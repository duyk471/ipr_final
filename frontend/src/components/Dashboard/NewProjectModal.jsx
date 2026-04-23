import React, { useState } from 'react';
import { X, Layout, Type as TypeIcon, Maximize2 } from 'lucide-react';

const NewProjectModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState(`Untitled ${new Date().toLocaleDateString()}`);
    const [width, setWidth] = useState(1080);
    const [height, setHeight] = useState(1080);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate({ name, width: Math.max(1, parseInt(width) || 1), height: Math.max(1, parseInt(height) || 1) });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-biophilic-dark-surface rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-biophilic-cream-dark dark:border-biophilic-dark-border">
                {/* Header */}
                <div className="p-6 px-8 border-b border-biophilic-cream-dark dark:border-biophilic-dark-border flex items-center justify-between bg-gradient-to-r from-biophilic-green-light/30 to-white dark:from-biophilic-dark-green/10 dark:to-biophilic-dark-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-biophilic-green rounded-xl flex items-center justify-center text-white shadow-organic border border-biophilic-green-dark">
                            <Layout size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-biophilic-dark-text tracking-tight">Create New Design</h2>
                            <p className="text-[10px] text-slate-500 dark:text-biophilic-dark-text-muted font-bold uppercase tracking-widest mt-0.5">Start with a blank canvas or a template</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-biophilic-dark-card hover:shadow-md rounded-full transition-all text-slate-400 dark:text-biophilic-dark-text-muted bg-slate-50 dark:bg-biophilic-dark-bg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row h-full">
                    {/* Left side: Inputs */}
                    <div className="flex-1 p-8 md:p-10 border-r border-biophilic-cream-dark dark:border-biophilic-dark-border space-y-8">
                        <div className="flex flex-col gap-2.5">
                            <label className="text-xs font-black text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest flex items-center gap-2">
                                <TypeIcon size={14} className="text-biophilic-green dark:text-biophilic-dark-green" />
                                Project Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Awesome Design"
                                required
                                className="w-full px-5 py-4 bg-biophilic-cream dark:bg-biophilic-dark-card border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-biophilic-green/10 focus:border-biophilic-green focus:bg-white dark:focus:bg-biophilic-dark-bg focus:outline-none transition-all text-lg font-bold text-slate-800 dark:text-biophilic-dark-text"
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <label className="text-xs font-black text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest flex items-center gap-2">
                                <Maximize2 size={14} className="text-biophilic-green dark:text-biophilic-dark-green" />
                                Custom Dimensions
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase ml-1">Width (px)</span>
                                    <input
                                        type="number"
                                        value={width}
                                        onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full px-5 py-4 bg-biophilic-cream dark:bg-biophilic-dark-card border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-biophilic-green/10 focus:border-biophilic-green focus:bg-white dark:focus:bg-biophilic-dark-bg focus:outline-none transition-all font-bold text-slate-800 dark:text-biophilic-dark-text"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase ml-1">Height (px)</span>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full px-5 py-4 bg-biophilic-cream dark:bg-biophilic-dark-card border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-biophilic-green/10 focus:border-biophilic-green focus:bg-white dark:focus:bg-biophilic-dark-bg focus:outline-none transition-all font-bold text-slate-800 dark:text-biophilic-dark-text"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 bg-slate-50 dark:bg-biophilic-dark-bg text-slate-500 dark:text-biophilic-dark-text-muted rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-biophilic-dark-card transition-all active:scale-[0.98] text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-[2] py-4 bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl font-bold shadow-organic hover:bg-biophilic-green-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                Create Blank
                            </button>
                        </div>
                    </div>

                    {/* Right side: Templates */}
                    <div className="flex-1 p-8 md:p-10 bg-slate-50/30 dark:bg-biophilic-dark-bg/20">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-black text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest">Popular Presets</span>
                            <div className="w-8 h-px bg-biophilic-cream-dark dark:bg-biophilic-dark-border flex-1 mx-4" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {[
                                { label: 'Instagram (1:1)', w: 1080, h: 1080 },
                                { label: 'Instagram Story', w: 1080, h: 1920 },
                                { label: 'FB Cover', w: 851, h: 315 },
                                { label: 'YouTube Thumb', w: 1280, h: 720 },
                                { label: 'Twitter Post', w: 1200, h: 675 },
                                { label: 'LinkedIn Banner', w: 1584, h: 396 },
                                { label: 'Pinterest Pin', w: 1000, h: 1500 },
                                { label: 'A4 Document', w: 794, h: 1123 },
                                { label: 'Business Card', w: 1050, h: 600 }
                            ].map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => { setWidth(preset.w); setHeight(preset.h); }}
                                    className={`p-4 rounded-2xl text-left transition-all border-2 flex flex-col gap-1 relative overflow-hidden group ${width === preset.w && height === preset.h ? 'bg-white dark:bg-biophilic-dark-card text-biophilic-moss dark:text-biophilic-dark-green border-biophilic-green dark:border-biophilic-dark-green shadow-md scale-[1.02]' : 'bg-white dark:bg-biophilic-dark-card text-slate-600 dark:text-biophilic-dark-text-muted border-transparent dark:border-biophilic-dark-border hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green hover:shadow-sm'}`}
                                >
                                    <span className="text-xs font-bold leading-tight">{preset.label}</span>
                                    <span className={`text-[10px] font-medium ${width === preset.w && height === preset.h ? 'text-biophilic-green' : 'text-slate-400 dark:text-biophilic-dark-text-muted'}`}>{preset.w} × {preset.h}</span>
                                    
                                    {width === preset.w && height === preset.h && (
                                        <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-biophilic-green rounded-full flex items-center justify-center text-white scale-75">
                                            <X size={14} className="rotate-45" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewProjectModal;
