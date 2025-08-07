import React, { useState } from 'react';
import type { RSSFeed } from '../types';
import { parseOPML, createFeedsFromOPML, generateOPML } from '../utils/rss';
import LoadingSpinner from './LoadingSpinner';

interface FeedManagerProps {
  feeds: RSSFeed[];
  onAddFeed: (url: string) => Promise<void>;
  onRemoveFeed: (feedId: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const FeedManager: React.FC<FeedManagerProps> = ({
  feeds,
  onAddFeed,
  onRemoveFeed,
  onClose,
  isLoading
}) => {
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addingFeeds, setAddingFeeds] = useState<string[]>([]);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    const feedUrl = newFeedUrl.trim();
    setError(null);
    setAddingFeeds(prev => [...prev, feedUrl]);
    
    try {
      await onAddFeed(feedUrl);
      setNewFeedUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィードの追加に失敗しました');
    } finally {
      setAddingFeeds(prev => prev.filter(url => url !== feedUrl));
    }
  };

  const handleOPMLImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const opmlText = event.target?.result as string;
        const opmlData = parseOPML(opmlText);
        const newFeeds = createFeedsFromOPML(opmlData);
        
        // 各フィードを追加（ローディング状態を管理）
        for (const feed of newFeeds) {
          setAddingFeeds(prev => [...prev, feed.url]);
          try {
            await onAddFeed(feed.url);
          } finally {
            setAddingFeeds(prev => prev.filter(url => url !== feed.url));
          }
        }
      } catch (err) {
        setError('OPMLファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  };

  const handleOPMLExport = () => {
    const opmlContent = generateOPML(feeds);
    const blob = new Blob([opmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rss-feeds.opml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">フィード管理</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* 新しいフィード追加 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">新しいフィードを追加</h3>
            <form onSubmit={handleAddFeed} className="flex gap-2">
              <input
                type="url"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                placeholder="RSSフィードのURLを入力"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !newFeedUrl.trim() || addingFeeds.includes(newFeedUrl.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingFeeds.includes(newFeedUrl.trim()) ? (
                  <>
                    <LoadingSpinner size="sm" showText={false} />
                    追加中...
                  </>
                ) : (
                  '追加'
                )}
              </button>
            </form>
          </div>

          {/* 追加中のフィード */}
          {addingFeeds.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">追加中のフィード</h3>
              <div className="space-y-2">
                {addingFeeds.map((url) => (
                  <div
                    key={url}
                    className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" showText={false} />
                        <span className="text-sm text-gray-600">追加中...</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">{url}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPMLインポート/エクスポート */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">OPMLファイル</h3>
            <div className="flex gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".opml,.xml"
                  onChange={handleOPMLImport}
                  className="hidden"
                  disabled={isLoading || addingFeeds.length > 0}
                />
                <div className="px-4 py-2 border border-gray-300 rounded-md text-center cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  {addingFeeds.length > 0 ? 'インポート中...' : 'OPMLファイルをインポート'}
                </div>
              </label>
              <button
                onClick={handleOPMLExport}
                disabled={feeds.length === 0 || isLoading || addingFeeds.length > 0}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                OPMLファイルをエクスポート
              </button>
            </div>
          </div>

          {/* フィード一覧 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              登録済みフィード ({feeds.length})
            </h3>

            {feeds.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                まだフィードが登録されていません
              </p>
            ) : (
              <div className="space-y-2">
                {feeds.map((feed) => (
                  <div
                    key={feed.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{feed.title}</h4>
                      <p className="text-sm text-gray-500 truncate">{feed.url}</p>
                      {feed.description && (
                        <p className="text-sm text-gray-600 mt-1">{feed.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveFeed(feed.id)}
                      disabled={isLoading}
                      className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                      title="フィードを削除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedManager; 
