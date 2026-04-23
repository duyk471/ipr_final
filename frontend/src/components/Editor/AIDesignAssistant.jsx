import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Loader2, Wand2 } from 'lucide-react';
import { api } from '../../store/useCanvasStore';

const AIDesignAssistant = ({ canvasRef, projectId }) => {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [updatedJson, setUpdatedJson] = useState(null);
    const [error, setError] = useState('');
    const [assistantPrompt, setAssistantPrompt] = useState('');

    const handleAnalyze = async () => {
        if (!canvasRef.current) return;

        setLoading(true);
        setError('');
        setSuggestions([]);
        setUpdatedJson(null);

        try {
            const snapshot = canvasRef.current.getDesignSnapshot();
            if (!snapshot) throw new Error('Could not get canvas snapshot');

            const res = await api.post('/ai/analyze-design', {
                screenshot: snapshot.screenshot,
                canvasJson: snapshot.json,
                projectId,
                userPrompt: assistantPrompt.trim()
            });

            if (res.data.success) {
                setSuggestions(res.data.suggestions || []);
                setUpdatedJson(res.data.updatedJson);
            } else {
                throw new Error(res.data.message || 'Analysis failed');
            }
        } catch (err) {
            console.error('AI Analysis Error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to analyze design');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (!updatedJson || !canvasRef.current) return;

        try {
            await canvasRef.current.loadDesign(updatedJson);
            setUpdatedJson(null);
            setSuggestions([]);
        } catch (err) {
            setError('Failed to apply improvements: ' + err.message);
        }
    };

    return (
        <div className="p-6 flex flex-col h-full bg-slate-50/30 dark:bg-biophilic-dark-surface transition-colors overflow-y-auto custom-scrollbar">
            <div className="mb-6">
                <h3 className="text-lg font-black text-biophilic-moss dark:text-biophilic-dark-text flex items-center gap-2 tracking-tight">
                    <Sparkles className="text-biophilic-green dark:text-biophilic-dark-green" size={20} />
                    Design Assistant
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest mt-1">
                    Let AI review and improve your design
                </p>
                <div className="mt-6">
                    <label htmlFor="design-assistant-prompt" className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-biophilic-dark-text-muted mb-3">
                        Design Objective
                    </label>
                    <textarea
                        id="design-assistant-prompt"
                        value={assistantPrompt}
                        onChange={(e) => setAssistantPrompt(e.target.value)}
                        placeholder="E.g. Make it look more premium, cleaner, and suitable for a fashion brand."
                        className="w-full min-h-24 rounded-2xl border border-biophilic-cream-dark dark:border-biophilic-dark-border bg-white dark:bg-biophilic-dark-card px-4 py-3 text-sm text-slate-700 dark:text-biophilic-dark-text outline-none transition-all focus:border-biophilic-green focus:ring-4 focus:ring-biophilic-green/10 resize-none shadow-sm placeholder:text-slate-300 dark:placeholder:text-biophilic-dark-text-muted/40"
                        disabled={loading}
                    />
                    <p className="mt-2 text-[10px] text-slate-400 dark:text-biophilic-dark-text-muted italic">
                        Optional. Help the AI understand your specific vision.
                    </p>
                </div>
            </div>

            {!suggestions.length && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-[2rem] bg-white dark:bg-biophilic-dark-card/30">
                    <div className="w-16 h-16 bg-biophilic-green-light/40 dark:bg-biophilic-dark-green/10 text-biophilic-green dark:text-biophilic-dark-green rounded-2xl flex items-center justify-center mb-5 shadow-organic-sm">
                        <Wand2 size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-biophilic-dark-text">AI Ready to Help</p>
                    <p className="text-xs text-slate-400 dark:text-biophilic-dark-text-muted mt-2 mb-8 max-w-[220px] leading-relaxed">
                        Press analyze to get feedback on your layout, colors, and overall design composition.
                    </p>
                    <button
                        onClick={handleAnalyze}
                        className="w-full py-4 bg-biophilic-green dark:bg-biophilic-dark-green hover:bg-biophilic-green-dark text-white dark:text-biophilic-dark-bg rounded-2xl font-bold text-sm transition-all shadow-organic active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Sparkles size={18} />
                        Analyze My Design
                    </button>
                </div>
            )}

            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-6">
                        <Loader2 className="animate-spin text-biophilic-green" size={48} />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-biophilic-moss dark:text-biophilic-dark-green opacity-50" size={20} />
                    </div>
                    <p className="text-sm font-bold text-biophilic-moss dark:text-biophilic-dark-text">Reviewing your masterpiece...</p>
                    <p className="text-xs text-slate-400 dark:text-biophilic-dark-text-muted mt-2">Gemini is finding the perfect improvements.</p>
                </div>
            )}

            {suggestions.length > 0 && !loading && (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-biophilic-dark-card rounded-2xl p-5 mb-6 border border-biophilic-cream-dark dark:border-biophilic-dark-border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 size={16} className="text-biophilic-green" />
                            <h4 className="text-xs font-black text-biophilic-moss dark:text-biophilic-dark-text uppercase tracking-widest">AI Insights</h4>
                        </div>
                        <ul className="space-y-4">
                            {suggestions.map((s, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-biophilic-dark-text-muted leading-relaxed">
                                    <div className="w-1.5 h-1.5 rounded-full bg-biophilic-green/60 mt-1.5 shrink-0" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-auto pt-4 space-y-3">
                        <p className="text-[10px] text-slate-400 dark:text-biophilic-dark-text-muted text-center italic">
                            Applying these will update your canvas immediately.
                        </p>
                        <button
                            onClick={handleApply}
                            className="w-full py-4 bg-biophilic-green dark:bg-biophilic-dark-green hover:bg-biophilic-green-dark text-white dark:text-biophilic-dark-bg rounded-2xl font-bold text-sm transition-all shadow-organic active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Wand2 size={18} />
                            Apply AI Improvements
                        </button>
                        <button
                            onClick={() => setSuggestions([])}
                            className="w-full py-3 text-slate-400 dark:text-biophilic-dark-text-muted hover:text-biophilic-moss dark:hover:text-biophilic-dark-green font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            Start New Analysis
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs rounded-2xl flex gap-3 border border-red-100 dark:border-red-900/20">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                </div>
            )}
        </div>
    );
};

export default AIDesignAssistant;
