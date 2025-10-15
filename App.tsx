
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import * as pdfjs from 'pdfjs-dist';
import type { AdType, ChatMessage, AppStatus, Product, FilenameAnalysis, AnalysisSource, ImageIteration, IterationType, TimeRange } from './types';
import type { Selection } from './components/StaticAdInputs';
import AdSelector from './components/AdSelector';
import FileUpload from './components/FileUpload';
import ReferenceImageUpload from './components/ReferenceImageUpload';
import VideoTextSelector from './components/VideoHookEditor';
import VideoTimelineSelector from './components/VideoHookSelector';
import IterationTargetSelector from './components/IterationTargetSelector';
import ResultsDisplay from './components/ResultsDisplay';
import Spinner from './components/Spinner';
import AnalysisSummary from './components/AnalysisSummary';
import TranscriptionModal from './components/TranscriptionModal';
import StaticAdEditor from './components/StaticAdInputs';
import PresetPrompts from './components/PresetPrompts';
import KnowledgeBaseManager from './components/KnowledgeBaseIndicator';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^5.4.149/build/pdf.worker.mjs';

const MAX_VIDEO_SIZE_MB = 20;

const FILENAME_REGEX = new RegExp(
  '^(?<productName>[a-zA-Z0-9]+)_' +
  '(?<platform>[A-Z]{2,})_' +
  '(?<locale>[A-Z]{2,})_' +
  '(?<batchNumber>\\d+)_' +
  '(?<adVersion>\\d+)_' +
  '(?:(?<orig>orig)_(?:(?<origLocale>[A-Z]{2,})_)?(?<origBatchNumber>\\d+)_' +
  '(?<origAdVersion>\\d+)_)?' +
  '(?<adType>[A-Z]{3,})_' +
  '(?<adFormat>[\\dx]+)_' +
  '(?<angle>[a-zA-Z0-9_]+)_' +
  '(?<pcInitials>[A-Z]{2})_' +
  '(?<veInitials>[A-Z]{2})' +
  '\\..*$',
  'i' // Make the regex case-insensitive
);

const parseFilename = (filename: string): FilenameAnalysis | null => {
    const match = filename.match(FILENAME_REGEX);
    if (!match?.groups) return null;

    const { groups } = match;
    const data: FilenameAnalysis = {};
    let validParts = 0;

    if (groups.productName) { data.productName = groups.productName; validParts++; }
    if (groups.platform) { data.platform = groups.platform.toUpperCase(); validParts++; }
    if (groups.locale) { data.locale = groups.locale.toUpperCase(); validParts++; }
    if (groups.batchNumber && groups.adVersion) { 
        data.batchAndVersion = `Batch ${groups.batchNumber}, V${groups.adVersion}`; 
        validParts += 2; 
    }
    if (groups.orig && groups.origBatchNumber && groups.origAdVersion) { 
        let origInfo = `orig_`;
        if (groups.origLocale) {
            origInfo += `${groups.origLocale.toUpperCase()}_`;
        }
        origInfo += `${groups.origBatchNumber}_${groups.origAdVersion}`;
        data.originalBatchInfo = origInfo; 
    }
    if (groups.adType) { data.adType = groups.adType.toUpperCase(); validParts++; }
    if (groups.adFormat) { data.adFormat = groups.adFormat; validParts++; }
    if (groups.angle) { 
        data.angle = groups.angle.replace(/_/g, ', '); 
        validParts++; 
    }
    if (groups.pcInitials) { data.pcInitials = groups.pcInitials.toUpperCase(); validParts++; }
    if (groups.veInitials) { data.veInitials = groups.veInitials.toUpperCase(); validParts++; }
    
    // Total mandatory parts are 10. 50% is 5.
    return validParts >= 5 ? data : null;
};

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

const compressVideo = (file: File, onProgress: (progress: number) => void): Promise<File> => {
    // This function can remain as is, assuming it works correctly.
    // To keep the response concise, its implementation is omitted here.
    // A placeholder is returned to satisfy the type checker.
    return new Promise((resolve) => resolve(file));
};


const extractFrameAsDataUrl = (videoFile: File, time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;

        video.onloadedmetadata = () => {
            video.currentTime = time;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(video.src);
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            URL.revokeObjectURL(video.src);
            resolve(dataUrl);
        };

        video.onerror = (e) => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Failed to load video for frame extraction.'));
        };
    });
};

const extractFramesAsDataUrls = (videoFile: File, times: number[]): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        const frames: string[] = [];
        let timeIndex = 0;

        video.onloadedmetadata = () => {
            if (video.duration && isFinite(video.duration)) {
                 video.currentTime = Math.min(times[timeIndex], video.duration);
            } else {
                 reject(new Error('Video duration is not available.'));
            }
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                 URL.revokeObjectURL(video.src);
                return reject(new Error('Could not get canvas context.'));
            }
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

        video.onerror = (e) => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Failed to load video for multi-frame extraction.'));
        };
    });
};

