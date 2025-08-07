import type { RSSFeed, RSSItem } from '../types';

const STORAGE_KEYS = {
  FEEDS: 'rss-reader-feeds',
  ARTICLES: 'rss-reader-articles',
} as const;



// フィードの保存・取得
export const saveFeeds = (feeds: RSSFeed[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(feeds));
  } catch (error) {
    console.error('フィードの保存に失敗しました:', error);
  }
};

export const loadFeeds = (): RSSFeed[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FEEDS);
    if (!stored) return [];
    
    const feeds = JSON.parse(stored);
    // 日付文字列をDateオブジェクトに変換
    const processedFeeds = feeds.map((feed: any) => ({
      ...feed,
      lastFetched: feed.lastFetched ? new Date(feed.lastFetched) : undefined,
    }));
    
    // 重複チェック（URLベース）
    const uniqueFeeds: RSSFeed[] = [];
    const seenUrls = new Set<string>();
    
    for (const feed of processedFeeds) {
      if (!seenUrls.has(feed.url)) {
        seenUrls.add(feed.url);
        uniqueFeeds.push(feed);
      }
    }
    
    // 重複が見つかった場合は、クリーンアップされたデータを保存
    if (uniqueFeeds.length !== processedFeeds.length) {
      console.warn('重複したフィードを検出し、クリーンアップしました');
      saveFeeds(uniqueFeeds);
    }
    
    return uniqueFeeds;
  } catch (error) {
    console.error('フィードの読み込みに失敗しました:', error);
    return [];
  }
};

// 記事の保存・取得
export const saveArticles = (articles: RSSItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('ストレージ容量制限に達しました。古いデータを削除してリトライします...');
      
      // 記事数を半分に削減してリトライ
      const reducedArticles = articles.slice(0, Math.floor(articles.length / 2));
      console.log(`記事数を${articles.length}件から${reducedArticles.length}件に削減します`);
      
      try {
        localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(reducedArticles));
        console.log('記事の保存に成功しました');
      } catch (retryError) {
        console.error('リトライ後も記事の保存に失敗しました:', retryError);
        // 最後の手段として記事を全削除
        localStorage.removeItem(STORAGE_KEYS.ARTICLES);
        console.warn('記事データを全削除しました');
      }
    } else {
      console.error('記事の保存に失敗しました:', error);
    }
  }
};

export const loadArticles = (): RSSItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ARTICLES);
    if (!stored) return [];
    
    const articles = JSON.parse(stored);
    // 日付文字列をDateオブジェクトに変換
    return articles.map((article: any) => ({
      ...article,
      pubDate: new Date(article.pubDate),
    }));
  } catch (error) {
    console.error('記事の読み込みに失敗しました:', error);
    return [];
  }
};

// 新しい記事を追加（重複チェック付き、当日分優先保存）
export const addArticles = (newArticles: RSSItem[]): void => {
  const existingArticles = loadArticles();
  const existingIds = new Set(existingArticles.map(article => article.id));
  
  const uniqueNewArticles = newArticles.filter(article => !existingIds.has(article.id));
  let allArticles = [...existingArticles, ...uniqueNewArticles];
  
  // 日付順でソート（新しい順）
  allArticles.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  
  // 当日分を優先保存するためのロジック（日本時間基準）
  const nowJST = new Date();
  const todayJST = new Date(nowJST.getTime() + (9 * 60 * 60 * 1000));
  const todayKey = todayJST.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 記事を当日分と過去分に分類（日本時間基準）
  const todayArticles = allArticles.filter(article => {
    const articleJST = new Date(article.pubDate.getTime() + (9 * 60 * 60 * 1000));
    const articleKey = articleJST.toISOString().split('T')[0];
    return articleKey === todayKey;
  });
  
  const pastArticles = allArticles.filter(article => {
    const articleJST = new Date(article.pubDate.getTime() + (9 * 60 * 60 * 1000));
    const articleKey = articleJST.toISOString().split('T')[0];
    return articleKey < todayKey;
  });
  
  const futureArticles = allArticles.filter(article => {
    const articleJST = new Date(article.pubDate.getTime() + (9 * 60 * 60 * 1000));
    const articleKey = articleJST.toISOString().split('T')[0];
    return articleKey > todayKey;
  });
  
  console.log(`📅 記事分類: 当日${todayArticles.length}件, 過去${pastArticles.length}件, 未来${futureArticles.length}件`);
  
  // 当日分は全て保持、過去分は制限を適用
  const MAX_TODAY_ARTICLES = 500; // 当日分の上限
  const MAX_PAST_ARTICLES = 500;  // 過去分の上限
  
  let finalTodayArticles = todayArticles;
  if (todayArticles.length > MAX_TODAY_ARTICLES) {
    finalTodayArticles = todayArticles.slice(0, MAX_TODAY_ARTICLES);
    console.log(`当日記事が${MAX_TODAY_ARTICLES}件を超えたため、古いものを削除しました`);
  }
  
  let finalPastArticles = pastArticles;
  if (pastArticles.length > MAX_PAST_ARTICLES) {
    finalPastArticles = pastArticles.slice(0, MAX_PAST_ARTICLES);
    console.log(`過去記事が${MAX_PAST_ARTICLES}件を超えたため、古いものを削除しました`);
  }
  
  // 30日以上古い記事を削除（当日分は除外）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentPastArticles = finalPastArticles.filter(article => article.pubDate >= thirtyDaysAgo);
  
  if (recentPastArticles.length !== finalPastArticles.length) {
    console.log(`30日以上古い記事を${finalPastArticles.length - recentPastArticles.length}件削除しました`);
  }
  
  // 最終的な記事リスト（当日分 + 未来分 + 最近の過去分）
  allArticles = [...futureArticles, ...finalTodayArticles, ...recentPastArticles];
  
  // 再度日付順でソート
  allArticles.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  
  saveArticles(allArticles);
};

// ストレージのクリア
export const clearStorage = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// ストレージの使用量を取得
export const getStorageUsage = (): { used: number; total: number; percentage: number; breakdown: Record<string, number> } => {
  let used = 0;
  const breakdown: Record<string, number> = {};
  
  Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
    const item = localStorage.getItem(storageKey);
    if (item) {
      const size = item.length * 2; // UTF-16文字は2バイト
      breakdown[key] = size;
      used += size;
    } else {
      breakdown[key] = 0;
    }
  });
  
  const total = 5 * 1024 * 1024; // 5MB (localStorageの一般的な制限)
  const percentage = Math.round((used / total) * 100);
  
  return {
    used,
    total,
    percentage,
    breakdown,
  };
};

// ストレージ使用状況をコンソールに表示
export const logStorageUsage = (): void => {
  const usage = getStorageUsage();
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  console.group('📊 ストレージ使用状況');
  console.log(`総使用量: ${formatBytes(usage.used)} / ${formatBytes(usage.total)} (${usage.percentage}%)`);
  console.log('内訳:');
  Object.entries(usage.breakdown).forEach(([key, size]) => {
    console.log(`  ${key}: ${formatBytes(size)}`);
  });
  console.groupEnd();
}; 
