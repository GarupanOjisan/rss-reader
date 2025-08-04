import React from 'react';
import type { RSSItem } from '../types';

interface ArticleCardProps {
  article: RSSItem;
  onClick: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onClick }) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const nowJST = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const todayKey = nowJST.toISOString().split('T')[0];
    
    const articleJST = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const articleKey = articleJST.toISOString().split('T')[0];
    
    const isToday = articleKey === todayKey;
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    
    if (isToday) {
      if (diffInMinutes < 5) {
        return '今';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}分前`;
      } else {
        return `${diffInHours}時間前`;
      }
    } else if (diffInHours < 48) {
      return '昨日';
    } else {
      return articleJST.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric'
      });
    }
  };
  
  const getTimeDisplay = (date: Date) => {
    // 日本時間で時刻を表示
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    return jstDate.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC' // JSTに変換済みなのでUTCとして扱う
    });
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <article 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600">
            {article.title}
          </h3>
          
          {article.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-3">
              {truncateText(stripHtml(article.description), 200)}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="font-medium text-blue-600">
                {article.feedTitle}
              </span>
              {article.author && (
                <span>by {article.author}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <time 
                dateTime={article.pubDate.toISOString()}
                className="text-gray-400 text-xs"
              >
                {getTimeDisplay(article.pubDate)}
              </time>
              <span className={`font-medium ${
                formatDate(article.pubDate).includes('時間前') || 
                formatDate(article.pubDate).includes('分前') || 
                formatDate(article.pubDate) === '今'
                  ? 'text-green-600' 
                  : 'text-gray-500'
              }`}>
                {formatDate(article.pubDate)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>
    </article>
  );
};

export default ArticleCard; 
