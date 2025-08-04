// RSSフィードの型定義
export interface RSSFeed {
  id: string;
  title: string;
  url: string;
  description?: string;
  lastFetched?: Date;
  isActive: boolean;
}

// RSS記事の型定義
export interface RSSItem {
  id: string;
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate: Date;
  author?: string;
  feedId: string;
  feedTitle: string;
}

// OPML形式の型定義
export interface OPMLOutline {
  text: string;
  title?: string;
  type: string;
  xmlUrl: string;
  htmlUrl?: string;
  description?: string;
}

export interface OPMLData {
  head: {
    title: string;
    dateCreated?: string;
    dateModified?: string;
  };
  body: {
    outline: OPMLOutline[];
  };
}

// アプリケーションの状態管理用の型定義
export interface AppState {
  feeds: RSSFeed[];
  articles: RSSItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
} 
