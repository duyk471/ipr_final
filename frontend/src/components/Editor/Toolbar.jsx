import React, { useRef } from 'react';
import { Type, Upload, Shapes, Sparkles, Wand2, Image } from 'lucide-react';
import { api } from '../../store/useCanvasStore';

const Toolbar = ({ canvasRef, projectId, activeLeftPanel, setActiveLeftPanel }) => {
    const fileInputRef = useRef(null);

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

        e.target.value = null;
    };

    const mainTools = [
        { 
            id: 'elements', 
            icon: <Shapes size={22} />, 
            label: "Elements", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'elements' ? null : 'elements') 
        },
        { 
            id: 'text', 
            icon: <Type size={22} />, 
            label: "Text", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'text' ? null : 'text') 
        },
        { 
            id: 'ai', 
            icon: <Sparkles size={22} />, 
            label: "AI Gen", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'ai' ? null : 'ai') 
        },
        { 
            id: 'assistant', 
            icon: <Wand2 size={22} />, 
            label: "AI Assist", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'assistant' ? null : 'assistant') 
        },
        { 
            id: 'images', 
            icon: <Image size={22} />, 
            label: "Images", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'images' ? null : 'images') 
        },
        { 
            id: 'upload', 
            icon: <Upload size={22} />, 
            label: "Upload", 
            action: () => { handleUploadClick(); setActiveLeftPanel(null); } 
        },
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
                <div key={tool.id} className="relative group w-full">
                    <button
                        onClick={tool.action}
                        className={`flex flex-col items-center justify-center p-3 gap-1.5 rounded-2xl-organic transition-all duration-300 ease-out w-full select-none ${
                            activeLeftPanel === tool.id
                                ? 'text-white bg-biophilic-green shadow-lg scale-105'
                                : 'text-slate-500 hover:text-biophilic-green hover:bg-biophilic-rose/20'
                        }`}
                        title={tool.label}
                    >
                        {React.cloneElement(tool.icon, { 
                            size: 20, 
                            strokeWidth: activeLeftPanel === tool.id ? 2.5 : 2 
                        })}
                        <span className="text-[10px] font-bold uppercase tracking-wider">{tool.label}</span>
                    </button>
                    {/* Tooltip delay hover */}
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1E293B] text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 delay-100 whitespace-nowrap z-50">
                        {tool.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Toolbar;
