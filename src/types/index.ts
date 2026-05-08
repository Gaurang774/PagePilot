export interface PageMeta {
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  author?: string;
  publishDate?: string;
}

export interface PageLink {
  href: string;
  text: string;
  isExternal: boolean;
}

export interface PageHeading {
  level: number;
  text: string;
}

export interface PageData {
  url: string;
  title: string;
  meta: PageMeta;
  headings: PageHeading[];
  bodyText: string;
  links: PageLink[];
  imageAlts: string[];
  structuredData: unknown[];
  wordCount: number;
  readingTime: number; // minutes
  internalLinkCount: number;
  externalLinkCount: number;
  scannedAt: string; // ISO string
  favicon: string;
}

export interface Insights {
  summary: string;
  keyTopics: string[];
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // 0–100
  pageType:
    | "article"
    | "e-commerce"
    | "documentation"
    | "landing-page"
    | "social"
    | "forum"
    | "other";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  pageData: PageData;
  insights: Insights | null;
  chatHistory: ChatMessage[];
}

// Message types for chrome.runtime messaging
export type MessageType =
  | { type: "SCAN_PAGE" }
  | { type: "PING" }
  | { type: "GET_API_KEY" }
  | { type: "SET_API_KEY"; key: string }
  | { type: "GET_INSIGHTS"; pageData: PageData }
  | { type: "CHAT_STREAM"; pageData: PageData; messages: ChatMessage[]; userMessage: string }
  | { type: "ABORT_STREAM" };
