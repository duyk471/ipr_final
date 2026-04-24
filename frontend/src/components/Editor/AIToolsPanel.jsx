import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import MaskingTool from './MaskingTool';
import InpaintingTool from './InpaintingTool';
import BlendingTool from './BlendingTool';

/**
 * AI Tools Panel
 * Integrates all AI features: Masking, Inpainting, and Blending
 */
export const AIToolsPanel = ({
    canvasImage,
    projectId,
    onImageGenerated
}) => {
    const [expanded, setExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState('inpaint'); // 'inpaint' or 'blend'
    const [generatedMask, setGeneratedMask] = useState(null);
    const [inpaintResult, setInpaintResult] = useState(null);

    if (!canvasImage) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-700 text-sm">
                    Open an image or create a canvas to use AI features.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800">AI Features</h2>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
            </button>

            {expanded && (
                <div className="px-6 pb-6 border-t border-blue-200">
                    {/* Tab selector */}
                    <div className="flex gap-2 mb-6 mt-6">
                        <button
                            onClick={() => setActiveTab('inpaint')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'inpaint'
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            Background & Outfit Swap
                        </button>
                        <button
                            onClick={() => setActiveTab('blend')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'blend'
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            Image Blending
                        </button>
                    </div>

                    {/* Content */}
                    {activeTab === 'inpaint' ? (
                        <>
                            <MaskingTool
                                image={canvasImage}
                                projectId={projectId}
                                onMaskGenerated={(maskResult) => {
                                    setGeneratedMask(maskResult.mask);
                                }}
                            />
                            <InpaintingTool
                                image={canvasImage}
                                mask={generatedMask}
                                projectId={projectId}
                                onInpaintComplete={(result) => {
                                    setInpaintResult(result);
                                    if (onImageGenerated) {
                                        onImageGenerated(result.inpaintedImage, 'inpaint');
                                    }
                                }}
                            />
                        </>
                    ) : (
                        <BlendingTool
                            backgroundImage={canvasImage}
                            projectId={projectId}
                            onBlendComplete={(result) => {
                                if (onImageGenerated) {
                                    onImageGenerated(result.blendedImage, 'blend');
                                }
                            }}
                        />
                    )}

                    {/* Info section */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">ℹ️ How to use:</h4>
                        {activeTab === 'inpaint' ? (
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>1. <strong>Create Selection:</strong> Draw a bounding box or add points to select an area</li>
                                <li>2. <strong>Generate Mask:</strong> SAM model creates a precise mask from your selection</li>
                                <li>3. <strong>Inpaint:</strong> Describe what you want to generate (e.g., "beach sunset")</li>
                                <li>4. <strong>Result:</strong> Stable Diffusion fills the masked area with your description</li>
                            </ul>
                        ) : (
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>1. <strong>Upload Foreground:</strong> The image element to blend</li>
                                <li>2. <strong>Provide Mask:</strong> White = foreground, Black = background</li>
                                <li>3. <strong>Choose Mode:</strong> Color-match or brightness-match for seamless blending</li>
                                <li>4. <strong>Result:</strong> Poisson blending creates smooth integration</li>
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIToolsPanel;
