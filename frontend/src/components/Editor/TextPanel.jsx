import React, { useState } from 'react';
import { Type, Plus, Search } from 'lucide-react';

const FONTS = [
    "Inter", "Roboto", "Open Sans", "Oswald", "Lora", "Merriweather", 
    "Playfair Display", "Montserrat", "Pacifico", "Dancing Script", "Caveat", "Anton"
];

const TextPanel = ({ canvasRef }) => {
    const [textInput, setTextInput] = useState('');
    const [selectedFont, setSelectedFont] = useState('Inter');
    const [selectedSize, setSelectedSize] = useState('heading'); // heading, subheading, body

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

        canvasRef.current?.addText({
            text: content,
            fontFamily: selectedFont,
            fontSize: fontSize,
            fontWeight: fontWeight
        });
        
        if (textInput.trim()) {
            setTextInput('');
        }
    };

    return (
        <div className="p-5 h-full flex flex-col gap-8 bg-slate-50/50 dark:bg-biophilic-dark-surface transition-colors">
            {/* Input Preview */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add Text</h3>
                <input
                    type="text"
                    placeholder="Type your message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full bg-biophilic-cream dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border text-slate-900 dark:text-biophilic-dark-text rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-biophilic-green/30 focus:border-biophilic-green outline-none shadow-sm transition-all"
                />
            </div>

            {/* Quick Presets */}
            <div className="space-y-3">
                <button
                    onClick={() => { setSelectedSize('heading'); handleAddText('heading'); }}
                    className="w-full py-4 px-6 bg-white dark:bg-biophilic-dark-card border border-slate-100 dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green text-left transition-all group"
                >
                    <span className="block text-2xl font-bold dark:text-biophilic-dark-text group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green transition-colors">Add a heading</span>
                </button>
                <button
                    onClick={() => { setSelectedSize('subheading'); handleAddText('subheading'); }}
                    className="w-full py-3 px-6 bg-white dark:bg-biophilic-dark-card border border-slate-100 dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green text-left transition-all group"
                >
                    <span className="block text-lg font-semibold dark:text-biophilic-dark-text group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green transition-colors">Add a subheading</span>
                </button>
                <button
                    onClick={() => { setSelectedSize('body'); handleAddText('body'); }}
                    className="w-full py-2 px-6 bg-white dark:bg-biophilic-dark-card border border-slate-200 dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green text-left transition-all group"
                >
                    <span className="block text-sm dark:text-biophilic-dark-text group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green transition-colors">Add a little bit of body text</span>
                </button>
            </div>

            {/* Font Selector */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Choose Font</h3>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {FONTS.map(font => (
                        <button
                            key={font}
                            onClick={() => setSelectedFont(font)}
                            style={{ fontFamily: font }}
                            className={`w-full px-4 py-3 rounded-lg text-left transition-all border ${
                                selectedFont === font 
                                ? 'bg-biophilic-green/10 dark:bg-biophilic-dark-green/10 border-biophilic-green dark:border-biophilic-dark-green text-biophilic-moss dark:text-biophilic-dark-green font-bold' 
                                : 'bg-white dark:bg-biophilic-dark-card border-transparent dark:border-biophilic-dark-border/40 hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-border text-slate-700 dark:text-biophilic-dark-text-muted'
                            }`}
                        >
                            {font}
                        </button>
                    ))}
                </div>
            </div>
            
            <button
                onClick={() => handleAddText(selectedSize)}
                className="mt-auto w-full py-3 bg-biophilic-green hover:bg-biophilic-green-dark text-white rounded-xl font-bold transition-all shadow-organic flex items-center justify-center gap-2 active:scale-95"
            >
                <Plus size={18} />
                Add text to design
            </button>
        </div>
    );
};

export default TextPanel;
