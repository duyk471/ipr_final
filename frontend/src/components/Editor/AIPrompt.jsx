import React, { useState } from 'react';
import { Sparkles, Loader2, Info } from 'lucide-react';
import { api } from '../../store/useCanvasStore';
import useCanvasStore from '../../store/useCanvasStore';
import { X } from 'lucide-react';

const AIPrompt = ({ canvasRef, projectId }) => {
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [transparent, setTransparent] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState(false);
    const [error, setError] = useState('');

    const globalStyleTags = useCanvasStore(state => state.globalStyleTags);
    const setGlobalStyleTags = useCanvasStore(state => state.setGlobalStyleTags);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setGenerating(true);
        setError('');

        try {
            let finalPrompt = prompt;

            if (magicPrompt) {
                try {
                    // Enhance the prompt first
                    const enhanceRes = await api.post('/ai/enhance-prompt', { prompt: finalPrompt });
                    if (enhanceRes.data.success && enhanceRes.data.text) {
                        finalPrompt = enhanceRes.data.text;
                        setPrompt(finalPrompt); // Update UI so user sees the enhanced prompt
                    }
                } catch (enhanceErr) {
                    console.warn('Prompt enhancement failed, using original:', enhanceErr);
                    // We don't stop here, just proceed with the original prompt
                }
            }

            // Apply Smart Prompting for aesthetic
            finalPrompt = `${finalPrompt}, high quality, highly detailed`;
            
            // Append global style tags if present, otherwise default to biophilic
            if (globalStyleTags) {
                finalPrompt = `${finalPrompt}, ${globalStyleTags}`;
            } else {
                finalPrompt = `${finalPrompt}, biophilic aesthetic, organic lighting`;
            }
            
            if (transparent) {
                finalPrompt = `${finalPrompt}, isolated on a plain white background`;
            }

            const res = await api.post('/ai/generate', {
                prompt: finalPrompt,
                projectId,
                removeBackground: transparent
            });
            if (res.data.success && res.data.asset) {
                try {
                    const { persistBackendAsset } = await import('../../services/localAssetService');
                    const assetInfo = await persistBackendAsset(res.data.asset.displayUrl);
                    
                    // Add to canvas with metadata
                    canvasRef.current?.addImage(assetInfo.url, {
                        source: res.data.metadata?.source || 'gemini-ai',
                        prompt: prompt,
                        originalPath: assetInfo.path
                    });
                    setPrompt(''); // Clear after success
                } catch (saveError) {
                    console.error('Failed to save AI image locally:', saveError);
                    setError('Image generated but failed to save to workspace.');
                }
            } else {
                setError('Failed to generate image. Please try again.');
            }
        } catch (err) {
            console.error('AI Gen Error:', err);
            const msg = err.response?.data?.message || err.message || 'Error communicating with AI service.';
            setError(`${msg} (Ensure your API keys are valid in the backend .env file)`);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/30 dark:bg-biophilic-dark-surface transition-colors">
            <div className="p-5 border-b border-biophilic-cream-dark dark:border-biophilic-dark-border flex items-center gap-2">
                <Sparkles className="text-biophilic-green dark:text-biophilic-dark-green" size={20} />
                <h3 className="font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight text-[15px]">AI Image Generator</h3>
            </div>

            <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                <p className="text-[11px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest mb-6">
                    Create unique artwork in seconds
                </p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-biophilic-dark-text-muted mb-3">
                            Visual Prompt
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="E.g. A cute orange cat wearing traditional Vietnamese Ao Dai, 3d render..."
                            className="w-full h-40 p-4 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-biophilic-green/10 focus:border-biophilic-green text-sm text-slate-700 dark:text-biophilic-dark-text transition-all shadow-sm placeholder:text-slate-300 dark:placeholder:text-biophilic-dark-text-muted/40"
                            disabled={generating}
                        />
                        
                        {globalStyleTags && (
                            <div className="mt-3 flex items-start gap-2 bg-biophilic-green/10 dark:bg-biophilic-dark-green/20 p-3 rounded-xl border border-biophilic-green/20 dark:border-biophilic-dark-green/30 relative">
                                <div className="flex-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-biophilic-moss dark:text-biophilic-dark-green block mb-1">
                                        Applied Style Reference
                                    </span>
                                    <p className="text-xs text-slate-600 dark:text-biophilic-dark-text-muted leading-relaxed italic pr-6">
                                        "{globalStyleTags}"
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setGlobalStyleTags('')}
                                    className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove Style"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white dark:bg-biophilic-dark-card rounded-2xl border border-biophilic-cream-dark dark:border-biophilic-dark-border shadow-sm">
                        <div className="flex flex-col">
                            <label htmlFor="transparent-bg" className="text-sm font-bold text-slate-700 dark:text-biophilic-dark-text cursor-pointer select-none">   
                                Alpha Transparency
                            </label>
                            <span className="text-[10px] text-slate-400 dark:text-biophilic-dark-text-muted">Generate with no background</span>
                        </div>
                        <div 
                            onClick={() => setTransparent(!transparent)}
                            className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out flex items-center ${transparent ? 'bg-biophilic-green' : 'bg-slate-200 dark:bg-biophilic-dark-border'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${transparent ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white dark:bg-biophilic-dark-card rounded-2xl border border-biophilic-cream-dark dark:border-biophilic-dark-border shadow-sm">
                        <div className="flex flex-col">
                            <label htmlFor="magic-prompt" className="text-sm font-bold text-slate-700 dark:text-biophilic-dark-text cursor-pointer select-none flex items-center gap-1.5">   
                                <Sparkles size={14} className="text-biophilic-green" /> Magic Prompt
                            </label>
                            <span className="text-[10px] text-slate-400 dark:text-biophilic-dark-text-muted">Auto-enhance short ideas into detailed prompts</span>
                        </div>
                        <div 
                            onClick={() => setMagicPrompt(!magicPrompt)}
                            className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out flex items-center ${magicPrompt ? 'bg-biophilic-green' : 'bg-slate-200 dark:bg-biophilic-dark-border'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${magicPrompt ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs rounded-2xl flex gap-3 border border-red-100 dark:border-red-900/20">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{error}</span>
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="mt-8 w-full py-4 bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-biophilic-green-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-organic active:scale-95"
                >
                    {generating ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Building Artwork...
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            Generate Magic
                        </>
                    )}
                </button>
            </div>

            <div className="p-4 px-6 bg-biophilic-cream/30 dark:bg-biophilic-dark-card/50 border-t border-biophilic-cream-dark dark:border-biophilic-dark-border">
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest">
                    <Info size={14} className="text-biophilic-green" />
                    <p>Auto-saved to assets folder</p>
                </div>
            </div>
        </div>
    );
};

export default AIPrompt;
