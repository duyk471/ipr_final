import React, { useState } from 'react';
import { Maximize, CornerRightDown, CornerLeftUp, AlertCircle } from 'lucide-react';
import { processAI } from '../../services/aiService';
import BiophilicSpinner from '../UI/BiophilicSpinner';

export const GenerativeExpandTool = ({ canvasRef, projectId, onComplete }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [expandDir, setExpandDir] = useState('all'); // 'all', 'horizontal', 'vertical'

    const handleExpand = async () => {
        if (!canvasRef?.current?.canvas) return;
        
        try {
            setIsProcessing(true);
            setError(null);

            const canvas = canvasRef.current.canvas;
            const originalWidth = canvas.width;
            const originalHeight = canvas.height;
            
            // Define expansion (e.g., 20% in the chosen direction)
            const padding = 0.2;
            let newWidth = originalWidth;
            let newHeight = originalHeight;
            let offsetX = 0;
            let offsetY = 0;

            if (expandDir === 'all' || expandDir === 'horizontal') {
                newWidth = Math.round(originalWidth * (1 + padding * 2));
                offsetX = Math.round(originalWidth * padding);
            }
            
            if (expandDir === 'all' || expandDir === 'vertical') {
                newHeight = Math.round(originalHeight * (1 + padding * 2));
                offsetY = Math.round(originalHeight * padding);
            }

            const imageBase64 = canvas.toDataURL('image/png');

            const result = await processAI('expand', {
                image: imageBase64,
                expansionData: {
                    newWidth,
                    newHeight,
                    offsetX,
                    offsetY
                },
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-3 gap-2">
                {[
                    { id: 'all', icon: Maximize, label: 'All Sides' },
                    { id: 'horizontal', icon: CornerLeftUp, label: 'Sides Only' },
                    { id: 'vertical', icon: CornerRightDown, label: 'Top/Bottom' }
                ].map((dir) => (
                    <button
                        key={dir.id}
                        onClick={() => setExpandDir(dir.id)}
                        className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                            expandDir === dir.id
                                ? 'bg-white dark:bg-biophilic-dark-green border-biophilic-moss shadow-premium'
                                : 'bg-biophilic-cream/30 dark:bg-biophilic-dark-border border-transparent hover:border-biophilic-moss/30'
                        }`}
                    >
                        <dir.icon size={18} className="text-biophilic-moss" />
                        <span className="text-[9px] font-black uppercase tracking-tight text-biophilic-bark dark:text-biophilic-dark-text text-center">
                            {dir.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="p-4 bg-biophilic-green/5 border border-biophilic-green/10 rounded-2xl">
                <p className="text-[11px] text-biophilic-bark/70 leading-relaxed">
                    AI will intelligently fill the new areas by analyzing your existing image's texture, lighting, and composition.
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            <button
                onClick={handleExpand}
                disabled={isProcessing}
                className="w-full py-4 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-organic hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
            >
                {isProcessing ? 'Expanding...' : 'Expand Canvas'}
            </button>

            {isProcessing && (
                <div className="flex justify-center pt-4">
                    <BiophilicSpinner size="md" message="Imagining New Boundaries" />
                </div>
            )}
        </div>
    );
};

export default GenerativeExpandTool;
