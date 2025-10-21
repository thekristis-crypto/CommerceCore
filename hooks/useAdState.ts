import { useState } from 'react';
import { AdType, AppStatus, Product, FilenameAnalysis, AnalysisSource, ImageIteration, IterationType, TimeRange, TranscriptionData } from '../types';
import { Selection } from '../components/StaticAdInputs';

export const useAdState = () => {
    // App State
    const [status, setStatus] = useState<AppStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    
    // Form & UI State
    const [adType, setAdType] = useState<AdType | null>(null);
    const [adFile, setAdFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [marketingAngle, setMarketingAngle] = useState('');
    const [iterationRequest, setIterationRequest] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [customProductName, setCustomProductName] = useState('');
    
    // Analysis State
    const [analysisResults, setAnalysisResults] = useState<FilenameAnalysis | null>(null);
    const [analysisAttempted, setAnalysisAttempted] = useState(false);
    const [detectedProduct, setDetectedProduct] = useState<string | null>(null);
    const [suggestedAngle, setSuggestedAngle] = useState('');
    const [suggestedAngleFromAI, setSuggestedAngleFromAI] = useState<string | null>(null);
    const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);

    // Feature State
    const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
    const [transcription, setTranscription] = useState<TranscriptionData | null>(null);
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
    const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [workingAdPreview, setWorkingAdPreview] = useState<string | null>(null);
    const [selectedIteration, setSelectedIteration] = useState<ImageIteration | null>(null);
    const [referenceAdFile, setReferenceAdFile] = useState<File | null>(null);
    const [referenceFilePreview, setReferenceFilePreview] = useState<string | null>(null);
    const [numberOfIterations, setNumberOfIterations] = useState<1 | 2 | 4>(4);
    const [compressionProgress, setCompressionProgress] = useState(0);

    // Video Iteration State
    const [iterationType, setIterationType] = useState<IterationType | null>(null);
    const [selectedText, setSelectedText] = useState<string | null>(null);
    // FIX: Declare the missing 'selectedTimeRange' and 'setSelectedTimeRange' state variables.
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(null);
    const [selectedTextTimeRange, setSelectedTextTimeRange] = useState<TimeRange | null>(null);
    const [selectedTextTranslation, setSelectedTextTranslation] = useState<string | null>(null);
    const [isTranslatingSelection, setIsTranslatingSelection] = useState(false);

    const resetState = (keepAdType = false) => {
        setAdFile(null);
        setFilePreview(null);
        setError(null);
        setMarketingAngle('');
        setIterationRequest('');
        setNegativePrompt('');
        setSelectedProduct('');
        setCustomProductName('');
        setStatus('idle');
        setAnalysisResults(null);
        setAnalysisAttempted(false);
        setDetectedProduct(null);
        setSuggestedAngle('');
        setSuggestedAngleFromAI(null);
        setFileSizeWarning(null);
        setDetectedLanguage(null);
        setTranscription(null);
        setTranscriptionError(null);
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
        setSelectedTextTimeRange(null);
        setSelectedTextTranslation(null);
        setIsTranslatingSelection(false);
        setCompressionProgress(0);
        if (!keepAdType) {
            setAdType(null);
        }
    };

    return {
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
        selectedTimeRange, setSelectedTimeRange, selectedTextTimeRange, setSelectedTextTimeRange,
        selectedTextTranslation, setSelectedTextTranslation,
        isTranslatingSelection, setIsTranslatingSelection,
        compressionProgress, setCompressionProgress,
        resetState
    };
};
