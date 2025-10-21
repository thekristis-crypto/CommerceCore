import type { FilenameAnalysis } from '../types';

export const analyzeFilename = (filename: string): FilenameAnalysis | null => {
    const name = filename.replace(/\.[^/.]+$/, "");

    const regex = new RegExp(
        /^(?<productName>.+?)\s*-\s*/.source +
        /(?<platform>FB|TT|GG|SC|YT)\s*-\s*/.source +
        /(?<locale>[A-Z]{2}(?:-[A-Z]{2})?)\s*-\s*/.source +
        /(?<batchAndVersion>B\d+\s*V\d+)\s*/.source +
        /(?:-\s*(?<originalBatchInfo>orig_.*?))?\s*-\s*/.source +
        /(?<adType>Video|Static)\s*-\s*/.source +
        /(?<adFormat>\d+x\d+|SQUARE|VERTICAL|HORIZONTAL)\s*-\s*/.source +
        /(?<angle>.*?)\s*-\s*/.source +
        /(?:PC_(?<pcInitials>[A-Z]+)\s*)?/.source +
        /(?:-?\s*VE_(?<veInitials>[A-Z]+))?$/.source,
        'i'
    );

    const match = name.match(regex);

    if (!match || !match.groups) {
        return null;
    }

    const { groups } = match;

    return {
        productName: groups.productName?.trim(),
        platform: groups.platform?.trim().toUpperCase(),
        locale: groups.locale?.trim().toUpperCase(),
        batchAndVersion: groups.batchAndVersion?.trim(),
        originalBatchInfo: groups.originalBatchInfo?.trim(),
        adType: groups.adType?.trim(),
        adFormat: groups.adFormat?.trim(),
        angle: groups.angle?.trim(),
        pcInitials: groups.pcInitials?.trim().toUpperCase(),
        veInitials: groups.veInitials?.trim().toUpperCase(),
    };
};
