import React, { useState, useEffect, useCallback } from 'react';
import type { RSSItem } from '../types';
import ArticleCard from './ArticleCard';

interface ArticleListProps {
  articles: RSSItem[];
  onArticleClick: (article: RSSItem) => void;
}

const ArticleList: React.FC<ArticleListProps> = ({ articles, onArticleClick }) => {
  const [displayedArticles, setDisplayedArticles] = useState<RSSItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const articlesPerPage = 20;

  // 記事を日付でグループ化（日本時間基準、日付順でソート）
  const groupArticlesByDate = (articles: RSSItem[]) => {
    const groups: { [key: string]: RSSItem[] } = {};
    
    articles.forEach(article => {
      // 日本時間（JST）で日付を取得
      const jstDate = new Date(article.pubDate.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      const dateKey = jstDate.toISOString().split('T')[0]; // YYYY-MM-DD形式
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(article);
    });
    
    // 各グループ内で時刻順（降順）にソート
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    });
    
    return groups;
  };

  // 表示する記事を更新
  useEffect(() => {
    const sortedArticles = [...articles].sort((a, b) => 
      b.pubDate.getTime() - a.pubDate.getTime()
    );
    
    const endIndex = page * articlesPerPage;
    const newDisplayedArticles = sortedArticles.slice(0, endIndex);
    
    setDisplayedArticles(newDisplayedArticles);
    setHasMore(endIndex < sortedArticles.length);
  }, [articles, page]);

  // 無限スクロールの処理
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop
      === document.documentElement.offsetHeight
    ) {
      if (hasMore) {
        setPage(prev => prev + 1);
      }
    }
  }, [hasMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">記事がありません</h3>
        <p className="text-gray-500">
          RSSフィードを追加して記事を読み込みましょう
        </p>
      </div>
    );
  }

  const articleGroups = groupArticlesByDate(displayedArticles);
  
  // 日付グループを日付順（降順）でソート
  const sortedDateGroups = Object.entries(articleGroups).sort(([dateA], [dateB]) => {
    return dateB.localeCompare(dateA); // YYYY-MM-DD形式なので文字列比較で十分
  });

  return (
    <div className="space-y-6">
      {sortedDateGroups.map(([dateKey, dateArticles]) => {
        const dateObj = new Date(dateKey + 'T00:00:00+09:00'); // 日本時間として解釈
        const today = new Date();
        const todayJST = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayKey = todayJST.toISOString().split('T')[0];
        const isToday = dateKey === todayKey;
        
        return (
          <div key={dateKey}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center ${
              isToday ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {isToday && (
                <span className="inline-flex items-center px-2 py-1 mr-2 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  今日
                </span>
              )}
              {dateObj.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
              <span className="ml-2 text-sm text-gray-500">
                ({dateArticles.length}件)
              </span>
            </h2>
            <div className="space-y-4">
              {dateArticles.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onClick={() => onArticleClick(article)}
                />
              ))}
            </div>
          </div>
        );
      })}
      
      {hasMore && (
        <div className="text-center py-4">
          <div className="inline-flex items-center text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
            さらに読み込み中...
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleList; 
