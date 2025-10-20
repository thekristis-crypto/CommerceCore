// FIX: Import React to resolve 'Cannot find namespace' errors on React types.
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality, Chat } from '@google/genai';
import type { AdType, AppStatus, ChatMessage, Product, ImageIteration, IterationType, TimeRange, GeneralKnowledgeFile } from '../types';
import type { Selection } from '../components/StaticAdInputs';

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

const extractFramesAsDataUrls = (videoFile: File, times: number[]): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        const frames: string[] = [];
        let timeIndex = 0;

        video.onloadedmetadata = () => video.duration && isFinite(video.duration)
            ? video.currentTime = Math.min(times[timeIndex], video.duration)
            : reject(new Error('Video duration is not available.'));

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context.'));
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg'));
            timeIndex++;
            if (timeIndex < times.length) {
                video.currentTime = Math.min(times[timeIndex], video.duration);
            } else {
                URL.revokeObjectURL(video.src);
                resolve(frames);
            }
        };
        video.onerror = (e) => reject(new Error('Failed to load video for multi-frame extraction.'));
    });
};


interface GeminiHookProps {
    adFile: File | null;
    adType: AdType | null;
    marketingAngle: string;
    iterationRequest: string;
    negativePrompt: string;
    selectedProduct: string;
    customProductName: string;
    selection: Selection | null;
    referenceAdFile: File | null;
    numberOfIterations: 1 | 2 | 4;
    iterationType: IterationType | null;
    selectedText: string | null;
    selectedTextTranslation: string | null;
    transcription: string | null;
    detectedLanguage: string | null;
    productList: Product[];
    generalKnowledgeFiles: GeneralKnowledgeFile[];
    knowledgeFileContents: Map<string, string>;
    setStatus: (status: AppStatus) => void;
    setError: (error: string | null) => void;
    setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const useGemini = ({
    adFile, adType, marketingAngle, iterationRequest, negativePrompt, selectedProduct, customProductName,
    selection, referenceAdFile, numberOfIterations, iterationType, selectedText, selectedTextTranslation,
    transcription, detectedLanguage,
    productList, generalKnowledgeFiles, knowledgeFileContents,
    setStatus, setError, setChatHistory
}: GeminiHookProps) => {

    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [currentChatMessage, setCurrentChatMessage] = useState('');

    const handleStartGeneration = useCallback(async (
        currentChatSession: Chat | null, 
        setChatSession: (session: Chat | null) => void
    ) => {
        if (!adFile || !selectedProduct || !marketingAngle || !iterationRequest) {
            setError("Please fill out all required fields before generating.");
            return;
        }
        setError(null);
        setStatus('generating');
        setChatSession(null);

        const newUserMessage: ChatMessage = { type: 'user', content: iterationRequest };
        setChatHistory([newUserMessage]);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const productInfo = productList.find(p => p.name === selectedProduct) || { name: customProductName, description: "A product", features: [], benefits: [] };

            const imageGenKeywords = ['change', 'add', 'remove', 'replace', 'make', 'generate', 'show', 'give', 'create', 'design', 'concept', 'variation', 'palette', 'style', 'background', 'visual'];
            const isImageGenRequest = adType === 'static' && imageGenKeywords.some(keyword => iterationRequest.toLowerCase().includes(keyword));
            
            if (isImageGenRequest) {
                // ... Image generation logic ...
                return;
            }
            
            // --- Build Knowledge Base Context ---
            let knowledgeContext = '';
            const generalContent = generalKnowledgeFiles
                .map(file => knowledgeFileContents.get(file.path))
                .filter(Boolean)
                .join('\n\n');

            if (generalContent) {
                knowledgeContext += `--- GENERAL KNOWLEDGE START ---\n${generalContent}\n--- GENERAL KNOWLEDGE END ---\n\n`;
            }

            const productData = productList.find(p => p.name === selectedProduct);
            if (productData && productData.knowledgeFiles) {
                const productContent = productData.knowledgeFiles
                    .map(file => knowledgeFileContents.get(file.path))
                    .filter(Boolean)
                    .join('\n\n');
                if (productContent) {
                     knowledgeContext += `--- PRODUCT-SPECIFIC KNOWLEDGE FOR ${productData.name} START ---\n${productContent}\n--- PRODUCT-SPECIFIC KNOWLEDGE FOR ${productData.name} END ---\n\n`;
                }
            }


            // --- Text Generation ---
            const systemInstruction = `You are an expert performance marketing creative strategist and a multi-lingual video/image analyst. Your goal is to provide actionable, creative ideas for A/B testing ads based on the user's input, creative assets, and provided knowledge base.`;
            let promptContext = `**Ad Type:** ${adType}\n**Marketing Angle:** ${marketingAngle}`;
            if (knowledgeContext) {
                 promptContext += `\n**Knowledge Base Context:**\n${knowledgeContext}`;
            }
            const creativeParts: any[] = [];
            let userRequestForPrompt = iterationRequest;
            
            if (adType === 'video') {
                // ... Video context building logic ...
            } else if (adType === 'static') {
                // ... Static context building logic ...
            }
            
            const finalPrompt = `${promptContext}\n**My Request:** ${userRequestForPrompt}`;

            const initialResponse = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [...creativeParts, { text: finalPrompt }] },
                config: { systemInstruction }
            });
            const aiResponseText = initialResponse.text;
            
