import React, { useState, useEffect } from 'react';
import { addExcludedDate, removeExcludedDate, getExcludedDates } from '../utils/storage';

interface DateFilterProps {
  onExcludedDatesChange: (dates: string[]) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ onExcludedDatesChange }) => {
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // 除外日付の読み込み
  useEffect(() => {
    const dates = getExcludedDates();
    setExcludedDates(dates);
    onExcludedDatesChange(dates);
  }, [onExcludedDatesChange]);

  // 日付を除外リストに追加
  const handleAddExcludedDate = () => {
    if (selectedDate && !excludedDates.includes(selectedDate)) {
      addExcludedDate(selectedDate);
      const newExcludedDates = [...excludedDates, selectedDate];
      setExcludedDates(newExcludedDates);
      onExcludedDatesChange(newExcludedDates);
      setSelectedDate('');
    }
  };

  // 日付を除外リストから削除
  const handleRemoveExcludedDate = (date: string) => {
    removeExcludedDate(date);
    const newExcludedDates = excludedDates.filter(d => d !== date);
    setExcludedDates(newExcludedDates);
    onExcludedDatesChange(newExcludedDates);
  };

  // 今日の日付を除外リストに追加
  const handleExcludeToday = () => {
    const today = new Date();
    const todayJST = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    const todayKey = todayJST.toISOString().split('T')[0];
    
    if (!excludedDates.includes(todayKey)) {
      addExcludedDate(todayKey);
      const newExcludedDates = [...excludedDates, todayKey];
      setExcludedDates(newExcludedDates);
      onExcludedDatesChange(newExcludedDates);
    }
  };

  // 日付を日本語形式で表示
  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00+09:00');
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">日付フィルター</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4">
          {/* 今日を除外するボタン */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExcludeToday}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              今日の記事を除外
            </button>
            <span className="text-sm text-gray-500">
              今日公開された記事を表示しません
            </span>
          </div>

          {/* 日付選択と追加 */}
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              onClick={handleAddExcludedDate}
              disabled={!selectedDate}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              除外リストに追加
            </button>
          </div>

          {/* 除外日付一覧 */}
          {excludedDates.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">除外中の日付:</h4>
              <div className="space-y-2">
                {excludedDates.sort().map((date) => (
                  <div
                    key={date}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm text-gray-900">
                      {formatDateForDisplay(date)}
                    </span>
                    <button
                      onClick={() => handleRemoveExcludedDate(date)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="除外リストから削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 説明 */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <p>
              <strong>フィルター機能について:</strong><br />
              除外リストに追加した日付に公開された記事は表示されません。
              記事の公開日（インターネットに公開された日）を基準にフィルタリングされます。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter; 