import React, { useState, useRef, useEffect } from 'react';
import { Wand2, AlertCircle, Check, MousePointer2, Paintbrush, Square, RotateCcw, Sparkles } from 'lucide-react';
import ProcessingIndicator from '../UI/ProcessingIndicator';
import { generateMask } from '../../services/aiService';

/**
 * Masking Tool Component
 * Allows users to select regions for inpainting using bounding box or scribble
 */
export const MaskingTool = ({ 
    image, 
    onMaskGenerated,
    projectId,
    canvasRef: mainCanvasRef
}) => {
    const [selectionMode, setSelectionMode] = useState('scribble'); // 'bbox' or 'scribble'
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [points, setPoints] = useState([]);
    const [bbox, setBbox] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [imageScale, setImageScale] = useState({ x: 1, y: 1 });
    const [isDirectMode, setIsDirectMode] = useState(false);
    
    const localCanvasRef = useRef(null);
    const startPosRef = useRef(null);
    const lastPointRef = useRef(null);

    // Initialize and resize canvas based on image (for local mode)
    useEffect(() => {
        if (isDirectMode) return;
        const loadAndDrawImage = () => {
            const canvas = localCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                const canvasW = 400;
                const canvasH = 400;
                
                const scale = Math.min(canvasW / img.width, canvasH / img.height);
                const drawW = img.width * scale;
                const drawH = img.height * scale;
                const offsetX = (canvasW - drawW) / 2;
                const offsetY = (canvasH - drawH) / 2;
                
                setImageScale({
                    scale,
                    offsetX,
                    offsetY,
                    originalW: img.width,
                    originalH: img.height
                });
                
                ctx.clearRect(0, 0, canvasW, canvasH);
                ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            };
            img.src = image;
        };

        loadAndDrawImage();
    }, [image, isDirectMode]);

    const toggleDirectMode = () => {
        if (isDirectMode) {
            mainCanvasRef.current?.stopSelection();
            setIsDirectMode(false);
            setPoints([]);
            setBbox(null);
        } else {
            setIsDirectMode(true);
            setPoints([]);
            setBbox(null);
            
            // Start selection on main canvas with the current mode (scribble or bbox)
            mainCanvasRef.current?.startSelection(selectionMode, (data) => {
                if (data.type === 'scribble') {
                    const scaledPoints = data.points.map(p => [p[0] * 2, p[1] * 2]);
                    setPoints(scaledPoints);
                } else if (data.type === 'bbox') {
                    // Scale bbox coordinates by 2 to match snapshot space
                    const scaledBbox = data.bbox.map(val => val * 2);
                    setBbox(scaledBbox);
                }
            });
        }
    };

    // Cleanup direct mode on unmount
    useEffect(() => {
        return () => {
            if (isDirectMode) {
                mainCanvasRef.current?.stopSelection();
            }
        };
    }, [isDirectMode, mainCanvasRef]);

    const getMousePos = (e) => {
        const canvas = localCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        // Scale factor between CSS pixels and canvas internal pixels
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleCanvasMouseDown = (e) => {
        if (isDirectMode) return;
        const pos = getMousePos(e);
        setIsDrawing(true);
        startPosRef.current = pos;
        
        if (selectionMode === 'scribble') {
            const newPoint = [pos.x, pos.y];
            setPoints([newPoint]);
            lastPointRef.current = pos;
        }
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDrawing || isDirectMode) return;

        const pos = getMousePos(e);
        const canvas = localCanvasRef.current;
        const ctx = canvas.getContext('2d');

        if (selectionMode === 'bbox') {
            redrawBaseImage();
            const start = startPosRef.current;
            const width = pos.x - start.x;
            const height = pos.y - start.y;
            
            ctx.strokeStyle = '#4A5C4B';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.strokeRect(start.x, start.y, width, height);
            ctx.fillStyle = 'rgba(74, 92, 75, 0.1)';
            ctx.fillRect(start.x, start.y, width, height);
        } else if (selectionMode === 'scribble') {
            ctx.strokeStyle = 'rgba(74, 92, 75, 0.6)';
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();

            const dist = Math.hypot(pos.x - lastPointRef.current.x, pos.y - lastPointRef.current.y);
            if (dist > 8) {
                setPoints(prev => [...prev, [pos.x, pos.y]]);
                lastPointRef.current = pos;
            }
        }
    };

    const handleCanvasMouseUp = (e) => {
        if (!isDrawing || isDirectMode) return;
        const pos = getMousePos(e);
        setIsDrawing(false);

        if (selectionMode === 'bbox') {
            const start = startPosRef.current;
            const width = Math.abs(pos.x - start.x);
            const height = Math.abs(pos.y - start.y);
            
            setBbox([
                Math.min(start.x, pos.x),
                Math.min(start.y, pos.y),
                width,
                height
            ]);
        }
    };

    const redrawBaseImage = () => {
        const canvas = localCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            const { scale, offsetX, offsetY, originalW, originalH } = imageScale;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, offsetX, offsetY, originalW * scale, originalH * scale);
        };
        img.src = image;
    };

    const handleGenerateMask = async () => {
        try {
            setError(null);
            setSuccess(false);
            setIsProcessing(true);

            let selection;
            
            if (isDirectMode) {
                // In direct mode, points/bbox are already scaled to snapshot space
                if (points.length === 0 && !bbox) throw new Error(`Please draw a ${selectionMode === 'bbox' ? 'box' : 'path'} on the main canvas.`);
                
                if (bbox) {
                    selection = {
                        type: 'bbox',
                        bbox: bbox
                    };
                } else {
                    selection = {
                        type: 'points',
                        points: points
                    };
                }
            } else {
                const { scale, offsetX, offsetY } = imageScale;
                if (selectionMode === 'bbox' && bbox) {
                    selection = {
                        type: 'bbox',
                        bbox: [
                            (bbox[0] - offsetX) / scale,
                            (bbox[1] - offsetY) / scale,
                            bbox[2] / scale,
                            bbox[3] / scale
                        ]
                    };
                } else if (selectionMode === 'scribble' && points.length > 0) {
                    selection = {
                        type: 'points',
                        points: points.map(p => [
                            (p[0] - offsetX) / scale,
                            (p[1] - offsetY) / scale
                        ])
                    };
                }
            }

            if (!selection) {
                throw new Error(`Please draw a ${selectionMode === 'bbox' ? 'box' : 'path'} over the object.`);
            }

            const result = await generateMask(image, selection);
            
            // Stop direct selection after successful mask generation
            if (isDirectMode) {
                mainCanvasRef.current?.stopSelection();
                setIsDirectMode(false);
            }

            setSuccess(true);
            onMaskGenerated(result);
            setTimeout(() => setSuccess(false), 3000);
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
        if (!isDirectMode) {
            redrawBaseImage();
        } else {
            // Re-start selection to clear paths
            mainCanvasRef.current?.stopSelection();
            mainCanvasRef.current?.startSelection('scribble', (data) => {
                const scaledPoints = data.points.map(p => [p[0] * 2, p[1] * 2]);
                setPoints(scaledPoints);
            });
        }
    };

    return (
        <div className="bg-biophilic-cream/30 dark:bg-biophilic-dark-bg/40 rounded-3xl p-6 border border-biophilic-moss/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-biophilic-moss/10 flex items-center justify-center">
                        <Paintbrush className="w-5 h-5 text-biophilic-moss" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-biophilic-bark dark:text-biophilic-dark-green uppercase tracking-tight">
                            Select Area
                        </h3>
                        <p className="text-[10px] font-bold text-biophilic-moss/60 uppercase tracking-widest">
                            Step 1: Define what to change
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={handleReset}
                    className="p-2 text-biophilic-moss/60 hover:text-biophilic-moss hover:bg-biophilic-moss/5 rounded-xl transition-all"
                    title="Reset Selection"
                >
                    <RotateCcw size={18} />
                </button>
            </div>

            {/* Selection Mode Toggle: Direct vs Sidebar */}
            <div className="mb-6">
                <button
                    onClick={toggleDirectMode}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border ${
                        isDirectMode 
                            ? 'bg-biophilic-moss text-white border-biophilic-moss shadow-organic scale-[1.02]' 
                            : 'bg-white dark:bg-biophilic-dark-border/30 text-biophilic-moss border-biophilic-moss/20 hover:border-biophilic-moss/50'
                    }`}
                >
                    <Sparkles size={14} className={isDirectMode ? 'animate-pulse' : ''} />
                    {isDirectMode ? 'Selecting Directly on Canvas' : 'Select Directly on Main Canvas'}
                </button>
            </div>

            {!isDirectMode && (
                <>
                    {/* Mode selector */}
                    <div className="flex gap-2 p-1 bg-biophilic-moss/5 dark:bg-biophilic-dark-border/30 rounded-2xl mb-6">
                        <button
                            onClick={() => { setSelectionMode('scribble'); handleReset(); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                selectionMode === 'scribble'
                                    ? 'bg-white dark:bg-biophilic-dark-green text-biophilic-moss dark:text-biophilic-dark-bg shadow-sm scale-[1.02]'
                                    : 'text-biophilic-moss/60 hover:text-biophilic-moss'
                            }`}
                        >
                            <Paintbrush size={14} /> Scribble
                        </button>
                        <button
                            onClick={() => { setSelectionMode('bbox'); handleReset(); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                selectionMode === 'bbox'
                                    ? 'bg-white dark:bg-biophilic-dark-green text-biophilic-moss dark:text-biophilic-dark-bg shadow-sm scale-[1.02]'
                                    : 'text-biophilic-moss/60 hover:text-biophilic-moss'
                            }`}
                        >
                            <Square size={14} /> Box
                        </button>
                    </div>

                    {/* Local Canvas */}
                    <div className="relative group mb-6">
                        <div className="absolute inset-0 bg-biophilic-moss/5 rounded-[2.5rem] -m-1 group-hover:bg-biophilic-moss/10 transition-all duration-500" />
                        <div className="relative border border-biophilic-moss/10 rounded-[2rem] overflow-hidden bg-white dark:bg-biophilic-dark-border shadow-inner">
                            <canvas
                                ref={localCanvasRef}
                                width={400}
                                height={400}
                                onMouseDown={handleCanvasMouseDown}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp}
                                className="w-full cursor-crosshair touch-none"
                            />
                            
                            {!isDrawing && points.length === 0 && !bbox && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-biophilic-bark/5 backdrop-blur-[1px]">
                                    <div className="bg-white/90 dark:bg-biophilic-dark-card/90 px-4 py-2 rounded-full shadow-premium flex items-center gap-2">
                                        <MousePointer2 size={14} className="text-biophilic-moss animate-bounce" />
                                        <span className="text-[10px] font-black text-biophilic-moss uppercase tracking-widest">
                                            {selectionMode === 'scribble' ? 'Draw over object' : 'Drag to draw box'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {isDirectMode && (
                <div className="mb-6 p-6 bg-biophilic-moss/5 border-2 border-dashed border-biophilic-moss/20 rounded-[2rem] text-center animate-in zoom-in-95">
                    <div className="w-12 h-12 bg-biophilic-moss/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Paintbrush className="text-biophilic-moss animate-pulse" size={24} />
                    </div>
                    <p className="text-[11px] font-black text-biophilic-moss uppercase tracking-widest leading-relaxed">
                        Go ahead and {selectionMode === 'scribble' ? 'scribble' : 'draw a box'} directly on the main canvas to select your area.
                    </p>
                    <p className="text-[9px] font-bold text-biophilic-moss/60 uppercase tracking-tighter mt-2">
                        {bbox ? '✓ Box captured' : points.length > 0 ? `✓ Captured ${points.length} points` : 'Waiting for your input...'}
                    </p>
                </div>
            )}

            {/* Error/Success Messages */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl flex gap-3 text-red-600 dark:text-red-400 text-xs font-bold animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-biophilic-green/10 border border-biophilic-green/20 rounded-2xl flex gap-3 text-biophilic-green text-xs font-bold animate-in slide-in-from-top-2">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    AI Mask generated successfully!
                </div>
            )}

            <button
                onClick={handleGenerateMask}
                disabled={isProcessing || (points.length === 0 && !bbox)}
                className="w-full py-4 bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-organic hover:bg-biophilic-green-dark dark:hover:bg-biophilic-green transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed group"
            >
                <span className="group-hover:scale-110 transition-transform inline-block">
                    {isProcessing ? 'Processing...' : 'Apply Selection'}
                </span>
            </button>

            <ProcessingIndicator
                isVisible={isProcessing}
                message="AI Analysis"
                details="SAM (Segment Anything Model) is isolating your selection..."
            />
        </div>
    );
};

export default MaskingTool;
