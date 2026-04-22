import React, { useState, useEffect } from 'react';
import useCanvasStore from '../../store/useCanvasStore';
import { Lock, Unlock, ArrowUp, ArrowDown, BringToFront, SendToBack } from 'lucide-react';

const FONTS = [
    "Inter", "Roboto", "Open Sans", "Oswald", "Lora", "Merriweather", 
    "Playfair Display", "Montserrat", "Pacifico", "Dancing Script", "Caveat", "Anton"
];

const PropertiesPanel = ({ canvasRef }) => {
    const { selectedObject } = useCanvasStore();
    const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 });
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');

    // Update canvas info when not selecting any object
    useEffect(() => {
        if (canvasRef.current && !selectedObject) {
            const size = canvasRef.current.getCanvasSize();
            const bgColor = canvasRef.current.getBackgroundColor();
            if (size && size.width > 0 && size.height > 0) {
                setCanvasSize(size);
            }
            if (bgColor) {
                setBackgroundColor(bgColor);
            }
        }
    }, [canvasRef, selectedObject]);

    const handleBackgroundColorChange = (color) => {
        setBackgroundColor(color);
        canvasRef.current?.setBackgroundColor(color);
    };

    if (!selectedObject) {
        return (
            <div className="flex items-center gap-6 h-full px-2 w-full text-sm">
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Background</span>
                    <input 
                        type="color" 
                        value={backgroundColor} 
                        onChange={(e) => handleBackgroundColorChange(e.target.value)} 
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer overflow-hidden p-0" 
                    />
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                <div className="text-[13px] font-mono text-slate-500">
                    Canvas Size: {canvasSize.width} × {canvasSize.height} px
                </div>
            </div>
        );
    }

    const handleChange = (prop, value) => {
        canvasRef.current?.updateObject({ [prop]: value });
    };

    const isText = selectedObject.type.includes('text');

    return (
        <div className="flex items-center gap-5 h-full px-2 w-full text-sm">
            {/* Fill Color */}
            <div className="flex items-center gap-2 shrink-0">
                <input
                    type="color"
                    value={selectedObject.fill || '#000000'}
                    onChange={(e) => handleChange('fill', e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    title="Fill Color"
                />
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

            {/* Position & Size */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">W</span>
                    <input
                        type="number"
                        min="1"
                        value={selectedObject.width || 0}
                        onChange={(e) => handleChange('width', Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-16 px-2 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-600 focus:outline-none font-mono text-slate-700 dark:bg-[#0B1120] dark:text-slate-300 dark:border-slate-600"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">H</span>
                    <input
                        type="number"
                        min="1"
                        value={selectedObject.height || 0}
                        onChange={(e) => handleChange('height', Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-16 px-2 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-600 focus:outline-none font-mono text-slate-700 dark:bg-[#0B1120] dark:text-slate-300 dark:border-slate-600"
                    />
                </div>
            </div>

            {isText && (
                <>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                    {/* Typography */}
                    <div className="flex items-center gap-2 shrink-0">
                        <select
                            value={selectedObject.fontFamily || 'Inter'}
                            onChange={(e) => handleChange('fontFamily', e.target.value)}
                            className="px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-600 focus:outline-none bg-white text-slate-700 dark:bg-[#0B1120] dark:text-slate-300 dark:border-slate-600"
                            style={{ fontFamily: selectedObject.fontFamily || 'Inter' }}
                        >
                            {FONTS.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="1"
                            value={selectedObject.fontSize || 12}
                            onChange={(e) => handleChange('fontSize', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 px-2 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-600 focus:outline-none text-slate-700 dark:bg-[#0B1120] dark:text-slate-300 dark:border-slate-600"
                        />
                    </div>

                    {/* Text Style */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shrink-0 dark:bg-[#0B1120] dark:border-slate-600">
                        <button
                            onClick={() => {
                                canvasRef.current?.snapUndo();
                                handleChange('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold');
                            }}
                            className={`w-9 h-8 flex items-center justify-center font-bold text-[13px] transition-colors ${selectedObject.fontWeight === 'bold' ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                        >
                            B
                        </button>
                        <div className="w-px h-full bg-slate-200 dark:bg-slate-700"></div>
                        <button
                            onClick={() => {
                                canvasRef.current?.snapUndo();
                                handleChange('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic');
                            }}
                            className={`w-9 h-8 flex items-center justify-center font-serif italic text-[13px] transition-colors ${selectedObject.fontStyle === 'italic' ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                        >
                            I
                        </button>
                        <div className="w-px h-full bg-slate-200 dark:bg-slate-700"></div>
                        <button
                            onClick={() => {
                                canvasRef.current?.snapUndo();
                                handleChange('underline', !selectedObject.underline);
                            }}
                            className={`w-9 h-8 flex items-center justify-center underline text-[13px] transition-colors ${selectedObject.underline ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                        >
                            U
                        </button>
                    </div>
                </>
            )}

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

            {/* Opacity */}
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-medium text-slate-500">Opacity</span>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedObject.opacity || 1}
                    onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
                    className="w-24 accent-slate-800 dark:accent-slate-400"
                />
            </div>

            <div className="flex-1"></div>

            {/* Actions (Layering icons & Lock) */}
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => canvasRef.current?.bringToFront()}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Bring to Front"
                >
                    <BringToFront size={18} />
                </button>
                <button
                    onClick={() => canvasRef.current?.bringForward()}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Bring Forward"
                >
                    <ArrowUp size={18} />
                </button>
                <button
                    onClick={() => canvasRef.current?.sendBackwards()}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Send Backward"
                >
                    <ArrowDown size={18} />
                </button>
                <button
                    onClick={() => canvasRef.current?.sendToBack()}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Send to Back"
                >
                    <SendToBack size={18} />
                </button>
                
                <div className="w-px h-4 bg-slate-200 mx-1 dark:bg-slate-700"></div>
                
                <button
                    onClick={() => canvasRef.current?.toggleLock()}
                    className={`p-1.5 rounded-md transition-colors ${
                        selectedObject.isLocked 
                            ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white' 
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    }`}
                    title={selectedObject.isLocked ? "Unlock Layer" : "Lock Layer"}
                >
                    {selectedObject.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
            </div>
        </div>
    );
};

export default PropertiesPanel;
