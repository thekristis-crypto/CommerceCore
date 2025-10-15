import React from 'react';
import type { AdType, IterationType } from '../types';

interface PresetPromptsProps {
    adType: AdType | null;
    hasSelection: boolean;
    onSelect: (prompt: string) => void;
    iterationType?: IterationType | null;
}

const prompts = {
    videoCopy: [
        "Generate 5 alternative hooks for this copy",
        "Write 3 different voiceover scripts for this section",
        "Suggest different tones for reading this line (e.g., urgent, mysterious)",
        "Provide 5 text overlay ideas that complement this script",
    ],
    videoVisual: [
        "Suggest 3 'WTF-style' visuals to stop the scroll",
        "Create 4 variations of urgent offer badges (e.g., '50% OFF TODAY')",
        "Generate 5 fake TikTok comments about this product for on-screen text",
        "Suggest flashy, high-energy visual effects (zooms, shakes, glows)",
    ],
    static: [
        "Change the background to something more eye-catching",
        "Give me 4 different design concepts for this ad",
        "Make the overall style more minimalist and clean",
        "Generate 4 variations with different color palettes",
    ],
    staticSelection: [
        "Make this text bigger and bolder",
        "Change the color of this object",
        "Add a neon glow effect to this",
        "Replace this with a different icon",
    ],
};

const PresetPrompts: React.FC<PresetPromptsProps> = ({ adType, hasSelection, onSelect, iterationType }) => {
    let promptList: string[] = [];
    
    if (adType === 'video') {
        if (iterationType === 'visual') {
            promptList = prompts.videoVisual;
        } else { // This covers 'copy' and the default state before selection
            promptList = prompts.videoCopy;
        }
    } else if (adType === 'static') {
        promptList = hasSelection ? prompts.staticSelection : prompts.static;
    }

    if (promptList.length === 0) {
        return null;
    }

    return (
        <div>
            <p className="text-xs text-slate-400 mb-2">Or try one of these ideas:</p>
            <div className="flex flex-wrap gap-2 justify-start">
                {promptList.map(prompt => (
                    <button
                        key={prompt}
                        onClick={() => onSelect(prompt)}
                        className="text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-1 px-3 rounded-full transition-colors text-left"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PresetPrompts;