import React, { useRef, useState, useEffect } from 'react';
import { Type, Square, Circle, Triangle, Image as ImageIcon, Upload, Shapes, ChevronRight } from 'lucide-react';
import { api } from '../../store/useCanvasStore';

const Toolbar = ({ canvasRef, projectId }) => {
    const fileInputRef = useRef(null);
    const [showShapes, setShowShapes] = useState(false);
    const submenuRef = useRef(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await api.post(`/projects/${projectId}/assets/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                canvasRef.current?.addImage(res.data.asset.displayUrl);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        }

        // Reset input
        e.target.value = null;
    };

    // Close submenu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (submenuRef.current && !submenuRef.current.contains(event.target)) {
                setShowShapes(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const shapeOptions = [
        { icon: <Square size={18} />, label: "Rectangle", action: () => { canvasRef.current?.addShape('rect'); setShowShapes(false); } },
        { icon: <Circle size={18} />, label: "Circle", action: () => { canvasRef.current?.addShape('circle'); setShowShapes(false); } },
        { icon: <Triangle size={18} />, label: "Triangle", action: () => { canvasRef.current?.addShape('triangle'); setShowShapes(false); } },
    ];

    const mainTools = [
        { id: 'text', icon: <Type size={20} />, label: "Text", action: () => canvasRef.current?.addText() },
        { id: 'shapes', icon: <Shapes size={20} />, label: "Shapes", action: () => setShowShapes(!showShapes), hasSubmenu: true },
        { id: 'upload', icon: <Upload size={20} />, label: "Upload", action: handleUploadClick },
    ];

    return (
        <div className="flex flex-col gap-4 w-full px-2 relative">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg, image/svg+xml"
            />

            {mainTools.map((tool) => (
                <div key={tool.id} className="relative group">
                    <button
                        onClick={tool.action}
                        className={`flex flex-col items-center justify-center p-3 gap-1.5 rounded-xl transition-all w-full select-none ${tool.id === 'shapes' && showShapes
                                ? 'text-indigo-600 bg-indigo-50 shadow-inner'
                                : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                    >
                        {tool.icon}
                        <span className="text-[10px] font-bold uppercase tracking-wider">{tool.label}</span>
                        {tool.hasSubmenu && (
                            <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 transition-transform ${showShapes ? 'scale-100' : 'scale-0'}`} />
                        )}
                    </button>

                    {/* Shapes Submenu */}
                    {tool.id === 'shapes' && showShapes && (
                        <div
                            ref={submenuRef}
                            className="absolute left-full ml-4 top-0 bg-white shadow-2xl border border-gray-100 rounded-2xl p-2 flex flex-col gap-1 min-w-[140px] z-50 animate-in slide-in-from-left-2 fade-in duration-200"
                        >
                            <div className="px-3 py-2 border-b border-gray-50 mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Shape</span>
                            </div>
                            {shapeOptions.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={option.action}
                                    className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all text-sm font-medium group/item"
                                >
                                    <div className="text-gray-400 group-hover/item:text-indigo-600 transition-colors">
                                        {option.icon}
                                    </div>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Toolbar;
