
import { useState } from 'react';
import { AdType, AppStatus, Product, FilenameAnalysis, AnalysisSource, ImageIteration, IterationType, TimeRange } from '../types';
import { Selection } from '../components/StaticAdInputs';

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
  'i'
);

const parseFilename = (filename: string): FilenameAnalysis | null => {
    const match = filename.match(FILENAME_REGEX);
    if (!match?.groups) return null;
    const { groups } = match;
    const data: FilenameAnalysis = {};
    if (groups.productName) data.productName = groups.productName;
    if (groups.platform) data.platform = groups.platform.toUpperCase();
    if (groups.locale) data.locale = groups.locale.toUpperCase();
    if (groups.batchNumber && groups.adVersion) data.batchAndVersion = `Batch ${groups.batchNumber}, V${groups.adVersion}`;
    if (groups.orig && groups.origBatchNumber && groups.origAdVersion) {
        data.originalBatchInfo = `orig_${groups.origLocale ? `${groups.origLocale.toUpperCase()}_` : ''}${groups.origBatchNumber}_${groups.origAdVersion}`;
    }
    if (groups.adType) data.adType = groups.adType.toUpperCase();
    if (groups.adFormat) data.adFormat = groups.adFormat;
    if (groups.angle) data.angle = groups.angle.replace(/_/g, ', ');
    if (groups.pcInitials) data.pcInitials = groups.pcInitials.toUpperCase();
    if (groups.veInitials) data.veInitials = groups.veInitials.toUpperCase();
    return Object.keys(data).length >= 5 ? data : null;
};

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

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
    const [analysisSource, setAnalysisSource] = useState<AnalysisSource>(null);
    const [detectedProduct, setDetectedProduct] = useState<string | null>(null);
    const [suggestedAngle, setSuggestedAngle] = useState('');
    const [suggestedAngleFromAI, setSuggestedAngleFromAI] = useState<string | null>(null);

    // Feature State
    const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [workingAdPreview, setWorkingAdPreview] = useState<string | null>(null);
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
        setAnalysisSource(null);
        setDetectedProduct(null);
        setSuggestedAngle('');
        setSuggestedAngleFromAI(null);
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
    };

    return {
        status, setStatus, error, setError,
        adType, setAdType, adFile, setAdFile, filePreview, setFilePreview,
        marketingAngle, setMarketingAngle, iterationRequest, setIterationRequest,
        negativePrompt, setNegativePrompt, selectedProduct, setSelectedProduct,
        customProductName, setCustomProductName,
        analysisResults, setAnalysisResults, analysisSource, setAnalysisSource,
        detectedProduct, setDetectedProduct, suggestedAngle, setSuggestedAngle,
        suggestedAngleFromAI, setSuggestedAngleFromAI,
        detectedLanguage, setDetectedLanguage, transcription, setTranscription,
        showTranscriptionModal, setShowTranscriptionModal, isTranscribing, setIsTranscribing,
        selection, setSelection, workingAdPreview, setWorkingAdPreview,
        selectedIteration, setSelectedIteration, referenceAdFile, setReferenceAdFile,
        referenceFilePreview, setReferenceFilePreview, numberOfIterations, setNumberOfIterations,
        iterationType, setIterationType, selectedText, setSelectedText,
        selectedTimeRange, setSelectedTimeRange, selectedTextTranslation, setSelectedTextTranslation,
        isTranslatingSelection, setIsTranslatingSelection,
        resetState
    };
};

useAdState.processFile = async (
    file: File,
    adType: AdType | null,
    setPreview: (url: string) => void,
    setStatus: (status: AppStatus) => void,
    setError: (error: string | null) => void
) => {
    const MAX_VIDEO_SIZE_MB = 20;
    if (adType === 'video' && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        setStatus('compressing'); // Placeholder for compression
    }
    try {
        const url = await fileToDataUrl(file);
        setPreview(url);
        setStatus('idle');
    } catch (e) {
        setError('Failed to process the file.');
        setStatus('idle');
    }
};

useAdState.analyzeFile = (file: File, productList: Product[]) => {
    const isValidAngle = (angle?: string) => angle && angle.length > 2 && !/bestvar/i.test(angle);
    
    const analysis = parseFilename(file.name);
    let foundProduct: Product | undefined;
    let foundAngle: string | undefined;

    if (analysis) {
        foundProduct = productList.find(p => p.shortName.toLowerCase() === analysis.productName?.toLowerCase());
        if (isValidAngle(analysis.angle)) {
            foundAngle = analysis.angle;
        }
    }
    
    return {
        analysis,
        product: foundProduct,
        angle: foundAngle
    };
};
