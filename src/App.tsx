import React, { useState, useEffect } from 'react';
import type { RSSFeed, RSSItem } from './types';
import { loadFeeds, saveFeeds, loadArticles, addArticles, saveArticles, logStorageUsage, filterArticlesByDate } from './utils/storage';
import { fetchMultipleRSSFeeds } from './utils/rss';
import Header from './components/Header';
import FeedManager from './components/FeedManager';
import ArticleList from './components/ArticleList';
import LoadingSpinner from './components/LoadingSpinner';
import DateFilter from './components/DateFilter';

function App() {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [articles, setArticles] = useState<RSSItem[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<RSSItem[]>([]);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedManager, setShowFeedManager] = useState(false);

  // 初期化時にローカルストレージからデータを読み込み
  useEffect(() => {
    const savedFeeds = loadFeeds();
    const savedArticles = loadArticles();
    
    console.log('🔄 アプリケーション初期化');
    console.log(`読み込まれたフィード数: ${savedFeeds.length}`);
    console.log(`読み込まれた記事数: ${savedArticles.length}`);
    logStorageUsage();
    
    setFeeds(savedFeeds);
    setArticles(savedArticles);
    
    // 初期化時に除外日付を設定（DateFilterコンポーネントで読み込まれる）
    setFilteredArticles(savedArticles);
  }, []);

  // 除外日付が変更された時に記事をフィルタリング
  useEffect(() => {
    const filtered = filterArticlesByDate(articles, excludedDates);
    setFilteredArticles(filtered);
    
    if (excludedDates.length > 0) {
      console.log(`📅 日付フィルター適用: ${excludedDates.length}日を除外、${filtered.length}/${articles.length}件表示`);
    }
  }, [articles, excludedDates]);

  // 除外日付の変更を処理
  const handleExcludedDatesChange = (dates: string[]) => {
    setExcludedDates(dates);
  };

  // フィードを追加
  const addFeed = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 重複チェック
      const existingFeed = feeds.find(feed => feed.url === url);
      if (existingFeed) {
        setError('このフィードは既に登録されています');
        return;
      }
      
      const { feeds: newFeeds, items: newItems } = await fetchMultipleRSSFeeds([url]);
      
      if (newFeeds.length > 0) {
        // 新しいフィードのみを追加（さらなる重複チェック）
        const uniqueNewFeeds = newFeeds.filter(newFeed => 
          !feeds.some(existingFeed => existingFeed.url === newFeed.url)
        );
        
        if (uniqueNewFeeds.length === 0) {
          setError('このフィードは既に登録されています');
          return;
        }
        
        const updatedFeeds = [...feeds, ...uniqueNewFeeds];
        console.log('✅ フィード追加成功');
        console.log(`追加されたフィード: ${uniqueNewFeeds[0]?.title} (${uniqueNewFeeds[0]?.url})`);
        console.log(`総フィード数: ${updatedFeeds.length}`);
        
        setFeeds(updatedFeeds);
        saveFeeds(updatedFeeds);
        
        if (newItems.length > 0) {
          console.log(`📰 新しい記事を${newItems.length}件追加中...`);
          
          // 当日分の記事数をカウント（日本時間基準）
          const nowJST = new Date();
          const todayJST = new Date(nowJST.getTime() + (9 * 60 * 60 * 1000));
          const todayKey = todayJST.toISOString().split('T')[0];
          
          const todayItems = newItems.filter(item => {
            const itemJST = new Date(item.pubDate.getTime() + (9 * 60 * 60 * 1000));
            const itemKey = itemJST.toISOString().split('T')[0];
            return itemKey === todayKey;
          });
          
          if (todayItems.length > 0) {
            console.log(`🌟 当日分の記事: ${todayItems.length}件（優先保存）`);
          }
          
          addArticles(newItems);
          const updatedArticles = loadArticles();
          setArticles(updatedArticles);
          console.log(`📊 総記事数: ${updatedArticles.length}`);
          logStorageUsage();
        }
      } else {
        setError('有効なRSSフィードが見つかりませんでした');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィードの追加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // フィードを削除
  const removeFeed = (feedId: string) => {
    const targetFeed = feeds.find(f => f.id === feedId);
    console.log('🗑️ フィード削除');
    console.log(`削除対象: ${targetFeed?.title}`);
    
    const updatedFeeds = feeds.filter(feed => feed.id !== feedId);
    setFeeds(updatedFeeds);
    saveFeeds(updatedFeeds);
    
    // 関連する記事も削除
    const updatedArticles = articles.filter(article => article.feedId !== feedId);
    const deletedArticleCount = articles.length - updatedArticles.length;
    
    setArticles(updatedArticles);
    saveArticles(updatedArticles);
    
    console.log(`フィード削除完了 (記事${deletedArticleCount}件も削除)`);
    console.log(`残りフィード数: ${updatedFeeds.length}`);
    logStorageUsage();
  };

  // 全フィードを更新
  const refreshAllFeeds = async () => {
    if (feeds.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const urls = feeds.map(feed => feed.url);
      const { feeds: updatedFeeds, items: newItems } = await fetchMultipleRSSFeeds(urls);
      
      // 既存のフィード情報を更新
      const mergedFeeds = feeds.map(feed => {
        const updatedFeed = updatedFeeds.find(f => f.url === feed.url);
        return updatedFeed ? { ...feed, ...updatedFeed } : feed;
      });
      
      setFeeds(mergedFeeds);
      saveFeeds(mergedFeeds);
      
      if (newItems.length > 0) {
        addArticles(newItems);
        const updatedArticles = loadArticles();
        setArticles(updatedArticles);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィードの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 記事をクリックした時の処理
  const handleArticleClick = (article: RSSItem) => {
    window.open(article.link, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onRefresh={refreshAllFeeds}
        onManageFeeds={() => setShowFeedManager(true)}
        isLoading={isLoading}
      />
      
      <main className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {showFeedManager && (
          <FeedManager
            feeds={feeds}
            onAddFeed={addFeed}
            onRemoveFeed={removeFeed}
            onClose={() => setShowFeedManager(false)}
            isLoading={isLoading}
          />
        )}
        
        {isLoading && <LoadingSpinner />}
        
        <DateFilter 
          onExcludedDatesChange={handleExcludedDatesChange}
        />

        <ArticleList 
          articles={filteredArticles}
          onArticleClick={handleArticleClick}
        />
      </main>
    </div>
  );
}

export default App;
