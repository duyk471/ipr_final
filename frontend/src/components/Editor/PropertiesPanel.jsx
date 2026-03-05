import React, { useState, useEffect } from 'react';
import useCanvasStore from '../../store/useCanvasStore';

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
            <div className="flex flex-col h-full bg-white p-6 gap-6">
                <h3 className="font-bold text-gray-800 border-b pb-2 uppercase text-xs tracking-widest flex items-center gap-2">
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

    const isText = selectedObject.type.includes('text');

    return (
        <div className="flex flex-col h-full bg-white p-6 gap-6">
            <h3 className="font-bold text-gray-800 border-b pb-2 uppercase text-xs tracking-widest flex items-center gap-2">
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

            {/* Text Specific */}
            {isText && (
                <>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Font Size</label>
                        <input
                            type="number"
                            value={selectedObject.fontSize || 12}
                            onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Text Content</label>
                        <textarea
                            value={selectedObject.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            className="px-3 py-2 text-sm border rounded-lg h-24 resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </>
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
                </div>
            </div>
        </div>
    );
};

export default PropertiesPanel;
