import React, { useCallback, useState } from 'react';
import type { AdType } from '../types';

interface FileUploadProps {
    onFileChange: (file: File) => void;
    adType: AdType;
    disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, adType, disabled = false }) => {
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

    const acceptTypes = adType === 'video' ? 'video/mp4,video/quicktime,video/x-matroska,video/webm' : 'image/jpeg,image/png,image/webp';
    const disabledClasses = disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-slate-500';

    return (
        <div>
            <label
                htmlFor="file-upload"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex justify-center w-full h-32 px-4 transition bg-slate-800 border-2 ${isDragging ? 'border-indigo-500' : 'border-slate-700'} border-dashed rounded-md appearance-none ${disabledClasses}`}
            >
                <span className="flex items-center space-x-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="font-medium text-slate-400">
                        Drop a {adType} file, or <span className="text-indigo-400 underline">browse</span>
                    </span>
                </span>
                <input id="file-upload" type="file" className="hidden" accept={acceptTypes} onChange={handleFileSelect} disabled={disabled} />
            </label>
        </div>
    );
};

export default FileUpload;