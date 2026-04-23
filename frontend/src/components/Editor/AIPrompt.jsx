import React, { useState } from 'react';
import { Sparkles, Loader2, Info } from 'lucide-react';
import { api } from '../../store/useCanvasStore';

const AIPrompt = ({ canvasRef, projectId }) => {
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [transparent, setTransparent] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setGenerating(true);
        setError('');

        try {
            const res = await api.post('/ai/generate', {
                prompt: transparent ? `${prompt}, isolated on a plain white background` : prompt,
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
            setError(err.response?.data?.message || 'Error communicating with AI service. Make sure your GEMINI_API_KEY is valid and the model supports Image Generation.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white/80">
            <div className="p-4 border-b flex items-center gap-2">
                <Sparkles className="text-slate-500" size={20} />
                <h3 className="font-semibold text-slate-800">AI Image Generator</h3>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <p className="text-sm text-slate-500 mb-4">
                    Describe the image you want to create and AI will generate it directly onto your canvas.
                </p>

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g. A cute orange cat wearing traditional Vietnamese Ao Dai, 3d render..."
                    className="w-full h-32 p-3 border border-biophilic-cream-dark rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-biophilic-green/40 focus:border-biophilic-green mb-4 text-sm text-slate-700 bg-biophilic-cream/50"
                    disabled={generating}
                />

                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="transparent-bg"
                            checked={transparent}
                            onChange={(e) => setTransparent(e.target.checked)}
                            className="w-4 h-4 accent-biophilic-green border-slate-300 rounded focus:ring-biophilic-green"
                        />
                        <label htmlFor="transparent-bg" className="text-sm font-medium text-slate-700 cursor-pointer select-none">   
                            Transparent Background (Alpha)
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg flex gap-2">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="mt-auto w-full py-3 bg-biophilic-green text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-biophilic-green-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-organic"
                >
                    {generating ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            Generate Image
                        </>
                    )}
                </button>
            </div>

            <div className="p-4 bg-biophilic-cream/70 border-t mt-auto">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Info size={14} />
                    <p>Generated images are automatically saved to the project's assets folder.</p>
                </div>
            </div>
        </div>
    );
};

export default AIPrompt;
