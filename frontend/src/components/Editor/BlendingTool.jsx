import React, { useState, useRef } from 'react';
import { Wand2, AlertCircle, Check, Download, Upload } from 'lucide-react';
import ProcessingIndicator from '../UI/ProcessingIndicator';
import { blendImages } from '../../services/aiService';

/**
 * Blending Tool Component
 * Blends foreground and background images seamlessly
 */
export const BlendingTool = ({
    backgroundImage,
    projectId,
    onBlendComplete
}) => {
    const [foregroundImage, setForegroundImage] = useState(null);
    const [mask, setMask] = useState(null);
    const [blendMode, setBlendMode] = useState('color-match');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [result, setResult] = useState(null);
    const [previewMode, setPreviewMode] = useState('result');
    const fileInputRef = useRef(null);
    const maskInputRef = useRef(null);

    const handleForegroundUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setForegroundImage(event.target.result);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleMaskUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setMask(event.target.result);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleBlend = async () => {
        try {
            if (!backgroundImage) {
                throw new Error('Background image is required');
            }
            if (!foregroundImage) {
                throw new Error('Foreground image is required');
            }
            if (!mask) {
                throw new Error('Mask is required');
            }

            setError(null);
            setSuccess(false);
            setIsProcessing(true);

            const blendResult = await blendImages(
                backgroundImage,
                foregroundImage,
                mask,
                blendMode,
                projectId
            );

            setResult(blendResult);
            setSuccess(true);

            if (onBlendComplete) {
                onBlendComplete(blendResult);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        if (!result?.blendedImage) return;

        try {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${result.blendedImage}`;
            link.download = `blended_${Date.now()}.png`;
            link.click();
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    return (
        <div className="bg-biophilic-cream/30 dark:bg-biophilic-dark-bg/40 rounded-3xl p-6 border border-biophilic-moss/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-biophilic-moss/10 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-biophilic-moss" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-biophilic-bark dark:text-biophilic-dark-green uppercase tracking-tight">
                        Seamless Blending
                    </h3>
                    <p className="text-[10px] font-bold text-biophilic-moss/60 uppercase tracking-widest">
                        AI Poisson Integration
                    </p>
                </div>
            </div>

            {/* Upload sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Background */}
                <div className="bg-white dark:bg-biophilic-dark-border/40 border border-biophilic-moss/10 rounded-2xl p-4 shadow-inner">
                    <p className="text-[9px] font-black text-biophilic-moss uppercase tracking-widest mb-3">Target Background</p>
                    {backgroundImage ? (
                        <div className="relative group">
                            <img
                                src={backgroundImage}
                                alt="Background"
                                className="w-full h-24 object-cover rounded-xl border border-biophilic-moss/10"
                            />
                            <div className="absolute top-2 right-2 bg-biophilic-green/90 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-sm">
                                Loaded
                            </div>
                        </div>
                    ) : (
                        <div className="h-24 bg-biophilic-moss/5 rounded-xl flex items-center justify-center text-[10px] text-biophilic-moss/40 font-bold uppercase">
                            Canvas Active
                        </div>
                    )}
                </div>

                {/* Foreground */}
                <div
                    className="bg-white dark:bg-biophilic-dark-border/40 border border-biophilic-moss/10 rounded-2xl p-4 shadow-inner cursor-pointer hover:bg-biophilic-moss/5 transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <p className="text-[9px] font-black text-biophilic-moss uppercase tracking-widest mb-3">Foreground Element</p>
                    {foregroundImage ? (
                        <div className="relative">
                            <img
                                src={foregroundImage}
                                alt="Foreground"
                                className="w-full h-24 object-cover rounded-xl border border-biophilic-moss/10"
                            />
                            <div className="absolute top-2 right-2 bg-biophilic-green/90 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-sm">
                                Change
                            </div>
                        </div>
                    ) : (
                        <div className="h-24 bg-biophilic-moss/5 rounded-xl flex flex-col items-center justify-center gap-2 group-hover:scale-[0.98] transition-transform">
                            <Upload size={16} className="text-biophilic-moss/40" />
                            <span className="text-[9px] text-biophilic-moss/40 font-bold uppercase tracking-widest">Upload Image</span>
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleForegroundUpload} className="hidden" />
                </div>
            </div>

            {/* Mask section */}
            <div
                className="mb-6 bg-white dark:bg-biophilic-dark-border/40 border border-biophilic-moss/10 rounded-2xl p-4 shadow-inner cursor-pointer hover:bg-biophilic-moss/5 transition-all group"
                onClick={() => maskInputRef.current?.click()}
            >
                <div className="flex justify-between items-center mb-3">
                    <p className="text-[9px] font-black text-biophilic-moss uppercase tracking-widest">Blending Mask (Alpha)</p>
                    <Upload size={12} className="text-biophilic-moss/40" />
                </div>
                {mask ? (
                    <div className="relative">
                        <img
                            src={mask}
                            alt="Mask"
                            className="w-full h-16 object-cover rounded-xl border border-biophilic-moss/10"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                            <span className="text-white text-[8px] font-black uppercase tracking-widest">Click to Change</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-16 bg-biophilic-moss/5 rounded-xl flex items-center justify-center text-[9px] text-biophilic-moss/40 font-bold uppercase tracking-widest">
                        Required: White=Solid, Black=Clear
                    </div>
                )}
                <input ref={maskInputRef} type="file" accept="image/*" onChange={handleMaskUpload} className="hidden" />
            </div>

            {/* Blend mode */}
            <div className="mb-8">
                <label className="block text-[10px] font-black text-biophilic-moss uppercase tracking-widest mb-2 ml-1">
                    Blending mode
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {['normal', 'color-match', 'brightness-match'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setBlendMode(mode)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${
                                blendMode === mode
                                    ? 'bg-biophilic-moss text-white shadow-md scale-[1.02]'
                                    : 'bg-white dark:bg-biophilic-dark-border/40 text-biophilic-moss/60 hover:bg-biophilic-moss/5'
                            }`}
                        >
                            {mode.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error/Success */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-600 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-biophilic-green/10 border border-biophilic-green/20 rounded-2xl flex gap-3 text-biophilic-green text-xs font-bold">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Blending successful!
                </div>
            )}

            {/* Preview Section */}
            {result && (
                <div className="mb-8 border border-biophilic-moss/10 rounded-[2rem] overflow-hidden bg-white dark:bg-biophilic-dark-border shadow-premium animate-in zoom-in-95">
                    <div className="flex p-1 bg-biophilic-moss/5">
                        <button
                            onClick={() => setPreviewMode('result')}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                previewMode === 'result'
                                    ? 'bg-white dark:bg-biophilic-dark-green text-biophilic-moss dark:text-biophilic-dark-bg shadow-sm'
                                    : 'text-biophilic-moss/50 hover:text-biophilic-moss'
                            }`}
                        >
                            Blended Result
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
                                src={`data:image/png;base64,${result.blendedImage}`}
                                alt="Result"
                                className="w-full max-h-72 object-contain rounded-2xl"
                            />
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[9px] font-black text-biophilic-moss/40 uppercase tracking-widest mb-2 text-center">Background</p>
                                    <img src={backgroundImage} alt="BG" className="w-full h-32 object-contain rounded-xl bg-white/50" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-biophilic-moss/40 uppercase tracking-widest mb-2 text-center">Blended</p>
                                    <img src={`data:image/png;base64,${result.blendedImage}`} alt="Blended" className="w-full h-32 object-contain rounded-xl bg-white/50" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={handleBlend}
                    disabled={isProcessing || !foregroundImage || !mask}
                    className="flex-1 py-4 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-organic hover:bg-biophilic-green-dark dark:hover:bg-biophilic-green transition-all active:scale-[0.98] disabled:opacity-40"
                >
                    {isProcessing ? 'Blending...' : 'Run Integration'}
                </button>
                {result && (
                    <button
                        onClick={handleDownload}
                        className="p-4 bg-biophilic-cream-dark/20 text-biophilic-moss rounded-2xl hover:bg-biophilic-cream-dark/30 transition-all active:scale-[0.95]"
                    >
                        <Download size={20} />
                    </button>
                )}
            </div>

            <ProcessingIndicator
                isVisible={isProcessing}
                message="Poisson Blending"
                details="Harmonizing colors and lighting for seamless integration..."
            />
        </div>
    );
};

export default BlendingTool;
