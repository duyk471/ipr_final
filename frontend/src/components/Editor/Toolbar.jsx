import React, { useRef } from 'react';
import { Type, Upload, Shapes, Sparkles, Wand2, Image, Wand } from 'lucide-react';
import { api } from '../../store/useCanvasStore';
import useCanvasStore from '../../store/useCanvasStore';
import { uploadLocalAsset } from '../../services/localAssetService';

const Toolbar = ({ canvasRef, projectId }) => {
    const { activeLeftPanel, setActiveLeftPanel } = useCanvasStore();
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
            // Use local-first upload service
            const assetInfo = await uploadLocalAsset(file);
            
            // Add to canvas with metadata for local path persistence
            canvasRef.current?.addImage(assetInfo.url, {
                originalPath: assetInfo.path,
                source: "upload"
            });
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
            id: 'magic', 
            icon: <Wand size={22} />, 
            label: "Magic", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'magic' ? null : 'magic') 
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
                        className={`flex flex-col items-center justify-center px-2 py-3.5 gap-1.5 rounded-2xl transition-all duration-300 ease-out w-full select-none relative group/btn ${
                            activeLeftPanel === tool.id
                                ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg shadow-lg dark:shadow-dark-green-glow scale-[1.05] font-black'
                                : 'text-slate-500 dark:text-biophilic-dark-text-muted hover:bg-biophilic-green/10 dark:hover:bg-biophilic-dark-green/10 hover:text-biophilic-green dark:hover:text-biophilic-dark-green'
                        }`}
                        title={tool.label}
                    >
                        <div className={`transition-transform duration-300 ${activeLeftPanel === tool.id ? 'scale-110' : 'group-hover/btn:scale-110'}`}>
                            {React.cloneElement(tool.icon, { 
                                size: 20, 
                                strokeWidth: activeLeftPanel === tool.id ? 2.5 : 2,
                                color: 'currentColor'
                            })}
                        </div>
                        <span className={`text-[8px] uppercase tracking-[0.1em] font-black transition-colors ${activeLeftPanel === tool.id ? 'opacity-100' : 'opacity-70 group-hover/btn:opacity-100'}`}>
                            {tool.label}
                        </span>
                        
                        {activeLeftPanel === tool.id && (
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-biophilic-green dark:bg-biophilic-dark-green rounded-full shadow-glow-green" />
                        )}
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/90 dark:bg-biophilic-dark-surface/95 backdrop-blur-md text-white dark:text-biophilic-dark-text text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all transform translate-x-[-10px] group-hover:translate-x-0 duration-200 z-50 shadow-xl border border-white/10 dark:border-biophilic-dark-border">
                        {tool.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Toolbar;
