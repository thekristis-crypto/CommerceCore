import React from 'react';
import type { FilenameAnalysis } from '../types';

interface AnalysisSummaryProps {
    analysis: FilenameAnalysis | null;
    detectedLanguage: string | null;
}

const getFlagEmoji = (locale: string): string => {
    if (!locale) return '';
    const code = locale.toUpperCase().split('-')[0];
    const flags: { [key:string]: string } = {
        US: '🇺🇸',
        UK: '🇬🇧',
        GB: '🇬🇧',
        EN: '🇺🇸',
        ES: '🇪🇸',
        DE: '🇩🇪',
        FR: '🇫🇷',
        PT: '🇵🇹',
        IT: '🇮🇹',
        AU: '🇦🇺',
    };
    return flags[code] || '🏳️';
};


const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ analysis, detectedLanguage }) => {
    
    if (!analysis) {
        return (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
                <p className="text-xs text-slate-400 italic">Filename Analysis</p>
                <p className="text-sm text-slate-300">Could not parse filename. Please ensure it follows the standard naming convention to enable auto-fill.</p>
            </div>
        );
    }

    const localeValue = analysis.locale ? `${getFlagEmoji(analysis.locale)} ${analysis.locale}` : (detectedLanguage ? `${getFlagEmoji(detectedLanguage)} ${detectedLanguage}` : null);
    
    const fields = [
        { label: 'Product', value: analysis.productName },
        { label: 'Platform', value: analysis.platform },
        { label: 'Locale', value: localeValue },
        { label: 'Batch/Ver', value: analysis.batchAndVersion },
        { label: 'Original Ad', value: analysis.originalBatchInfo },
        { label: 'Type', value: analysis.adType },
        { label: 'Format', value: analysis.adFormat },
        { label: 'Angle', value: analysis.angle },
        { label: 'Editor', value: analysis.veInitials },
    ].filter(field => field.value);

    if (fields.length === 0) return null;

    return (
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
            <p className="text-xs text-slate-400 italic">Analysis source: Filename</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {fields.map(field => (
                     <div key={field.label} className="truncate flex items-baseline">
                        <span className="font-semibold text-slate-400 w-20 shrink-0">{field.label}: </span>
                        {field.label === 'Original Ad' && field.value ? (
                            <a 
                                href={`https://drive.google.com/drive/search?q=title:${encodeURIComponent(field.value.replace(/^orig_/, ''))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 underline transition-colors truncate"
                                title={`Search for "${field.value.replace(/^orig_/, '')}" in Google Drive`}
                            >
                                {field.value}
                            </a>
                        ) : (
                            <span className="text-slate-200 truncate">{field.value}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnalysisSummary;