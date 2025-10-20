import type { Product, FilenameAnalysis, AppStatus } from '../types';

const FILENAME_REGEX = new RegExp(
  '^(?<productName>[a-zA-Z0-9]+)_' +
  '(?<platform>[A-Z]{2,})_' +
  '(?<locale>[A-Z]{2,})_' +
  '(?<batchNumber>\\d+)_' +
  '(?<adVersion>\\d+)_' +
  '(?:(?<orig>orig)_(?:(?<origLocale>[A-Z]{2,})_)?(?<origBatchNumber>\\d+)_' +
  '(?<origAdVersion>\\d+)_)?' +
  '(?<adType>(?!orig\\b)[A-Z]{3,})_' +
  '(?<adFormat>[\\dx]+)_' +
  '(?<angle>[a-zA-Z0-9_]+)_' +
  '(?<pcInitials>[A-Z]{2})_' +
  '(?<veInitials>[A-Z]{2})' +
  '(?:\\..*)?$', // FIX: Made the file extension optional to handle all valid filenames
  'i'
);

const parseFilename = (filename: string): FilenameAnalysis | null => {
    const match = filename.match(FILENAME_REGEX);
    if (!match?.groups) return null;
    const { groups } = match;
    const data: FilenameAnalysis = {};
    if (groups.productName) data.productName = groups.productName;
    if (groups.platform) data.platform = groups.platform.toUpperCase();
    if (groups.locale) data.locale = groups.locale.toUpperCase();
    if (groups.batchNumber && groups.adVersion) data.batchAndVersion = `Batch ${groups.batchNumber}, V${groups.adVersion}`;
    if (groups.orig && groups.origBatchNumber && groups.origAdVersion) {
        data.originalBatchInfo = `orig_${groups.origLocale ? `${groups.origLocale.toUpperCase()}_` : ''}${groups.origBatchNumber}_${groups.origAdVersion}`;
    }
    if (groups.adType) data.adType = groups.adType.toUpperCase();
    if (groups.adFormat) data.adFormat = groups.adFormat;
    if (groups.angle) data.angle = groups.angle.replace(/_/g, ', ');
    if (groups.pcInitials) data.pcInitials = groups.pcInitials.toUpperCase();
    if (groups.veInitials) data.veInitials = groups.veInitials.toUpperCase();
    return Object.keys(data).length >= 5 ? data : null;
};


const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

export const processFile = async (
    file: File,
    setPreview: (url: string) => void,
    setStatus: (status: AppStatus) => void,
    setError: (error: string | null) => void
) => {
    try {
        const url = await fileToDataUrl(file);
        setPreview(url);
        setStatus('idle');
    } catch (e) {
        setError('Failed to process the file.');
        setStatus('idle');
    }
};

export const analyzeFile = (file: File, productList: Product[]) => {
    const isValidAngle = (angle?: string) => angle && angle.length > 2 && !/bestvar/i.test(angle);
    
    const analysis = parseFilename(file.name);
    let foundProduct: Product | undefined;
    let foundAngle: string | undefined;

    if (analysis) {
        foundProduct = productList.find(p => p.shortName.toLowerCase() === analysis.productName?.toLowerCase());
        if (isValidAngle(analysis.angle)) {
            foundAngle = analysis.angle;
        }
    }
    
    return {
        analysis,
        product: foundProduct,
        angle: foundAngle
    };
};