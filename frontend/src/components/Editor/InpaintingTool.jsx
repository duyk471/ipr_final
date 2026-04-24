import React, { useState } from 'react';
import { Wand2, AlertCircle, Check, Download } from 'lucide-react';
import ProcessingIndicator from '../UI/ProcessingIndicator';
import { inpaintImage, base64ToImage } from '../../services/aiService';

/**
 * Inpainting Tool Component
 * Performs inpainting on an image with a mask and prompt
 */
export const InpaintingTool = ({
    image,
    mask,
    projectId,
    onInpaintComplete
}) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [result, setResult] = useState(null);
    const [previewMode, setPreviewMode] = useState('result'); // 'result' or 'comparison'

    const handleInpaint = async () => {
        try {
            if (!prompt.trim()) {
                throw new Error('Please enter an inpainting prompt');
            }

            setError(null);
            setSuccess(false);
            setIsProcessing(true);

            const inpaintResult = await inpaintImage(
                image,
                mask,
                prompt.trim(),
                negativePrompt.trim(),
                projectId
            );

            setResult(inpaintResult);
            setSuccess(true);

            if (onInpaintComplete) {
                onInpaintComplete(inpaintResult);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        if (!result?.inpaintedImage) return;

        try {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${result.inpaintedImage}`;
            link.download = `inpainted_${Date.now()}.png`;
            link.click();
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    if (!mask) {
        return (
            <div className="bg-biophilic-moss/5 border border-biophilic-moss/10 rounded-3xl p-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="w-12 h-12 bg-biophilic-moss/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-biophilic-moss" size={24} />
                </div>
                <p className="text-biophilic-bark font-bold text-sm">
                    Selection Required
                </p>
                <p className="text-biophilic-moss/60 text-[11px] font-bold uppercase tracking-widest mt-1">
                    Please apply a selection above to continue
                </p>
            </div>
        );
    }

    return (
        <div className="bg-biophilic-cream/30 dark:bg-biophilic-dark-bg/40 rounded-3xl p-6 border border-biophilic-moss/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-biophilic-moss/10 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-biophilic-moss" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-biophilic-bark dark:text-biophilic-dark-green uppercase tracking-tight">
                        AI Generation
                    </h3>
                    <p className="text-[10px] font-bold text-biophilic-moss/60 uppercase tracking-widest">
                        Step 2: Stable Diffusion Fill
                    </p>
                </div>
            </div>

            {/* Prompts */}
            <div className="space-y-4 mb-8">
                <div>
                    <label className="block text-[10px] font-black text-biophilic-moss uppercase tracking-widest mb-2 ml-1">
                        Describe what to generate
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'swap background to a beach sunset'"
                        className="w-full px-4 py-3 bg-white dark:bg-biophilic-dark-border border border-biophilic-moss/10 rounded-2xl focus:ring-2 focus:ring-biophilic-green focus:border-transparent resize-none min-h-[100px] text-sm text-biophilic-bark dark:text-biophilic-dark-text shadow-inner transition-all"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-biophilic-moss uppercase tracking-widest mb-2 ml-1">
                        Avoid (Negative)
                    </label>
                    <input
                        type="text"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="e.g., 'blurry, low quality'"
                        className="w-full px-4 py-3 bg-white dark:bg-biophilic-dark-border border border-biophilic-moss/10 rounded-2xl focus:ring-2 focus:ring-biophilic-green focus:border-transparent text-sm text-biophilic-bark dark:text-biophilic-dark-text shadow-inner transition-all"
                    />
                </div>
            </div>

            {/* Error/Success */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl flex gap-3 text-red-600 text-xs font-bold animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-biophilic-green/10 border border-biophilic-green/20 rounded-2xl flex gap-3 text-biophilic-green text-xs font-bold animate-in slide-in-from-top-2">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Inpainting completed successfully!
                </div>
            )}

            {/* Preview Section */}
            {result && (
                <div className="mb-8 border border-biophilic-moss/10 rounded-[2rem] overflow-hidden bg-white dark:bg-biophilic-dark-border shadow-premium animate-in zoom-in-95 duration-500">
                    <div className="flex p-1 bg-biophilic-moss/5">
                        <button
                            onClick={() => setPreviewMode('result')}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                previewMode === 'result'
                                    ? 'bg-white dark:bg-biophilic-dark-green text-biophilic-moss dark:text-biophilic-dark-bg shadow-sm'
                                    : 'text-biophilic-moss/50 hover:text-biophilic-moss'
                            }`}
                        >
                            Result
                        </button>
                        <button
                            onClick={() => setPreviewMode('comparison')}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                previewMode === 'comparison'
                                    ? 'bg-white dark:bg-biophilic-dark-green text-biophilic-moss dark:text-biophilic-dark-bg shadow-sm'
                                    : 'text-biophilic-moss/50 hover:text-biophilic-moss'
                            }`}
                        >
                            Comparison
                        </button>
                    </div>
                    <div className="p-4 bg-biophilic-cream/10">
                        {previewMode === 'result' ? (
                            <img
                                src={`data:image/png;base64,${result.inpaintedImage}`}
                                alt="Result"
                                className="w-full max-h-72 object-contain rounded-2xl"
                            />
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[9px] font-black text-biophilic-moss/40 uppercase tracking-widest mb-2 text-center">Before</p>
                                    <img src={image} alt="Before" className="w-full h-32 object-contain rounded-xl bg-white/50" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-biophilic-moss/40 uppercase tracking-widest mb-2 text-center">After</p>
                                    <img src={`data:image/png;base64,${result.inpaintedImage}`} alt="After" className="w-full h-32 object-contain rounded-xl bg-white/50" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={handleInpaint}
                    disabled={isProcessing || !prompt.trim()}
                    className="flex-1 py-4 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-organic hover:bg-biophilic-green-dark dark:hover:bg-biophilic-green transition-all active:scale-[0.98] disabled:opacity-40"
                >
                    {isProcessing ? 'Generating...' : 'Start AI Generation'}
                </button>
                {result && (
                    <button
                        onClick={handleDownload}
                        className="p-4 bg-biophilic-cream-dark/20 text-biophilic-moss rounded-2xl hover:bg-biophilic-cream-dark/30 transition-all active:scale-[0.95]"
                        title="Download Result"
                    >
                        <Download size={20} />
                    </button>
                )}
            </div>

            <ProcessingIndicator
                isVisible={isProcessing}
                message="AI Imagining"
                details="Stable Diffusion is rendering your description..."
            />
        </div>
    );
};

export default InpaintingTool;
