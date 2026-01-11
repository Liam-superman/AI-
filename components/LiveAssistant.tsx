import React, { useEffect, useRef, useState } from 'react';
import { LiveClient } from '../services/geminiService';

interface LiveAssistantProps {
  contextText: string; // The news summary or interpretation to discuss
  onClose: () => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ contextText, onClose }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [volume, setVolume] = useState(0);
  const clientRef = useRef<LiveClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const client = new LiveClient((vol) => {
        setVolume(vol);
    });
    clientRef.current = client;

    client.connect(contextText).then(() => {
        setIsConnecting(false);
    }).catch(err => {
        console.error("Failed to connect live", err);
        setIsConnecting(false);
    });

    return () => {
        client.disconnect();
    };
  }, [contextText]);

  // Visualizer Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Dynamic circle based on volume
        const radius = 30 + (volume * 200); // Scale volume for visual effect
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.2 + volume})`; // Blue with opacity
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(59, 130, 246, 0.8)`;
        ctx.fill();

        animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [volume]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-6">AI 实时语音探讨</h2>
        
        <div className="relative w-64 h-64 mb-6 flex items-center justify-center">
            {isConnecting ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            ) : (
                <canvas ref={canvasRef} width={256} height={256} className="w-full h-full" />
            )}
            
            {!isConnecting && (
                 <div className="absolute pointer-events-none">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                     </svg>
                 </div>
            )}
        </div>

        <p className="text-center text-gray-600 mb-2">
            {isConnecting ? "正在连接 Gemini Live..." : "正在聆听... 请就新闻内容提问。"}
        </p>
        <p className="text-xs text-gray-400 text-center max-w-xs">
           Gemini 2.5 原生音频预览
        </p>

        <button 
            onClick={onClose}
            className="mt-6 bg-red-50 text-red-600 px-6 py-2 rounded-full font-medium hover:bg-red-100 transition-colors"
        >
            结束会话
        </button>
      </div>
    </div>
  );
};

export default LiveAssistant;