            const chat = ai.chats.create({
                model: 'gemini-2.5-pro',
                config: { systemInstruction },
                history: [
                    { role: 'user', parts: [{ text: finalPrompt }] },
                    { role: 'model', parts: [{ text: aiResponseText }] }
                ]
            });
            setChatSession(chat);

            const aiResponse: ChatMessage = { type: 'assistant', content: aiResponseText };
            setChatHistory(prev => [...prev, aiResponse]);
            setStatus('ready');

        } catch (e: any) {
            console.error("Generation failed:", e);
            setError(`Generation failed: ${e.message}`);
            setChatHistory(prev => prev[prev.length - 1]?.type === 'user' ? prev.slice(0, -1) : prev);
            setStatus('idle');
        }
    }, [
        adFile, selectedProduct, marketingAngle, iterationRequest, setError, setStatus, setChatSession, setChatHistory,
        productList, customProductName, adType, negativePrompt, selection, referenceAdFile, numberOfIterations,
        iterationType, selectedText, selectedTextTranslation, transcription, detectedLanguage, generalKnowledgeFiles, knowledgeFileContents
    ]);

    const handleFollowUpMessage = useCallback(async (e: React.FormEvent, currentChatSession: Chat | null) => {
        e.preventDefault();
        if (!currentChatMessage.trim() || status === 'generating' || !currentChatSession) return;

        const messageToSend = currentChatMessage;
        setCurrentChatMessage('');
        setError(null);
        setStatus('generating');

        setChatHistory(prev => [...prev, { type: 'user', content: messageToSend }]);

        try {
            const response = await currentChatSession.sendMessage({ message: messageToSend });
            const aiResponse: ChatMessage = { type: 'assistant', content: response.text };
            setChatHistory(prev => [...prev, aiResponse]);
            setStatus('ready');
        } catch (e: any) {
            console.error("Follow-up failed:", e);
            setError(`Chat failed: ${e.message}`);
            setChatHistory(prev => prev.slice(0, -1));
            setStatus('idle');
        }
    }, [currentChatMessage, status, setError, setStatus, setChatHistory]);

    // Fix: Removed chatHistory and setChatHistory from the return value as they are now managed in the App component.
    return {
        chatSession,
        setChatSession,
        currentChatMessage,
        setCurrentChatMessage,
        handleStartGeneration,
        handleFollowUpMessage
    };
};

useGemini.translateText = async (text: string, signal: AbortSignal): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const prompt = `Translate the following text to English. Respond with only the translated text, without any introductory phrases.\n\nText: "${text}"`;
    // Fix: The generateContent method expects only one argument. The AbortSignal is not supported in this call signature.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
    });
    return response.text.trim();
};

useGemini.suggestAngle = async (file: File, adType: AdType, setStatus: (s: AppStatus) => void): Promise<string | null> => {
    try {
        setStatus('parsing');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const base64 = await fileToBase64(file);
        const parts = [{ inlineData: { mimeType: file.type, data: base64 } }];
        const prompt = "Analyze and suggest a 1-3 word marketing angle (e.g., 'Problem/Solution'). Respond with ONLY the angle.";
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [...parts, { text: prompt }] } });
        setStatus('idle');
        return response.text.trim();
    } catch (e) {
        console.error("Angle suggestion failed:", e);
        setStatus('idle');
        return null;
    }
};

useGemini.transcribeVideo = async (videoFile: File): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const videoBase64 = await fileToBase64(videoFile);
        const videoPart = { inlineData: { mimeType: videoFile.type, data: videoBase64 } };
        const prompt = `You are an expert multi-lingual transcriptionist. Your task is to accurately transcribe the spoken audio in the provided video.
First, you MUST identify the primary language spoken.
Then, provide a verbatim transcription in that original language.
If the original language is NOT English, you MUST also provide a high-quality, natural-sounding English translation.
Structure your response EXACTLY as follows, without any additional commentary:

LANGUAGE: [Detected Language Code, e.g., es-MX or en-US]

[Full transcription in original language]

---
ENGLISH TRANSLATION:
[Full English translation]

If the original language is English, omit the "ENGLISH TRANSLATION" section entirely.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [videoPart, { text: prompt }] } });
        return response.text;
    } catch (e) {
        console.error("Transcription failed:", e);
        return "Could not generate transcription.";
    }
};

useGemini.summarizeDocument = async (text: string): Promise<string> => {
    if (!text) return "No content to analyze.";
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const prompt = `You are a helpful AI assistant. Provide a comprehensive overview of the following document content. Focus on the key topics, main arguments, and important takeaways. Format your response using markdown for clarity.\n\nDOCUMENT CONTENT:\n"""\n${text.substring(0, 15000)}\n"""`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
        });
        return response.text;
    } catch (e) {
        console.error("Summarization failed:", e);
        return "Could not generate a summary for this document.";
    }
};

useGemini.summarizeProductKnowledge = async (productName: string, knowledgeText: string): Promise<string> => {
    if (!knowledgeText) return "";
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const prompt = `Based on the following document(s) for the product "${productName}", extract 2-3 of the most critical points that are essential for creating marketing ads. Present them as a short, concise bulleted list. Respond ONLY with the bulleted list.\n\nKNOWLEDGE CONTENT:\n"""\n${knowledgeText.substring(0, 15000)}\n"""`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
        });
        return response.text;
    } catch (e) {
        console.error("Product knowledge summarization failed:", e);
        return "Could not summarize product knowledge.";
    }
};
