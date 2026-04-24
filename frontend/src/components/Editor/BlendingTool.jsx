import React, { useState, useRef } from 'react';
import { Wand2, AlertCircle, Check, Download, Upload } from 'lucide-react';
import ProcessingIndicator from '../UI/ProcessingIndicator';
import { blendImages } from '../../services/aiService';

/**
 * Blending Tool Component
 * Blends foreground and background images seamlessly
 */
export const BlendingTool = ({
    backgroundImage,
    projectId,
    onBlendComplete
}) => {
    const [foregroundImage, setForegroundImage] = useState(null);
    const [mask, setMask] = useState(null);
    const [blendMode, setBlendMode] = useState('color-match');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [result, setResult] = useState(null);
    const [previewMode, setPreviewMode] = useState('result');
    const fileInputRef = useRef(null);
    const maskInputRef = useRef(null);

    const handleForegroundUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setForegroundImage(event.target.result);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleMaskUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setMask(event.target.result);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleBlend = async () => {
        try {
            if (!backgroundImage) {
                throw new Error('Background image is required');
            }
            if (!foregroundImage) {
                throw new Error('Foreground image is required');
            }
            if (!mask) {
                throw new Error('Mask is required');
            }

            setError(null);
            setSuccess(false);
            setIsProcessing(true);

            const blendResult = await blendImages(
                backgroundImage,
                foregroundImage,
                mask,
                blendMode,
                projectId
            );

            setResult(blendResult);
            setSuccess(true);

            if (onBlendComplete) {
                onBlendComplete(blendResult);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        if (!result?.blendedImage) return;

        try {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${result.blendedImage}`;
            link.download = `blended_${Date.now()}.png`;
            link.click();
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    return (
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                AI Image Blending (Seamless Integration)
            </h3>

            {/* Upload sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Background */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Background Image</p>
                    {backgroundImage ? (
                        <div>
                            <img
                                src={backgroundImage}
                                alt="Background"
                                className="w-full max-h-32 object-contain rounded mb-2"
                            />
                            <p className="text-xs text-green-600">✓ Loaded</p>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">Using current canvas</p>
                    )}
                </div>

                {/* Foreground */}
                <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Foreground Image *
                    </p>
                    {foregroundImage ? (
                        <div>
                            <img
                                src={foregroundImage}
                                alt="Foreground"
                                className="w-full max-h-32 object-contain rounded mb-2"
                            />
                            <p className="text-xs text-green-600">✓ Loaded</p>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">Click to upload or drag & drop</p>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleForegroundUpload}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Mask section */}
            <div
                className="mb-6 border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => maskInputRef.current?.click()}
            >
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Blending Mask *
                </p>
                {mask ? (
                    <div>
                        <img
                            src={mask}
                            alt="Mask"
                            className="w-full max-h-24 object-contain rounded mb-2"
                        />
                        <p className="text-xs text-green-600">✓ Loaded (white = foreground, black = background)</p>
                    </div>
                ) : (
                    <p className="text-xs text-gray-500">Click to upload or use generated mask</p>
                )}
                <input
                    ref={maskInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMaskUpload}
                    className="hidden"
                />
            </div>

            {/* Blend mode */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blending Mode
                </label>
                <select
                    value={blendMode}
                    onChange={(e) => setBlendMode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="normal">Normal (Alpha Blending)</option>
                    <option value="color-match">Color Match (Adjust foreground to match background colors)</option>
                    <option value="brightness-match">Brightness Match (Adjust brightness and colors)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    Choose how the foreground should be blended with the background.
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
                    Blending completed successfully!
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
                            Blended Result
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
                                src={`data:image/png;base64,${result.blendedImage}`}
                                alt="Blended result"
                                className="w-full max-h-96 object-contain rounded"
                            />
                        ) : (
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">BEFORE</p>
                                    <img
                                        src={backgroundImage}
                                        alt="Background"
                                        className="w-full max-h-48 object-contain rounded"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">AFTER</p>
                                    <img
                                        src={`data:image/png;base64,${result.blendedImage}`}
                                        alt="Blended"
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
                    onClick={handleBlend}
                    disabled={isProcessing || !foregroundImage || !mask}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium"
                >
                    Blend Images
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
                message="Blending Images..."
                details="Applying Poisson Blending with color/brightness matching"
            />
        </div>
    );
};

export default BlendingTool;
