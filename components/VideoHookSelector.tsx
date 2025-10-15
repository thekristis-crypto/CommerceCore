import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TimeRange } from '../types';

interface VideoTimelineSelectorProps {
    videoUrl: string;
    onTimeRangeSelect: (range: TimeRange | null) => void;
    selectedTimeRange: TimeRange | null;
    onBack: () => void;
}

const formatTime = (seconds: number) => {
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const VideoTimelineSelector: React.FC<VideoTimelineSelectorProps> = ({ videoUrl, onTimeRangeSelect, selectedTimeRange, onBack }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [duration, setDuration] = useState(0);
    const [isCreatingSelection, setIsCreatingSelection] = useState(false);
    const [resizingHandle, setResizingHandle] = useState<'start' | 'end' | null>(null);
    const [startPercent, setStartPercent] = useState(0);
    const [endPercent, setEndPercent] = useState(0);

    useEffect(() => {
        if (videoRef.current) {
            const handleMetadata = () => setDuration(videoRef.current?.duration || 0);
            const video = videoRef.current;
            video.addEventListener('loadedmetadata', handleMetadata);
            return () => video.removeEventListener('loadedmetadata', handleMetadata);
        }
    }, [videoUrl]);
    
    useEffect(() => {
        if (selectedTimeRange && duration > 0) {
            setStartPercent((selectedTimeRange.start / duration) * 100);
            setEndPercent((selectedTimeRange.end / duration) * 100);
        } else {
            setStartPercent(0);
            setEndPercent(0);
        }
    }, [selectedTimeRange, duration]);

    const getPercentFromEvent = (e: MouseEvent | React.MouseEvent): number => {
        if (!timelineRef.current) return 0;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        return Math.max(0, Math.min(100, (x / rect.width) * 100));
    };
    
    const updateVideoPreview = useCallback((percent: number) => {
        if (videoRef.current && duration > 0 && isFinite(duration)) {
            videoRef.current.currentTime = (percent / 100) * duration;
        }
    }, [duration]);

    const finalizeSelection = useCallback((startP: number, endP: number) => {
        const finalStartPercent = Math.min(startP, endP);
        const finalEndPercent = Math.max(startP, endP);

        if (finalEndPercent - finalStartPercent > 1 && duration > 0) {
            let selectionStartSeconds = (finalStartPercent / 100) * duration;
            const selectionEndSeconds = (finalEndPercent / 100) * duration;

            const SNAP_THRESHOLD_SECONDS = 0.5;
            if (selectionStartSeconds <= SNAP_THRESHOLD_SECONDS && startP < endP) {
                selectionStartSeconds = 0;
            }

            const selection: TimeRange = { start: selectionStartSeconds, end: selectionEndSeconds };
            onTimeRangeSelect(selection);
        } else {
            onTimeRangeSelect(null);
        }
    }, [duration, onTimeRangeSelect]);
    
    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingHandle) return;
        e.preventDefault();
        const percent = getPercentFromEvent(e);
        if (resizingHandle === 'start') {
            setStartPercent(percent);
        } else {
            setEndPercent(percent);
        }
        updateVideoPreview(percent);
    }, [resizingHandle, updateVideoPreview]);

    const handleGlobalMouseUp = useCallback(() => {
        if (resizingHandle) {
            finalizeSelection(startPercent, endPercent);
            setResizingHandle(null);
        }
    }, [resizingHandle, startPercent, endPercent, finalizeSelection]);

    useEffect(() => {
        if (resizingHandle) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [resizingHandle, handleGlobalMouseMove, handleGlobalMouseUp]);

    const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).dataset.handle) return;
        
        const percent = getPercentFromEvent(e);
        
        if (selectedTimeRange) {
            const currentStart = (selectedTimeRange.start / duration) * 100;
            const currentEnd = (selectedTimeRange.end / duration) * 100;
            if (percent >= currentStart && percent <= currentEnd) {
                return; // Clicked inside existing selection, do nothing
            }
        }
        
        e.preventDefault();
        setIsCreatingSelection(true);
        setStartPercent(percent);
        setEndPercent(percent);
        onTimeRangeSelect(null);
    };

    const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isCreatingSelection) return;
        e.preventDefault();
        const percent = getPercentFromEvent(e);
        setEndPercent(percent);
        updateVideoPreview(percent);
    };

    const handleTimelineMouseUp = useCallback(() => {
        if (!isCreatingSelection) return;
        setIsCreatingSelection(false);
        finalizeSelection(startPercent, endPercent);
    }, [isCreatingSelection, startPercent, endPercent, finalizeSelection]);

    const handleHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: 'start' | 'end') => {
        e.stopPropagation();
        setResizingHandle(handle);
    };

    const clearSelection = () => onTimeRangeSelect(null);

    const previewSelection = () => {
        if (videoRef.current && selectedTimeRange) {
            videoRef.current.currentTime = selectedTimeRange.start;
            videoRef.current.play();
            const checkTime = setInterval(() => {
                if (videoRef.current && (videoRef.current.currentTime >= selectedTimeRange.end || videoRef.current.paused)) {
                    videoRef.current.pause();
                    clearInterval(checkTime);
                }
            }, 100);
        }
    };

    const selectionWidth = Math.abs(endPercent - startPercent);
    const selectionLeft = Math.min(startPercent, endPercent);
    const canShowSelection = (isCreatingSelection || selectedTimeRange) && duration > 0;

    return (
        <div className="space-y-4">
            <video ref={videoRef} key={videoUrl} src={videoUrl} controls className="w-full rounded-lg shadow-lg" playsInline />
            <div className="space-y-3">
                 <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-400">Select or adjust the time range below:</p>
                    <button onClick={onBack} className="text-xs text-indigo-400 hover:text-indigo-300 transition">(Change)</button>
                </div>
                <div 
                    ref={timelineRef}
                    className="w-full h-8 bg-slate-700 rounded-full cursor-crosshair relative touch-none"
                    onMouseDown={handleTimelineMouseDown}
                    onMouseMove={handleTimelineMouseMove}
                    onMouseUp={handleTimelineMouseUp}
                    onMouseLeave={handleTimelineMouseUp}
                >
                    {canShowSelection && (
                        <div 
                            className="absolute h-full bg-indigo-500/60 rounded-full border-y-2 border-indigo-400"
                            style={{ left: `${selectionLeft}%`, width: `${selectionWidth}%` }}
                        >
                            <div
                                data-handle="start"
                                onMouseDown={(e) => handleHandleMouseDown(e, 'start')}
                                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-6 bg-indigo-300 rounded-sm cursor-ew-resize z-10"
                            />
                            <div
                                data-handle="end"
                                onMouseDown={(e) => handleHandleMouseDown(e, 'end')}
                                className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-6 bg-indigo-300 rounded-sm cursor-ew-resize z-10"
                            />
                        </div>
                    )}
                </div>
                {selectedTimeRange && (
                     <div className="flex justify-between items-center bg-indigo-900/30 p-2 rounded-md">
                        <p className="text-sm font-mono text-indigo-200">
                            Selected: {formatTime(selectedTimeRange.start)} - {formatTime(selectedTimeRange.end)}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={previewSelection} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded-md transition">Preview</button>
                            <button onClick={clearSelection} className="text-xs bg-slate-600 hover:bg-slate-700 text-white py-1 px-3 rounded-md transition">Clear</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoTimelineSelector;