import type { RSSFeed, RSSItem, OPMLData, OPMLOutline } from '../types';

// 複数のプロキシサービスを定義（フォールバック用）
const PROXY_SERVICES = [
  (url: string) => `http://localhost:8080/${url}`, // ローカルCORS Anywhere
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, // フォールバック
];

// RSSフィードを取得して解析
export const fetchRSSFeed = async (url: string): Promise<{
  feed: RSSFeed;
  items: RSSItem[];
}> => {
  let lastError: Error | null = null;
  
  // 複数のプロキシサービスを順番に試す
  for (let i = 0; i < PROXY_SERVICES.length; i++) {
    try {
      const proxyUrl = PROXY_SERVICES[i](url);
      const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest'
      };
      
      // ローカルCORS Anywhereサーバーの場合、Originヘッダーを追加
      if (i === 0) {
        headers['Origin'] = 'http://localhost:5173';
      }
      
      const response = await fetch(proxyUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let rssText: string;
      
      // レスポンスの形式に応じて処理
      if (i === 1) { // allorigins.win の場合
        const data = await response.json();
        rssText = data.contents;
      } else {
        // ローカルCORS Anywhereの場合は直接テキストを取得
        rssText = await response.text();
      }
      
      // XMLを解析
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rssText, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('RSSフィードの解析に失敗しました');
      }
      
      // RSS 2.0 または Atom フィードを判定
      const isAtom = xmlDoc.querySelector('feed') !== null;
      const isRSS = xmlDoc.querySelector('rss') !== null;
      
      if (!isAtom && !isRSS) {
        throw new Error('有効なRSSまたはAtomフィードではありません');
      }
      
      let feedTitle = '';
      let feedDescription = '';
      let items: RSSItem[] = [];
      
      if (isRSS) {
        // RSS 2.0 フィードの解析
        const channel = xmlDoc.querySelector('channel');
        if (channel) {
          feedTitle = channel.querySelector('title')?.textContent || 'Unknown Feed';
          feedDescription = channel.querySelector('description')?.textContent || '';
          
          const itemElements = channel.querySelectorAll('item');
          items = Array.from(itemElements).map(item => ({
            id: generateId(),
            title: item.querySelector('title')?.textContent || 'No Title',
            link: item.querySelector('link')?.textContent || '',
            description: item.querySelector('description')?.textContent || '',
            content: item.querySelector('content\\:encoded')?.textContent || 
                    item.querySelector('description')?.textContent || '',
            pubDate: item.querySelector('pubDate')?.textContent ? 
                    new Date(item.querySelector('pubDate')!.textContent!) : new Date(),
            author: item.querySelector('author')?.textContent || 
                   item.querySelector('dc\\:creator')?.textContent || '',
            feedId: '',
            feedTitle: feedTitle,
          }));
        }
      } else if (isAtom) {
        // Atom フィードの解析
        const feed = xmlDoc.querySelector('feed');
        if (feed) {
          feedTitle = feed.querySelector('title')?.textContent || 'Unknown Feed';
          feedDescription = feed.querySelector('subtitle')?.textContent || '';
          
          const entryElements = feed.querySelectorAll('entry');
          items = Array.from(entryElements).map(entry => ({
            id: generateId(),
            title: entry.querySelector('title')?.textContent || 'No Title',
            link: entry.querySelector('link')?.getAttribute('href') || '',
            description: entry.querySelector('summary')?.textContent || '',
            content: entry.querySelector('content')?.textContent || 
                    entry.querySelector('summary')?.textContent || '',
            pubDate: entry.querySelector('published')?.textContent ? 
                    new Date(entry.querySelector('published')!.textContent!) : 
                    entry.querySelector('updated')?.textContent ? 
                    new Date(entry.querySelector('updated')!.textContent!) : new Date(),
            author: entry.querySelector('author name')?.textContent || '',
            feedId: '',
            feedTitle: feedTitle,
          }));
        }
      }
      
      const feed: RSSFeed = {
        id: generateId(),
        title: feedTitle,
        url,
        description: feedDescription,
        lastFetched: new Date(),
        isActive: true,
      };
      
      // フィードIDを設定
      items = items.map(item => ({ ...item, feedId: feed.id }));
      
      return { feed, items };
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`プロキシサービス ${i + 1} でエラー:`, error);
      // 次のプロキシサービスを試す
      continue;
    }
  }
  
  // すべてのプロキシサービスが失敗した場合
  console.error(`RSSフィードの取得に失敗しました: ${url}`, lastError);
  throw new Error(`RSSフィードの取得に失敗しました。すべてのプロキシサービスでエラーが発生しました: ${lastError?.message}`);
};

// 複数のRSSフィードを並行して取得
export const fetchMultipleRSSFeeds = async (urls: string[]): Promise<{
  feeds: RSSFeed[];
  items: RSSItem[];
}> => {
  const promises = urls.map(url => 
    fetchRSSFeed(url).catch(error => {
      console.error(`フィード取得エラー: ${url}`, error);
      return null;
    })
  );

  const results = await Promise.allSettled(promises);
  
  const feeds: RSSFeed[] = [];
  const items: RSSItem[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      feeds.push(result.value.feed);
      items.push(...result.value.items);
    }
  });

  return { feeds, items };
};

// OPMLファイルを解析
export const parseOPML = (opmlText: string): OPMLData => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(opmlText, 'text/xml');
  
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('OPMLファイルの解析に失敗しました');
  }

  const headElement = xmlDoc.querySelector('head');
  const bodyElement = xmlDoc.querySelector('body');

  if (!headElement || !bodyElement) {
    throw new Error('OPMLファイルの形式が正しくありません');
  }

  const head = {
    title: headElement.querySelector('title')?.textContent || '',
    dateCreated: headElement.querySelector('dateCreated')?.textContent || undefined,
    dateModified: headElement.querySelector('dateModified')?.textContent || undefined,
  };

  const outlines: OPMLOutline[] = [];
  const outlineElements = bodyElement.querySelectorAll('outline');

  outlineElements.forEach((element) => {
    const xmlUrl = element.getAttribute('xmlUrl');
    if (xmlUrl) {
      outlines.push({
        text: element.getAttribute('text') || '',
        title: element.getAttribute('title') || undefined,
        type: element.getAttribute('type') || 'rss',
        xmlUrl,
        htmlUrl: element.getAttribute('htmlUrl') || undefined,
        description: element.getAttribute('description') || undefined,
      });
    }
  });

  return {
    head,
    body: { outline: outlines },
  };
};

// OPMLデータからRSSフィードのURLリストを抽出
export const extractFeedUrlsFromOPML = (opmlData: OPMLData): string[] => {
  return opmlData.body.outline
    .filter(outline => outline.type === 'rss' || outline.xmlUrl)
    .map(outline => outline.xmlUrl);
};

// OPMLデータからRSSFeedオブジェクトのリストを生成
export const createFeedsFromOPML = (opmlData: OPMLData): RSSFeed[] => {
  return opmlData.body.outline
    .filter(outline => outline.type === 'rss' || outline.xmlUrl)
    .map(outline => ({
      id: generateId(),
      title: outline.title || outline.text,
      url: outline.xmlUrl,
      description: outline.description,
      lastFetched: undefined,
      isActive: true,
    }));
};

// OPMLファイルを生成
export const generateOPML = (feeds: RSSFeed[]): string => {
  const outlines = feeds.map(feed => 
    `  <outline text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" type="rss" xmlUrl="${escapeXml(feed.url)}" description="${escapeXml(feed.description || '')}"/>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>RSS Reader Export</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
};

// ユーティリティ関数
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}; 
