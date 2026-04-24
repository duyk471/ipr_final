import React, { useRef } from 'react';
import { Type, Upload, Shapes, Sparkles, Wand2, Image, Bot, Maximize, Eraser, Zap, Paintbrush } from 'lucide-react';
import { uploadLocalAsset } from '../../services/localAssetService';

const Toolbar = ({ canvasRef, projectId, activeLeftPanel, setActiveLeftPanel }) => {
    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const assetInfo = await uploadLocalAsset(file);
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
        { type: 'separator' },
        { 
            id: 'ai-expand', 
            icon: <Maximize size={22} />, 
            label: "Expand", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'ai-expand' ? null : 'ai-expand') 
        },
        { 
            id: 'ai-remover', 
            icon: <Eraser size={22} />, 
            label: "Remover", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'ai-remover' ? null : 'ai-remover') 
        },
        { 
            id: 'ai-relight', 
            icon: <Zap size={22} />, 
            label: "Relight", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'ai-relight' ? null : 'ai-relight') 
        },
        { 
            id: 'ai-mask', 
            icon: <Paintbrush size={22} />, 
            label: "Mask", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'ai-mask' ? null : 'ai-mask') 
        },
        { 
            id: 'ai-inpaint', 
            icon: <Wand2 size={22} />, 
            label: "Inpaint", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'ai-inpaint' ? null : 'ai-inpaint') 
        },
        { 
            id: 'ai-blend', 
            icon: <Sparkles size={22} />, 
            label: "Blend", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'ai-blend' ? null : 'ai-blend') 
        },
        { type: 'separator' },
        { 
            id: 'ai', 
            icon: <Bot size={22} />, 
            label: "AI Gen", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'ai' ? null : 'ai') 
        },
        { 
            id: 'assistant', 
            icon: <Wand2 size={22} />, 
            label: "AI Assist", 
            action: () => setActiveLeftPanel(activeLeftPanel === 'assistant' ? null : 'assistant') 
        },
    ];

    return (
        <div className="flex flex-col gap-3 w-full px-2 relative h-full">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg, image/svg+xml"
            />

            {mainTools.map((tool, idx) => {
                if (tool.type === 'separator') {
                    return <div key={`sep-${idx}`} className="w-8 h-px bg-slate-200 dark:bg-biophilic-dark-border my-1 mx-auto opacity-50" />;
                }

                return (
                    <div key={tool.id} className="relative group w-full">
                        <button
                            onClick={tool.action}
                            className={`flex flex-col items-center justify-center p-3 gap-1 rounded-2xl transition-all duration-300 ease-out w-full select-none relative group/btn ${
                                activeLeftPanel === tool.id
                                    ? 'bg-biophilic-green dark:bg-[#A8C69F] text-white dark:text-[#2D3A30] shadow-lg dark:shadow-dark-green-glow scale-[1.05]'
                                    : 'text-slate-500 dark:text-biophilic-dark-text-muted hover:bg-biophilic-green/10 dark:hover:bg-[#A8C69F]/10 hover:text-biophilic-green dark:hover:text-[#A8C69F]'
                            }`}
                            title={tool.label}
                        >
                            <div className={`transition-transform duration-300 ${activeLeftPanel === tool.id ? 'scale-110' : 'group-hover/btn:scale-110'}`}>
                                {React.cloneElement(tool.icon, { 
                                    size: 18, 
                                    strokeWidth: activeLeftPanel === tool.id ? 2.5 : 2,
                                    color: 'currentColor'
                                })}
                            </div>
                            <span className={`text-[8px] uppercase tracking-wider font-black transition-colors ${activeLeftPanel === tool.id ? 'opacity-100' : 'opacity-60 group-hover/btn:opacity-100'}`}>
                                {tool.label}
                            </span>
                            
                            {activeLeftPanel === tool.id && (
                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-biophilic-green dark:bg-[#A8C69F] rounded-full shadow-glow-green" />
                            )}
                        </button>
                        {/* Tooltip */}
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/90 dark:bg-biophilic-dark-surface/95 backdrop-blur-md text-white dark:text-biophilic-dark-text text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all transform translate-x-[-10px] group-hover:translate-x-0 duration-200 z-50 shadow-xl border border-white/10 dark:border-biophilic-dark-border">
                            {tool.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Toolbar;
