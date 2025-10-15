// Fix: Corrected invalid import statement for React.
import React from 'react';
import Spinner from './Spinner';
import type { GeneralKnowledgeFile } from '../types';

interface KnowledgeBaseManagerProps {
    onFileChange: (file: File) => void;
    persistedFiles: GeneralKnowledgeFile[];
    isLoading: boolean;
}

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ onFileChange, persistedFiles, isLoading }) => {
    
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileChange(e.dataTransfer.files[0]);
        }
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileChange(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 className="text-sm font-semibold text-slate-400">Product Knowledge Base:</h4>
            
            {isLoading && persistedFiles.length === 0 && (
                <div className="flex items-center justify-center h-24 text-slate-400">
                    <Spinner /> <span className="ml-2">Loading Knowledge...</span>
                </div>
            )}
            
            {!isLoading && persistedFiles.length > 0 && (
                 <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                    {persistedFiles.map(file => (
                        <div key={file.name} className="flex items-center p-2 rounded-md w-full bg-slate-700/50">
                            <FileIcon />
                            <span className="text-sm font-medium text-slate-300 truncate" title={file.name}>{file.name}</span>
                        </div>
                    ))}
                </div>
            )}
            
            {!isLoading && persistedFiles.length === 0 && (
                 <p className="text-xs text-slate-500 text-center py-4">No knowledge files uploaded yet.</p>
            )}

            <div className="pt-2">
                 <label
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="flex flex-col items-center justify-center w-full h-20 px-4 transition bg-slate-800 border-2 border-slate-700 border-dashed rounded-md appearance-none cursor-pointer hover:border-slate-500"
                >
                    <span className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="font-medium text-slate-400 text-xs">
                           Drop new PDF/TXT file to add knowledge
                        </span>
                    </span>
                    <input id="knowledge-file-upload" type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileSelect} />
                </label>
            </div>
        </div>
    );
};

export default KnowledgeBaseManager;