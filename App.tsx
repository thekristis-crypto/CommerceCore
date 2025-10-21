import React, { useState, useEffect, useCallback, useRef } from 'react';

// Components
import AdSelector from './components/AdSelector';
import FileUpload from './components/FileUpload';
import AnalysisSummary from './components/AnalysisSummary';
import ProductKnowledgeSummary from './components/ProductKnowledgeSummary';
import VideoHookSelector from './components/VideoHookSelector';
import VideoHookEditor from './components/VideoHookEditor';
import IterationTargetSelector from './components/IterationTargetSelector';
import StaticAdInputs from './components/StaticAdInputs';
import ResultsDisplay from './components/ResultsDisplay';
import Spinner from './components/Spinner';
import PresetPrompts from './components/PresetPrompts';
import TranscriptionModal from './components/TranscriptionModal';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import CompressionModal from './components/CompressionModal';

// Hooks
import { useAdState } from './hooks/useAdState';
import { useGemini } from './hooks/useGemini';
import { useKnowledgeBase } from './hooks/useKnowledgeBase';

// Utils
import { analyzeFilename } from './utils/fileAnalysis';
import { compressVideo, cancelCompression } from './utils/videoCompressor';
import type { ChatMessage, AdType, ImageIteration } from './types';

// Constants
const MAX_FILE_SIZE_MB = 200;
const COMPRESSION_TARGET_MB = 100;
const TRANSCRIPTION_FILE_LIMIT_MB = 50;