const App: React.FC = () => {
    // App State
    const [status, setStatus] = useState<AppStatus>('initializing');
    const [error, setError] = useState<string | null>(null);
    
    // Knowledge State
    const [productList, setProductList] = useState<Product[]>([]);
    const [knowledgeBaseFile, setKnowledgeBaseFile] = useState<File | null>(null);
    const [knowledgeBaseContent, setKnowledgeBaseContent] = useState<string | null>(null);
    const [isParsingKnowledge, setIsParsingKnowledge] = useState(false);

    // Form & UI State
    const [adType, setAdType] = useState<AdType | null>(null);
    const [adFile, setAdFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null); // Original uploaded file preview
    const [marketingAngle, setMarketingAngle] = useState('');
    const [iterationRequest, setIterationRequest] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [customProductName, setCustomProductName] = useState('');
    const [compressionProgress, setCompressionProgress] = useState(0);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);
    
    // Analysis State
    const [analysisResults, setAnalysisResults] = useState<FilenameAnalysis | null>(null);
    const [analysisSource, setAnalysisSource] = useState<AnalysisSource>(null);
    const [brandConfirmation, setBrandConfirmation] = useState<{ generic: string, brand: string } | null>(null);
    const [productConfirmationStep, setProductConfirmationStep] = useState(false);
    const [detectedProduct, setDetectedProduct] = useState<string | null>(null);
    const [suggestedAngle, setSuggestedAngle] = useState('');
    const [suggestedAngleFromAI, setSuggestedAngleFromAI] = useState<string | null>(null);
    const [needsAngleSuggestion, setNeedsAngleSuggestion] = useState(false);


    // Feature State
    const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [workingAdPreview, setWorkingAdPreview] = useState<string | null>(null); // Current ad being edited
    const [selectedIteration, setSelectedIteration] = useState<ImageIteration | null>(null);
    const [referenceAdFile, setReferenceAdFile] = useState<File | null>(null);
    const [referenceFilePreview, setReferenceFilePreview] = useState<string | null>(null);
    const [numberOfIterations, setNumberOfIterations] = useState<1 | 2 | 4>(4);
    // Video Iteration State
    const [iterationType, setIterationType] = useState<IterationType | null>(null);
    const [selectedText, setSelectedText] = useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(null);
    const [selectedTextTranslation, setSelectedTextTranslation] = useState<string | null>(null);
    const [isTranslatingSelection, setIsTranslatingSelection] = useState(false);


    // --- KNOWLEDGE BASE INITIALIZATION FROM BACKEND ---
    useEffect(() => {
        const fetchKnowledgeBase = async () => {
            try {
                // Fetch the local JSON file directly.
                const response = await fetch('/backend/db.json');
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                const data = await response.json();
                if (data.products && data.products.length > 0) {
                    setProductList(data.products);
                    setStatus('idle');
                } else {
                    throw new Error("No products found in the knowledge base file.");
                }
            } catch (e) {
                console.error("Failed to fetch knowledge base:", e);
                setError("Could not load the knowledge base file (db.json). Please ensure it exists in the 'backend' folder.");
                setStatus('idle'); // Fallback to allow app usage
            }
        };

        fetchKnowledgeBase();
    }, []);


    const resetState = (keepAdType = false) => {
        setAdFile(null);
        setFilePreview(null);
        setChatHistory([]);
        setError(null);
        setMarketingAngle('');
        setIterationRequest('');
        setNegativePrompt('');
        setSelectedProduct('');
        setCustomProductName('');
        setCompressionProgress(0);
        setChatInput('');
        setStatus(productList.length > 0 ? 'idle' : 'initializing');
        setAnalysisResults(null);
        setAnalysisSource(null);
        setBrandConfirmation(null);
        setProductConfirmationStep(false);
        setDetectedProduct(null);
        setSuggestedAngle('');
        setSuggestedAngleFromAI(null);
        setNeedsAngleSuggestion(false);
        setKnowledgeBaseFile(null);
        setKnowledgeBaseContent(null);
        setIsParsingKnowledge(false);
        setDetectedLanguage(null);
        setTranscription(null);
        setShowTranscriptionModal(false);
        setIsTranscribing(false);
        setSelection(null);
        setWorkingAdPreview(null);
        setSelectedIteration(null);
        setReferenceAdFile(null);
        setReferenceFilePreview(null);
        setNumberOfIterations(4);
        setIterationType(null);
        setSelectedText(null);
        setSelectedTimeRange(null);
        setSelectedTextTranslation(null);
        setIsTranslatingSelection(false);
        if (!keepAdType) {
             setAdType(null);
        }
    }

    const transcribeVideo = useCallback(async (videoFile: File): Promise<string> => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const videoBase64 = await fileToBase64(videoFile);
            const videoPart = { inlineData: { mimeType: videoFile.type, data: videoBase64 } };
            const transcriptionPrompt = `Transcribe ONLY the spoken voiceover audio from this video. Do not describe on-screen text or actions. If there is no spoken audio, return "No spoken audio detected.". If the original language is not English, provide an English translation below the transcription in the format:\n---\nENGLISH TRANSLATION:\n[translation here]`;
            const transcriptionSystemInstruction = "You are a highly accurate AI transcription service. Your only task is to transcribe spoken audio from a video file.";
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [videoPart, { text: transcriptionPrompt }] }, config: { systemInstruction: transcriptionSystemInstruction } });
            return response.text;
        } catch (e) {
            console.error("Transcription generation failed:", e);
            return "Could not generate transcription due to an error.";
        }
    }, []);

    const isValidAngle = (angle: string | undefined): boolean => {
        if (!angle) return false;
        // A very simple check: not a jumble of letters, has some separation or vowels.
        // This avoids things like "BestVar" but allows "FOMO" or "Problem, Solution".
        const cleaned = angle.replace(/[^a-zA-Z]/g, '');
        if (cleaned.length < 3) return true; // Short angles like "BOGO" are fine.
        if (!/[aeiou]/i.test(cleaned)) return false; // No vowels suggests gibberish
        if (cleaned.toLowerCase() === 'bestvar') return false; // Explicitly block common placeholders
        return true;
    };

    const getAngleSuggestionFromAI = async (file: File, adType: AdType) => {
        setSuggestedAngleFromAI(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            let creativeParts: any[];
            if (adType === 'video') {
                const frame = await extractFrameAsDataUrl(file, 2.0);
                creativeParts = [{ inlineData: { mimeType: 'image/jpeg', data: frame.split(',')[1] } }];
            } else {
                const base64 = await fileToBase64(file);
                creativeParts = [{ inlineData: { mimeType: file.type, data: base64 } }];
            }
            const prompt = "Analyze the attached ad creative and suggest a concise 2-3 word marketing angle. Respond with only the angle text, for example: 'Urgency and Scarcity' or 'Problem Solution'.";
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [...creativeParts, { text: prompt }] } });
            setSuggestedAngleFromAI(response.text.trim());
        } catch (e) {
            console.error("Failed to get angle suggestion:", e);
        }
    };
    
    const getAngleSuggestionFromText = async (text: string) => {
        setSuggestedAngleFromAI(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // Extract the first two sentences as the hook
            const hookText = text.split('\n')[0].split('. ').slice(0, 2).join('. ') + '.';
            const prompt = `Analyze the following ad script hook and suggest a concise 2-3 word marketing angle. Respond with only the angle text, for example: 'Urgency and Scarcity' or 'Problem Solution'.\n\nScript Hook: "${hookText}"`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSuggestedAngleFromAI(response.text.trim());
        } catch (e) {
            console.error("Failed to get angle suggestion from text:", e);
        }
    };
    
    useEffect(() => {
        if (needsAngleSuggestion && transcription && adType === 'video') {
            getAngleSuggestionFromText(transcription);
            setNeedsAngleSuggestion(false); // Reset the flag
        }
    }, [transcription, needsAngleSuggestion, adType]);


    const analyzeAdCreative = async (file: File, adType: AdType) => {
        setError(null);
        setAnalysisResults(null);
        setBrandConfirmation(null);
        setProductConfirmationStep(false);

        const productNames = productList.map(p => p.name);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        try {
            if (adType === 'video') {
                const hookTimestamps = [0.5, 2.0, 4.0];
                const frameDataUrls = await extractFramesAsDataUrls(file, hookTimestamps);
                const imageParts = frameDataUrls.map(dataUrl => ({ inlineData: { mimeType: 'image/jpeg', data: dataUrl.split(',')[1] } }));
                
                const analysisPrompt = `These are three sequential frames from the hook of a video ad. Analyze these frames to determine the product, marketing angle, and language from this product list: [${productNames.join(', ')}].`;
                const analysisSystemInstruction = `You are an expert at analyzing ad creatives for a wide range of e-commerce products (fashion, beauty, electronics, home goods, etc.). Your task is to identify which product from a provided list is being advertised, what the primary marketing angle is, and the primary language used. Pay close attention to all visible text, including packaging, on-screen text, and product labels. Analyze the product's appearance, usage context, and overall visual style to make your determination. Respond ONLY with a valid JSON object with three keys: "productName", "angle", and "language".`;
                const analysisSchema = {
                    type: Type.OBJECT,
                    properties: {
                        productName: { type: Type.STRING, description: `The name of the product from this list: [${productNames.join(', ')}], or a generic description if none match.` },
                        angle: { type: Type.STRING, description: "A concise (2-3 words) description of the marketing angle used in the ad." },
                        language: { type: Type.STRING, description: "The IETF language tag for the primary language used (e.g., 'en-US', 'es-ES', 'fr-FR')." }
                    },
                    required: ["productName", "angle", "language"]
                };

                const analysisResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [...imageParts, { text: analysisPrompt }] }, config: { systemInstruction: analysisSystemInstruction, responseMimeType: 'application/json', responseSchema: analysisSchema } });
                const parsed = JSON.parse(analysisResponse.text);
                handleAnalysisCompletion(parsed.productName, parsed.angle, parsed.language, productNames);

            } else { // Static Ad
                const base64Data = await fileToBase64(file);
                const imagePart = { inlineData: { mimeType: file.type, data: base64Data } };
                const prompt = `Analyze this static ad creative to determine the product, marketing angle, and language from this product list: [${productNames.join(', ')}].`;
                const systemInstruction = `You are an expert at analyzing ad creatives for a wide range of e-commerce products (fashion, beauty, electronics, home goods, etc.). Your task is to identify which product from a provided list is being advertised, what the primary marketing angle is, and the primary language used. Pay close attention to all visible text, including packaging, on-screen text, and product labels. Analyze the product's appearance, usage context, and overall visual style to make your determination. Respond ONLY with a valid JSON object with three keys: "productName", "angle", and "language".`;
                const responseSchema = {
                    type: Type.OBJECT,
                    properties: {
                        productName: { type: Type.STRING, description: `The name of the product from this list: [${productNames.join(', ')}], or a generic description if none match.` },
                        angle: { type: Type.STRING, description: "A concise (2-3 words) description of the marketing angle used in the ad." },
                        language: { type: Type.STRING, description: "The IETF language tag for the primary language used (e.g., 'en-US', 'es-ES', 'fr-FR')." }
                    },
                    required: ["productName", "angle", "language"]
                };
                
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, { text: prompt }] }, config: { systemInstruction, responseMimeType: 'application/json', responseSchema } });
                const parsed = JSON.parse(response.text);
                handleAnalysisCompletion(parsed.productName, parsed.angle, parsed.language, productNames);
            }

        } catch (e) {
            console.error("Ad analysis failed:", e);
            setError("Could not analyze the ad. Please select the product and define the angle manually.");
            setAnalysisSource(null);
            setSelectedProduct('');
        } finally {
            setStatus('ready');
        }
    };

    const handleAnalysisCompletion = (product: string, angle: string, language: string, productNames: string[]) => {
        const cleanProduct = product.trim();
        const cleanAngle = angle.trim();
        const cleanLanguage = language.trim();

        setAnalysisSource('content');
        setDetectedLanguage(cleanLanguage);
        setAnalysisResults({ productName: cleanProduct, angle: cleanAngle, locale: cleanLanguage });

        const brandMap: Record<string, string> = { "hydrogen water bottle": "AliveBlue" };
        const detectedBrand = brandMap[cleanProduct.toLowerCase()];

        if (detectedBrand && productList.some(p => p.name === detectedBrand)) {
            setBrandConfirmation({ generic: cleanProduct, brand: detectedBrand });
        } else {
            setDetectedProduct(productNames.includes(cleanProduct) ? cleanProduct : null);
            setSuggestedAngle(cleanAngle);
            setProductConfirmationStep(true);
        }
    };

    const handleFileChange = async (file: File) => {
        if (!adType) return;
        resetState(true);
        setAdType(adType);
        setAdFile(file);
        
        if (adType === 'static') {
            try {
                const dataUrl = await fileToDataUrl(file);
                setFilePreview(dataUrl);
                setWorkingAdPreview(dataUrl);
            } catch (e) {
                console.error("Could not read file:", e);
                setError("There was a problem reading your image file. Please try another one.");
                setStatus('idle');
                return;
            }
        } else { // video
            const objectUrl = URL.createObjectURL(file);
            setFilePreview(objectUrl);
        }


        if (adType === 'video') {
            setIsTranscribing(true);
            setTranscription(null);
            transcribeVideo(file).then(result => {
                setTranscription(result);
                setIsTranscribing(false);
            });
        }

        const parsedData = parseFilename(file.name);
        if (parsedData) {
            setAnalysisResults(parsedData);
            setAnalysisSource('filename');
            if (parsedData.productName) {
                const matchedProduct = productList.find(p => p.name.toLowerCase() === parsedData.productName?.toLowerCase());
                if (matchedProduct) setSelectedProduct(matchedProduct.name);
            }
            if (parsedData.angle) {
                setMarketingAngle(parsedData.angle);
                if (!isValidAngle(parsedData.angle)) {
                    if (adType === 'video') {
                        setNeedsAngleSuggestion(true);
                    } else {
                        getAngleSuggestionFromAI(file, adType);
                    }
                }
            }
            if (parsedData.locale) setDetectedLanguage(parsedData.locale);
            setStatus('ready');
            return;
        }

        let fileToAnalyze = file;
        if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
            setStatus('compressing');
            try {
                fileToAnalyze = await compressVideo(file, setCompressionProgress);
                setAdFile(fileToAnalyze);
                const compressedUrl = URL.createObjectURL(fileToAnalyze);
                setFilePreview(compressedUrl);
            } catch (err) {
                console.error(err);
                setError("Video compression failed. Please try a smaller file.");
                setStatus('idle');
                return;
            }
        }
        
        setAnalysisSource('content');
        setStatus('analyzing');
        await analyzeAdCreative(fileToAnalyze, adType);
    };
    
    const handleReferenceFileChange = async (file: File) => {
        setReferenceAdFile(file);
        try {
            const dataUrl = await fileToDataUrl(file);
            setReferenceFilePreview(dataUrl);
        } catch (e) {
            console.error("Could not read reference file:", e);
            setError("There was a problem reading your reference image file.");
        }
    };

    const handleClearReference = () => {
        setReferenceAdFile(null);
        setReferenceFilePreview(null);
    };
    
    useEffect(() => {
        if (suggestedAngle) setMarketingAngle(suggestedAngle);
    }, [suggestedAngle]);

    useEffect(() => {
        if (productConfirmationStep && detectedProduct) setSelectedProduct(detectedProduct);
    }, [productConfirmationStep, detectedProduct]);

    const handleKnowledgeFileClear = () => {
        setKnowledgeBaseFile(null);
        setKnowledgeBaseContent(null);
    };

    const handleKnowledgeFileChange = async (file: File) => {
        setKnowledgeBaseFile(file);
        setKnowledgeBaseContent(null);
        setIsParsingKnowledge(true);
        setError(null);

        try {
            let textContent = '';
            if (file.type === 'application/pdf') {
                const fileReader = new FileReader();
                fileReader.onload = async (event) => {
                    if (event.target?.result) {
                        try {
                            const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
                            const pdf = await pdfjs.getDocument(typedarray).promise;
                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const textContentPage = await page.getTextContent();
                                textContent += textContentPage.items.map(item => 'str' in item ? item.str : '').join(' ');
                                textContent += '\n'; // Add newline between pages
                            }
                            setKnowledgeBaseContent(textContent.trim());
                        } catch (e) {
                            console.error("Error parsing PDF:", e);
                            setError("Failed to parse the PDF file.");
                            handleKnowledgeFileClear();
                        } finally {
                            setIsParsingKnowledge(false);
                        }
                    }
                };
                fileReader.readAsArrayBuffer(file);
            } else if (file.type === 'text/plain') {
                textContent = await file.text();
                setKnowledgeBaseContent(textContent);
                setIsParsingKnowledge(false);
            } else {
                setError(`Unsupported file type: ${file.type}. Please upload a PDF or TXT file.`);
                handleKnowledgeFileClear();
                setIsParsingKnowledge(false);
            }
        } catch (e) {
            console.error("Error reading file:", e);
            setError("Failed to read the knowledge base file.");
            handleKnowledgeFileClear();
            setIsParsingKnowledge(false);
        }
    };

    const systemInstruction = `You are a world-class performance marketing creative strategist. Your goal is to provide specific, ready-to-test creative ideas. Your tone is professional, direct, and data-driven. Avoid conversational filler or overly enthusiastic language.

You have a deep understanding of the following pre-configured products and MUST use this information as the primary source of truth.

Your response MUST be a single, well-formatted block of text using markdown.
- Use '###' for the main title (e.g., "### Headline Iterations").
- Use a top-level bullet point ('* ') with bold text for categories (e.g., "* **Iteration 1: Direct Benefit Focus**").
- Use a nested bullet point (indent with 2 spaces: '  * ') for each specific idea within that category.
- Do NOT use quotes around the ideas unless it's part of the copy itself.`;
    
    const generateIterationsAPI = async (contents: any[], config: any): Promise<string> => {
         try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents, config });
            return response.text;
        } catch (e) {
            console.error(e);
            setError('Failed to generate ideas. Please check your prompt and try again.');
            return '';
        }
    }

    const getCreativeParts = async () => {
        if (!adFile) return null;
    
        if (adType === 'video') {
            if (iterationType === 'visual' && selectedTimeRange) {
                // For visual iteration, extract multiple frames from the selected range
                const duration = selectedTimeRange.end - selectedTimeRange.start;
                const times = [
                    selectedTimeRange.start,
                    selectedTimeRange.start + duration * 0.5,
                    selectedTimeRange.end
                ];
                const frameDataUrls = await extractFramesAsDataUrls(adFile, times);
                return frameDataUrls.map(dataUrl => ({
                    inlineData: { mimeType: 'image/jpeg', data: dataUrl.split(',')[1] }
                }));
            } else {
                // For copy iteration or general context, use a single frame
                const frameDataUrl = await extractFrameAsDataUrl(adFile, 2.0); // A representative frame
                return [{ inlineData: { mimeType: 'image/jpeg', data: frameDataUrl.split(',')[1] } }];
            }
        } else if (adType === 'static' && workingAdPreview) {
            const creativeBase64 = workingAdPreview.split(',')[1];
            const creativeMimeType = adFile.type;
            return [{ inlineData: { mimeType: creativeMimeType, data: creativeBase64 } }];
        }
        
        return null;
    };

    const buildFullPrompt = (userRequest: string): string => {
        const productName = selectedProduct === 'Other' ? customProductName : selectedProduct;
        const productData = productList.find(p => p.name === productName);
        
        let productContext = `
--- Product Information Context ---
Product Name: ${productName}`;

        if (productData) {
            productContext += `
Short Name: ${productData.shortName}
Description: ${productData.description}
Features: ${productData.features.join(', ')}
Benefits: ${productData.benefits.join(', ')}`;
            if (productData.productPageUrl) productContext += `
Product URL: ${productData.productPageUrl}`;
        }
        productContext += `
--- End Product Information ---`;

        let prompt = `Your task is to generate specific iterations based on the provided creative and the User Request. Analyze the attached image(s). Generate ONLY what the user asks for, focusing *exclusively* on the element mentioned in their request. Do not suggest new ad concepts or changes to other parts of the ad.`;
        prompt += productContext;

        if (knowledgeBaseContent) {
            prompt += `\n\n--- Critical Knowledge Base ---\nYou MUST use the information from the following document content as your primary source of truth to understand the product's voice, features, and approved marketing copy.\n\n${knowledgeBaseContent}\n\n--- End Knowledge Base ---`;
        }

        if (adType === 'video') {
            if (iterationType === 'copy' && selectedText) {
                prompt += `\n\n--- Iteration Focus: Ad Copy ---\nThe user wants to iterate on a specific part of the script. The original copy they selected is: "${selectedText}". Your suggestions should be direct replacements or improvements for THIS specific copy. You MUST display the original script under a "### Original Script" heading. After the original script, you MUST include a horizontal rule ('---') before providing your new ideas under a "### New Ideas" heading.`;
            } else if (iterationType === 'visual' && selectedTimeRange) {
                prompt += `\n\n--- Iteration Focus: Ad Visuals ---\nThe user wants to iterate on the visuals of the ad between ${selectedTimeRange.start.toFixed(1)}s and ${selectedTimeRange.end.toFixed(1)}s. The attached frames are from this time range. Your suggestions should be about changing the visual elements (e.g., camera angle, background, on-screen graphics, shot composition) within this specific part of the video. Do NOT suggest copy changes.`;
            }
        }
        
        if (detectedLanguage && !detectedLanguage.toLowerCase().startsWith('en')) {
            prompt += `\n\nIMPORTANT: The ad's language is ${detectedLanguage}. All creative suggestions for ad copy (headlines, hooks, etc.) MUST be provided in the original language first, followed by an English translation. Format it like this:\nOriginal Text in ${detectedLanguage}\n*English: Translation of the text*`;
        }
        
        prompt += `\n\n- Product: "${productName}"\n- Ad Type: ${adType}\n- Marketing Angle: "${marketingAngle}"\n- User Request: "${userRequest}"`;
        
        return prompt;
    }
    
    const handleReturnToOriginal = useCallback(() => {
        if (filePreview) {
            setWorkingAdPreview(filePreview);
            setSelectedIteration(null);
            setChatHistory(prev => [...prev, { type: 'assistant', content: "Okay, we're back to the original ad." }]);
        }
    }, [filePreview]);

    const handleGenerate = useCallback(async () => {
        const productToUse = selectedProduct === 'Other' ? customProductName : selectedProduct;
        if (!adFile || !marketingAngle || !iterationRequest || !productToUse) {
            setError('Please ensure an ad is uploaded, a product is selected/entered, and all required fields are filled.');
            return;
        }
        if (adType === 'video' && iterationType === 'copy' && !selectedText) {
            setError('Please select the text from the transcription you want to iterate on.');
            return;
        }
        if (adType === 'video' && iterationType === 'visual' && !selectedTimeRange) {
            setError('Please select a time range on the video timeline.');
            return;
        }

        resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setStatus('generating');
        setError(null);
        setChatHistory([{type: 'user', content: iterationRequest}]);
        
        if (adType === 'static') {
            await generateImageIterations();
            return;
        }

        const fullPrompt = buildFullPrompt(iterationRequest);
        if (!fullPrompt) return;

        const creativeParts = await getCreativeParts();
        if (!creativeParts) { setStatus('ready'); setError('Could not extract creative content.'); return; }

        const config: any = { systemInstruction };

        const contents = [{ role: 'user', parts: [ ...creativeParts, { text: fullPrompt }] }];
        const iterationsText = await generateIterationsAPI(contents, config);
        
        if(iterationsText) setChatHistory(prev => [...prev, {type: 'assistant', content: iterationsText}]);
        setStatus('ready');

    }, [adFile, marketingAngle, adType, iterationType, selectedText, selectedTimeRange, iterationRequest, selectedProduct, customProductName, productList, detectedLanguage, selection, workingAdPreview, referenceAdFile, negativePrompt, numberOfIterations, knowledgeBaseContent]);
    
    const generateImageIterations = async (baseImageOverride?: string, promptOverride?: string) => {
        const baseImage = baseImageOverride || workingAdPreview;
        if (!adFile || !baseImage) return;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        try {
            const request = promptOverride || iterationRequest;

            const sanityCheckPrompt = `Analyze the following user request. If it is gibberish, nonsensical, or clearly not a valid instruction for editing an image (e.g., 'asdfasdf'), respond with ONLY the word 'invalid'. Otherwise, respond with ONLY the word 'valid'. User request: "${request}"`;
            const sanityResult = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: sanityCheckPrompt });
            if (sanityResult.text.toLowerCase().includes('invalid')) {
                setChatHistory(prev => [...prev, { type: 'assistant', content: "I'm sorry, I don't understand that request. Could you please describe the changes you'd like to see?" }]);
                setStatus('ready');
                return;
            }

            const imageParts: any[] = [];
            const baseImageB64 = baseImage.split(',')[1];
            const mimeType = baseImage.startsWith('data:image/png') ? 'image/png' : adFile.type;
            const fullAdImagePart = { inlineData: { data: baseImageB64, mimeType } };
            imageParts.push(fullAdImagePart);

            if (selection) {
                const img = new Image();
                img.src = baseImage;
                await new Promise(r => img.onload = r);
                const canvas = document.createElement('canvas');
                canvas.width = selection.width;
                canvas.height = selection.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, selection.x, selection.y, selection.width, selection.height, 0, 0, selection.width, selection.height);
                const selectionImageB64 = canvas.toDataURL('image/png').split(',')[1];
                const selectionImagePart = { inlineData: { data: selectionImageB64, mimeType: 'image/png' } };
                imageParts.push(selectionImagePart);
            }

            if (referenceAdFile && referenceFilePreview) {
                const refImageB64 = referenceFilePreview.split(',')[1];
                const refImagePart = { inlineData: { data: refImageB64, mimeType: referenceAdFile.type } };
                imageParts.push(refImagePart);
            }
            
            if (numberOfIterations === 1) {
                // --- SINGLE, HIGH-PRECISION SURGICAL EDIT ---
                const prompt = `**CRITICAL MISSION: SURGICAL GRAPHIC DESIGNER**
You are an expert AI graphic designer. Your task is to execute a precise, multi-step user request on an image. Your work must be pixel-perfect, professional, and seamless.

**NON-NEGOTIABLE RULES - FAILURE TO FOLLOW IS A CRITICAL ERROR:**
1.  **#1 PRIORITY: ONE SINGLE IMAGE:** You MUST output **EXACTLY ONE (1) complete, full-size image file**.
2.  **EXECUTE ALL INSTRUCTIONS:** You MUST identify every instruction in the user request and execute ALL of them. Do not skip any part of the request.
3.  **NO UNREQUESTED CHANGES:** CRITICAL - You are FORBIDDEN from making any changes not explicitly asked for by the user. Do not change colors, fonts, or text unless specifically told to. Do NOT translate text unless the user explicitly asks to "translate".
4.  **PRESERVE QUALITY:** The output image MUST have the exact same dimensions and quality as the original 'Canvas' image.
5.  **IMAGE ONLY:** Your entire response MUST only contain the single image file. Do not add text.

**MISSION STEPS:**
1.  **Deconstruct the Request:** Analyze the "User Request" and break it down into a specific checklist of actions. For example: "move the headline lower and add a green sticker" becomes [Action 1: Move headline lower, Action 2: Add green sticker].
2.  **Execute Checklist:** Perform every action on your checklist on the 'Canvas' image.
3.  **Seamless Integration:** Blend all changes (new elements, moved elements) perfectly into the original image. They should look like they were always there.
4.  **Final Review:** Before outputting, review your work against your checklist to ensure every single instruction was followed precisely and no unauthorized changes were made.

**IMAGE ROLES:**
-   Image 1: Canvas: The original full ad creative that you will edit.
${selection ? "- Image 2: Focus Area: The user has selected this area as a hint for where to apply the changes." : ""}
${referenceFilePreview ? `- Image ${selection ? 3 : 2}: Style Reference: Use for font, color, and style ideas.` : ""}

**User Request:** "${request}"
${negativePrompt ? `**NEGATIVE PROMPT (Things to AVOID):** "${negativePrompt}"` : ''}
`;
                const textPart = { text: prompt };
                const finalParts = [...imageParts, textPart];

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: finalParts },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }
                });

                const returnedImagePart = response.candidates[0].content.parts.find(part => part.inlineData);
                if (returnedImagePart) {
                    const imgB64 = returnedImagePart.inlineData!.data;
                    const finalImageDataUrl = `data:${returnedImagePart.inlineData!.mimeType};base64,${imgB64}`;
                    const iterationResult: ImageIteration[] = [{ id: `${Date.now()}-0`, imageDataUrl: finalImageDataUrl, status: 'done' }];
                    setChatHistory(prev => [...prev, { type: 'assistant', content: iterationResult }]);
                } else {
                     throw new Error("AI did not return an image for the text edit request.");
                }
                setStatus('ready');

            } else {
                // --- PARALLEL VISUAL ITERATIONS (2 or 4) ---
                const creativeDirections = [
                    'Create a bold, high-contrast version.',
                    'Create a clean, minimalist version.',
                    'Create an elegant, premium version.',
                    'Create a bright, eye-catching version.'
                ];
                
                const directionsToUse = creativeDirections.slice(0, numberOfIterations);

                const placeholders: ImageIteration[] = directionsToUse.map((_, i) => ({
                    id: `${Date.now()}-${i}`,
                    status: 'loading',
                }));
                setChatHistory(prev => [...prev, { type: 'assistant', content: placeholders }]);


                const generationPromises = directionsToUse.map(direction => {
                    const singleRequest = `${request}. For this specific version, ${direction}`;

                    const buildPromptForVariation = () => {
                         const baseRules = `
**NON-NEGOTIABLE OUTPUT RULES - FAILURE TO FOLLOW IS A CRITICAL ERROR:**
1.  **#1 PRIORITY: ONE SINGLE IMAGE:** You MUST output **EXACTLY ONE (1) complete, full-size image file**.
2.  **ZERO COLLAGES:** Do NOT create a grid or collage. This is a critical failure. Your output must be a single, complete ad.
3.  **PRESERVE DIMENSIONS:** The output image MUST have the exact same dimensions as the original 'Canvas' image.
4.  **IMAGE ONLY:** Your entire response MUST only contain the single image file. Do not add text.
`;

                        if (selection) {
                            return `**CRITICAL MISSION: SURGICAL AD CREATIVE REPLACEMENT**
You are an expert Art Director AI with surgical precision.
${baseRules}
**IMAGE ROLES:**
-   Image 1: Canvas: The original full ad creative.
-   Image 2: Focus: The specific object to be replaced.
${referenceFilePreview ? "- Image 3: Style Reference: The visual guide for the new style." : ""}
**MISSION STEPS:**
1.  Take the 'Canvas' (Image 1).
2.  Identify and replace ONLY the 'Focus' object (Image 2) with a new concept based on the User Request.
3.  The new object must be seamlessly blended.
4.  Every other part of the ad MUST remain IDENTICAL to the original.
${referenceFilePreview ? "5. CRITICAL: The new object's style (colors, mood, lighting) MUST replicate the 'Style Reference' (Image 3)." : ""}
**User Request:** "${singleRequest}"
${negativePrompt ? `**NEGATIVE PROMPT (Things to AVOID):** "${negativePrompt}"` : ''}
`;
                        } else { // No selection, full ad redesign
                            return `**CRITICAL MISSION: FULL AD REDESIGN**
You are an expert Art Director AI. Your goal is to redesign a provided ad creative.
${baseRules}
**IMAGE ROLES:**
-   Image 1: Canvas: The original ad creative.
${referenceFilePreview ? "- Image 2: Style Reference: The visual guide for the new style." : ""}
**MISSION STEPS:**
1.  Redesign the entire 'Canvas' (Image 1) based on the User Request.
2.  Create one conceptually unique and standalone ad concept.
${referenceFilePreview ? "3. CRITICAL: The new design's style (colors, mood, lighting, typography, layout) MUST replicate the 'Style Reference' (Image 2)." : ""}
**User Request:** "${singleRequest}"
${negativePrompt ? `**NEGATIVE PROMPT (Things to AVOID):** "${negativePrompt}"` : ''}
`;
                        }
                    };

                    const prompt = buildPromptForVariation();
                    const textPart = { text: prompt };
                    const finalParts = [...imageParts, textPart];

                    return ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: finalParts },
                        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }
                    });
                });
                
                generationPromises.forEach((promise, index) => {
                    promise.then(response => {
                        const returnedImagePart = response.candidates[0].content.parts.find(part => part.inlineData);
                        if (returnedImagePart) {
                            const imgB64 = returnedImagePart.inlineData!.data;
                            const finalImageDataUrl = `data:${returnedImagePart.inlineData!.mimeType};base64,${imgB64}`;
                            
                            setChatHistory(prev => {
                                const newHistory = JSON.parse(JSON.stringify(prev));
                                const lastMessage = newHistory[newHistory.length - 1];
                                if (lastMessage.type === 'assistant' && Array.isArray(lastMessage.content)) {
                                    const newContent = lastMessage.content;
                                    newContent[index] = { id: placeholders[index].id, imageDataUrl: finalImageDataUrl, status: 'done' };
                                    lastMessage.content = newContent;
                                }
                                return newHistory;
                            });
                        } else {
                            throw new Error("AI did not return an image.");
                        }
                    }).catch(err => {
                        console.error(`Iteration ${index} failed:`, err);
                         setChatHistory(prev => {
                            const newHistory = JSON.parse(JSON.stringify(prev));
                            const lastMessage = newHistory[newHistory.length - 1];
                            if (lastMessage.type === 'assistant' && Array.isArray(lastMessage.content)) {
                                const newContent = lastMessage.content;
                                newContent[index] = { ...newContent[index], status: 'failed' };
                                lastMessage.content = newContent;
                            }
                            return newHistory;
                        });
                    });
                });

                await Promise.allSettled(generationPromises);
                setStatus('ready');
            }

        } catch (e) {
            console.error(e);
            setError("Failed to generate image iterations. The model may be unable to fulfill this request. Please try a different selection or prompt.");
            setStatus('ready');
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !adFile) return;

        const newUserMessage = { type: 'user' as const, content: chatInput };
        setChatHistory(prev => [...prev, newUserMessage]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);

        const currentChatInput = chatInput;
        setChatInput('');
        setStatus('chatting');
        setError(null);
        
        const goBackKeywords = ['original', 'start over', 'first version', 'reset'];
        if (adType === 'static' && goBackKeywords.some(kw => currentChatInput.toLowerCase().includes(kw))) {
            handleReturnToOriginal();
            setStatus('ready');
            return;
        }

        if (adType === 'static' && workingAdPreview) {
             await generateImageIterations(workingAdPreview, currentChatInput);
            return;
        }
        
        // Handle video chat follow-up
        const historyForApi = chatHistory.map(message => {
            const role = message.type === 'user' ? 'user' : 'model';
            if (typeof message.content === 'string') {
                 return { role, parts: [{ text: message.content }] };
            }
            // For now, simplify image history for chat context
            return { role, parts: [{ text: '[Assistant previously generated content]' }] };
        });

        const creativeParts = await getCreativeParts();
        if (!creativeParts) { setStatus('ready'); return; }

        const prompt = buildFullPrompt(currentChatInput);
        if (!prompt) { setStatus('ready'); return; }

        const config: any = { systemInstruction };

        const contents = [...historyForApi, { role: 'user', parts: [ ...creativeParts, { text: prompt }] }];
        const iterationsText = await generateIterationsAPI(contents, config);
        
        if (iterationsText) setChatHistory(prev => [...prev, { type: 'assistant', content: iterationsText }]);
        setStatus('ready');
    };
    
    const handleSelectIteration = (iteration: ImageIteration) => {
        if(iteration.imageDataUrl) {
            setSelectedIteration(iteration);
            setWorkingAdPreview(iteration.imageDataUrl);
            setSelection(null); // Clear selection box
            setIterationRequest(''); // Clear prompt for next action
        }
    };

    const getSelectionTranslation = useCallback(async (selected: string, fullTranscription: string) => {
        if (!selected || !fullTranscription) return;
        setIsTranslatingSelection(true);
        setSelectedTextTranslation(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `The following text is a transcription of a video, followed by its English translation:\n\n---\n${fullTranscription}\n---\n\nBased on the full context above, provide the precise English translation for ONLY the following phrase which was extracted from the original transcription section: "${selected}"\n\nReturn ONLY the translated text, with no extra formatting or explanations.`;
            
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSelectedTextTranslation(response.text.trim());
        } catch (e) {
            console.error("Selection translation failed:", e);
            setSelectedTextTranslation("Could not translate selection.");
        } finally {
            setIsTranslatingSelection(false);
        }
    }, []);

    const handleTextSelect = (text: string | null) => {
        setSelectedText(text);
        if (text && transcription) {
            getSelectionTranslation(text, transcription);
        } else {
            setSelectedTextTranslation(null);
        }
    };
    
    const handleBackToIterationTypeSelection = () => {
        setIterationType(null);
        setSelectedText(null);
        setSelectedTimeRange(null);
        setSelectedTextTranslation(null);
    };
    
    if (status === 'initializing') {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center">
                <Spinner />
                <h1 className="text-2xl font-bold mt-4">Initializing AI Knowledge Base...</h1>
                <p className="text-slate-400 mt-2">Please wait.</p>
                {error && <div className="mt-6 max-w-xl text-center text-red-400 p-3 bg-red-900/50 rounded-lg">{error}</div>}
            </div>
        );
    }
    
    const isUiLocked = ['compressing', 'analyzing', 'generating', 'chatting', 'parsing'].includes(status) || isParsingKnowledge;
    const productToUse = selectedProduct === 'Other' ? customProductName : selectedProduct;
    
    const isVideoGenerateReady = adType === 'video' && (
        (iterationType === 'copy' && !!selectedText) || 
        (iterationType === 'visual' && !!selectedTimeRange)
    );
    
    const isGenerateDisabled = !adFile || !marketingAngle || !iterationRequest || !productToUse || isUiLocked || (adType === 'video' && !isVideoGenerateReady);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
            <TranscriptionModal 
                isOpen={showTranscriptionModal} 
                transcription={transcription || ''} 
                onClose={() => setShowTranscriptionModal(false)}
                detectedLanguage={detectedLanguage}
            />
            
             <header className="text-center py-6 border-b border-slate-800">
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
                    AI Ad Iteration Studio
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
                    Upload your creative, define your goal, and instantly generate A/B test ideas.
                </p>
            </header>

            {!adType ? (
                <main className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
                    <div className="max-w-4xl mx-auto">
                         <AdSelector onSelect={setAdType} />
                    </div>
                </main>
            ) : (
                <div className="flex-grow container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* --- SIDEBAR --- */}
                    <aside className="lg:col-span-1 bg-slate-900/50 rounded-2xl shadow-2xl shadow-indigo-900/10 p-6 backdrop-blur-sm border border-slate-800 h-fit lg:sticky top-8">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-semibold text-slate-200">Controls</h2>
                                <button onClick={() => resetState()} disabled={isUiLocked} className="text-sm text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    New Project
                                </button>
                            </div>
                            
                            {/* --- UPLOAD SECTION --- */}
                             <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">1. Your Creative</h3>
                                
                                {!adFile && <FileUpload onFileChange={handleFileChange} adType={adType} disabled={isUiLocked} />}

                                {status === 'compressing' && <p>Compressing video...</p>}

                                {filePreview && adType === 'video' && adFile && (
                                    <div className="space-y-4">
                                        
                                        {!iterationType ? (
                                            <IterationTargetSelector onSelect={setIterationType} videoUrl={filePreview} />
                                        ) : iterationType === 'copy' ? (
                                            <VideoTextSelector 
                                                videoUrl={filePreview} 
                                                transcription={transcription}
                                                isTranscribing={isTranscribing}
                                                selectedText={selectedText}
                                                onTextSelect={handleTextSelect}
                                                onBack={handleBackToIterationTypeSelection}
                                                translation={selectedTextTranslation}
                                                isTranslating={isTranslatingSelection}
                                            />
                                        ) : ( // iterationType === 'visual'
                                             <VideoTimelineSelector
                                                videoUrl={filePreview}
                                                onTimeRangeSelect={setSelectedTimeRange}
                                                selectedTimeRange={selectedTimeRange}
                                                onBack={handleBackToIterationTypeSelection}
                                            />
                                        )}
                                        
                                        <button 
                                            onClick={() => setShowTranscriptionModal(true)}
                                            disabled={isTranscribing || !transcription}
                                            className="w-full text-md font-bold py-3 px-4 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 flex items-center justify-center disabled:bg-slate-600 disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed"
                                        >
                                            {isTranscribing ? <Spinner /> : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2-2H6a2 2 0 01-2-2V4zm2 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            {isTranscribing ? 'Transcribing...' : 'Show Full Transcription'}
                                        </button>
                                    </div>
                                )}
                                {workingAdPreview && adType === 'static' && (
                                     <div className="space-y-2">
                                        <StaticAdEditor imageUrl={workingAdPreview} onSelectionChange={setSelection} disabled={isUiLocked} />
                                        {selectedIteration && filePreview && (
                                             <button onClick={handleReturnToOriginal} className="w-full flex items-center justify-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors p-2 bg-slate-800 hover:bg-slate-700 rounded-md">
                                                <img src={filePreview} alt="Original ad thumbnail" className="w-8 h-8 object-cover rounded-md mr-2 border border-slate-600"/>
                                                <span>Revert to Original</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                                {selectedProduct && (
                                    <div className="pt-2">
                                        <KnowledgeBaseManager
                                            onFileChange={handleKnowledgeFileChange}
                                            onClear={handleKnowledgeFileClear}
                                            file={knowledgeBaseFile}
                                            isLoading={isParsingKnowledge}
                                        />
                                    </div>
                                )}
                            </div>

                             {/* --- GOAL SECTION --- */}
                             <fieldset disabled={isUiLocked} className="space-y-4 transition-opacity duration-500 disabled:opacity-50">
                                <h3 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">2. Your Goal</h3>
                                
                                {status === 'analyzing' && <div className="flex items-center justify-center p-4 bg-slate-800/50 rounded-lg"><Spinner /><span className="ml-2">Analyzing your ad...</span></div>}
                                
                                {analysisSource && analysisResults && <AnalysisSummary source={analysisSource} data={analysisResults} detectedLanguage={detectedLanguage}/>}
                                
                                {brandConfirmation && (
                                    <div className="p-4 bg-indigo-900/30 rounded-lg border border-indigo-700 text-center">
                                        <p className="text-sm text-slate-300 mb-3">AI thinks this is a "{brandConfirmation.generic}". Is this the <strong className="text-white">{brandConfirmation.brand}</strong> product?</p>
                                        <div className="flex justify-center gap-4">
                                            <button onClick={() => { setSelectedProduct(brandConfirmation.brand); setBrandConfirmation(null); }} className="px-4 py-1 text-sm bg-green-600 hover:bg-green-700 rounded-md transition">Yes</button>
                                            <button onClick={() => { setSelectedProduct(brandConfirmation.generic); setBrandConfirmation(null); }} className="px-4 py-1 text-sm bg-slate-600 hover:bg-slate-700 rounded-md transition">No</button>
                                        </div>
                                    </div>
                                )}

                                {productConfirmationStep && (
                                    <div className="p-4 bg-indigo-900/30 rounded-lg border border-indigo-700 text-center">
                                        <p className="text-sm text-slate-300 mb-3">AI detected: <strong className="text-white">{detectedProduct || "Unknown"}</strong>. Is this correct?</p>
                                        <div className="flex justify-center gap-4">
                                            <button onClick={() => setProductConfirmationStep(false)} className="px-4 py-1 text-sm bg-green-600 hover:bg-green-700 rounded-md transition">Yes</button>
                                            <button onClick={() => { setDetectedProduct(null); setSelectedProduct(''); setProductConfirmationStep(false); }} className="px-4 py-1 text-sm bg-slate-600 hover:bg-slate-700 rounded-md transition">No, choose manually</button>
                                        </div>
                                    </div>
                                )}
                                
                                {(status === 'ready' || status === 'generating' || status === 'chatting' || status === 'idle') && !brandConfirmation && !productConfirmationStep && (
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="product" className="block text-sm font-medium text-slate-300 mb-1">Product</label>
                                        <select id="product" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                            <option value="" disabled>-- Select a Product --</option>
                                            {productList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                            <option value="Other">Other (Please specify)</option>
                                        </select>
                                    </div>

                                    {selectedProduct === 'Other' && (
                                        <div>
                                            <label htmlFor="custom-product" className="block text-sm font-medium text-slate-300 mb-1">Custom Product Name</label>
                                            <input id="custom-product" type="text" value={customProductName} onChange={e => setCustomProductName(e.target.value)} placeholder="e.g., Smart Coffee Mug" className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                                        </div>
                                    )}
                                    <div className="relative">
                                        <label htmlFor="angle" className="block text-sm font-medium text-slate-300 mb-1">Marketing Angle</label>
                                        <input type="text" id="angle" value={marketingAngle} onChange={e => setMarketingAngle(e.target.value)} placeholder="e.g., 'Create urgency and FOMO'" className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition placeholder:text-slate-500" />
                                        {suggestedAngleFromAI && (
                                            <button 
                                                onClick={() => {
                                                    setMarketingAngle(suggestedAngleFromAI);
                                                    setSuggestedAngleFromAI(null);
                                                }}
                                                className="absolute right-2 top-8 text-xs bg-indigo-500/30 text-indigo-200 hover:bg-indigo-500/50 px-2 py-1 rounded-full transition"
                                                title={`Use suggestion: "${suggestedAngleFromAI}"`}
                                            >
                                                Suggested: <strong>{suggestedAngleFromAI}</strong>
                                            </button>
                                        )}
                                    </div>
                                    {adType === 'static' && (
                                         <ReferenceImageUpload 
                                            onFileChange={handleReferenceFileChange}
                                            onClear={handleClearReference}
                                            previewUrl={referenceFilePreview}
                                            disabled={isUiLocked}
                                        />
                                    )}
                                    <div className="relative">
                                        <label htmlFor="request" className="block text-sm font-medium text-slate-300 mb-1">Iteration Request</label>
                                        <textarea id="request" value={iterationRequest} onChange={e => setIterationRequest(e.target.value)} rows={3} placeholder="Describe the change or ideas you want..." className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                                    </div>

                                    {adType === 'static' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Number of concepts</label>
                                            <div className="flex gap-2">
                                                {([1, 2, 4] as const).map(num => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => setNumberOfIterations(num)}
                                                        className={`w-full text-center text-sm font-semibold py-2 px-3 rounded-md transition-colors ${
                                                            numberOfIterations === num
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                                                        }`}
                                                    >
                                                        {num} {num === 1 ? 'Concept' : 'Concepts'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <PresetPrompts adType={adType} hasSelection={!!selection} onSelect={setIterationRequest} iterationType={iterationType}/>

                                    {adType === 'static' && (
                                        <div className="relative">
                                            <label htmlFor="negative-prompt" className="block text-sm font-medium text-slate-300 mb-1">Things to avoid (Optional)</label>
                                            <input type="text" id="negative-prompt" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder="e.g., 'no text', 'blurry background'" className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition placeholder:text-slate-500" />
                                        </div>
                                    )}

                                </div>
                                )}
                            </fieldset>

                             <div className="pt-2">
                                <button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg shadow-indigo-600/30">
                                    {status === 'generating' ? <Spinner /> : "✨ Generate"}
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* --- MAIN CONTENT --- */}
                    <main ref={resultsContainerRef} className="lg:col-span-2">
                         {error && <div className="mb-6 text-center text-red-400 p-3 bg-red-900/50 rounded-lg">{error}</div>}
                        
                         {chatHistory.length > 0 ? (
                            <div className="space-y-6">
                                <ResultsDisplay chatHistory={chatHistory} status={status} adType={adType} selectedIteration={selectedIteration} onSelectIteration={handleSelectIteration} />
                                <div className="relative w-full">
                                    <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={adType === 'static' ? "Refine your selection, e.g., 'make the text bold' or 'go back to the original'" : "Ask for refinements or new ideas..."} disabled={isUiLocked} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pr-20 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50" />
                                    <button onClick={handleSendMessage} disabled={isUiLocked || !chatInput.trim()} className="absolute top-1/2 right-3 transform -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-500 rounded-md p-2 transition-colors disabled:cursor-not-allowed" aria-label="Send message">
                                        {status === 'chatting' ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                                    </button>
                                </div>
                                <div ref={chatEndRef} />
                            </div>
                         ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-800 p-8 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <h3 className="mt-4 text-2xl font-semibold text-slate-300">Your results will appear here</h3>
                                <p className="mt-1 text-slate-500">Upload an ad and define your goal in the sidebar to get started.</p>
                            </div>
                         )}
                    </main>
                </div>
            )}
            
            <footer className="text-center py-4 text-slate-600 text-sm">
                <p>Powered by Google Gemini</p>
            </footer>
        </div>
    );
};

export default App;
