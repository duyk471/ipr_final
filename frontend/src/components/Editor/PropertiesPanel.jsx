import React, { useState, useEffect } from 'react';
import useCanvasStore from '../../store/useCanvasStore';

const FONTS = [
    "Inter", "Roboto", "Open Sans", "Oswald", "Lora", "Merriweather", 
    "Playfair Display", "Montserrat", "Pacifico", "Dancing Script", "Caveat", "Anton"
];

const PropertiesPanel = ({ canvasRef }) => {
    const { selectedObject } = useCanvasStore();
    const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 });
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [removingBg, setRemovingBg] = useState(false);
    
    // Palette Extractor
    const [extractedColors, setExtractedColors] = useState([]);
    const [isExtracting, setIsExtracting] = useState(false);

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

    useEffect(() => {
        setExtractedColors([]);
    }, [selectedObject?.id]);

    const handleBackgroundColorChange = (color) => {
        setBackgroundColor(color);
        canvasRef.current?.setBackgroundColor(color);
    };

    if (!selectedObject) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 gap-6 transition-colors overflow-y-auto">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2 uppercase text-xs tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    CANVAS PROPERTIES
                </h3>

                {/* Canvas Size - Read Only */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Dimensions</label>
                        <div className="px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 font-mono">
                            {canvasSize.width} × {canvasSize.height} px
                        </div>
                    </div>

                    {/* Background Color */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Background Color</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                                className="w-12 h-12 rounded border-2 border-gray-200 p-1 cursor-pointer overflow-hidden"
                            />
                            <input
                                type="text"
                                value={backgroundColor}
                                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 text-xs border-t pt-6">
                    <p className="text-xs">Click on an object to edit its properties</p>
                </div>
            </div>
        );
    }

    const handleChange = (prop, value) => {
        canvasRef.current?.updateObject({ [prop]: value });
    };

    const handleFilterChange = (filterType, value) => {
        if (!selectedObject.filters) return;
        const newFilters = { ...selectedObject.filters, [filterType]: value };
        canvasRef.current?.applyFilters({ ...selectedObject.filters, ...newFilters });
    };

    const handleRemoveBackground = async () => {
        setRemovingBg(true);
        try {
            await canvasRef.current?.removeBackgroundActiveObject();
        } catch (err) {
            console.error('Failed to remove background:', err);
            alert('Lỗi: ' + (err.response?.data?.message || err.message || 'Không thể xóa nền. Bật console ở backend để xem lỗi chi tiết.'));
        } finally {
            setRemovingBg(false);
        }
    };

    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

    const handleExtractPalette = () => {
        if (!selectedObject || selectedObject.type !== 'image') return;
        setIsExtracting(true);
        // Small delay to allow UI to update to loading state
        setTimeout(() => {
            try {
                const imgEl = selectedObject._originalElement || selectedObject.getElement();
                if (!imgEl) throw new Error("No image element");
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 100;
                canvas.height = (imgEl.height / imgEl.width) * 100;
                ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                
                const colorMap = {};
                for (let i = 0; i < data.length; i += 16) { 
                    if (data[i+3] < 128) continue; 
                    const r = Math.min(255, Math.max(0, Math.round(data[i] / 32) * 32));
                    const g = Math.min(255, Math.max(0, Math.round(data[i+1] / 32) * 32));
                    const b = Math.min(255, Math.max(0, Math.round(data[i+2] / 32) * 32));
                    const hex = rgbToHex(r, g, b);
                    colorMap[hex] = (colorMap[hex] || 0) + 1;
                }
                
                const sortedColors = Object.entries(colorMap)
                    .sort((a,b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(entry => entry[0]);
                    
                setExtractedColors(sortedColors);
            } catch (err) {
                console.error("Color extraction failed:", err);
            }
            setIsExtracting(false);
        }, 50);
    };

    const isText = selectedObject.type.includes('text');
    const isImage = selectedObject.type === 'image';

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 gap-6 transition-colors overflow-y-auto overflow-x-hidden">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2 uppercase text-xs tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                {selectedObject.type.toUpperCase()} Properties
            </h3>

            {/* Color / Fill */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Fill Color</label>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={selectedObject.fill || '#000000'}
                        onChange={(e) => handleChange('fill', e.target.value)}
                        className="w-10 h-10 rounded border-0 p-0 cursor-pointer overflow-hidden"
                    />
                    <input
                        type="text"
                        value={selectedObject.fill || '#000000'}
                        onChange={(e) => handleChange('fill', e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Opacity */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Opacity ({Math.round((selectedObject.opacity || 1) * 100)}%)</label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedObject.opacity || 1}
                    onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                />
            </div>

            {/* Dimensions & Position */}
            <div className="flex flex-col gap-3 pt-4 border-t">
                <label className="text-xs font-semibold text-gray-500 uppercase">Position & Size</label>
                
                {/* Width & Height */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Width</label>
                        <input
                            type="number"
                            min="1"
                            value={selectedObject.width || 0}
                            onChange={(e) => handleChange('width', Math.max(1, parseFloat(e.target.value) || 1))}
                            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Height</label>
                        <input
                            type="number"
                            min="1"
                            value={selectedObject.height || 0}
                            onChange={(e) => handleChange('height', Math.max(1, parseFloat(e.target.value) || 1))}
                            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                </div>

                {/* Position from edges */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Left</label>
                        <input
                            type="number"
                            value={selectedObject.left || 0}
                            onChange={(e) => handleChange('left', parseInt(e.target.value) || 0)}
                            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Top</label>
                        <input
                            type="number"
                            value={selectedObject.top || 0}
                            onChange={(e) => handleChange('top', parseInt(e.target.value) || 0)}
                            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Right</label>
                        <input
                            type="number"
                            value={selectedObject.right || 0}
                            onChange={(e) => handleChange('right', parseInt(e.target.value) || 0)}
                            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Bottom</label>
                        <input
                            type="number"
                            value={selectedObject.bottom || 0}
                            onChange={(e) => handleChange('bottom', parseInt(e.target.value) || 0)}
                            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                </div>
            </div>

            {/* Text Specific */}
            {isText && (
                <>
                    <div className="flex flex-col gap-2 pt-4 border-t">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Typography</label>
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-400">Font Family</label>
                            <select
                                value={selectedObject.fontFamily || 'Inter'}
                                onChange={(e) => handleChange('fontFamily', e.target.value)}
                                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                                style={{ fontFamily: selectedObject.fontFamily || 'Inter' }}
                            >
                                {FONTS.map(font => (
                                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase mt-2">Text Properties</label>
                        <div className="flex justify-between items-center gap-2">
                            <label className="text-xs text-gray-400 flex-1">Size</label>
                            <input
                                type="number"
                                min="1"
                                value={selectedObject.fontSize || 12}
                                onChange={(e) => handleChange('fontSize', Math.max(1, parseInt(e.target.value) || 1))}
                                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none w-20"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Style</label>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1 rounded-lg w-max text-sm">
                            <button
                                onClick={() => handleChange('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
                                className={`w-8 h-8 rounded flex items-center justify-center font-bold transition-colors ${selectedObject.fontWeight === 'bold' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                                title="Bold"
                            >
                                B
                            </button>
                            <button
                                onClick={() => handleChange('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
                                className={`w-8 h-8 rounded flex items-center justify-center font-serif italic transition-colors ${selectedObject.fontStyle === 'italic' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                                title="Italic"
                            >
                                I
                            </button>
                            <button
                                onClick={() => handleChange('underline', !selectedObject.underline)}
                                className={`w-8 h-8 rounded flex items-center justify-center underline transition-colors ${selectedObject.underline ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                                title="Underline"
                            >
                                U
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Text Content</label>
                        <textarea
                            value={selectedObject.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            className="px-3 py-2 text-sm border rounded-lg h-24 resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    {/* Text Effects */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Text Effects</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => canvasRef.current?.applyTextEffect('none')}
                                className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border text-gray-600 rounded-lg text-xs font-medium"
                            >None</button>
                            <button
                                onClick={() => canvasRef.current?.applyTextEffect('shadow')}
                                className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border text-gray-600 rounded-lg text-xs font-medium drop-shadow-md"
                            >Shadow</button>
                            <button
                                onClick={() => canvasRef.current?.applyTextEffect('glow')}
                                className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border text-gray-600 rounded-lg text-xs font-medium"
                                style={{ textShadow: "0 0 4px rgba(99,102,241,0.8)" }}
                            >Glow</button>
                            <button
                                onClick={() => canvasRef.current?.applyTextEffect('outline')}
                                className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border text-gray-800 rounded-lg text-xs font-black"
                                style={{ WebkitTextStroke: "1px black", color: "white" }}
                            >Outline</button>
                            <button
                                onClick={() => canvasRef.current?.applyTextEffect('hollow')}
                                className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border text-gray-800 rounded-lg text-xs font-bold col-span-2"
                                style={{ WebkitTextStroke: "1px black", color: "transparent" }}
                            >Hollow</button>
                        </div>
                    </div>

                    {/* Curved Text */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Curved Text</label>
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={!!selectedObject.isCurved}
                                        onChange={(e) => canvasRef.current?.toggleCurvedText(e.target.checked)}
                                    />
                                    <div className={`block w-8 h-4 rounded-full transition-colors ${selectedObject.isCurved ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform ${selectedObject.isCurved ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                            </label>
                        </div>
                        {selectedObject.isCurved && (
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex justify-between">
                                    <label className="text-[10px] text-gray-400">Curve Radius</label>
                                    <span className="text-[10px] text-gray-400 font-mono">{selectedObject.curveRadius || 50}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-150"
                                    max="150"
                                    value={selectedObject.curveRadius || 50}
                                    onChange={(e) => canvasRef.current?.updateCurveRadius(parseInt(e.target.value))}
                                    className="w-full accent-indigo-600"
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Image Utilities */}
            {isImage && (
                <div className="flex flex-col gap-3 pt-4 border-t dark:border-gray-700">
                    <label className="text-xs font-semibold text-gray-500 uppercase flex items-center justify-between">
                        Image Utilities
                    </label>
                    <button
                        onClick={handleRemoveBackground}
                        disabled={removingBg}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                    >
                        {removingBg ? (
                            <>
                                <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                                Removing Background...
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Z"/><path d="m19 15-7-7-7 7"/><path d="m17 21-5-5-5 5"/>
                                </svg>
                                Xóa nền AI (Remove BG)
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center">
                        Xử lý AI chuyên nghiệp trên Server. Có thể mất vài giây.
                    </p>
                </div>
            )}

            {/* Image Filters */}
            {isImage && (
                <div className="flex flex-col gap-3 pt-4 border-t">
                    <label className="text-xs font-semibold text-gray-500 uppercase flex items-center justify-between">
                        Image Filters
                        <button 
                            onClick={() => canvasRef.current?.applyFilters({ brightness: 0, contrast: 0, hue: 0, blur: 0 })}
                            className="text-[10px] text-indigo-500 hover:text-indigo-700 font-normal normal-case"
                        >
                            Reset
                        </button>
                    </label>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <label className="text-xs text-gray-400">Brightness</label>
                            <span className="text-[10px] text-gray-400 font-mono">{selectedObject.filters?.brightness?.toFixed(2) || '0.00'}</span>
                        </div>
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.05"
                            value={selectedObject.filters?.brightness || 0}
                            onChange={(e) => handleFilterChange('brightness', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <label className="text-xs text-gray-400">Contrast</label>
                            <span className="text-[10px] text-gray-400 font-mono">{selectedObject.filters?.contrast?.toFixed(2) || '0.00'}</span>
                        </div>
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.05"
                            value={selectedObject.filters?.contrast || 0}
                            onChange={(e) => handleFilterChange('contrast', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <label className="text-xs text-gray-400">Hue Rotation</label>
                            <span className="text-[10px] text-gray-400 font-mono">{selectedObject.filters?.hue?.toFixed(2) || '0.00'}</span>
                        </div>
                        <input
                            type="range"
                            min="-2"
                            max="2"
                            step="0.05"
                            value={selectedObject.filters?.hue || 0}
                            onChange={(e) => handleFilterChange('hue', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <label className="text-xs text-gray-400">Blur</label>
                            <span className="text-[10px] text-gray-400 font-mono">{selectedObject.filters?.blur?.toFixed(2) || '0.00'}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedObject.filters?.blur || 0}
                            onChange={(e) => handleFilterChange('blur', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                </div>
            )}

            {/* Layer Control */}
            <div className="flex flex-col gap-2 pt-4 border-t">
                <label className="text-xs font-semibold text-gray-500 uppercase">Layer Order</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => canvasRef.current?.bringToFront()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                        Bring Front
                    </button>
                    <button
                        onClick={() => canvasRef.current?.sendToBack()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                        Send Back
                    </button>
                    <button
                        onClick={() => canvasRef.current?.bringForward()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                        Move Up
                    </button>
                    <button
                        onClick={() => canvasRef.current?.sendBackwards()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                        Move Down
                    </button>
                </div>
                
                <label className="text-xs font-semibold text-gray-500 uppercase mt-2">Actions</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => canvasRef.current?.toggleLock()}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                            selectedObject.isLocked 
                                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {selectedObject.isLocked ? (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Un-Lock</>
                        ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Lock Layer</>
                        )}
                    </button>
                    <button
                        onClick={() => canvasRef.current?.deleteActiveObject()}
                        className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> Delete
                    </button>
                    
                    {/* Conditional Group/Ungroup */}
                    {selectedObject.isActiveSelection && (
                        <button
                            onClick={() => canvasRef.current?.groupElements()}
                            className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors col-span-2"
                        >
                            Group Selected Elements
                        </button>
                    )}
                    {selectedObject.isGroup && (
                        <button
                            onClick={() => canvasRef.current?.ungroupElements()}
                            className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors col-span-2"
                        >
                            Ungroup Elements
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertiesPanel;
