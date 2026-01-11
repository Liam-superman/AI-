import React, { useState, useEffect } from 'react';
import { fetchDailyAINews } from './services/geminiService';
import { NewsArticle, GroundingChunk, AppView } from './types';
import NewsCard from './components/NewsCard';
import NewsReader from './components/NewsReader';
import DatePicker from './components/DatePicker';
import LiveAssistant from './components/LiveAssistant';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.FEED);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [showLiveAssistant, setShowLiveAssistant] = useState(false);
  const [liveContext, setLiveContext] = useState('');

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      try {
        const result = await fetchDailyAINews(selectedDate);
        setArticles(result.articles);
        setGroundingChunks(result.groundingChunks);
      } catch (error) {
        console.error("Failed to load news", error);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, [selectedDate]);

  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article);
    setView(AppView.READER);
    window.scrollTo(0,0);
  };

  const handleBack = () => {
    setView(AppView.FEED);
    setSelectedArticle(null);
  };

  const handleOpenLive = (context: string) => {
    setLiveContext(context);
    setShowLiveAssistant(true);
  };

  return (
    <div className="min-h-screen pb-10">
      {/* Header with Safe Area support for iPhone Notch */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                AI
             </div>
             <h1 className="text-xl font-bold text-gray-800 tracking-tight truncate">每日 AI 简报</h1>
          </div>
          <DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === AppView.FEED && (
          <>
             <div className="mb-8">
                 <h2 className="text-3xl font-bold text-gray-900 mb-2">今日热点</h2>
                 <p className="text-gray-500">
                    为您呈现 {new Date(selectedDate).toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 的 AI 发展动态
                 </p>
             </div>

             {loading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                     {[...Array(6)].map((_, i) => (
                         <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
                     ))}
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                     {articles.map((article, index) => (
                         <NewsCard 
                            key={article.id || index} 
                            article={article} 
                            index={index}
                            onClick={() => handleArticleClick(article)} 
                         />
                     ))}
                 </div>
             )}

             {/* Search Grounding Sources */}
             {!loading && groundingChunks.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    参考来源
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {groundingChunks.map((chunk, idx) => (
                      chunk.web?.uri && (
                        <a 
                          key={idx}
                          href={chunk.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full transition-colors truncate max-w-xs block"
                        >
                          {chunk.web.title || new URL(chunk.web.uri).hostname}
                        </a>
                      )
                    ))}
                  </div>
                </div>
             )}
          </>
        )}

        {view === AppView.READER && selectedArticle && (
          <NewsReader 
             article={selectedArticle} 
             onBack={handleBack}
             onOpenLive={handleOpenLive}
          />
        )}
      </main>

      {/* Live Assistant Overlay */}
      {showLiveAssistant && (
          <LiveAssistant 
             contextText={liveContext} 
             onClose={() => setShowLiveAssistant(false)} 
          />
      )}
    </div>
  );
};

export default App;