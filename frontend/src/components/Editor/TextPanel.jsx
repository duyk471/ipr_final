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
        <div className="p-5 h-full flex flex-col gap-8 bg-slate-50/50 dark:bg-[#1E293B] transition-colors">
            {/* Input Preview */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add Text</h3>
                <input
                    type="text"
                    placeholder="Type your message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-600/20 outline-none shadow-sm"
                />
            </div>

            {/* Quick Presets */}
            <div className="space-y-3">
                <button
                    onClick={() => { setSelectedSize('heading'); handleAddText('heading'); }}
                    className="w-full py-4 px-6 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 text-left transition-all group"
                >
                    <span className="block text-2xl font-bold dark:text-slate-100 group-hover:text-slate-800 dark:group-hover:text-slate-400">Add a heading</span>
                </button>
                <button
                    onClick={() => { setSelectedSize('subheading'); handleAddText('subheading'); }}
                    className="w-full py-3 px-6 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 text-left transition-all group"
                >
                    <span className="block text-lg font-semibold dark:text-slate-100 group-hover:text-slate-800 dark:group-hover:text-slate-400">Add a subheading</span>
                </button>
                <button
                    onClick={() => { setSelectedSize('body'); handleAddText('body'); }}
                    className="w-full py-2 px-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 text-left transition-all group"
                >
                    <span className="block text-sm dark:text-slate-100 group-hover:text-slate-800 dark:group-hover:text-slate-400">Add a little bit of body text</span>
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
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold' 
                                : 'bg-white dark:bg-slate-700 border-transparent hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            {font}
                        </button>
                    ))}
                </div>
            </div>
            
            <button
                onClick={() => handleAddText(selectedSize)}
                className="mt-auto w-full py-3 bg-[#1E293B] hover:bg-[#0B1120] text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
                <Plus size={18} />
                Add text to design
            </button>
        </div>
    );
};

export default TextPanel;
