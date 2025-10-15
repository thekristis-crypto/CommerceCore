import React from 'react';
import type { FilenameAnalysis, AnalysisSource } from '../types';

interface AnalysisSummaryProps {
    source: AnalysisSource;
    data: FilenameAnalysis;
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


const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ source, data, detectedLanguage }) => {
    if (!source) return null;

    const sourceText = source === 'filename' ? 'Analysis source: Filename' : 'Analysis source: Ad content';
    
    const localeValue = data.locale ? `${getFlagEmoji(data.locale)} ${data.locale}` : (detectedLanguage ? `${getFlagEmoji(detectedLanguage)} ${detectedLanguage}` : null);
    
    const fields = [
        { label: 'Product', value: data.productName },
        { label: 'Platform', value: data.platform },
        { label: 'Locale', value: localeValue },
        { label: 'Batch/Ver', value: data.batchAndVersion },
        { label: 'Original Ad', value: data.originalBatchInfo },
        { label: 'Type', value: data.adType },
        { label: 'Format', value: data.adFormat },
        { label: 'Angle', value: data.angle },
        { label: 'Editor', value: data.veInitials },
    ].filter(field => field.value);

    if (fields.length === 0) return null;

    return (
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
            <p className="text-xs text-slate-400 italic">{sourceText}</p>
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