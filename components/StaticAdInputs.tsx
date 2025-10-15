import React, { useState, useRef, useEffect } from 'react';

export interface Selection {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface StaticAdEditorProps {
    imageUrl: string;
    onSelectionChange: (selection: Selection | null) => void;
    disabled?: boolean;
}

const StaticAdEditor: React.FC<StaticAdEditorProps> = ({ imageUrl, onSelectionChange, disabled }) => {
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);

    // Reset selection when image URL changes (e.g., selecting a new iteration)
    useEffect(() => {
        clearSelection();
    }, [imageUrl]);

    const getRelativeCoords = (e: React.MouseEvent): { x: number, y: number } => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return;
        e.preventDefault();
        setStartPoint(getRelativeCoords(e));
        setSelection(null);
        onSelectionChange(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!startPoint || disabled) return;
        e.preventDefault();
        const currentPoint = getRelativeCoords(e);
        const newSelection: Selection = {
            x: Math.min(startPoint.x, currentPoint.x),
            y: Math.min(startPoint.y, currentPoint.y),
            width: Math.abs(startPoint.x - currentPoint.x),
            height: Math.abs(startPoint.y - currentPoint.y),
        };
        setSelection(newSelection);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!startPoint || disabled) return;
        e.preventDefault();

        if (selection && imageRef.current) {
            const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.current;
            const scaleX = naturalWidth / clientWidth;
            const scaleY = naturalHeight / clientHeight;

            const finalSelection = {
                x: selection.x * scaleX,
                y: selection.y * scaleY,
                width: selection.width * scaleX,
                height: selection.height * scaleY,
            };

            if (finalSelection.width > 5 && finalSelection.height > 5) {
                onSelectionChange(finalSelection);
            } else {
                setSelection(null);
                onSelectionChange(null);
            }
        }
        setStartPoint(null);
    };
    
    const clearSelection = () => {
        setSelection(null);
        setStartPoint(null);
        onSelectionChange(null);
    };

    return (
        <div className="space-y-2">
            <div
                ref={containerRef}
                className={`relative w-full select-none ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img ref={imageRef} key={imageUrl} src={imageUrl} alt="Ad preview" className="rounded-lg shadow-lg w-full" />
                {!selection && !startPoint && (
                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg pointer-events-none animate-pulse-border" />
                )}
                {selection && (
                    <div
                        className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/20 pointer-events-none"
                        style={{
                            left: selection.x,
                            top: selection.y,
                            width: selection.width,
                            height: selection.height,
                        }}
                    />
                )}
            </div>
            {selection && (
                <button onClick={clearSelection} className="w-full text-sm font-semibold py-2 px-4 rounded-md bg-slate-700/50 hover:bg-slate-700/80 transition-colors">
                    Clear Selection
                </button>
            )}
             <style>{`
                @keyframes pulse-border {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                    50% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0); }
                }
                .animate-pulse-border { animation: pulse-border 2s infinite; }
            `}</style>
        </div>
    );
};

export default StaticAdEditor;