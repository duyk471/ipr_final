import React, { useRef } from 'react';
import { Type, Upload, Shapes, Sparkles, Wand2 } from 'lucide-react';
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
            action: () => { canvasRef.current?.addText(); setActiveLeftPanel(null); } 
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
                <div key={tool.id} className="relative group">
                    <button
                        onClick={tool.action}
                        className={`flex flex-col items-center justify-center p-3.5 gap-1.5 rounded-xl transition-all w-full select-none ${
                            activeLeftPanel === tool.id
                                ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-inner'
                                : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700'
                        }`}
                        title={tool.label}
                    >
                        {tool.icon}
                        <span className="text-[9px] font-bold uppercase tracking-[0.05em]">{tool.label}</span>
                        {activeLeftPanel === tool.id && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-indigo-600 transition-all shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Toolbar;
