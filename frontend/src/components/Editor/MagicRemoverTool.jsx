import React, { useState, useEffect } from 'react';
import { Eraser, Check, AlertCircle, Trash2 } from 'lucide-react';
import { processAI } from '../../services/aiService';
import BiophilicSpinner from '../UI/BiophilicSpinner';

export const MagicRemoverTool = ({ canvasRef, projectId, onComplete }) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [brushSize, setBrushSize] = useState(30);

    const startMasking = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)'; // Visual feedback
        setIsDrawing(true);
    };

    const stopMasking = () => {
        if (!canvasRef.current) return;
        canvasRef.current.isDrawingMode = false;
        setIsDrawing(false);
    };

    const handleRemove = async () => {
        if (!canvasRef.current) return;
        
        try {
            setIsProcessing(true);
            setError(null);

            const canvas = canvasRef.current;
            
            // 1. Generate mask from the red drawings
            // We need a black and white mask (white = area to remove)
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const ctx = maskCanvas.getContext('2d');
            
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
            
            // Render only the pencil strokes as white
            canvas.getObjects().filter(obj => obj.type === 'path' && obj.stroke === 'rgba(255, 0, 0, 0.5)').forEach(path => {
                const oldColor = path.stroke;
                path.set('stroke', 'white');
                path.render(ctx);
                path.set('stroke', oldColor);
            });

            const maskBase64 = maskCanvas.toDataURL('image/png');
            
            // 2. Get the original image (without the mask strokes)
            const objectsToHide = canvas.getObjects().filter(obj => obj.type === 'path' && obj.stroke === 'rgba(255, 0, 0, 0.5)');
            objectsToHide.forEach(obj => obj.set('visible', false));
            canvas.renderAll();
            
            const imageBase64 = canvas.toDataURL('image/png');
            
            // Restore visibility
            objectsToHide.forEach(obj => obj.set('visible', true));
            canvas.renderAll();

            // 3. Send to backend
            const result = await processAI('erase', {
                image: imageBase64,
                mask: maskBase64,
                projectId
            });

            // 4. Remove the mask paths from canvas
            objectsToHide.forEach(obj => canvas.remove(obj));
            canvas.renderAll();

            if (onComplete) {
                onComplete(result);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
            stopMasking();
        }
    };

    const clearMask = () => {
        if (!canvasRef.current?.canvas) return;
        const canvas = canvasRef.current.canvas;
        const paths = canvas.getObjects().filter(obj => obj.type === 'path' && obj.stroke === 'rgba(255, 0, 0, 0.5)');
        paths.forEach(path => canvas.remove(path));
        canvas.renderAll();
    };

    useEffect(() => {
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
            if (canvasRef.current?.canvas) {
                canvasRef.current.canvas.isDrawingMode = false;
            }
        };
    }, [canvasRef]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 bg-biophilic-cream/30 dark:bg-biophilic-dark-border rounded-3xl border border-biophilic-moss/10">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-biophilic-moss">
                        Brush Size
                    </label>
                    <span className="text-[10px] font-bold text-biophilic-moss">{brushSize}px</span>
                </div>
                <input
                    type="range"
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setBrushSize(val);
                        if (canvasRef.current?.isDrawingMode) {
                            canvasRef.current.freeDrawingBrush.width = val;
                        }
                    }}
                    className="w-full accent-biophilic-moss"
                />
            </div>

            <div className="flex gap-2">
                {!isDrawing ? (
                    <button
                        onClick={startMasking}
                        className="flex-1 py-4 bg-biophilic-cream dark:bg-biophilic-dark-surface text-biophilic-moss rounded-2xl text-[10px] font-black uppercase tracking-widest border border-biophilic-moss/20 hover:bg-biophilic-cream-dark transition-all flex items-center justify-center gap-2"
                    >
                        <Eraser size={16} />
                        Start Painting
                    </button>
                ) : (
                    <button
                        onClick={stopMasking}
                        className="flex-1 py-4 bg-white dark:bg-biophilic-dark-green text-biophilic-moss dark:text-biophilic-dark-bg rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-biophilic-moss shadow-premium transition-all flex items-center justify-center gap-2"
                    >
                        <Check size={16} />
                        Done Painting
                    </button>
                )}
                <button
                    onClick={clearMask}
                    className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-100 transition-all"
                    title="Clear Mask"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            <button
                onClick={handleRemove}
                disabled={isProcessing || isDrawing}
                className="w-full py-4 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-organic hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100"
            >
                {isProcessing ? 'Removing...' : 'Magic Remove Objects'}
            </button>

            {isProcessing && (
                <div className="flex justify-center pt-4">
                    <BiophilicSpinner size="md" message="Reconstructing Background" />
                </div>
            )}
        </div>
    );
};

export default MagicRemoverTool;
