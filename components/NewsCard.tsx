import React from 'react';
import { NewsArticle } from '../types';

interface NewsCardProps {
  article: NewsArticle;
  onClick: () => void;
  index: number;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, onClick, index }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 group"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
          #{index + 1}
        </span>
        <span className="text-xs text-gray-400 font-medium">{article.source}</span>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
        {article.title}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-3">
        {article.summary}
      </p>
    </div>
  );
};

export default NewsCard;