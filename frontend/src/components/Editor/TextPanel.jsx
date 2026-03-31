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

    const handleAddText = () => {
        let options = {
            fontFamily: selectedFont,
            text: textInput || (selectedSize === 'heading' ? 'Add a heading' : selectedSize === 'subheading' ? 'Add a subheading' : 'Add body text'),
            fontSize: selectedSize === 'heading' ? 64 : selectedSize === 'subheading' ? 36 : 18,
            fontWeight: selectedSize === 'heading' ? 'bold' : 'normal'
        };
        canvasRef.current?.addText(options);
    };

    return (
        <div className="p-5 h-full flex flex-col gap-8 bg-gray-50/50 dark:bg-gray-800 transition-colors">
            {/* Input Preview */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Add Text</h3>
                <input
                    type="text"
                    placeholder="Type your message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                />
            </div>

            {/* Quick Presets */}
            <div className="space-y-3">
                <button
                    onClick={() => { setSelectedSize('heading'); handleAddText(); }}
                    className="w-full py-4 px-6 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500 text-left transition-all group"
                >
                    <span className="block text-2xl font-bold dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Add a heading</span>
                </button>
                <button
                    onClick={() => { setSelectedSize('subheading'); handleAddText(); }}
                    className="w-full py-3 px-6 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500 text-left transition-all group"
                >
                    <span className="block text-lg font-semibold dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Add a subheading</span>
                </button>
                <button
                    onClick={() => { setSelectedSize('body'); handleAddText(); }}
                    className="w-full py-2 px-6 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500 text-left transition-all group"
                >
                    <span className="block text-sm dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Add a little bit of body text</span>
                </button>
            </div>

            {/* Font Selector */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Choose Font</h3>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {FONTS.map(font => (
                        <button
                            key={font}
                            onClick={() => setSelectedFont(font)}
                            style={{ fontFamily: font }}
                            className={`w-full px-4 py-3 rounded-lg text-left transition-all border ${
                                selectedFont === font 
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                                : 'bg-white dark:bg-gray-700 border-transparent hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {font}
                        </button>
                    ))}
                </div>
            </div>
            
            <button
                onClick={handleAddText}
                className="mt-auto w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
                <Plus size={18} />
                Add text to design
            </button>
        </div>
    );
};

export default TextPanel;
