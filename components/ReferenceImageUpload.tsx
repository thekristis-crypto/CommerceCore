import React, { useCallback, useState } from 'react';

interface ReferenceImageUploadProps {
    onFileChange: (file: File) => void;
    onClear: () => void;
    previewUrl: string | null;
    disabled?: boolean;
}

const ReferenceImageUpload: React.FC<ReferenceImageUploadProps> = ({ onFileChange, onClear, previewUrl, disabled = false }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileChange(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    }, [onFileChange, disabled]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (e.target.files && e.target.files.length > 0) {
            onFileChange(e.target.files[0]);
        }
    };
    
    if (previewUrl) {
        return (
            <div>
                 <label className="block text-sm font-medium text-slate-300 mb-1">Style Reference Image</label>
                <div className="relative group bg-slate-900/50 rounded-md">
                    <img src={previewUrl} alt="Reference preview" className="w-full h-24 object-contain rounded-md" />
                    <button 
                        onClick={onClear} 
                        disabled={disabled}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/80 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden"
                        aria-label="Clear reference image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    const disabledClasses = disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-slate-500';

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Style Reference (Optional)</label>
            <label
                htmlFor="reference-file-upload"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex justify-center w-full h-20 px-4 transition bg-slate-800/50 border-2 ${isDragging ? 'border-indigo-500' : 'border-slate-700'} border-dashed rounded-md appearance-none ${disabledClasses}`}
            >
                <span className="flex items-center space-x-2 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-slate-400 text-sm">
                        Drop reference image, or <span className="text-indigo-400 underline">browse</span>
                    </span>
                </span>
                <input id="reference-file-upload" type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} disabled={disabled} />
            </label>
        </div>
    );
};

export default ReferenceImageUpload;