function App() {
    const adState = useAdState();
    const {
        status, setStatus, error, setError,
        adType, setAdType, adFile, setAdFile, filePreview, setFilePreview,
        marketingAngle, setMarketingAngle, iterationRequest, setIterationRequest,
        selectedProduct, setSelectedProduct, customProductName, setCustomProductName,
        analysisResults, setAnalysisResults, detectedProduct, setDetectedProduct,
        suggestedAngleFromAI, setSuggestedAngleFromAI,
        transcription, setTranscription, isTranscribing, setIsTranscribing, showTranscriptionModal, setShowTranscriptionModal,
        selection, setSelection, workingAdPreview, setWorkingAdPreview, selectedIteration, setSelectedIteration,
        iterationType, setIterationType, selectedText, setSelectedText,
        selectedTimeRange, setSelectedTimeRange, selectedTextTimeRange, setSelectedTextTimeRange,
        selectedTextTranslation, setSelectedTextTranslation, isTranslatingSelection, setIsTranslatingSelection,
        compressionProgress, setCompressionProgress,
        resetState
    } = adState;
    
    const { productList, generalKnowledgeFiles, knowledgeFileContents, isParsingKnowledge, showKnowledgeModal, setShowKnowledgeModal } = useKnowledgeBase();
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    
    const geminiHook = useGemini({ ...adState, productList, generalKnowledgeFiles, knowledgeFileContents, setChatHistory });
    
    const translationAbortControllerRef = useRef<AbortController | null>(null);

    const handleFileChange = async (file: File) => {
        resetState(true);
        setStatus('analyzing');
        
        setAdFile(file);
        const objectUrl = URL.createObjectURL(file);
        setFilePreview(objectUrl);
        setWorkingAdPreview(objectUrl);

        const analysis = analyzeFilename(file.name);
        setAnalysisResults(analysis);
        if (analysis?.productName) {
            const matchedProduct = productList.find(p => p.name.toLowerCase() === analysis.productName!.toLowerCase());
            if(matchedProduct) {
                setSelectedProduct(matchedProduct.name);
                setDetectedProduct(matchedProduct.name);
            }
        }
        
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setStatus('compressing');
            try {
                const compressedFile = await compressVideo(file, COMPRESSION_TARGET_MB, setCompressionProgress);
                setAdFile(compressedFile);
                 if (adType === 'video' && compressedFile.size <= TRANSCRIPTION_FILE_LIMIT_MB * 1024 * 1024) {
                    await handleTranscription(compressedFile);
                }
            } catch (err: any) {
                setError(`Video compression failed: ${err.message}. Please try a smaller file.`);
                setStatus('idle');
                return;
            } finally {
                setCompressionProgress(0);
            }
        } else if (adType === 'video' && file.size <= TRANSCRIPTION_FILE_LIMIT_MB * 1024 * 1024) {
             await handleTranscription(file);
        }
        
        setStatus('idle'); // Temporarily idle while AI suggests an angle
        const aiAngle = await useGemini.suggestAngle(file, adType as AdType, setStatus);
        setSuggestedAngleFromAI(aiAngle);
    };
    
    const handleTranscription = async (file: File) => {
        setIsTranscribing(true);
        try {
            const data = await useGemini.transcribeVideo(file);
            setTranscription(data);
        } catch (e: any) {
             setError(`Transcription failed: ${e.message}`);
        } finally {
            setIsTranscribing(false);
        }
    };
    
     useEffect(() => {
        if (selectedText && transcription?.language && !/en/i.test(transcription.language)) {
            setIsTranslatingSelection(true);
            if (translationAbortControllerRef.current) {
                translationAbortControllerRef.current.abort();
            }
            const controller = new AbortController();
            translationAbortControllerRef.current = controller;
            
            useGemini.translateText(selectedText, controller.signal)
                .then(translation => setSelectedTextTranslation(translation))
                .catch(err => { if (err.name !== 'AbortError') console.error("Translation failed:", err); })
                .finally(() => setIsTranslatingSelection(false));
        } else {
             setSelectedTextTranslation(null);
        }
        
        return () => translationAbortControllerRef.current?.abort();
    }, [selectedText, transcription?.language, setSelectedTextTranslation, setIsTranslatingSelection]);

    const handleBackToTypeSelect = () => {
        resetState(false);
        setChatHistory([]);
    };

    const handleSelectIteration = (iteration: ImageIteration) => {
        setSelectedIteration(iteration);
        setWorkingAdPreview(iteration.imageDataUrl || null);
    };

    const isReadyForInput = adType && filePreview;
    
    const renderSidebar = () => {
        if (!isReadyForInput) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <h3 className="font-semibold text-slate-300">Upload an Ad</h3>
                    <p className="text-sm text-slate-500">Upload a video or static ad creative to begin the iteration process.</p>
                </div>
            );
        }
        
        return (
            <div className="p-4 space-y-4 overflow-y-auto">
                {adType === 'video' && (
                    <>
                        {iterationType === null && <IterationTargetSelector onSelect={setIterationType} videoUrl={filePreview!} />}
                        {iterationType === 'copy' && <VideoHookEditor videoUrl={filePreview!} transcription={transcription} isTranscribing={isTranscribing} selectedText={selectedText} onTextSelect={(text, timeRange) => { setSelectedText(text); setSelectedTextTimeRange(timeRange); }} onBack={() => setIterationType(null)} translation={selectedTextTranslation} isTranslating={isTranslatingSelection} />}
                        {iterationType === 'visual' && <VideoHookSelector videoUrl={filePreview!} onTimeRangeSelect={setSelectedTimeRange} selectedTimeRange={selectedTimeRange} onBack={() => setIterationType(null)} />}
                    </>
                )}
                {adType === 'static' && <StaticAdInputs imageUrl={workingAdPreview!} onSelectionChange={setSelection} disabled={status === 'generating' || status === 'chatting'} />}
                <AnalysisSummary analysis={analysisResults} detectedLanguage={transcription?.language ?? null} />
                
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">1. Select Product</label>
                    <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
                         <option value="" disabled>-- Select a product --</option>
                        {productList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        <option value="Other">Other...</option>
                    </select>
                    {selectedProduct === 'Other' && <input type="text" value={customProductName} onChange={e => setCustomProductName(e.target.value)} placeholder="Enter product name" className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm mt-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />}
                </div>

                <ProductKnowledgeSummary productName={selectedProduct} summary={null} isLoading={false} />
                
                <div className="space-y-2">
                     <label className="block text-sm font-medium text-slate-300">2. Define Marketing Angle</label>
                     <input type="text" value={marketingAngle} onChange={e => setMarketingAngle(e.target.value)} placeholder="e.g., Problem/Solution, Scarcity" className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                     {suggestedAngleFromAI && <button onClick={() => setMarketingAngle(suggestedAngleFromAI)} className="text-xs text-indigo-400 hover:underline mt-1">Use suggestion: "{suggestedAngleFromAI}"</button>}
                </div>
                 <div className="space-y-2">
                     <label className="block text-sm font-medium text-slate-300">3. Write Your Iteration Request</label>
                     <textarea value={iterationRequest} onChange={e => setIterationRequest(e.target.value)} rows={4} placeholder="e.g., Generate 5 alternative hooks..." className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"></textarea>
                </div>
                <PresetPrompts adType={adType} hasSelection={!!selection} onSelect={setIterationRequest} iterationType={iterationType} />
            </div>
        );
    };

    if (!adType) {
        return (
            <main className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-200">
                <AdSelector onSelect={setAdType} onOpenKnowledgeBase={() => setShowKnowledgeModal(true)} />
                <KnowledgeBaseModal isOpen={showKnowledgeModal} onClose={() => setShowKnowledgeModal(false)} generalFiles={generalKnowledgeFiles} productList={productList} isLoading={isParsingKnowledge} knowledgeFileContents={knowledgeFileContents} />
            </main>
        );
    }
    
    const canGenerate = selectedProduct && marketingAngle && iterationRequest;

    return (
        <div className="h-screen w-screen bg-slate-950 text-slate-300 flex flex-col">
            {status === 'compressing' && <CompressionModal progress={compressionProgress} onCancel={cancelCompression} />}
            {transcription && <TranscriptionModal isOpen={showTranscriptionModal} onClose={() => setShowTranscriptionModal(false)} transcriptionData={transcription} />}
            <KnowledgeBaseModal isOpen={showKnowledgeModal} onClose={() => setShowKnowledgeModal(false)} generalFiles={generalKnowledgeFiles} productList={productList} isLoading={isParsingKnowledge} knowledgeFileContents={knowledgeFileContents} />
            
            <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <button onClick={handleBackToTypeSelect} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                        &larr; Back
                    </button>
                    <h1 className="text-lg font-bold text-white">Ad Iteration Studio <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full capitalize">{adType} Ad</span></h1>
                </div>
                {isReadyForInput && (
                     <div className="flex items-center gap-2">
                        {adType === 'video' && transcription && <button onClick={() => setShowTranscriptionModal(true)} className="text-xs bg-slate-700/50 hover:bg-slate-700 py-1 px-3 rounded-md transition-colors">View Transcription</button>}
                        <button onClick={geminiHook.handleStartGeneration} disabled={!canGenerate || status === 'generating' || status === 'chatting'} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {(status === 'generating' || status === 'chatting') && <Spinner />}
                            Generate
                        </button>
                    </div>
                )}
            </header>
            
            <div className="flex flex-grow overflow-hidden">
                <aside className="w-[450px] flex-shrink-0 bg-slate-900/70 border-r border-slate-800 flex flex-col">
                    {!isReadyForInput && <div className="p-4"><FileUpload onFileChange={handleFileChange} adType={adType} disabled={status !== 'idle'}/></div>}
                    {renderSidebar()}
                </aside>

                <main className="flex-grow flex flex-col bg-slate-950/50">
                    {chatHistory.length === 0 && status !== 'generating' && (
                        <div className="flex-grow flex items-center justify-center text-center text-slate-600">
                           <p>Your creative iterations will appear here.</p>
                        </div>
                    )}
                    <ResultsDisplay chatHistory={chatHistory} status={status} adType={adType} selectedIteration={selectedIteration} onSelectIteration={handleSelectIteration} />
                     {chatHistory.length > 0 && (status === 'ready' || status === 'chatting') && (
                        <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900/50">
                            <form onSubmit={geminiHook.handleFollowUpMessage} className="flex gap-3">
                                <input
                                    type="text"
                                    value={geminiHook.currentChatMessage}
                                    onChange={e => geminiHook.setCurrentChatMessage(e.target.value)}
                                    placeholder="Ask a follow-up question..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    disabled={status === 'chatting'}
                                />
                                <button type="submit" disabled={status === 'chatting' || !geminiHook.currentChatMessage.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {status === 'chatting' && <Spinner />}
                                    Send
                                </button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;
