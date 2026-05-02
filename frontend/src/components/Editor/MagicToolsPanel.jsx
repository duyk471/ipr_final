import React, { useState, useRef } from 'react';
import { Wand2, ImagePlus, Type, Sparkles, Loader2, Info, Check, Palette } from 'lucide-react';
import * as fabric from 'fabric';
import { api } from '../../store/useCanvasStore';
import useCanvasStore from '../../store/useCanvasStore';
import useNotificationStore from '../../store/useNotificationStore';

const MagicToolsPanel = ({ canvasRef, selectedObject }) => {
    const { notify } = useNotificationStore();
    const [activeTab, setActiveTab] = useState('vision'); // 'vision' | 'text'

    // Vision State
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [visionGenerating, setVisionGenerating] = useState(false);
    const [visionResult, setVisionResult] = useState('');
    const [extractedStyles, setExtractedStyles] = useState(null);
    const [styleGenerating, setStyleGenerating] = useState(false);
    const fileInputRef = useRef(null);
    
    // Store Actions
    const setGlobalStyleTags = useCanvasStore(state => state.setGlobalStyleTags);
    const saveAssetToProject = useCanvasStore(state => state.saveAssetToProject);
    const setActiveLeftPanel = useCanvasStore(state => state.setActiveLeftPanel);

    // Text State
    const [keyword, setKeyword] = useState('');
    const [textGenerating, setTextGenerating] = useState(false);
    const [textResult, setTextResult] = useState('');

    // Theme State
    const [mood, setMood] = useState('');
    const [themeGenerating, setThemeGenerating] = useState(false);
    const [themeResult, setThemeResult] = useState(null);

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleDescribeImage = async () => {
        if (!imagePreview) return;
        setVisionGenerating(true);
        setVisionResult('');

        try {
            const res = await api.post('/ai/describe-image', { image: imagePreview });
            if (res.data.success && res.data.description) {
                setVisionResult(res.data.description);
                notify({ message: 'Image analyzed successfully.', type: 'success' });
            } else {
                notify({ message: 'Failed to describe image.', type: 'error' });
            }
        } catch (error) {
            console.error('Vision AI Error:', error);
            notify({ message: error.response?.data?.message || 'Error communicating with AI Vision service.', type: 'error' });
        } finally {
            setVisionGenerating(false);
        }
    };

    const handleExtractStyles = async () => {
        if (!imagePreview) return;
        setStyleGenerating(true);
        setExtractedStyles(null);

        try {
            // Remove data:image/... base64 prefix
            const base64Data = imagePreview.split(',')[1];
            const res = await api.post('/ai/extract-styles', { base64Image: base64Data });
            
            if (res.data.success && res.data.styles) {
                setExtractedStyles(res.data.styles);
                
                // Save reference image locally
                if (imageFile) {
                    try {
                        const newFilename = `style_ref_${Date.now()}_${imageFile.name}`;
                        await saveAssetToProject(imageFile, newFilename);
                    } catch (e) {
                        console.warn('Could not save reference to project assets', e);
                    }
                }
                
                notify({ message: 'Styles extracted successfully.', type: 'success' });
            } else {
                notify({ message: 'Failed to extract styles.', type: 'error' });
            }
        } catch (error) {
            console.error('Style AI Error:', error);
            notify({ message: error.response?.data?.message || 'Error communicating with AI Vision service.', type: 'error' });
        } finally {
            setStyleGenerating(false);
        }
    };

    const handleGenerateText = async () => {
        if (!keyword.trim()) return;
        setTextGenerating(true);
        setTextResult('');

        try {
            const res = await api.post('/ai/generate-text', { keyword });
            if (res.data.success && res.data.text) {
                setTextResult(res.data.text);
                notify({ message: 'Content generated successfully.', type: 'success' });
            } else {
                notify({ message: 'Failed to generate content.', type: 'error' });
            }
        } catch (error) {
            console.error('Text AI Error:', error);
            notify({ message: error.response?.data?.message || 'Error communicating with AI Text service.', type: 'error' });
        } finally {
            setTextGenerating(false);
        }
    };

    const applyToSelectedText = () => {
        if (!canvasRef.current) return;
        
        // Access the fabric canvas instance from the ref
        const canvas = canvasRef.current.canvas || (canvasRef.current.getActiveObject ? canvasRef.current : null);
        if (!canvas) return;

        const activeObj = canvas.getActiveObject();
        
        // Check for any text-like object type
        if (activeObj && activeObj.type.includes('text')) {
            activeObj.set({ text: textResult });
            canvas.renderAll();
            // Fire modified event to trigger history save
            canvas.fire('object:modified', { target: activeObj });
            notify({ message: 'Applied to selected text object.', type: 'success' });
        } else {
            notify({ message: 'Please select a text object on the canvas first.', type: 'warning' });
        }
    };

    const handleGenerateTheme = async () => {
        if (!mood.trim()) return;
        setThemeGenerating(true);
        setThemeResult(null);

        try {
            const canvas = canvasRef.current?.canvas;
            const canvasJson = canvas ? canvas.toObject(['id', 'metadata']) : null;

            const res = await api.post('/ai/generate-theme', { 
                mood,
                canvasJson 
            });
            if (res.data.success && res.data.hex_codes) {
                setThemeResult(res.data);
                notify({ message: 'Palette generated successfully.', type: 'success' });
            } else {
                notify({ message: 'Failed to generate theme.', type: 'error' });
            }
        } catch (error) {
            console.error('Theme AI Error:', error);
            notify({ message: error.response?.data?.message || 'Error communicating with AI service.', type: 'error' });
        } finally {
            setThemeGenerating(false);
        }
    };

    const applyThemeToProject = () => {
        console.log('Applying theme...', themeResult);
        if (!canvasRef.current || !themeResult) return;
        
        const canvas = canvasRef.current.canvas;
        if (!canvas) return;

        try {
            // Priority 1: Use the AI-curated JSON if available (Most robust)
            if (themeResult.updatedJson) {
                console.log('Applying AI-curated JSON theme...');
                // We need to load the objects from the new JSON. 
                // fabric.Canvas.loadFromJSON is the standard way.
                const json = themeResult.updatedJson;
                
                // If it's a nested structure from our AI, handle it
                const objects = json.layers || json.objects || (Array.isArray(json) ? json : null);
                
                if (objects) {
                    // Update existing objects by ID or index to preserve references
                    const canvasObjects = canvas.getObjects();
                    objects.forEach((newObj, idx) => {
                        const existingObj = canvasObjects[idx];
                        if (existingObj) {
                            // Apply only the visual properties (fill, stroke, backgroundColor)
                            if (newObj.fill) existingObj.set('fill', newObj.fill);
                            if (newObj.stroke) existingObj.set('stroke', newObj.stroke);
                            if (newObj.backgroundColor) existingObj.set('backgroundColor', newObj.backgroundColor);
                        }
                    });
                    
                    // Handle canvas background
                    const bgColor = json.canvas?.backgroundColor || json.backgroundColor || themeResult.hex_codes?.[0];
                    if (bgColor) {
                        canvas.backgroundColor = bgColor;
                        if (canvas.setBackgroundColor) canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));
                    }
                }
            } else if (themeResult.hex_codes) {
                // Fallback to manual mapping if updatedJson is missing
                const colors = themeResult.hex_codes;
                const bgColor = colors[0];
                canvas.backgroundColor = bgColor;
                if (canvas.setBackgroundColor) canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));

                const objects = canvas.getObjects();
                objects.forEach((obj, idx) => {
                    const type = obj.type.toLowerCase();
                    if (type.includes('text')) {
                        obj.set('fill', obj.fontSize > 30 ? colors[1] : colors[2]);
                    } else if (['rect', 'circle', 'triangle', 'polygon', 'path'].includes(type)) {
                        obj.set('fill', colors[3 + (idx % 2)] || colors[3]);
                    }
                });
            }

            canvas.requestRenderAll();
            canvas.fire('object:modified');
            notify({ message: `Applied "${themeResult.palette_name}" to project!`, type: 'success' });
        } catch (err) {
            console.error('Apply Theme Error:', err);
            notify({ message: 'Error applying theme. Check console for details.', type: 'error' });
        }
    };

    const isTextSelected = selectedObject && selectedObject.type && selectedObject.type.includes('text');

    return (
        <div className="flex flex-col h-full bg-slate-50/30 dark:bg-biophilic-dark-surface transition-colors">
            <div className="p-5 border-b border-biophilic-cream-dark dark:border-biophilic-dark-border flex items-center gap-2">
                <Wand2 className="text-biophilic-green dark:text-biophilic-dark-green" size={20} />
                <h3 className="font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight text-[15px]">Magic Tools</h3>
            </div>

            <div className="flex p-4 gap-2 border-b border-biophilic-cream-dark dark:border-biophilic-dark-border">
                <button
                    onClick={() => setActiveTab('vision')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border flex items-center justify-center gap-1.5 ${
                        activeTab === 'vision'
                            ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white border-biophilic-green-dark shadow-organic-sm scale-[1.02]'
                            : 'bg-white dark:bg-biophilic-dark-card text-slate-400 dark:text-biophilic-dark-text-muted border-biophilic-cream-dark dark:border-biophilic-dark-border hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-border'
                    }`}
                >
                    <ImagePlus size={14} /> Vision
                </button>
                <button
                    onClick={() => setActiveTab('text')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border flex items-center justify-center gap-1.5 ${
                        activeTab === 'text'
                            ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white border-biophilic-green-dark shadow-organic-sm scale-[1.02]'
                            : 'bg-white dark:bg-biophilic-dark-card text-slate-400 dark:text-biophilic-dark-text-muted border-biophilic-cream-dark dark:border-biophilic-dark-border hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-border'
                    }`}
                >
                    <Type size={14} /> Write
                </button>
                <button
                    onClick={() => setActiveTab('theme')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border flex items-center justify-center gap-1.5 ${
                        activeTab === 'theme'
                            ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white border-biophilic-green-dark shadow-organic-sm scale-[1.02]'
                            : 'bg-white dark:bg-biophilic-dark-card text-slate-400 dark:text-biophilic-dark-text-muted border-biophilic-cream-dark dark:border-biophilic-dark-border hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-border'
                    }`}
                >
                    <Palette size={14} /> Theme
                </button>
            </div>

            <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                
                {/* --- VISION TAB --- */}
                {activeTab === 'vision' && (
                    <div className="space-y-6">
                        <p className="text-[11px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest leading-relaxed">
                            Upload an image to generate descriptive keywords or captions using AI.
                        </p>

                        <div 
                            className="w-full aspect-video border-2 border-dashed border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-2xl flex flex-col items-center justify-center bg-white dark:bg-biophilic-dark-card cursor-pointer hover:border-biophilic-green dark:hover:border-biophilic-dark-green transition-all overflow-hidden relative group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Change Image</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-biophilic-dark-text-muted">
                                    <ImagePlus size={24} className="mx-auto mb-2 text-biophilic-green/50 dark:text-biophilic-dark-green/50" />
                                    <span className="text-xs font-bold">Click to upload image</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                className="hidden" 
                            />
                        </div>

                        <button
                            onClick={handleExtractStyles}
                            disabled={!imagePreview || visionGenerating || styleGenerating}
                            className="w-full py-4 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-biophilic-green-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-organic-md text-[13px] uppercase tracking-widest"
                        >
                            {styleGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {styleGenerating ? 'Analyzing Vision...' : 'Describe & Extract Styles'}
                        </button>

                        {extractedStyles && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pt-2 border-t border-biophilic-cream-dark dark:border-biophilic-dark-border">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-biophilic-moss dark:text-biophilic-dark-green">
                                        Style Reference Results
                                    </label>
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted italic">Click to apply & go to AI Gen</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {extractedStyles.map((style, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => {
                                                setGlobalStyleTags(style.tags);
                                                notify({ message: `Applied '${style.name}'! Redirecting to AI Generator...`, type: 'success' });
                                                // Redirect to AI GEN tab in left sidebar
                                                setTimeout(() => setActiveLeftPanel('ai'), 500);
                                            }}
                                            className="group relative bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-2xl p-5 cursor-pointer hover:border-biophilic-green dark:hover:border-biophilic-dark-green transition-all shadow-organic-sm hover:shadow-organic-md flex flex-col gap-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-biophilic-moss dark:text-white tracking-tight uppercase">{style.name}</h4>
                                                <Sparkles size={14} className="text-biophilic-green opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-biophilic-dark-text-muted leading-relaxed font-medium">{style.tags}</p>
                                            
                                            <div className="absolute inset-0 bg-biophilic-green/95 dark:bg-biophilic-dark-green/95 rounded-2xl flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0">
                                                <div className="bg-white/20 p-2 rounded-full">
                                                    <Check size={24} className="text-white" />
                                                </div>
                                                <span className="text-white text-xs font-black tracking-widest uppercase">Use This Style</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TEXT TAB --- */}
                {activeTab === 'text' && (
                    <div className="space-y-6">
                        <p className="text-[11px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest leading-relaxed">
                            Generate creative content, slogans, or descriptions based on a keyword.
                        </p>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-biophilic-dark-text-muted">
                                Keyword or Topic
                            </label>
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="E.g., Sustainable fashion"
                                className="w-full px-4 py-3 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-biophilic-green/20 text-sm text-slate-700 dark:text-biophilic-dark-text"
                                disabled={textGenerating}
                            />
                        </div>

                        <button
                            onClick={handleGenerateText}
                            disabled={!keyword.trim() || textGenerating}
                            className="w-full py-3 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-biophilic-green-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
                        >
                            {textGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {textGenerating ? 'Writing...' : 'Generate Content'}
                        </button>

                        {textResult && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-biophilic-moss dark:text-biophilic-dark-green mb-2">
                                        Generated Text
                                    </label>
                                    <textarea
                                        value={textResult}
                                        onChange={(e) => setTextResult(e.target.value)}
                                        className="w-full h-32 p-4 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-biophilic-green/20 text-sm text-slate-700 dark:text-biophilic-dark-text leading-relaxed"
                                    />
                                </div>

                                <button
                                    onClick={applyToSelectedText}
                                    className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                        isTextSelected
                                            ? 'bg-biophilic-green/10 text-biophilic-green-dark hover:bg-biophilic-green/20 dark:bg-biophilic-dark-green/20 dark:text-biophilic-dark-text'
                                            : 'bg-slate-100 text-slate-400 dark:bg-biophilic-dark-border dark:text-biophilic-dark-text-muted cursor-not-allowed'
                                    }`}
                                >
                                    <Check size={16} />
                                    Apply to Selected Text
                                </button>
                                
                                {!isTextSelected && (
                                    <p className="text-[10px] text-center text-slate-400 dark:text-biophilic-dark-text-muted italic flex items-center justify-center gap-1">
                                        <Info size={12} /> Select a text object on canvas to apply
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- THEME TAB --- */}
                {activeTab === 'theme' && (
                    <div className="space-y-6">
                        <p className="text-[11px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest leading-relaxed">
                            Generate a cohesive color palette from a mood and apply it to your entire design.
                        </p>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-biophilic-dark-text-muted">
                                Describe Mood or Vibe
                            </label>
                            <input
                                type="text"
                                value={mood}
                                onChange={(e) => setMood(e.target.value)}
                                placeholder="E.g., Cyberpunk neon, Calm forest..."
                                className="w-full px-4 py-3 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-biophilic-green/20 text-sm text-slate-700 dark:text-biophilic-dark-text"
                                disabled={themeGenerating}
                            />
                        </div>

                        <button
                            onClick={handleGenerateTheme}
                            disabled={!mood.trim() || themeGenerating}
                            className="w-full py-3 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-biophilic-green-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
                        >
                            {themeGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {themeGenerating ? 'Curating Palette...' : 'Generate Theme'}
                        </button>

                        {themeResult && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-biophilic-moss dark:text-biophilic-dark-green mb-2">
                                        {themeResult.palette_name || 'Generated Palette'}
                                    </label>
                                    <div className="flex w-full h-12 rounded-xl overflow-hidden shadow-inner border border-biophilic-cream-dark dark:border-biophilic-dark-border">
                                        {themeResult.hex_codes.map((hex, idx) => (
                                            <div 
                                                key={idx} 
                                                className="flex-1 h-full group relative cursor-pointer hover:flex-[1.5] transition-all duration-300"
                                                style={{ backgroundColor: hex }}
                                                title={hex}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                                    <span className="text-[9px] text-white font-bold uppercase tracking-wider">{hex}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={applyThemeToProject}
                                    className="w-full py-3 bg-biophilic-green text-white hover:bg-biophilic-green-dark rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(74,92,75,0.3)] hover:shadow-[0_0_25px_rgba(74,92,75,0.5)] dark:shadow-dark-green-glow"
                                >
                                    <Check size={16} />
                                    Apply Theme to Project
                                </button>
                                
                                <p className="text-[10px] text-center text-slate-400 dark:text-biophilic-dark-text-muted italic flex items-center justify-center gap-1">
                                    <Info size={12} /> This will update colors of existing objects on canvas
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MagicToolsPanel;
