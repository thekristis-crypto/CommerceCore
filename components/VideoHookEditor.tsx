import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Spinner from './Spinner';
import type { TranscriptionData, TimeRange } from '../types';

interface VideoTextSelectorProps {
    videoUrl: string;
    transcription: TranscriptionData | null;
    isTranscribing: boolean;
    selectedText: string | null;
    onTextSelect: (text: string | null, timeRange: TimeRange | null) => void;
    onBack: () => void;
    translation: string | null;
    isTranslating: boolean;
}

interface Word {
    text: string;
    start: number;
    end: number;
    wordIndex: number;
}

const VideoTextSelector: React.FC<VideoTextSelectorProps> = ({ videoUrl, transcription, isTranscribing, selectedText, onTextSelect, onBack, translation, isTranslating }) => {
    
    const words = useMemo((): Word[] => {
        if (!transcription) return [];
        let wordIndex = 0;
        const flattenedWords: Word[] = [];
        transcription.segments.forEach(segment => {
            segment.text.split(/(\s+)/).forEach(wordText => {
                if (wordText.trim() !== '') {
                    flattenedWords.push({
                        text: wordText,
                        start: segment.start,
                        end: segment.end,
                        wordIndex: wordIndex++
                    });
                } else {
                    // This is whitespace, give it a non-selectable index
                    flattenedWords.push({ text: wordText, start: 0, end: 0, wordIndex: -1 });
                }
            });
        });
        return flattenedWords;
    }, [transcription]);

    const [selection, setSelection] = useState<{ start: number | null, end: number | null }>({ start: null, end: null });
    const [isSelecting, setIsSelecting] = useState(false);
    
    // Effect to clear internal selection state if parent clears selectedText
    useEffect(() => {
        if (selectedText === null) {
            setSelection({ start: null, end: null });
        }
    }, [selectedText]);

    const handleMouseDown = (index: number) => {
        if (index === -1) return; // Don't start selection on whitespace
        setIsSelecting(true);
        setSelection({ start: index, end: index });
    };

    const handleMouseEnter = (index: number) => {
        if (isSelecting && index !== -1) {
            setSelection(prev => ({ ...prev, end: index }));
        }
    };
    
    const handleMouseUp = useCallback(() => {
        if (isSelecting && selection.start !== null && selection.end !== null) {
            const startIndex = Math.min(selection.start, selection.end);
            const endIndex = Math.max(selection.start, selection.end);
            
            const selectedWords = words.slice(startIndex, endIndex + 1);
            const finalText = selectedWords.map(w => w.text).join('');

            const firstWord = words[startIndex];
            const lastWord = words[endIndex];
            const timeRange: TimeRange = { start: firstWord.start, end: lastWord.end };
            
            onTextSelect(finalText.trim(), timeRange);
        }
        setIsSelecting(false);
    }, [isSelecting, selection, words, onTextSelect]);

    const clearSelection = () => {
        setSelection({ start: null, end: null });
        onTextSelect(null, null);
    };
    
    const isWordSelected = (index: number): boolean => {
        if (index === -1 || selection.start === null || selection.end === null) return false;
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
                        {selectedText && <button onClick={clearSelection} className="text-xs text-indigo-400 hover:text-indigo-300 transition">Clear Selection</button>}
                    </div>
                </div>
                <div 
                    className="bg-slate-800/50 p-4 rounded-md cursor-text select-none border border-slate-700 max-h-48 overflow-y-auto"
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
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
                                    onMouseDown={() => handleMouseDown(word.wordIndex)}
                                    onMouseEnter={() => handleMouseEnter(word.wordIndex)}
                                    className={`${isWordSelected(word.wordIndex) ? 'bg-indigo-500/60 rounded' : ''}`}
                                >
                                    {word.text}
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
