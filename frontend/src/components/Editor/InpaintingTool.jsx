import React, { useState } from 'react';
import { Wand2, AlertCircle, Check, Download } from 'lucide-react';
import ProcessingIndicator from '../UI/ProcessingIndicator';
import { inpaintImage, base64ToImage } from '../../services/aiService';

/**
 * Inpainting Tool Component
 * Performs inpainting on an image with a mask and prompt
 */
export const InpaintingTool = ({
    image,
    mask,
    projectId,
    onInpaintComplete
}) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [result, setResult] = useState(null);
    const [previewMode, setPreviewMode] = useState('result'); // 'result' or 'comparison'

    const handleInpaint = async () => {
        try {
            if (!prompt.trim()) {
                throw new Error('Please enter an inpainting prompt');
            }

            setError(null);
            setSuccess(false);
            setIsProcessing(true);

            const inpaintResult = await inpaintImage(
                image,
                mask,
                prompt.trim(),
                negativePrompt.trim(),
                projectId
            );

            setResult(inpaintResult);
            setSuccess(true);

            if (onInpaintComplete) {
                onInpaintComplete(inpaintResult);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        if (!result?.inpaintedImage) return;

        try {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${result.inpaintedImage}`;
            link.download = `inpainted_${Date.now()}.png`;
            link.click();
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    if (!mask) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <p className="text-yellow-700">
                    Please generate a mask first using the Masking Tool above.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Step 2: Inpainting with Stable Diffusion
            </h3>

            {/* Prompts */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inpainting Prompt *
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'swap background to a beach sunset' or 'change outfit to elegant formal wear'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-24"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Describe what you want to generate in the selected area. Be detailed and specific.
                </p>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Negative Prompt (Optional)
                </label>
                <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="e.g., 'blurry, distorted, low quality'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Things you don't want in the generated image.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {error}
                </div>
            )}

            {/* Success */}
            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2 text-green-700 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Inpainting completed successfully!
                </div>
            )}

            {/* Preview */}
            {result && (
                <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <div className="flex border-b border-gray-200 bg-gray-100">
                        <button
                            onClick={() => setPreviewMode('result')}
                            className={`flex-1 px-4 py-2 font-medium transition-colors ${
                                previewMode === 'result'
                                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Result
                        </button>
                        <button
                            onClick={() => setPreviewMode('comparison')}
                            className={`flex-1 px-4 py-2 font-medium transition-colors ${
                                previewMode === 'comparison'
                                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Before/After
                        </button>
                    </div>
                    <div className="p-4 bg-white">
                        {previewMode === 'result' ? (
                            <img
                                src={`data:image/png;base64,${result.inpaintedImage}`}
                                alt="Inpainted result"
                                className="w-full max-h-96 object-contain rounded"
                            />
                        ) : (
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">BEFORE</p>
                                    <img
                                        src={image}
                                        alt="Original"
                                        className="w-full max-h-48 object-contain rounded"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">AFTER</p>
                                    <img
                                        src={`data:image/png;base64,${result.inpaintedImage}`}
                                        alt="Inpainted"
                                        className="w-full max-h-48 object-contain rounded"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleInpaint}
                    disabled={isProcessing || !prompt.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium"
                >
                    Generate Inpainting
                </button>
                {result && (
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </button>
                )}
            </div>

            <ProcessingIndicator
                isVisible={isProcessing}
                message="Generating Inpainting..."
                details="Using Stable Diffusion to fill the masked area"
            />
        </div>
    );
};

export default InpaintingTool;
