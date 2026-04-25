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
            <div className="flex items-center gap-6 h-full px-4 w-full text-sm">
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[10px] font-black text-biophilic-moss/60 dark:text-biophilic-dark-text-muted uppercase tracking-[0.15em]">Background</span>
                    <div className="relative group">
                        <input 
                            type="color" 
                            value={backgroundColor} 
                            onChange={(e) => handleBackgroundColorChange(e.target.value)} 
                            className="w-8 h-8 rounded-lg border-2 border-biophilic-cream-dark dark:border-biophilic-dark-border cursor-pointer overflow-hidden p-0 bg-transparent transition-transform group-hover:scale-110" 
                        />
                    </div>
                </div>
                <div className="w-px h-6 bg-biophilic-cream-dark dark:bg-biophilic-dark-border"></div>
                <div className="text-[11px] font-black text-biophilic-moss/40 dark:text-biophilic-dark-text-muted uppercase tracking-widest">
                    Canvas Size: <span className="text-biophilic-moss dark:text-biophilic-dark-text">{canvasSize.width} × {canvasSize.height} px</span>
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
                <div className="relative group">
                    <input
                        type="color"
                        value={selectedObject.fill || '#000000'}
                        onChange={(e) => handleChange('fill', e.target.value)}
                        className="w-8 h-8 rounded-lg border-2 border-biophilic-cream-dark dark:border-biophilic-dark-border cursor-pointer p-0 bg-transparent transition-transform group-hover:scale-110"
                        title="Fill Color"
                    />
                </div>
            </div>

            <div className="w-px h-6 bg-biophilic-cream-dark dark:bg-biophilic-dark-border"></div>

            {/* Position & Size */}
            <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-biophilic-moss/40 dark:text-biophilic-dark-text-muted uppercase">W</span>
                    <input
                        type="number"
                        min="1"
                        value={selectedObject.width || 0}
                        onChange={(e) => handleChange('width', Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-16 px-2 py-1.5 text-xs bg-biophilic-cream/30 dark:bg-biophilic-dark-bg border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-lg focus:border-biophilic-green focus:outline-none font-bold text-biophilic-moss dark:text-biophilic-dark-text transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-biophilic-moss/40 dark:text-biophilic-dark-text-muted uppercase">H</span>
                    <input
                        type="number"
                        min="1"
                        value={selectedObject.height || 0}
                        onChange={(e) => handleChange('height', Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-16 px-2 py-1.5 text-xs bg-biophilic-cream/30 dark:bg-biophilic-dark-bg border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-lg focus:border-biophilic-green focus:outline-none font-bold text-biophilic-moss dark:text-biophilic-dark-text transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-biophilic-moss/40 dark:text-biophilic-dark-text-muted uppercase">A</span>
                    <input
                        type="number"
                        min="-360"
                        max="360"
                        value={selectedObject.angle || 0}
                        onChange={(e) => {
                            let val = parseFloat(e.target.value) || 0;
                            if (val > 360) val = 360;
                            if (val < -360) val = -360;
                            handleChange('angle', val);
                        }}
                        className="w-16 px-2 py-1.5 text-xs bg-biophilic-cream/30 dark:bg-biophilic-dark-bg border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-lg focus:border-biophilic-green focus:outline-none font-bold text-biophilic-moss dark:text-biophilic-dark-text transition-all"
                    />
                </div>
            </div>

            {isText && (
                <>
                    <div className="w-px h-6 bg-biophilic-cream-dark dark:bg-biophilic-dark-border"></div>
                    {/* Typography */}
                    <div className="flex items-center gap-2 shrink-0">
                        <select
                            value={selectedObject.fontFamily || 'Inter'}
                            onChange={(e) => handleChange('fontFamily', e.target.value)}
                            className="px-3 py-1.5 text-xs bg-biophilic-cream/30 dark:bg-biophilic-dark-bg border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-lg focus:border-biophilic-green focus:outline-none font-bold text-biophilic-moss dark:text-biophilic-dark-text transition-all appearance-none cursor-pointer"
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
                            className="w-14 px-2 py-1.5 text-xs bg-biophilic-cream/30 dark:bg-biophilic-dark-bg border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-lg focus:border-biophilic-green focus:outline-none font-bold text-biophilic-moss dark:text-biophilic-dark-text"
                        />
                    </div>

                    {/* Text Style */}
                    <div className="flex items-center bg-biophilic-cream/30 dark:bg-biophilic-dark-bg border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-lg overflow-hidden shrink-0">
                        <button
                            onClick={() => {
                                canvasRef.current?.snapUndo();
                                handleChange('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold');
                            }}
                            className={`w-9 h-8 flex items-center justify-center font-black text-xs transition-all ${selectedObject.fontWeight === 'bold' ? 'bg-biophilic-green text-white dark:bg-biophilic-dark-green dark:text-biophilic-dark-bg' : 'text-biophilic-moss/60 dark:text-biophilic-dark-text-muted hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-surface'}`}
                        >
                            B
                        </button>
                        <div className="w-px h-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border"></div>
                        <button
                            onClick={() => {
                                canvasRef.current?.snapUndo();
                                handleChange('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic');
                            }}
                            className={`w-9 h-8 flex items-center justify-center font-serif italic text-xs transition-all ${selectedObject.fontStyle === 'italic' ? 'bg-biophilic-green text-white dark:bg-biophilic-dark-green dark:text-biophilic-dark-bg' : 'text-biophilic-moss/60 dark:text-biophilic-dark-text-muted hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-surface'}`}
                        >
                            I
                        </button>
                        <div className="w-px h-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border"></div>
                        <button
                            onClick={() => {
                                canvasRef.current?.snapUndo();
                                handleChange('underline', !selectedObject.underline);
                            }}
                            className={`w-9 h-8 flex items-center justify-center underline text-xs transition-all ${selectedObject.underline ? 'bg-biophilic-green text-white dark:bg-biophilic-dark-green dark:text-biophilic-dark-bg' : 'text-biophilic-moss/60 dark:text-biophilic-dark-text-muted hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-surface'}`}
                        >
                            U
                        </button>
                    </div>
                </>
            )}

            <div className="w-px h-6 bg-biophilic-cream-dark dark:bg-biophilic-dark-border"></div>

            {/* Opacity */}
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] font-black text-biophilic-moss/40 dark:text-biophilic-dark-text-muted uppercase tracking-widest">Opacity</span>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedObject.opacity || 1}
                    onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
                    className="w-20 accent-biophilic-green dark:accent-biophilic-dark-green"
                />
            </div>

            <div className="flex-1"></div>

            {/* Actions (Layering icons & Lock) */}
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => canvasRef.current?.bringToFront()}
                    className="p-1.5 text-biophilic-bark/60 hover:text-biophilic-moss dark:text-biophilic-dark-text-muted dark:hover:text-biophilic-dark-text hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-surface rounded-lg transition-all"
                    title="Bring to Front"
                >
                    <BringToFront size={18} />
                </button>
                <button
                    onClick={() => canvasRef.current?.bringForward()}
                    className="p-1.5 text-biophilic-bark/60 hover:text-biophilic-moss dark:text-biophilic-dark-text-muted dark:hover:text-biophilic-dark-text hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-surface rounded-lg transition-all"
                    title="Bring Forward"
                >
                    <ArrowUp size={18} />
                </button>
                <button
                    onClick={() => canvasRef.current?.sendBackwards()}
                    className="p-1.5 text-biophilic-bark/60 hover:text-biophilic-moss dark:text-biophilic-dark-text-muted dark:hover:text-biophilic-dark-text hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-surface rounded-lg transition-all"
                    title="Send Backward"
                >
                    <ArrowDown size={18} />
                </button>
                <button
                    onClick={() => canvasRef.current?.sendToBack()}
                    className="p-1.5 text-biophilic-bark/60 hover:text-biophilic-moss dark:text-biophilic-dark-text-muted dark:hover:text-biophilic-dark-text hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-surface rounded-lg transition-all"
                    title="Send to Back"
                >
                    <SendToBack size={18} />
                </button>
                
                <div className="w-px h-4 bg-biophilic-cream-dark mx-1 dark:bg-biophilic-dark-border"></div>
                
                <button
                    onClick={() => canvasRef.current?.toggleLock()}
                    className={`p-1.5 rounded-lg transition-all ${
                        selectedObject.isLocked 
                            ? 'bg-biophilic-green text-white dark:bg-biophilic-dark-green dark:text-biophilic-dark-bg shadow-organic-sm' 
                            : 'text-biophilic-bark/60 hover:text-biophilic-moss dark:text-biophilic-dark-text-muted dark:hover:text-biophilic-dark-text hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-surface'
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
