import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Maximize, Eraser, Zap, Wand2, Paintbrush } from 'lucide-react';
import MaskingTool from './MaskingTool';
import InpaintingTool from './InpaintingTool';
import BlendingTool from './BlendingTool';
import GenerativeExpandTool from './GenerativeExpandTool';
import MagicRemoverTool from './MagicRemoverTool';
import RelightingTool from './RelightingTool';

/**
 * AI Tools Panel
 * Integrates all advanced AI features
 */
export const AIToolsPanel = ({
    canvasImage,
    projectId,
    onImageGenerated,
    canvasRef,
    initialTab = 'expand'
}) => {
    const [activeTab, setActiveTab] = useState(initialTab); 
    const [generatedMask, setGeneratedMask] = useState(null);
    const [selectedLayer, setSelectedLayer] = useState(null);

    // Track selection changes to update tools
    React.useEffect(() => {
        if (!canvasRef?.current?.canvas) return;
        const canvas = canvasRef.current.canvas;
        
        const handleSelection = () => {
            const active = canvas.getActiveObject();
            setSelectedLayer(active);
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', () => setSelectedLayer(null));

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared');
        };
    }, [canvasRef]);

    if (!canvasImage) {
        return (
            <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-biophilic-cream-dark/30 dark:bg-biophilic-dark-border/30 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-biophilic-moss dark:text-biophilic-dark-green" />
                </div>
                <p className="text-biophilic-bark dark:text-biophilic-dark-text-muted text-sm font-medium">
                    Please upload an image or add elements to the canvas to use AI features.
                </p>
            </div>
        );
    }

    const tabs = [
        { id: 'expand', label: 'Expand', icon: Maximize },
        { id: 'remover', label: 'Remover', icon: Eraser },
        { id: 'relight', label: 'Relight', icon: Zap },
        { id: 'mask', label: 'Mask', icon: Paintbrush },
        { id: 'inpaint', label: 'Inpaint', icon: Wand2 },
        { id: 'blend', label: 'Blend', icon: Sparkles }
    ];

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
            <div className="px-5 pb-6">
                {/* Tab selector */}
                <div className="grid grid-cols-6 gap-1 p-1 bg-biophilic-cream-dark/30 dark:bg-biophilic-dark-border/30 rounded-xl mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-biophilic-dark-green text-biophilic-green dark:text-biophilic-dark-bg shadow-sm scale-[1.05]'
                                    : 'text-biophilic-moss/40 dark:text-biophilic-dark-text-muted hover:text-biophilic-moss'
                            }`}
                        >
                            <tab.icon size={14} className="mb-1" />
                            <span className="text-[7px] font-black uppercase tracking-tighter">
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {activeTab === 'expand' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <GenerativeExpandTool
                                canvasRef={canvasRef}
                                projectId={projectId}
                                onComplete={(result) => {
                                    if (onImageGenerated) onImageGenerated(result.image, 'expand');
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'remover' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <MagicRemoverTool
                                canvasRef={canvasRef}
                                projectId={projectId}
                                onComplete={(result) => {
                                    if (onImageGenerated) onImageGenerated(result.image, 'erase');
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'relight' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <RelightingTool
                                activeLayer={selectedLayer}
                                projectId={projectId}
                                onComplete={(result) => {
                                    if (onImageGenerated) onImageGenerated(result.image, 'relight');
                                }}
                                canvasRef={canvasRef}
                            />
                        </div>
                    )}

                    {activeTab === 'mask' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <MaskingTool
                                image={canvasImage}
                                projectId={projectId}
                                canvasRef={canvasRef}
                                onMaskGenerated={(maskResult) => {
                                    setGeneratedMask(maskResult.mask);
                                    setActiveTab('inpaint'); // Auto-switch to inpaint after mask is generated
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'inpaint' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <InpaintingTool
                                image={canvasImage}
                                mask={generatedMask}
                                projectId={projectId}
                                onInpaintComplete={(result) => {
                                    if (onImageGenerated) {
                                        onImageGenerated(result.inpaintedImage, 'inpaint');
                                    }
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'blend' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <BlendingTool
                                backgroundImage={canvasImage}
                                projectId={projectId}
                                onBlendComplete={(result) => {
                                    if (onImageGenerated) {
                                        onImageGenerated(result.blendedImage, 'blend');
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Info section */}
                <div className="mt-8 p-4 bg-biophilic-green/5 dark:bg-biophilic-dark-green/5 border border-biophilic-green/10 dark:border-biophilic-dark-green/10 rounded-2xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-biophilic-green dark:text-biophilic-dark-green mb-3 flex items-center gap-2">
                        <Sparkles size={12} />
                        AI Feature Guide
                    </h4>
                    <p className="text-[10px] text-biophilic-bark/60 dark:text-biophilic-dark-text-muted leading-relaxed">
                        {activeTab === 'expand' && "Drag boundaries to expand the scene beyond its original frame."}
                        {activeTab === 'remover' && "Paint over objects you want to vanish. AI will heal the background."}
                        {activeTab === 'relight' && "Select an image and apply cinematic lighting presets."}
                        {activeTab === 'mask' && "Segment an area of the image to prepare for generative editing."}
                        {activeTab === 'inpaint' && "Describe what the AI should imagine in the masked area."}
                        {activeTab === 'blend' && "Harmonize foreground elements with the background lighting."}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIToolsPanel;
