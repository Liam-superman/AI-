export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface SearchResult {
  articles: NewsArticle[];
  groundingChunks: GroundingChunk[];
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export enum AppView {
  FEED = 'FEED',
  READER = 'READER',
}

export interface AudioVisualizerData {
  volume: number;
}