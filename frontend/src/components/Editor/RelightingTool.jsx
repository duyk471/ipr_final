import React, { useState } from 'react';
import { Sun, Moon, Zap, Camera, Check, AlertCircle } from 'lucide-react';
import { processAI } from '../../services/aiService';
import BiophilicSpinner from '../UI/BiophilicSpinner';

const PRESETS = [
    { id: 'Golden Hour', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'Neon Night', icon: Zap, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' },
    { id: 'Studio Softlight', icon: Camera, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'Dramatic Noir', icon: Moon, color: 'text-slate-800', bg: 'bg-slate-800/10' }
];

export const RelightingTool = ({ activeLayer, projectId, onComplete, canvasRef }) => {
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleApply = async () => {
        if (!selectedPreset || !activeLayer || !canvasRef?.current?.canvas) return;
        const canvas = canvasRef.current.canvas;

        try {
            setIsProcessing(true);
            setError(null);

            // Get image data from layer
            const imageBase64 = activeLayer.toDataURL();

            const result = await processAI('relight', {
                image: imageBase64,
                preset: selectedPreset,
                projectId
            });

            if (onComplete) {
                onComplete(result);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!activeLayer || activeLayer.type !== 'image') {
        return (
            <div className="p-6 text-center bg-biophilic-cream/20 rounded-3xl border border-dashed border-biophilic-moss/20">
                <p className="text-xs font-medium text-biophilic-bark/60">
                    Select an image layer to apply AI Relighting.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 gap-3">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        disabled={isProcessing}
                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                            selectedPreset === preset.id
                                ? 'bg-white dark:bg-biophilic-dark-green border-biophilic-moss shadow-premium'
                                : 'bg-biophilic-cream/30 dark:bg-biophilic-dark-border border-transparent hover:border-biophilic-moss/30'
                        }`}
                    >
                        <div className={`p-2 rounded-xl ${preset.bg} ${preset.color}`}>
                            <preset.icon size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-biophilic-bark dark:text-biophilic-dark-text text-center">
                            {preset.id}
                        </span>
                    </button>
                ))}
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            <button
                onClick={handleApply}
                disabled={isProcessing || !selectedPreset}
                className="w-full py-4 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-organic hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100"
            >
                {isProcessing ? 'Relighting...' : 'Apply Lighting Preset'}
            </button>

            {isProcessing && (
                <div className="flex justify-center pt-4">
                    <BiophilicSpinner size="md" message="Matching Ambient Lighting" />
                </div>
            )}
        </div>
    );
};

export default RelightingTool;
