import type { Selection } from './components/StaticAdInputs';

export type AdType = 'video' | 'static';
export type AppStatus = 'initializing' | 'idle' | 'compressing' | 'analyzing' | 'ready' | 'generating' | 'chatting' | 'summarizing' | 'parsing';

export interface Product {
    name: string;
    shortName: string;
    description: string;
    features: string[];
    benefits: string[];
    productPageUrl: string;
    googleSheetUrl?: string;
    googleDocUrl?: string;
    knowledgeFiles?: GeneralKnowledgeFile[];
}

export interface GeneralKnowledgeFile {
    type: string;
    name: string;
    path: string;
}

export interface KnowledgeBase {
    products: Product[];
    generalKnowledge?: GeneralKnowledgeFile[];
}

export interface ImageIteration {
    id: string;
    imageDataUrl?: string;
    status: 'loading' | 'done' | 'failed';
}

export interface UserMessage {
    type: 'user';
    content: string;
}

export interface AssistantMessage {
    type: 'assistant';
    content: string | ImageIteration[];
}

export type ChatMessage = UserMessage | AssistantMessage;

export interface FilenameAnalysis {
    productName?: string;
    platform?: string;
    locale?: string;
    batchAndVersion?: string;
    originalBatchInfo?: string;
    adType?: string;
    adFormat?: string;
    angle?: string;
    pcInitials?: string;
    veInitials?: string;
}

export type AnalysisSource = 'filename' | 'content' | null;

export type IterationType = 'copy' | 'visual';

export interface TimeRange {
    start: number;
    end: number;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionData {
  language: string | null;
  fullText: string;
  translation: string | null;
  segments: TranscriptionSegment[];
}
