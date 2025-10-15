import React, { useState, useMemo, useCallback } from 'react';
import Spinner from './Spinner';

interface VideoTextSelectorProps {
    videoUrl: string;
    transcription: string | null;
    isTranscribing: boolean;
    selectedText: string | null;
    onTextSelect: (text: string | null) => void;
    onBack: () => void;
    translation: string | null;
    isTranslating: boolean;
}

// Parses the transcription to extract only the original language part before any translation markers.
const parseTranscription = (transcription: string): string => {
    const separatorRegex = /---\s*ENGLISH TRANSLATION:/i;
    const parts = transcription.split(separatorRegex);
    return parts[0]?.trim() || '';
};

const VideoTextSelector: React.FC<VideoTextSelectorProps> = ({ videoUrl, transcription, isTranscribing, selectedText, onTextSelect, onBack, translation, isTranslating }) => {
    const originalScript = useMemo(() => transcription ? parseTranscription(transcription) : '', [transcription]);
    // Split the script into words and whitespace to preserve original formatting.
    const words = useMemo(() => originalScript.split(/(\s+)/), [originalScript]);

    const [selection, setSelection] = useState<{ start: number | null, end: number | null }>({ start: null, end: null });
    const [isSelecting, setIsSelecting] = useState(false);

    const handleMouseDown = (index: number) => {
        // Prevent selection on whitespace
        if (words[index].trim() === '') return;
        setIsSelecting(true);
        setSelection({ start: index, end: index });
    };

    const handleMouseEnter = (index: number) => {
        if (isSelecting) {
            setSelection(prev => ({ ...prev, end: index }));
        }
    };
    
    const handleMouseUp = useCallback(() => {
        if (isSelecting && selection.start !== null && selection.end !== null) {
            const startIndex = Math.min(selection.start, selection.end);
            const endIndex = Math.max(selection.start, selection.end);
            const selectedWords = words.slice(startIndex, endIndex + 1).join('');
            onTextSelect(selectedWords.trim());
        }
        setIsSelecting(false);
    }, [isSelecting, selection, words, onTextSelect]);

    const clearSelection = () => {
        setSelection({ start: null, end: null });
        onTextSelect(null);
    };
    
    const isWordSelected = (index: number): boolean => {
        if (selection.start === null || selection.end === null) return false;
        const startIndex = Math.min(selection.start, selection.end);
        const endIndex = Math.max(selection.start, selection.end);
        return index >= startIndex && index <= endIndex;
    };

    return (
        <div className="space-y-4">
            <video key={videoUrl} src={videoUrl} controls className="w-full rounded-lg shadow-lg" playsInline />

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-400">Select the copy by highlighting the text below:</p>
                     <div>
                        <button onClick={onBack} className="text-xs text-indigo-400 hover:text-indigo-300 transition mr-4">(Change)</button>
                        {selectedText && (
                            <button onClick={clearSelection} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                                Clear Selection
                            </button>
                        )}
                    </div>
                </div>
                <div 
                    className="bg-slate-800/50 p-4 rounded-md cursor-text select-none border border-slate-700 max-h-48 overflow-y-auto"
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp} // End selection if mouse leaves the area
                >
                    {isTranscribing || !transcription ? (
                        <div className="flex items-center justify-center h-24 text-slate-400">
                            <Spinner /> <span className="ml-2">Transcription in progress...</span>
                        </div>
                    ) : (
                         <p className="text-slate-200 leading-relaxed">
                            {words.map((word, index) => (
                                <span 
                                    key={index}
                                    onMouseDown={() => handleMouseDown(index)}
                                    onMouseEnter={() => handleMouseEnter(index)}
                                    className={`${isWordSelected(index) ? 'bg-indigo-500/60 rounded' : ''}`}
                                >
                                    {word}
                                </span>
                            ))}
                        </p>
                    )}
                </div>
                {selectedText && (
                    <div className="p-3 bg-indigo-900/30 rounded-lg border border-indigo-700 space-y-2">
                        <div>
                            <p className="text-xs text-indigo-300 font-semibold mb-1">Selected Copy:</p>
                            <p className="text-sm font-mono text-white">"{selectedText}"</p>
                        </div>
                        {isTranslating ? (
                            <div className="flex items-center text-xs text-slate-400">
                                <Spinner /> <span className="ml-2">Translating...</span>
                            </div>
                        ) : translation && (
                            <div>
                                <p className="text-xs text-slate-400 font-semibold mb-1">English Translation:</p>
                                <p className="text-sm font-mono text-slate-300">"{translation}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoTextSelector;