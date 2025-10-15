import React, { useCallback } from 'react';
import Spinner from './Spinner';

interface KnowledgeBaseManagerProps {
    onFileChange: (file: File) => void;
    onClear: () => void;
    file: File | null;
    isLoading: boolean;
}

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ onFileChange, onClear, file, isLoading }) => {
    
    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileChange(e.dataTransfer.files[0]);
        }
    }, [onFileChange]);
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileChange(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    if (file) {
        return (
            <div className="space-y-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-400">Product Knowledge Base:</h4>
                 <div className="flex items-center justify-between p-2 rounded-md w-full bg-slate-700/50">
                    <div className="flex items-center min-w-0">
                        <FileIcon />
                        <span className="text-sm font-medium text-slate-300 truncate" title={file.name}>{file.name}</span>
                    </div>
                    {isLoading ? <Spinner /> : (
                         <button 
                            onClick={onClear} 
                            className="ml-2 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0" 
                            aria-label="Remove file"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-400">Product Knowledge Base (Optional):</h4>
            <label
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="flex flex-col items-center justify-center w-full h-24 px-4 transition bg-slate-800 border-2 border-slate-700 border-dashed rounded-md appearance-none cursor-pointer hover:border-slate-500"
            >
                <span className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="font-medium text-slate-400 text-sm">
                        Drop PDF/TXT file, or <span className="text-indigo-400 underline">browse</span>
                    </span>
                </span>
                <p className="text-xs text-slate-500 mt-1">Upload a doc to give the AI context.</p>
                <input id="knowledge-file-upload" type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileSelect} />
            </label>
        </div>
    );
};

export default KnowledgeBaseManager;