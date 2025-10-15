export type AdType = 'video' | 'static';

export type AppStatus = 'initializing' | 'idle' | 'compressing' | 'analyzing' | 'ready' | 'generating' | 'chatting' | 'summarizing';

export interface Product {
    name: string;
    shortName: string;
    description: string;
    features: string[];
    benefits: string[];
    productPageUrl: string;
    googleSheetUrl?: string;
    googleDocUrl?: string;
}

// --- New types for image iterations ---
export interface ImageIteration {
    id: string;
    imageDataUrl?: string; // The full composite image with the iteration applied
    status: 'loading' | 'done' | 'failed';
}

// --- Chat-based History Types ---

export interface UserMessage {
    type: 'user';
    content: string;
}

export interface AssistantMessage {
    type: 'assistant';
    content: string | ImageIteration[]; // Can be text or a set of image iterations
}

export type ChatMessage = UserMessage | AssistantMessage;


// --- Analysis Types ---

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

// --- Video Iteration Control Types ---

export type IterationType = 'copy' | 'visual';

export interface TimeRange {
    start: number;
    end: number;
}