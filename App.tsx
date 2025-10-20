import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import type { AdType, ChatMessage, AppStatus, Product, FilenameAnalysis, GeneralKnowledgeFile, ImageIteration } from './types';
import type { Selection } from './components/StaticAdInputs';
import { useAdState } from './hooks/useAdState';
import { useKnowledgeBase } from './hooks/useKnowledgeBase';
import { useGemini } from './hooks/useGemini';
import { compressVideo } from './utils/videoCompressor';
import { analyzeFile, processFile } from './utils/fileAnalysis';

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
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import ProductKnowledgeSummary from './components/ProductKnowledgeSummary';
import CompressionModal from './components/CompressionModal';

const App: React.FC = () => {
    const {
        status, setStatus, error, setError,
        adType, setAdType, adFile, setAdFile, filePreview, setFilePreview,
        marketingAngle, setMarketingAngle, iterationRequest, setIterationRequest,
        negativePrompt, setNegativePrompt, selectedProduct, setSelectedProduct,
        customProductName, setCustomProductName,
        analysisResults, setAnalysisResults, analysisAttempted, setAnalysisAttempted,
        detectedProduct, setDetectedProduct, suggestedAngle, setSuggestedAngle,
        suggestedAngleFromAI, setSuggestedAngleFromAI,
        fileSizeWarning, setFileSizeWarning,
        detectedLanguage, setDetectedLanguage, transcription, setTranscription,
        transcriptionError, setTranscriptionError,
        showTranscriptionModal, setShowTranscriptionModal, isTranscribing, setIsTranscribing,
        selection, setSelection, workingAdPreview, setWorkingAdPreview,
        selectedIteration, setSelectedIteration, referenceAdFile, setReferenceAdFile,
        referenceFilePreview, setReferenceFilePreview, numberOfIterations, setNumberOfIterations,
        iterationType, setIterationType, selectedText, setSelectedText,
        selectedTimeRange, setSelectedTimeRange, selectedTextTranslation, setSelectedTextTranslation,
        isTranslatingSelection, setIsTranslatingSelection,
        compressionProgress, setCompressionProgress,
        resetState
    } = useAdState();

    const {
        productList,
        generalKnowledgeFiles,
        knowledgeFileContents,
        isParsingKnowledge,
        showKnowledgeModal,
        setShowKnowledgeModal,
        error: knowledgeBaseError,
    } = useKnowledgeBase();

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [productKnowledgeSummary, setProductKnowledgeSummary] = useState<string | null>(null);
    const [isSummarizingKnowledge, setIsSummarizingKnowledge] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isVerifyingApi, setIsVerifyingApi] = useState(true);

    // Verify API Key on load
    useEffect(() => {
        const verify = async () => {
            const result = await useGemini.verifyApiKey();
            if (!result.ok) {
                setApiError(result.message);
            }
            setIsVerifyingApi(false);
        };
        verify();
    }, []);

    const {
        chatSession,
        setChatSession,
        currentChatMessage,
        setCurrentChatMessage,
        handleStartGeneration,
        handleFollowUpMessage
    } = useGemini({
        adFile, adType, marketingAngle, iterationRequest, negativePrompt, selectedProduct, customProductName,
        selection, referenceAdFile, numberOfIterations, iterationType, selectedText, selectedTextTranslation,
        transcription, detectedLanguage, productList, generalKnowledgeFiles, knowledgeFileContents,
        setStatus, setError, setChatHistory
    });

    const resultsContainerRef = useRef<HTMLDivElement>(null);
    
    // Auto-scroll chat
    useEffect(() => {
        if (chatHistory.length > 0) {
            resultsContainerRef.current?.scrollTo({
                top: resultsContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [chatHistory]);

    // Translate selected text
    useEffect(() => {
        if (!selectedText || (detectedLanguage && detectedLanguage.toLowerCase().startsWith('en'))) {
            setSelectedTextTranslation(null);
            return;
        }

        const controller = new AbortController();
        const signal = controller.signal;

        useGemini.translateText(selectedText, signal)
            .then(translation => {
                if (!signal.aborted) {
                    setSelectedTextTranslation(translation);
                }
            })
            .catch(err => {
                if (!signal.aborted) {
                    console.error("Translation failed:", err);
                    setSelectedTextTranslation("Could not translate selection.");
                }
            })
            .finally(() => {
                if (!signal.aborted) {
                    setIsTranslatingSelection(false);
                }
            });

        setIsTranslatingSelection(true);

        return () => controller.abort();

    }, [selectedText, detectedLanguage, setSelectedTextTranslation, setIsTranslatingSelection]);

    // Generate product knowledge summary
    useEffect(() => {
        const generateSummary = async () => {
            if (!selectedProduct || selectedProduct === 'Other' || apiError) {
                setProductKnowledgeSummary(null);
                return;
            }

            const productData = productList.find(p => p.name === selectedProduct);
            const hasKnowledgeFiles = productData?.knowledgeFiles && productData.knowledgeFiles.length > 0;
            
            if (hasKnowledgeFiles && knowledgeFileContents.size > 0) {
                const relevantContent = productData.knowledgeFiles
                    .map(file => knowledgeFileContents.get(file.path))
                    .filter(Boolean)
                    .join('\n\n');

                if (relevantContent) {
                    setIsSummarizingKnowledge(true);
                    setProductKnowledgeSummary(null);
                    try {
                        const summary = await useGemini.summarizeProductKnowledge(productData.name, relevantContent);
                        setProductKnowledgeSummary(summary);
                    } catch (err) {
                        console.error("Failed to summarize product knowledge:", err);
                        setProductKnowledgeSummary(null);
                    } finally {
                        setIsSummarizingKnowledge(false);
                    }
                } else {
                    setProductKnowledgeSummary(null);
                }
            } else {
                setProductKnowledgeSummary(null);
            }
        };

        generateSummary();
    }, [selectedProduct, knowledgeFileContents, productList, apiError]);

    const processFileForApp = useCallback(async (file: File) => {
        resetState(true);
        setAdFile(file);
        processFile(file, (url) => {
            setFilePreview(url);
            setWorkingAdPreview(url);
        }, setStatus, setError);

        if (apiError) {
            setError("Cannot perform AI analysis because the API key is not configured correctly.");
            return;
        }
        
        setAnalysisAttempted(true);
        const { analysis, product, angle } = analyzeFile(file, productList);
        
        if (analysis) {
            setAnalysisResults(analysis);
            if (product) {
                setSelectedProduct(product.name);
                setDetectedProduct(product.name);
            }
            if (angle) {
                setMarketingAngle(angle);
                setSuggestedAngle(angle);
            } else {
                useGemini.suggestAngle(file, adType as AdType, setStatus).then(setSuggestedAngleFromAI);
            }
        } else {
            setAnalysisResults(null);
            useGemini.suggestAngle(file, adType as AdType, setStatus).then(setSuggestedAngleFromAI);
        }

        if (adType === 'video' && !transcription && !isTranscribing) {
            setIsTranscribing(true);
            setError(null);
            setTranscriptionError(null);

            const MAX_VIDEO_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
            if (file.size > MAX_VIDEO_SIZE_BYTES) {
                 setFileSizeWarning(`Warning: This video is >15MB. It may fail to transcribe on the deployed app due to server limits.`);
            }

            useGemini.transcribeVideo(file).then(text => {
                setTranscription(text);
                const langMatch = text.match(/LANGUAGE: (.*)/);
                if (langMatch && langMatch[1]) {
                    setDetectedLanguage(langMatch[1]);
                }
            }).catch((err: Error) => {
                console.error("Detailed transcription error:", err);
                setTranscriptionError(`Transcription failed: ${err.message}. This could be due to file size limits or an unsupported format.`);
                setTranscription(null);
            }).finally(() => setIsTranscribing(false));
        }
    }, [apiError, adType, isTranscribing, productList, transcription, resetState, setAdFile, setFilePreview, setWorkingAdPreview, setStatus, setError, setAnalysisResults, setAnalysisAttempted, setSelectedProduct, setDetectedProduct, setMarketingAngle, setSuggestedAngle, setSuggestedAngleFromAI, setIsTranscribing, setTranscriptionError, setFileSizeWarning, setTranscription, setDetectedLanguage]);


    const handleFileChange = async (file: File) => {
        const COMPRESSION_THRESHOLD = 25 * 1024 * 1024; // 25MB

        if (adType === 'video' && file.size > COMPRESSION_THRESHOLD) {
            setStatus('compressing');
            setCompressionProgress(0);
            try {
                const compressedFile = await compressVideo(file, (progress) => {
                    setCompressionProgress(progress);
                });
                await processFileForApp(compressedFile);
            } catch (err) {
                console.error("Compression failed:", err);
                setError(`Failed to compress video: ${(err as Error).message}. Please try a smaller file or a different format.`);
                resetState(true);
                setStatus('idle');
            }
        } else {
            await processFileForApp(file);
        }
    };

    const handleReferenceFileChange = (file: File) => {
        setReferenceAdFile(file);
        processFile(file, setReferenceFilePreview, setStatus, setError);
    };

    const handleSelectIteration = (iteration: ImageIteration) => {
        if (iteration.imageDataUrl) {
            setSelectedIteration(iteration);
            setWorkingAdPreview(iteration.imageDataUrl);
            fetch(iteration.imageDataUrl)
                .then(res => res.blob())
                .then(blob => {
                    const newFile = new File([blob], `iteration-${iteration.id}.png`, { type: 'image/png' });
                    setAdFile(newFile);
                });
            setSelection(null);
        }
    };

    const transcriptionButtonContent = () => {
        if (transcriptionError) {
            return <span className="text-sm text-center">{transcriptionError}</span>;
        }
        if (isTranscribing) {
            return <><Spinner /> Transcribing...</>;
        }
        if (transcription) {
            return 'Show Full Transcription';
        }
        return 'Transcription Unavailable';
    };

    const transcriptionButtonClasses = () => {
        let base = "w-full text-center py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2";
        if (transcriptionError) {
            return `${base} bg-red-900/50 text-red-300 cursor-default`;
        }
        if (isTranscribing || !transcription) {
            return `${base} bg-cyan-600/20 text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed`;
        }
        return `${base} bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/40`;
    };

    const mainContent = (
        <>
            <header className="w-full max-w-screen-2xl text-center py-6">
                <h1 className="text-3xl font-bold">AI Ad Iteration Studio</h1>
                <p className="text-slate-400 mt-2">Upload your creative, define your goal, and instantly generate A/B test ideas.</p>
            </header>
            <div className="w-full max-w-screen-2xl flex-grow flex gap-8 px-4 pb-8">
                <aside className="w-[450px] flex-shrink-0 bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 flex-shrink-0">
                        <h2 className="text-lg font-bold">Controls</h2>
                        <button onClick={() => resetState()} className="text-sm bg-slate-700/50 hover:bg-slate-700 px-3 py-1 rounded-md transition-colors">
                            New Project
                        </button>
                    </div>

                    <div className="flex-grow p-4 space-y-6 overflow-y-auto">
                        <section className="space-y-4">
                            <h3 className="font-semibold text-lg">1. Your Creative</h3>
                            {filePreview ? (
                                <div className="space-y-4">
                                    {adType === 'static' && workingAdPreview && (
                                        <StaticAdEditor imageUrl={workingAdPreview} onSelectionChange={setSelection} disabled={status === 'generating' || !!apiError} />
                                    )}
                                    {adType === 'video' && !iterationType && (
                                        <IterationTargetSelector onSelect={setIterationType} videoUrl={filePreview} />
                                    )}
                                    {adType === 'video' && iterationType === 'copy' && (
                                        <VideoTextSelector videoUrl={filePreview} transcription={transcription} isTranscribing={isTranscribing} selectedText={selectedText} onTextSelect={setSelectedText} onBack={() => { setIterationType(null); setSelectedText(null); setSelectedTextTranslation(null); }} translation={selectedTextTranslation} isTranslating={isTranslatingSelection} />
                                    )}
                                    {adType === 'video' && iterationType === 'visual' && (
                                        <VideoTimelineSelector videoUrl={filePreview} selectedTimeRange={selectedTimeRange} onTimeRangeSelect={setSelectedTimeRange} onBack={() => { setIterationType(null); setSelectedTimeRange(null); }} />
                                    )}
                                    <button onClick={() => { setAdFile(null); setFilePreview(null); resetState(true); }} className="w-full text-xs py-1 px-3 rounded-md bg-slate-700/50 hover:bg-slate-700">Change Creative</button>
                                    
                                    {analysisAttempted && <AnalysisSummary analysis={analysisResults} detectedLanguage={detectedLanguage} />}

                                    {fileSizeWarning && (
                                        <div className="p-3 bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-sm rounded-md">
                                            {fileSizeWarning}
                                        </div>
                                    )}

                                    { adType === 'video' && adFile && (
                                        <button 
                                            onClick={() => setShowTranscriptionModal(true)} 
                                            disabled={isTranscribing || !transcription || !!transcriptionError || !!apiError} 
                                            className={transcriptionButtonClasses()}
                                        >
                                            {transcriptionButtonContent()}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <FileUpload onFileChange={handleFileChange} adType={adType as AdType} disabled={status === 'compressing' || !!apiError} />
                            )}
                        </section>
                        
                        {adFile && (
                            <>
                                <section className="space-y-4">
                                    <h3 className="font-semibold text-lg">2. Your Goal</h3>
                                     <div>
                                        <label htmlFor="product" className="block text-sm font-medium text-slate-300 mb-1">Product</label>
                                        <select id="product" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} disabled={!!apiError} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50">
                                            <option value="">{detectedProduct ? `Detected: ${detectedProduct}`: `Select a product...`}</option>
                                            {productList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                            <option value="Other">Other...</option>
                                        </select>
                                    </div>
                                    {selectedProduct === 'Other' && (
                                        <input type="text" value={customProductName} onChange={e => setCustomProductName(e.target.value)} disabled={!!apiError} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50" placeholder="Enter Custom Product Name" />
                                    )}
                                    <ProductKnowledgeSummary
                                        productName={selectedProduct}
                                        summary={productKnowledgeSummary}
                                        isLoading={isSummarizingKnowledge}
                                    />
                                    <div>
                                        <label htmlFor="angle" className="block text-sm font-medium text-slate-300 mb-1">Marketing Angle</label>
                                        <div className="relative">
                                            <input type="text" id="angle" value={marketingAngle} onChange={e => setMarketingAngle(e.target.value)} disabled={!!apiError} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50" placeholder={suggestedAngle ? `e.g., ${suggestedAngle}`: "e.g., Problem/Solution, UGC"} />
                                            {suggestedAngleFromAI && marketingAngle !== suggestedAngleFromAI && (
                                                <button onClick={() => setMarketingAngle(suggestedAngleFromAI)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-indigo-600/50 hover:bg-indigo-600 px-2 py-1 rounded">
                                                    Use: {suggestedAngleFromAI}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                     <div>
                                        <label htmlFor="negativePrompt" className="block text-sm font-medium text-slate-300 mb-1">Things to Avoid (Optional)</label>
                                        <input type="text" id="negativePrompt" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} disabled={!!apiError} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50" placeholder="e.g., no red colors, don't use stock photos" />
                                    </div>
                                    {adType === 'static' && (
                                        <div className="space-y-4 pt-2">
                                            <ReferenceImageUpload onFileChange={handleReferenceFileChange} onClear={() => { setReferenceAdFile(null); setReferenceFilePreview(null); }} previewUrl={referenceFilePreview} disabled={status === 'generating' || !!apiError} />
                                            <div>
                                                <label htmlFor="numIterations" className="block text-sm font-medium text-slate-300 mb-1">Number of Variations</label>
                                                 <select id="numIterations" value={numberOfIterations} onChange={e => setNumberOfIterations(Number(e.target.value) as 1 | 2 | 4)} disabled={!!apiError} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50">
                                                    <option value="1">1 Variation</option>
                                                    <option value="2">2 Variations</option>
                                                    <option value="4">4 Variations</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label htmlFor="iterationRequest" className="block text-sm font-medium text-slate-300 mb-1">Iteration Request</label>
                                        <textarea id="iterationRequest" value={iterationRequest} onChange={(e) => setIterationRequest(e.target.value)} placeholder='e.g., "Generate 5 alternative hooks for this copy"' className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none disabled:opacity-50" rows={4} disabled={status === 'generating' || !!apiError} />
                                    </div>
                                    <PresetPrompts adType={adType} hasSelection={!!selection} onSelect={(prompt) => setIterationRequest(prompt)} iterationType={iterationType} />
                                </section>
                            </>
                        )}
                    </div>
                    
                    <div className="p-4 border-t border-slate-800 flex-shrink-0">
                        <button onClick={() => handleStartGeneration()} disabled={!adFile || !selectedProduct || !marketingAngle || !iterationRequest || status === 'generating' || !!apiError} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
                            {status === 'generating' ? <Spinner /> : 'Generate'}
                        </button>
                    </div>
                </aside>

                <section className="flex-grow bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
                     {error && <div className="m-4 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex-shrink-0">{error}</div>}
                    
                    {chatHistory.length === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 p-8">
                             <svg className="w-16 h-16 mb-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 01-6.23-.693L4.2 15.3m15.6 0c1.626.408 3.11 1.465 3.976 2.88A9.065 9.065 0 0112 21a9.065 9.065 0 01-7.775-4.144c.866-1.415 2.35-2.472 3.976-2.88" />
                            </svg>
                            <h3 className="text-xl font-semibold mt-4 text-slate-400">Your results will appear here</h3>
                            <p className="max-w-xs mt-2">Upload an ad and define your goal in the sidebar to get started.</p>
                        </div>
                    ) : (
                        <div ref={resultsContainerRef} className="flex-grow p-6 overflow-y-auto">
                            <ResultsDisplay chatHistory={chatHistory} status={status} adType={adType} selectedIteration={selectedIteration} onSelectIteration={handleSelectIteration} />
                        </div>
                    )}
                    
                    {chatHistory.length > 0 && chatSession && (
                        <div className="p-4 border-t border-slate-800 flex-shrink-0">
                            <form onSubmit={(e) => handleFollowUpMessage(e)} className="flex items-center gap-3">
                                <input type="text" value={currentChatMessage} onChange={(e) => setCurrentChatMessage(e.target.value)} placeholder="Ask a follow-up question to refine the ideas..." className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50" disabled={status === 'generating' || !!apiError} aria-label="Chat input" />
                                <button type="submit" disabled={status === 'generating' || !currentChatMessage.trim() || !!apiError} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex-shrink-0" aria-label="Send message">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                </button>
                            </form>
                        </div>
                    )}
                </section>
            </div>
        </>
    );

    if (isVerifyingApi) {
         return (
             <div className="bg-slate-950 text-slate-200 font-sans min-h-screen flex flex-col items-center justify-center p-4">
                 <Spinner />
                 <p className="mt-4 text-slate-400">Verifying API Connection...</p>
             </div>
        )
    }

    if (!adType) {
        return (
             <div className="bg-slate-950 text-slate-200 font-sans min-h-screen flex flex-col items-center justify-center p-4">
                {apiError && <div className="absolute top-0 left-0 right-0 p-4 bg-red-900/80 border-b border-red-700 text-red-200 text-center text-sm font-semibold backdrop-blur-sm">{apiError}</div>}
                <header className="w-full max-w-screen-2xl text-center py-6 mb-8">
                    <h1 className="text-3xl font-bold">AI Ad Iteration Studio</h1>
                    <p className="text-slate-400 mt-2">Upload your creative, define your goal, and instantly generate A/B test ideas.</p>
                </header>
                <AdSelector onSelect={type => { resetState(); setAdType(type); }} onOpenKnowledgeBase={() => setShowKnowledgeModal(true)} />
                {knowledgeBaseError && <p className="mt-4 text-red-400 max-w-md text-center text-sm">{knowledgeBaseError}</p>}
                <KnowledgeBaseModal
                    isOpen={showKnowledgeModal}
                    onClose={() => setShowKnowledgeModal(false)}
                    generalFiles={generalKnowledgeFiles}
                    productList={productList}
                    isLoading={isParsingKnowledge}
                    knowledgeFileContents={knowledgeFileContents}
                />
             </div>
        )
    }

    return (
        <div className="bg-slate-950 text-slate-200 font-sans min-h-screen flex flex-col items-center">
            {apiError && <div className="sticky top-0 left-0 right-0 p-4 bg-red-900/80 border-b border-red-700 text-red-200 text-center text-sm font-semibold z-50 backdrop-blur-sm">{apiError}</div>}
            {status === 'compressing' && <CompressionModal progress={compressionProgress} />}
            {mainContent}
            <footer className="w-full text-center p-4 text-xs text-slate-600">
                Powered by Google Gemini
            </footer>
             {showTranscriptionModal && transcription && (
                <TranscriptionModal isOpen={showTranscriptionModal} onClose={() => setShowTranscriptionModal(false)} transcription={transcription} detectedLanguage={detectedLanguage} />
            )}
             <KnowledgeBaseModal isOpen={showKnowledgeModal} onClose={() => setShowKnowledgeModal(false)} generalFiles={generalKnowledgeFiles} productList={productList} isLoading={isParsingKnowledge} knowledgeFileContents={knowledgeFileContents} />
        </div>
    );
};

export default App;