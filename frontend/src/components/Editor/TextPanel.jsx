import React, { useState } from 'react';
import { Type, Plus, Search, ChevronRight, Sparkles } from 'lucide-react';
import { useFonts } from '../../hooks/useFonts';

const TextPanel = ({ canvasRef }) => {
    const { fontsByCategory, loading } = useFonts();
    const [textInput, setTextInput] = useState('');
    const [selectedFont, setSelectedFont] = useState('Inter');
    const [selectedSize, setSelectedSize] = useState('heading'); // heading, subheading, body
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddText = (type = 'body') => {
        let content = textInput.trim();
        let fontSize = 18;
        let fontWeight = 'normal';

        if (type === 'heading') {
            content = content || 'Add a heading';
            fontSize = 64;
            fontWeight = 'bold';
        } else if (type === 'subheading') {
            content = content || 'Add a subheading';
            fontSize = 36;
            fontWeight = 'normal';
        } else {
            content = content || 'Add body text';
            fontSize = 18;
            fontWeight = 'normal';
        }

        // Preload font before adding to canvas
        document.fonts.load(`16px "${selectedFont}"`).then(() => {
            canvasRef.current?.addText({
                text: content,
                fontFamily: selectedFont,
                fontSize: fontSize,
                fontWeight: fontWeight
            });
        });
        
        if (textInput.trim()) {
            setTextInput('');
        }
    };

    const categories = {
        'sans-serif': 'Modern Sans',
        'serif': 'Classic Serif',
        'display': 'Bold Display',
        'handwriting': 'Script & Handwritten'
    };

    return (
        <div className="p-5 h-full flex flex-col gap-6 bg-slate-50/50 dark:bg-biophilic-dark-surface transition-colors overflow-hidden">
            {/* Input Preview */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-[0.2em]">Add Text</h3>
                    <Sparkles size={14} className="text-biophilic-green/40" />
                </div>
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Type something magical..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        className="w-full bg-white dark:bg-biophilic-dark-card border-2 border-biophilic-cream-dark dark:border-biophilic-dark-border text-slate-900 dark:text-biophilic-dark-text rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-biophilic-green/10 focus:border-biophilic-green outline-none shadow-sm transition-all group-hover:border-biophilic-green/30"
                    />
                </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-1 gap-2">
                <button
                    onClick={() => { setSelectedSize('heading'); handleAddText('heading'); }}
                    className="w-full py-3 px-5 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green dark:hover:border-biophilic-dark-green text-left transition-all group hover:shadow-organic-sm"
                >
                    <span className="block text-xl font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight">Add Heading</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => { setSelectedSize('subheading'); handleAddText('subheading'); }}
                        className="py-2.5 px-4 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green dark:hover:border-biophilic-dark-green text-left transition-all group hover:shadow-organic-sm"
                    >
                        <span className="block text-sm font-bold text-biophilic-moss/80 dark:text-biophilic-dark-text">Subheading</span>
                    </button>
                    <button
                        onClick={() => { setSelectedSize('body'); handleAddText('body'); }}
                        className="py-2.5 px-4 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green dark:hover:border-biophilic-dark-green text-left transition-all group hover:shadow-organic-sm"
                    >
                        <span className="block text-xs font-medium text-slate-500 dark:text-biophilic-dark-text-muted">Body Text</span>
                    </button>
                </div>
            </div>

            {/* Font Selector */}
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-[0.2em]">Typography</h3>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                            type="text" 
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-lg text-[10px] focus:outline-none focus:border-biophilic-green transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-slate-300 animate-pulse">
                            <Type size={32} />
                        </div>
                    ) : (
                        Object.entries(fontsByCategory).map(([catId, fonts]) => {
                            const filteredFonts = fonts.filter(f => f.family.toLowerCase().includes(searchTerm.toLowerCase()));
                            if (filteredFonts.length === 0) return null;

                            return (
                                <div key={catId} className="space-y-2">
                                    <h4 className="text-[9px] font-black text-biophilic-moss/60 dark:text-biophilic-dark-text-muted uppercase tracking-widest pl-2">{categories[catId] || catId}</h4>
                                    <div className="grid grid-cols-1 gap-1">
                                        {filteredFonts.map(font => (
                                            <button
                                                key={font.family}
                                                onClick={() => setSelectedFont(font.family)}
                                                style={{ fontFamily: font.family }}
                                                className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between group ${
                                                    selectedFont === font.family 
                                                    ? 'bg-biophilic-green text-white dark:bg-biophilic-dark-green dark:text-biophilic-dark-bg shadow-organic-md translate-x-1' 
                                                    : 'bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border hover:border-biophilic-green dark:hover:border-biophilic-dark-green text-slate-700 dark:text-biophilic-dark-text'
                                                }`}
                                            >
                                                <span className="text-base truncate">{font.family}</span>
                                                {selectedFont === font.family && <ChevronRight size={14} className="shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            <button
                onClick={() => handleAddText(selectedSize)}
                className="w-full py-4 bg-biophilic-moss dark:bg-biophilic-dark-green hover:bg-biophilic-bark dark:hover:bg-biophilic-green text-white dark:text-biophilic-dark-bg rounded-2xl font-black transition-all shadow-organic-lg flex items-center justify-center gap-3 active:scale-95 text-[13px] uppercase tracking-widest"
            >
                <Plus size={18} />
                Add to Canvas
            </button>
        </div>
    );
};

export default TextPanel;
