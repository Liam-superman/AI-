import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { NewsArticle, SearchResult } from "../types";
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from "./audioUtils";

const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
  console.error("API_KEY is missing!");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- News Fetching with Search Grounding ---

export const fetchDailyAINews = async (date: string): Promise<SearchResult> => {
  const prompt = `
    Find the top 20 most significant and hottest news stories related to Artificial Intelligence, Machine Learning, and AI applications for today, ${date}.
    Focus on major product releases, research breakthroughs, policy changes, and industry trends.
    
    Translate all content to Simplified Chinese (简体中文).

    Return the response ONLY as a raw JSON array (no markdown code blocks) of objects with these keys:
    - "title": string (The headline in Simplified Chinese)
    - "summary": string (A brief 1-sentence summary in Simplified Chinese)
    - "source": string (The name of the publisher)
    - "id": string (A unique random string id)
    - "date": string (The date of the news)

    Example format:
    [{"title": "...", "summary": "...", "source": "...", "id": "...", "date": "..."}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // We use a high temperature to get diverse news, but prompt ensures JSON structure
        temperature: 0.5, 
      }
    });

    let text = response.text || '[]';
    // Clean up markdown if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let articles: NewsArticle[] = [];
    try {
        articles = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse news JSON", e);
        // Fallback: Return an empty list or mock error article
        articles = [{
            id: 'error',
            title: '无法解析新闻数据',
            summary: '请尝试选择其他日期或稍后重试。',
            source: '系统消息',
            date
        }];
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { articles, groundingChunks };
  } catch (error) {
    console.error("Error fetching news:", error);
    throw error;
  }
};

// --- News Interpretation ---

export const interpretNewsArticle = async (article: NewsArticle): Promise<string> => {
  const prompt = `
    Act as a senior technology analyst. Provide a detailed, easy-to-understand interpretation of the following AI news story in Simplified Chinese (简体中文).
    Explain "Why this matters" (why it is important) and its potential impact on the future of AI.
    
    News Title: ${article.title}
    Source: ${article.source}
    Summary: ${article.summary}
    
    Keep the tone professional yet engaging. Format with clear paragraphs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Use search to verify facts if needed
      }
    });
    return response.text || "暂无解读内容。";
  } catch (error) {
    console.error("Error interpreting news:", error);
    return "生成解读失败，请稍后重试。";
  }
};

// --- Text-to-Speech (TTS) ---

export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    // Decode base64 to binary string then to ArrayBuffer
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;

  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

// --- Live API (Real-time Conversation) ---

export class LiveClient {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null; // Using any for session type as it's not exported strictly
  private isActive = false;
  private currentStream: MediaStream | null = null;

  constructor(private onVolumeChange: (vol: number) => void) {}

  async connect(contextText: string) {
    if (this.isActive) return;
    this.isActive = true;

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const outputNode = this.outputAudioContext!.createGain();
    outputNode.connect(this.outputAudioContext!.destination);

    const systemInstruction = `You are a helpful AI news assistant who speaks Simplified Chinese (简体中文). The user is reading a news story about: "${contextText}". 
    Answer their questions about this topic, discuss implications, or explain technical terms in Chinese. Be concise and conversational.`;

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.log("Live session opened");
          this.startAudioInput();
        },
        onmessage: async (message: LiveServerMessage) => {
           // Handle Audio Output
           const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
           if (base64Audio && this.outputAudioContext) {
             const audioBuffer = await decodeAudioData(
               base64ToUint8Array(base64Audio),
               this.outputAudioContext,
               24000
             );
             
             this.playAudio(audioBuffer);
           }
           
           // Handle Interruption
           if (message.serverContent?.interrupted) {
             this.stopAudioPlayback();
           }
        },
        onclose: () => {
          console.log("Live session closed");
          this.isActive = false;
        },
        onerror: (err) => {
          console.error("Live session error", err);
          this.isActive = false;
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        },
        systemInstruction: systemInstruction,
      }
    });
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.currentStream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.currentStream);
    const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.isActive) return;
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeChange(rms);

      const pcmBlob = createPcmBlob(inputData);
      
      this.sessionPromise?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(processor);
    processor.connect(this.inputAudioContext.destination);
  }

  private playAudio(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;
    
    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioContext.destination);
    
    source.addEventListener('ended', () => {
      this.sources.delete(source);
    });
    
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.sources.add(source);
  }

  private stopAudioPlayback() {
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    if (this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  async disconnect() {
    this.isActive = false;
    if (this.sessionPromise) {
      // session.close() is not strictly typed in all versions, casting if needed or assuming close method exists
      // The current SDK pattern might not expose .close on the promise result directly in a standard way unless awaited
      // but usually the session object has it.
      const session = await this.sessionPromise;
      // Note: SDK might handle close internally on garbage collection or we assume connection closes on reload
      // But explicit close is good if available.
      // @ts-ignore
      if (session.close) session.close(); 
    }
    
    this.currentStream?.getTracks().forEach(t => t.stop());
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.currentStream = null;
    this.sessionPromise = null;
  }
}