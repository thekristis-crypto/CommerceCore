import React from 'react';
import Spinner from './Spinner';

interface ProductKnowledgeSummaryProps {
    productName: string;
    summary: string | null;
    isLoading: boolean;
}

const markdownToList = (text: string): string => {
    return text
        .replace(/^\s*[\*-]\s/gm, '<li>')
        .replace(/$/gm, '</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
};

const ProductKnowledgeSummary: React.FC<ProductKnowledgeSummaryProps> = ({ productName, summary, isLoading }) => {
    if (!productName || productName === 'Other') {
        return null;
    }
    
    if (isLoading) {
        return (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 mt-2 flex items-center justify-center text-slate-400 text-sm">
                <Spinner />
                <span className="ml-2">Analyzing Product Knowledge...</span>
            </div>
        );
    }
    
    if (!summary) {
        return null;
    }

    return (
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 mt-2 space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                </svg>
                <span>Key Insights for {productName}</span>
            </h4>
            <ul 
                className="text-xs text-slate-300 list-none space-y-1 pl-1"
                dangerouslySetInnerHTML={{ __html: markdownToList(summary) }}
            />
        </div>
    );
};

export default ProductKnowledgeSummary;
