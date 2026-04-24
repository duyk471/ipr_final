import React, { useState, useRef } from 'react';
import { Wand2, AlertCircle, Check } from 'lucide-react';
import ProcessingIndicator from '../UI/ProcessingIndicator';
import { generateMask, base64ToImage } from '../../services/aiService';

/**
 * Masking Tool Component
 * Allows users to select regions for inpainting using bounding box or points
 */
export const MaskingTool = ({ 
    image, 
    onMaskGenerated,
    projectId 
}) => {
    const [selectionMode, setSelectionMode] = useState('bbox'); // 'bbox' or 'points'
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [points, setPoints] = useState([]);
    const [bbox, setBbox] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef(null);
    const startPosRef = useRef(null);

    // Handle bounding box drawing
    const handleCanvasMouseDown = (e) => {
        if (selectionMode !== 'bbox') return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        startPosRef.current = { x, y };
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDrawing || selectionMode !== 'bbox') return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const start = startPosRef.current;

        // Redraw canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redraw image
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);

            // Draw bounding box
            const width = currentX - start.x;
            const height = currentY - start.y;
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(start.x, start.y, width, height);

            // Fill with semi-transparent blue
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.fillRect(start.x, start.y, width, height);
        };
        img.src = image;
    };

    const handleCanvasMouseUp = (e) => {
        if (!isDrawing || selectionMode !== 'bbox') return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        const start = startPosRef.current;

        const width = Math.abs(endX - start.x);
        const height = Math.abs(endY - start.y);

        setBbox([
            Math.min(start.x, endX),
            Math.min(start.y, endY),
            width,
            height
        ]);

        setIsDrawing(false);
    };

    // Handle point clicking
    const handleCanvasClick = (e) => {
        if (selectionMode !== 'points') return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newPoints = [...points, [x, y]];
        setPoints(newPoints);

        // Redraw with points
        redrawCanvasWithPoints(newPoints);
    };

    const redrawCanvasWithPoints = (pts) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);

            // Draw points
            pts.forEach((point, idx) => {
                ctx.fillStyle = idx === pts.length - 1 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(59, 130, 246, 0.8)';
                ctx.beginPath();
                ctx.arc(point[0], point[1], 5, 0, Math.PI * 2);
                ctx.fill();
            });
        };
        img.src = image;
    };

    const handleGenerateMask = async () => {
        try {
            setError(null);
            setSuccess(false);
            setIsProcessing(true);

            const selection = {
                type: selectionMode,
                bbox: selectionMode === 'bbox' ? bbox : null,
                points: selectionMode === 'points' ? points : null
            };

            if (!selection.bbox && !selection.points?.length) {
                throw new Error(`Please create a selection using ${selectionMode === 'bbox' ? 'bounding box' : 'points'}`);
            }

            const result = await generateMask(image, selection);
            setSuccess(true);
            onMaskGenerated(result);

            // Reset after success
            setTimeout(() => {
                setBbox(null);
                setPoints([]);
                setSuccess(false);
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setBbox(null);
        setPoints([]);
        setError(null);
        setSuccess(false);

        // Redraw original image
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = image;
    };

    return (
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Step 1: Create Selection for Masking
            </h3>

            {/* Mode selector */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => {
                        setSelectionMode('bbox');
                        handleReset();
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectionMode === 'bbox'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    Bounding Box
                </button>
                <button
                    onClick={() => {
                        setSelectionMode('points');
                        handleReset();
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectionMode === 'points'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    Points
                </button>
            </div>

            {/* Canvas */}
            <div className="mb-4 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onClick={handleCanvasClick}
                    className="w-full cursor-crosshair bg-white"
                    onLoad={() => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = canvasRef.current;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                        };
                        img.src = image;
                    }}
                />
            </div>

            {/* Info */}
            <div className="text-sm text-gray-600 mb-4">
                {selectionMode === 'bbox' ? (
                    <>Click and drag to create a bounding box</>
                ) : (
                    <>Click to add points ({points.length} added)</>
                )}
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
                    Mask generated successfully!
                </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleGenerateMask}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium"
                >
                    Generate Mask
                </button>
                <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-400 transition-colors"
                >
                    Reset
                </button>
            </div>

            <ProcessingIndicator
                isVisible={isProcessing}
                message="Generating Mask..."
                details="Using Segment Anything Model (SAM) to create selection mask"
            />
        </div>
    );
};

export default MaskingTool;
