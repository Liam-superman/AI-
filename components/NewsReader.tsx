import React, { useEffect, useState, useRef } from 'react';
import { NewsArticle } from '../types';
import { interpretNewsArticle, generateSpeech } from '../services/geminiService';

interface NewsReaderProps {
  article: NewsArticle;
  onBack: () => void;
  onOpenLive: (context: string) => void;
}

const NewsReader: React.FC<NewsReaderProps> = ({ article, onBack, onOpenLive }) => {
  const [interpretation, setInterpretation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadInterpretation = async () => {
      setLoading(true);
      const text = await interpretNewsArticle(article);
      if (isMounted) {
        setInterpretation(text);
        setLoading(false);
      }
    };
    loadInterpretation();
    return () => { isMounted = false; };
  }, [article]);

  const handlePlayTTS = async () => {
    if (audioUrl) {
      audioRef.current?.play();
      return;
    }
    
    setAudioLoading(true);
    try {
        const textToRead = interpretation.length > 50 ? interpretation : `${article.title}. ${article.summary}`;
        const audioBuffer = await generateSpeech(textToRead);
        
        // Convert ArrayBuffer to Blob URL for the <audio> element
        const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Use timeout to let state update before playing
        setTimeout(() => {
             const audio = document.getElementById('tts-audio') as HTMLAudioElement;
             if(audio) audio.play();
        }, 100);

    } catch (e) {
        console.error("TTS Error", e);
        alert("无法生成语音。");
    } finally {
        setAudioLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up pb-20">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        返回列表
      </button>

      <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
            <div className="flex items-center space-x-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">
                    {article.source}
                </span>
                <span className="text-gray-400 text-sm">{article.date}</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {article.title}
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 italic border-l-4 border-blue-500 pl-4 py-1">
                {article.summary}
            </p>

            <div className="border-t border-gray-100 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2 text-purple-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 9l2.846-.813a4.5 4.5 0 003.09-3.09L9 2.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 9l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                        </svg>
                        AI 深度解读
                    </h2>
                    
                    <div className="flex space-x-3">
                         <button 
                            onClick={handlePlayTTS}
                            disabled={loading || audioLoading}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-colors ${
                                audioLoading || loading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                        >
                            {audioLoading ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                            )}
                            <span>{audioUrl ? '重播' : '收听解读'}</span>
                        </button>
                        
                        <button 
                            onClick={() => onOpenLive(interpretation || article.summary)}
                            disabled={loading}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-colors ${
                                loading 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                            <span>语音探讨</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                    </div>
                ) : (
                    <div className="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {interpretation}
                    </div>
                )}
            </div>
        </div>
      </article>
      
      {audioUrl && (
          <audio id="tts-audio" src={audioUrl} className="hidden" onEnded={() => {}} />
      )}
    </div>
  );
};

export default NewsReader;