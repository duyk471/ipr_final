import React from 'react';
import useCanvasStore from '../../store/useCanvasStore';

const PropertiesPanel = ({ canvasRef }) => {
    const { selectedObject } = useCanvasStore();

    if (!selectedObject) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <span className="text-gray-400">?</span>
                </div>
                <p className="text-gray-400 text-sm italic">Select an object on the canvas to edit its properties.</p>
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
