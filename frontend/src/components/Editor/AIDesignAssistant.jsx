import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Loader2, Wand2 } from 'lucide-react';
import { api } from '../../store/useCanvasStore';

const AIDesignAssistant = ({ canvasRef, projectId }) => {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [updatedJson, setUpdatedJson] = useState(null);
    const [error, setError] = useState('');

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
                projectId
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
        <div className="p-6 flex flex-col h-full">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="text-purple-600" size={20} />
                    Design Assistant
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                    Let AI review your design and suggest professional improvements.
                </p>
            </div>

            {!suggestions.length && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                        <Wand2 size={32} />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Ready to help?</p>
                    <p className="text-xs text-gray-400 mt-2 mb-6 max-w-[200px]">
                        I'll analyze your current layout, colors, and typography.
                    </p>
                    <button
                        onClick={handleAnalyze}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        Analyze My Design
                    </button>
                </div>
            )}

            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <Loader2 className="animate-spin text-purple-600 mb-4" size={40} />
                    <p className="text-sm font-medium text-gray-700">Reviewing your masterpiece...</p>
                    <p className="text-xs text-gray-400 mt-2">Gemini is thinking about improvements.</p>
                </div>
            )}

            {suggestions.length > 0 && !loading && (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-purple-50 rounded-xl p-4 mb-6 border border-purple-100">
                        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">AI Suggestions</h4>
                        <ul className="space-y-3">
                            {suggestions.map((s, i) => (
                                <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                                    <CheckCircle2 size={16} className="text-purple-500 shrink-0 mt-0.5" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-auto">
                        <p className="text-[10px] text-gray-400 text-center mb-3">
                            Click below to automatically apply these changes.
                        </p>
                        <button
                            onClick={handleApply}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Sparkles size={16} />
                            Apply AI Improvements
                        </button>
                        <button
                            onClick={() => setSuggestions([])}
                            className="w-full py-3 mt-2 text-gray-500 hover:text-gray-700 font-medium text-sm transition-all"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {error}
                </div>
            )}
        </div>
    );
};

export default AIDesignAssistant;
