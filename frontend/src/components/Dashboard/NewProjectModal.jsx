import React, { useState } from 'react';
import { X, Layout, Type as TypeIcon, Maximize2 } from 'lucide-react';

const NewProjectModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState(`Untitled ${new Date().toLocaleDateString()}`);
    const [width, setWidth] = useState(1080);
    const [height, setHeight] = useState(1080);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate({ name, width: Math.max(1, parseInt(width) || 1), height: Math.max(1, parseInt(height) || 1) });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                <div className="p-8 border-b flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Layout size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">New Project</h2>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">Configure your workspace</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white hover:shadow-md rounded-full transition-all text-gray-400 hover:text-gray-600 bg-gray-50">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 flex flex-col gap-8">
                    {/* Project Name */}
                    <div className="flex flex-col gap-2.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <TypeIcon size={16} className="text-indigo-500" />
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Design"
                            required
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-lg font-medium"
                        />
                    </div>

                    {/* Dimensions */}
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Maximize2 size={16} className="text-indigo-500" />
                            Dimensions (Pixels)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Width</span>
                                <input
                                    type="number"
                                    value={width}
                                    onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1"
                                    max="4000"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all font-semibold"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Height</span>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1"
                                    max="4000"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-col gap-3 pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Popular Templates</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                                { label: 'Instagram (1:1)', w: 1080, h: 1080 },
                                { label: 'Instagram Story', w: 1080, h: 1920 },
                                { label: 'FB Cover', w: 851, h: 315 },
                                { label: 'YouTube Thumb', w: 1280, h: 720 },
                                { label: 'A4 Document', w: 794, h: 1123 },
                                { label: 'Business Card', w: 1050, h: 600 }
                            ].map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => { setWidth(preset.w); setHeight(preset.h); }}
                                    className={`px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all border-2 text-center flex flex-col items-center justify-center gap-1 ${width === preset.w && height === preset.h ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-gray-600 border-gray-100 hover:border-indigo-200 hover:text-indigo-600'}`}
                                >
                                    <span>{preset.label}</span>
                                    <span className="opacity-60 font-medium">{preset.w}x{preset.h}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </form>

                <div className="p-8 bg-gray-50 border-t flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 bg-white text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all border-2 border-gray-100 active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        Create Project
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewProjectModal;
