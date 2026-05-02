import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import * as fabric from 'fabric';
import { Trash2, Copy, MoreVertical, RotateCw, Sparkles, FlipHorizontal, FlipVertical, Layers } from 'lucide-react';
import useCanvasStore, { api, resolveAssetUrlsInProject, stripObjectUrlsFromProject } from '../../store/useCanvasStore';
import useNotificationStore from '../../store/useNotificationStore';
import { uploadLocalAsset, uploadPastedImage, persistBackendAsset } from '../../services/localAssetService';
import SelectionToolbar from './SelectionToolbar';
import ContextMenu from './ContextMenu';

/**
 * Validate and clean layers before loading into Fabric
 * Removes or fixes broken blob URLs that would cause Fabric render errors
 * @param {Array} layers - Layer objects from canvas data
 * @returns {Array} Cleaned layers safe for Fabric rendering
 */
function validateAndCleanLayers(layers) {
    if (!Array.isArray(layers)) {
        console.warn('Layers is not an array:', layers);
        return [];
    }

    return layers.map((layer, index) => {
        try {
            // Check if layer has a broken blob URL (blob: prefix without valid session)
            if (layer.src && typeof layer.src === 'string' && layer.src.startsWith('blob:')) {
                // Blob URLs are session-specific and expire on page reload
                // If we're here and the blob URL is broken, we need to handle it
                // For now, we clear the src to prevent Fabric from crashing
                // The asset will show as empty/transparent in the canvas
                console.warn(`Layer ${index} has session-dependent blob URL:`,  layer.src);
                
                // Keep metadata for potential recovery, but clear the src
                if (!layer.metadata?.originalPath) {
                    // No recovery path available, clear the src
                    console.warn(`  No recovery path available (metadata.originalPath missing)`);
                    return {
                        ...layer,
                        src: '',  // Clear broken blob URL
                        // Keep other properties to maintain layer state
                    };
                }
                // If metadata.originalPath exists, it should have been resolved during project load
                // This shouldn't happen in normal flow, but keep the layer as-is
            }

            // Validate layer has required properties for Fabric
            if (layer.type === 'image' && !layer.src) {
                console.warn(`Layer ${index} has no src, removing from render`);
                return {
                    ...layer,
                    src: '',
                };
            }

            return layer;
        } catch (error) {
            console.error(`Error validating layer ${index}:`, error);
            // Return layer as-is if validation fails
            return layer;
        }
    }).filter(layer => {
        // Filter out any layers that would definitely cause rendering issues
        // (e.g., layers with invalid type)
        if (!layer || typeof layer !== 'object') {
            console.warn('Skipping invalid layer object:', layer);
            return false;
        }
        return true;
    });
}

const FabricCanvas = forwardRef(({ projectId }, ref) => {
    const { notify } = useNotificationStore();
    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    const containerRef = useRef(null);
    const { canvasData, currentProject, setCanvasData, saveProjectState, setSelectedObject, selectedObject, setToolbarPos, setContextMenu } = useCanvasStore();

    const isInitializing = useRef(true);
    const saveTimeout = useRef(null);

    // Selection UI State
    const isRotating = useRef(false);
    // Track the CSS display scale so the floating toolbar can counter-scale
    const [canvasScale, setCanvasScale] = useState(1);
    // Remove Background loading state
    const [isRemovingBg, setIsRemovingBg] = useState(false);
    // AI Merge loading state
    const [isMerging, setIsMerging] = useState(false);

    // Undo/Redo Stacks
    const undoStack = useRef([]);
    const redoStack = useRef([]);
    const isActionInProgress = useRef(false);
    // Drag/resize in-flight guards — prevents capturing every pixel as a separate undo state
    const isMoving = useRef(false);
    const isScalingObj = useRef(false);

    // Panning State
    const isPanning = useRef(false);
    const isSpacePressed = useRef(false);
    const isMouseInCanvas = useRef(false);
    const lastPosX = useRef(0);
    const lastPosY = useRef(0);
    const panOffsetX = useRef(0);
    const panOffsetY = useRef(0);

    // Zoom State
    const zoomLevel = useRef(1);
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 5;

    // Clipboard for copy/paste
    const clipboard = useRef(null);
    const isPasting = useRef(false);

    // Snapping Guides
    const guideLines = useRef([]);

    const pushToUndo = () => {
        // Block undo pushes during active drag or scale — object:modified will push one state on mouseup
        if (isActionInProgress.current || isMoving.current || isScalingObj.current) return;
        if (!fabricCanvas.current) return;
        const json = fabricCanvas.current.toObject(['id', 'metadata']);
        undoStack.current.push(JSON.stringify(json));
        if (undoStack.current.length > 50) undoStack.current.shift();
        redoStack.current = []; // Clear redo on any new action
    };

    const deleteActiveObject = () => {
        if (!fabricCanvas.current) return;
        const activeObjects = fabricCanvas.current.getActiveObjects();
        if (activeObjects.length > 0) {
            fabricCanvas.current.remove(...activeObjects);
            fabricCanvas.current.discardActiveObject();
            fabricCanvas.current.renderAll();
            queueSave();
        }
    };

    const handleRemoveBackgroundActiveObject = async () => {
        const activeObject = fabricCanvas.current?.getActiveObject();
        // Support both old 'image' and new Fabric v6 'fabricImage' types
        const isImage = activeObject && (
            activeObject.type === 'image' || 
            activeObject.type === 'fabricImage' || 
            activeObject.type?.toLowerCase().includes('image')
        );
        if (!isImage) return;
        if (isRemovingBg) return; // prevent double-click

        setIsRemovingBg(true);

        // ── Apply loading visuals on the Fabric object ──
        // 1. Blur the image
        const blurFilter = new fabric.filters.Blur({ blur: 0.5 });
        const originalFilters = [...(activeObject.filters || [])];
        activeObject.filters = [...originalFilters, blurFilter];
        activeObject.applyFilters();

        // 2. Pulsing opacity via a JS interval
        const originalOpacity = activeObject.opacity ?? 1;
        let pulse = true;
        const pulseInterval = setInterval(() => {
            if (!fabricCanvas.current) return;
            activeObject.set('opacity', pulse ? 0.45 : 0.8);
            pulse = !pulse;
            fabricCanvas.current.renderAll();
        }, 500);

        try {
            let src = activeObject.src || activeObject.getSrc();
            let res;

            // For local assets (blob URLs), we must upload the file data
            if (src.startsWith('blob:')) {
                const response = await fetch(src);
                const blob = await response.blob();
                const formData = new FormData();
                formData.append('image', blob, 'image.png');

                res = await api.post(`/projects/${projectId}/assets/remove-bg`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                // For existing backend assets, we can just send the path
                res = await api.post(`/projects/${projectId}/assets/remove-bg`, {
                    imagePath: src
                });
            }

            if (res.data.success) {
                try {
                    // Persist the background-removed image to local workspace
                    const assetInfo = await persistBackendAsset(res.data.asset.displayUrl);
                    
                    const imgEl = new Image();
                    imgEl.crossOrigin = 'anonymous';
                    imgEl.onload = () => {
                        // Restore filters and opacity before swapping element
                        clearInterval(pulseInterval);
                        activeObject.filters = originalFilters;
                        activeObject.applyFilters();
                        activeObject.set('opacity', originalOpacity);

                        activeObject.setElement(imgEl);
                        
                        // Update metadata with local path
                        activeObject.set('metadata', { 
                            ...activeObject.metadata, 
                            originalPath: assetInfo.path 
                        });
                        
                        // Update src to the blob URL for immediate display
                        activeObject.set('src', assetInfo.url);
                        
                        // ─── NEW: Trim transparent edges to refit bounding box ───
                        try {
                            const boundaries = getVisualBoundaries(imgEl);
                            if (boundaries) {
                                // Calculate position offset to keep content centered correctly
                                const oldWidth = activeObject.width * activeObject.scaleX;
                                const oldHeight = activeObject.height * activeObject.scaleY;
                                
                                // Set new dimensions (source dimensions)
                                activeObject.set({
                                    width: boundaries.width,
                                    height: boundaries.height,
                                    // Adjust position based on the trim
                                    left: activeObject.left + (boundaries.left * activeObject.scaleX),
                                    top: activeObject.top + (boundaries.top * activeObject.scaleY),
                                    // Set the crop properties (Fabric v6 uses cropX/cropY)
                                    cropX: boundaries.left,
                                    cropY: boundaries.top
                                });
                            }
                        } catch (trimErr) {
                            console.warn('Failed to trim transparent edges:', trimErr);
                        }

                        fabricCanvas.current.renderAll();
                        updateSelectedState();
                        queueSave();
                        setIsRemovingBg(false);
                    };
                    imgEl.onerror = () => {
                        throw new Error('Failed to load processed image');
                    };
                    imgEl.src = assetInfo.url;
                } catch (persistError) {
                    console.error('Failed to persist background-removed image:', persistError);
                    clearInterval(pulseInterval);
                    activeObject.filters = originalFilters;
                    activeObject.applyFilters();
                    activeObject.set('opacity', originalOpacity);
                    fabricCanvas.current.renderAll();
                    setIsRemovingBg(false);
                    notify({ message: 'Background removal succeeded but failed to save image locally.', type: 'warning' });
                }
            } else {
                throw new Error('BG removal failed');
            }
        } catch (err) {
            console.error('Server-side Background removal error:', err);
            clearInterval(pulseInterval);
            // Restore image to clean state on error
            activeObject.filters = originalFilters;
            activeObject.applyFilters();
            activeObject.set('opacity', originalOpacity);
            fabricCanvas.current?.renderAll();
            setIsRemovingBg(false);
        }
    };

    const handleAIMerge = async () => {
        const activeObject = fabricCanvas.current?.getActiveObject();
        const activeObjects = fabricCanvas.current?.getActiveObjects();

        if (!activeObject || !activeObjects || activeObjects.length < 2) return;
        
        const imageObjects = activeObjects.filter(o => 
            o.type === 'image' || o.type === 'fabricImage' || o.type?.toLowerCase().includes('image') || o.getSrc?.()
        );
        if (imageObjects.length < 2) return;
        
        if (isMerging) return;
        setIsMerging(true);
        
        try {
            const dataUrl = activeObject.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
            const prompt = "A seamless, professional photo-composite of the subjects placed in the background environment, matching lighting, consistent shadows, high resolution, 8k.";
            
            const res = await api.post(`/ai/merge`, {
                image: dataUrl,
                projectId: projectId,
                prompt: prompt
            });
            
            if (res.data.success) {
                try {
                    const assetInfo = await persistBackendAsset(res.data.asset.displayUrl);
                    
                    const imgEl = new Image();
                    imgEl.crossOrigin = 'anonymous';
                    imgEl.onload = () => {
                        const canvas = fabricCanvas.current;
                        const fabricImg = new fabric.FabricImage(imgEl, {
                            left: activeObject.left,
                            top: activeObject.top,
                            scaleX: activeObject.width / imgEl.width * activeObject.scaleX,
                            scaleY: activeObject.height / imgEl.height * activeObject.scaleY,
                            originX: activeObject.originX,
                            originY: activeObject.originY,
                            metadata: {
                                originalPath: assetInfo.path,
                                source: "ai-merge"
                            }
                        });
                        
                        const objectsToRemove = activeObject.getObjects ? activeObject.getObjects() : activeObjects;
                        canvas.discardActiveObject();
                        canvas.remove(...objectsToRemove);
                        
                        canvas.add(fabricImg);
                        canvas.setActiveObject(fabricImg);
                        canvas.renderAll();
                        
                        updateSelectedState();
                        queueSave();
                        setIsMerging(false);

                        // ── NEW: Automatically remove background after merge ──
                        setTimeout(() => {
                            handleRemoveBackgroundActiveObject();
                        }, 300);
                    };
                    imgEl.onerror = () => {
                        throw new Error('Failed to load merged image');
                    };
                    imgEl.src = assetInfo.url;
                } catch (persistError) {
                    console.error('Failed to persist merged image:', persistError);
                    setIsMerging(false);
                    notify({ message: 'Merge succeeded but failed to save image locally.', type: 'warning' });
                }
            } else {
                throw new Error('Merge failed');
            }
        } catch (err) {
            console.error('AI Merge error:', err);
            setIsMerging(false);
            if (err.response && err.response.status === 503) {
                notify({ message: "AI Server is busy. Please try again in a few seconds.", type: 'warning' });
            } else {
                notify({ message: "Failed to merge images. " + (err.response?.data?.message || err.message), type: 'error' });
            }
        }
    };

    const duplicateActiveObject = () => {
        if (!fabricCanvas.current) return;
        const activeObject = fabricCanvas.current.getActiveObject();
        if (!activeObject) return;

        activeObject.clone(['id', 'metadata']).then((cloned) => {
            cloned.set({
                left: activeObject.left + 30,
                top: activeObject.top + 30,
            });
            fabricCanvas.current.add(cloned);
            fabricCanvas.current.discardActiveObject();
            fabricCanvas.current.setActiveObject(cloned);
            fabricCanvas.current.requestRenderAll();
            updateSelectedState();
            queueSave();
        }).catch((err) => {
            console.error('Duplicate error:', err);
        });
    };

    const rotateActiveObject = () => {
        if (!fabricCanvas.current) return;
        const activeObject = fabricCanvas.current.getActiveObject();
        if (!activeObject) return;

        const currentAngle = activeObject.angle || 0;
        activeObject.set('angle', (currentAngle + 90) % 360);
        activeObject.setCoords();
        fabricCanvas.current.renderAll();
        updateSelectedState();
        queueSave();
    };

    const handleContextMenuAction = (action) => (e) => {
        e.stopPropagation();
        setContextMenu(null);
        if (!fabricCanvas.current) return;
        const activeObject = fabricCanvas.current.getActiveObject();

        switch (action) {
            case 'copy':
                if (activeObject) {
                    activeObject.clone(['id', 'metadata']).then(cloned => {
                        clipboard.current = cloned;
                    });
                }
                break;
            case 'paste':
                if (clipboard.current) {
                    clipboard.current.clone(['id', 'metadata']).then(clonedObj => {
                        fabricCanvas.current.discardActiveObject();
                        clonedObj.set({
                            left: clonedObj.left + 20,
                            top: clonedObj.top + 20,
                            evented: true,
                        });
                        if (clonedObj.type === 'activeSelection') {
                            clonedObj.canvas = fabricCanvas.current;
                            clonedObj.forEachObject(obj => {
                                fabricCanvas.current.add(obj);
                            });
                            clonedObj.setCoords();
                        } else {
                            fabricCanvas.current.add(clonedObj);
                        }
                        clipboard.current.top += 20;
                        clipboard.current.left += 20;
                        fabricCanvas.current.setActiveObject(clonedObj);
                        fabricCanvas.current.requestRenderAll();
                        updateSelectedState();
                        queueSave();
                    });
                }
                break;
            case 'duplicate':
                duplicateActiveObject();
                break;
            case 'flipX':
                if (activeObject) {
                    activeObject.set('flipX', !activeObject.flipX);
                    fabricCanvas.current.renderAll();
                    updateSelectedState();
                    queueSave();
                }
                break;
            case 'flipY':
                if (activeObject) {
                    activeObject.set('flipY', !activeObject.flipY);
                    fabricCanvas.current.renderAll();
                    updateSelectedState();
                    queueSave();
                }
                break;
            case 'group':
                if (activeObject) {
                    if (activeObject.type === 'activeSelection') {
                        activeObject.toGroup();
                    } else if (activeObject.type === 'group') {
                        activeObject.toActiveSelection();
                    }
                    fabricCanvas.current.requestRenderAll();
                    updateSelectedState();
                    queueSave(false);
                }
                break;
            case 'delete':
                deleteActiveObject();
                break;
            case 'bringForward':
                if (activeObject) {
                    fabricCanvas.current.bringObjectForward(activeObject);
                    fabricCanvas.current.renderAll();
                    queueSave();
                }
                break;
            case 'sendBackwards':
                if (activeObject) {
                    fabricCanvas.current.sendObjectBackwards(activeObject);
                    fabricCanvas.current.renderAll();
                    queueSave();
                }
                break;
            case 'bringToFront':
                if (activeObject) {
                    fabricCanvas.current.bringObjectToFront(activeObject);
                    fabricCanvas.current.renderAll();
                    queueSave();
                }
                break;
            case 'sendToBack':
                if (activeObject) {
                    fabricCanvas.current.sendObjectToBack(activeObject);
                    fabricCanvas.current.renderAll();
                    queueSave();
                }
                break;
            default:
                break;
        }
    };

    useImperativeHandle(ref, () => ({
        canvas: fabricCanvas.current,
        addText: (options = {}) => {
            if (!fabricCanvas.current) return;
            const text = new fabric.Textbox(options.text || 'Hello World', {
                left: options.left || 100,
                top: options.top || 100,
                width: options.width || 400, // Default width for wrapping
                fontFamily: options.fontFamily || 'Inter',
                fill: options.fill || '#000000',
                fontSize: options.fontSize || 40,
                fontWeight: options.fontWeight || 'normal',
                splitByGrapheme: true // Better wrapping for various languages
            });
            fabricCanvas.current.add(text);
            fabricCanvas.current.bringObjectToFront(text);
            fabricCanvas.current.setActiveObject(text);
            fabricCanvas.current.renderAll();
        },
        addShape: (type) => {
            if (!fabricCanvas.current) return;
            let shape;
            if (type === 'rect') {
                shape = new fabric.Rect({ left: 100, top: 100, fill: '#FF5733', width: 100, height: 100, rx: 0, ry: 0 });
            } else if (type === 'circle') {
                shape = new fabric.Circle({ left: 100, top: 100, fill: '#33FF57', radius: 50 });
            } else if (type === 'triangle') {
                shape = new fabric.Triangle({ left: 100, top: 100, fill: '#3357FF', width: 100, height: 100 });
            }
            if (shape) {
                fabricCanvas.current.add(shape);
                fabricCanvas.current.bringObjectToFront(shape);
                fabricCanvas.current.setActiveObject(shape);
                fabricCanvas.current.renderAll();
            }
        },
        addFrame: (type, textValue = 'A') => {
            if (!fabricCanvas.current) return;
            let frame;
            const commonProps = { left: 100, top: 100, fill: '#f3f4f6', stroke: '#818cf8', strokeWidth: 4, strokeDashArray: [10, 5], isFrame: true };
            if (type === 'circle') {
                frame = new fabric.Circle({ ...commonProps, radius: 100 });
            } else if (type === 'star') {
                frame = new fabric.Polygon([
                    { x: 50, y: 0 }, { x: 61, y: 35 }, { x: 98, y: 35 }, { x: 68, y: 57 },
                    { x: 79, y: 91 }, { x: 50, y: 70 }, { x: 21, y: 91 }, { x: 32, y: 57 },
                    { x: 2, y: 35 }, { x: 39, y: 35 }
                ], commonProps);
                frame.set({ scaleX: 3, scaleY: 3 });
            } else if (type === 'text') {
                frame = new fabric.Textbox(textValue, {
                    ...commonProps, fontSize: 300, fontFamily: 'Inter', fontWeight: 'bold', width: 300
                });
            }
            if (frame) {
                fabricCanvas.current.add(frame);
                fabricCanvas.current.bringObjectToFront(frame);
                fabricCanvas.current.setActiveObject(frame);
                fabricCanvas.current.renderAll();
                queueSave();
            }
        },
        addImage: async (url, metadata = null) => {
            if (!fabricCanvas.current) return;
            try {
                const canvas = fabricCanvas.current;
                // Support three types of URLs:
                // 1. Absolute HTTP URLs (from external sources)
                // 2. Object URLs (blob: URLs from local storage)
                // 3. Relative paths (legacy backend URLs - for backward compat)
                const isAbsolute = /^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:');
                
                // If not absolute and not starting with assets/, it might be a legacy backend path
                let fullUrl = url;
                if (!isAbsolute) {
                    if (url.startsWith('assets/')) {
                        // For local relative paths, get Object URL
                        const { getAssetObjectUrl } = useCanvasStore.getState();
                        fullUrl = await getAssetObjectUrl(url);
                    } else {
                        // Legacy backend path
                        fullUrl = `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}?t=${Date.now()}`;
                    }
                }
                
                const activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.isFrame) {
                    fabric.util.loadImage(fullUrl, (imgElement) => {
                        const pattern = new fabric.Pattern({
                            source: imgElement,
                            repeat: 'no-repeat'
                        });
                        const scaleX = activeObject.width / imgElement.width;
                        const scaleY = activeObject.height / imgElement.height;
                        const scale = Math.max(scaleX, scaleY);

                        const scaledW = imgElement.width * scale;
                        const scaledH = imgElement.height * scale;
                        const offsetX = (activeObject.width - scaledW) / 2;
                        const offsetY = (activeObject.height - scaledH) / 2;

                        pattern.patternTransform = [scale, 0, 0, scale, offsetX, offsetY];

                        activeObject.set({
                            fill: pattern,
                            stroke: null,
                            strokeWidth: 0,
                            isFrameFilled: true
                        });
                        if (metadata) {
                            activeObject.set('metadata', { ...activeObject.metadata, ...metadata, originalPath: url });
                        }
                        canvas.renderAll();
                        queueSave();
                    }, null, 'anonymous');
                    return;
                }

                const img = await fabric.FabricImage.fromURL(fullUrl, { crossOrigin: 'anonymous' });

                // Auto-scale to fit canvas if too large
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                if (img.width > canvasWidth * 0.8 || img.height > canvasHeight * 0.8) {
                    const scale = Math.min(canvasWidth * 0.8 / img.width, canvasHeight * 0.8 / img.height);
                    img.set({ scaleX: scale, scaleY: scale });
                }

                // Center origin for easier placement
                img.set({
                    originX: 'center',
                    originY: 'center',
                    left: canvasWidth / 2,
                    top: canvasHeight / 2
                });

                if (metadata) {
                    // Store the original URL path for later retrieval
                    // If it's a blob URL, we prefer metadata.originalPath (which should be the relative path)
                    img.set('metadata', { ...metadata, originalPath: metadata.originalPath || (url.startsWith('blob:') ? null : url) });
                } else {
                    img.set('metadata', { originalPath: url.startsWith('blob:') ? null : url });
                }

                canvas.add(img);
                // canvas.centerObject(img); // Already centered via left/top + origin center
                img.setCoords();
                canvas.bringObjectToFront(img);
                canvas.setActiveObject(img);
                canvas.renderAll();
                queueSave();
            } catch (err) {
                console.error('Error adding image:', err);
            }
        },
        updateObject: (props) => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject) {
                // Handle width/height changes with scaling
                if (props.width !== undefined || props.height !== undefined) {
                    const currentWidth = activeObject.getScaledWidth();
                    const currentHeight = activeObject.getScaledHeight();

                    if (props.width !== undefined) {
                        const scaleX = props.width / (activeObject.width * activeObject.scaleX);
                        activeObject.set('scaleX', activeObject.scaleX * scaleX);
                    }
                    if (props.height !== undefined) {
                        const scaleY = props.height / (activeObject.height * activeObject.scaleY);
                        activeObject.set('scaleY', activeObject.scaleY * scaleY);
                    }
                    delete props.width;
                    delete props.height;
                }

                // Handle right/bottom positioning (convert to left/top)
                if (props.right !== undefined) {
                    const width = activeObject.getScaledWidth();
                    props.left = fabricCanvas.current.width - props.right - width;
                    delete props.right;
                }
                if (props.bottom !== undefined) {
                    const height = activeObject.getScaledHeight();
                    props.top = fabricCanvas.current.height - props.bottom - height;
                    delete props.bottom;
                }

                // Handle dynamic font loading
                if (props.fontFamily && props.fontFamily !== activeObject.fontFamily) {
                    const fontName = props.fontFamily;
                    const fontID = fontName.replace(/\s+/g, '+');
                    const linkId = `font-${fontID}`;

                    if (!document.getElementById(linkId) && fontName !== 'Inter') {
                        const link = document.createElement('link');
                        link.id = linkId;
                        link.rel = 'stylesheet';
                        link.href = `https://fonts.googleapis.com/css2?family=${fontID}:wght@400;700&display=swap`;
                        document.head.appendChild(link);
                    }

                    // Apply immediately 
                    activeObject.set('fontFamily', fontName);
                    fabricCanvas.current.renderAll();
                    updateSelectedState();

                    // Re-render once loaded in browser
                    document.fonts.load(`16px "${fontName}"`).then(() => {
                        fabricCanvas.current.renderAll();
                        queueSave();
                    }).catch(err => console.error("Font load error:", err));

                    delete props.fontFamily;
                }

                if (Object.keys(props).length > 0) {
                    activeObject.set(props);
                    activeObject.setCoords();
                    fabricCanvas.current.renderAll();
                    updateSelectedState();
                    queueSave();
                }
            }
        },
        applyTextEffect: (effectType) => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject && activeObject.type.includes('text')) {
                if (effectType === 'none') {
                    activeObject.set({
                        shadow: null,
                        stroke: null,
                        strokeWidth: 0,
                        fill: activeObject.fill === 'transparent' ? '#000000' : activeObject.fill
                    });
                } else if (effectType === 'shadow') {
                    activeObject.set({
                        shadow: new fabric.Shadow({
                            color: 'rgba(0,0,0,0.5)',
                            blur: 4,
                            offsetX: 4,
                            offsetY: 4
                        }),
                        stroke: null, strokeWidth: 0,
                        fill: activeObject.fill === 'transparent' ? '#000000' : activeObject.fill
                    });
                } else if (effectType === 'glow') {
                    const color = activeObject.fill !== 'transparent' && typeof activeObject.fill === 'string' ? activeObject.fill : '#6366f1';
                    activeObject.set({
                        shadow: new fabric.Shadow({
                            color: color,
                            blur: 20,
                            offsetX: 0,
                            offsetY: 0
                        }),
                        stroke: null, strokeWidth: 0,
                        fill: activeObject.fill === 'transparent' ? '#000000' : activeObject.fill
                    });
                } else if (effectType === 'outline') {
                    activeObject.set({
                        stroke: '#000000',
                        strokeWidth: 2,
                        shadow: null,
                        fill: activeObject.fill === 'transparent' ? '#ffffff' : activeObject.fill
                    });
                } else if (effectType === 'hollow') {
                    activeObject.set({
                        fill: 'transparent',
                        stroke: '#000000',
                        strokeWidth: 2,
                        shadow: null
                    });
                }

                fabricCanvas.current.renderAll();
                updateSelectedState();
                queueSave();
            }
        },
        toggleCurvedText: (isCurved) => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject && activeObject.type.includes('text')) {
                if (isCurved) {
                    const radius = activeObject.curveRadius || 50;
                    const r = Math.max(Math.abs(radius) * 3, Math.max(activeObject.width, 100) / 2);
                    const sweep = radius > 0 ? 1 : 0;
                    activeObject.set('path', new fabric.Path(`M 0 0 A ${r} ${r} 0 0 ${sweep} ${activeObject.width} 0`));
                    activeObject.set('pathAlign', 'center');
                    activeObject.set('pathSide', 'left');
                    activeObject.set('isCurved', true);
                    activeObject.set('curveRadius', radius);
                } else {
                    activeObject.set('path', null);
                    activeObject.set('isCurved', false);
                }
                fabricCanvas.current.renderAll();
                updateSelectedState();
                queueSave();
            }
        },
        updateCurveRadius: (radius) => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject && activeObject.type.includes('text') && activeObject.isCurved) {
                const r = Math.max(Math.abs(radius) * 3, Math.max(activeObject.width, 100) / 2);
                const sweep = radius > 0 ? 1 : 0;
                activeObject.set('curveRadius', radius);
                activeObject.set('path', new fabric.Path(`M 0 0 A ${r} ${r} 0 0 ${sweep} ${activeObject.width} 0`));
                fabricCanvas.current.renderAll();
                updateSelectedState();
                queueSave();
            }
        },
        applyFilters: (filterProps) => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject && activeObject.type === 'image') {
                activeObject.filters = [];
                if (filterProps.brightness !== 0) {
                    activeObject.filters.push(new fabric.filters.Brightness({ brightness: filterProps.brightness }));
                }
                if (filterProps.contrast !== 0) {
                    activeObject.filters.push(new fabric.filters.Contrast({ contrast: filterProps.contrast }));
                }
                if (filterProps.hue !== 0) {
                    activeObject.filters.push(new fabric.filters.HueRotation({ rotation: filterProps.hue }));
                }
                if (filterProps.blur !== 0) {
                    activeObject.filters.push(new fabric.filters.Blur({ blur: filterProps.blur }));
                }
                activeObject.applyFilters();
                fabricCanvas.current.renderAll();
                updateSelectedState();
                queueSave();
            }
        },
        removeBackgroundActiveObject: handleRemoveBackgroundActiveObject,


        bringToFront: () => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject) {
                fabricCanvas.current.bringObjectToFront(activeObject);
                fabricCanvas.current.renderAll();
                queueSave();
            }
        },
        sendToBack: () => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject) {
                fabricCanvas.current.sendObjectToBack(activeObject);
                fabricCanvas.current.renderAll();
                queueSave();
            }
        },
        bringForward: () => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject) {
                fabricCanvas.current.bringObjectForward(activeObject);
                fabricCanvas.current.renderAll();
                queueSave();
            }
        },
        sendBackwards: () => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject) {
                fabricCanvas.current.sendObjectBackwards(activeObject);
                fabricCanvas.current.renderAll();
                queueSave();
            }
        },
        toggleLock: () => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject) {
                const isLocked = activeObject.locked || false;
                activeObject.set({
                    locked: !isLocked,
                    lockMovementX: !isLocked,
                    lockMovementY: !isLocked,
                    lockScalingX: !isLocked,
                    lockScalingY: !isLocked,
                    lockRotation: !isLocked,
                    hasControls: isLocked, // true when unlocked, false when locked
                });
                activeObject.setOptions({ hoverCursor: !isLocked ? 'not-allowed' : 'move' });
                fabricCanvas.current.renderAll();
                updateSelectedState();
                queueSave();
            }
        },
        groupElements: () => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject && activeObject.type === 'activeSelection') {
                activeObject.toGroup();
                fabricCanvas.current.renderAll();
                updateSelectedState();
                queueSave();
            }
        },
        ungroupElements: () => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject && activeObject.type === 'group') {
                activeObject.toActiveSelection();
                fabricCanvas.current.renderAll();
                updateSelectedState();
                queueSave();
            }
        },
        exportImage: (format, fileName) => {
            if (!fabricCanvas.current) return;
            const dataUrl = fabricCanvas.current.toDataURL({
                format: format,
                quality: 1,
                multiplier: 2
            });
            const link = document.createElement('a');
            const finalName = fileName || (currentProject?.name || 'design');
            link.download = `${finalName}.${format}`;
            link.href = dataUrl;
            link.click();
        },
        handleUndo: async () => {
            if (undoStack.current.length <= 1) return;
            isActionInProgress.current = true;

            const currentState = undoStack.current.pop();
            redoStack.current.push(currentState);

            const prevState = undoStack.current[undoStack.current.length - 1];
            await fabricCanvas.current.loadFromJSON(JSON.parse(prevState));
            fabricCanvas.current.renderAll();

            isActionInProgress.current = false;
            updateSelectedState();
            queueSave(true);
        },
        handleRedo: async () => {
            if (redoStack.current.length === 0) return;
            isActionInProgress.current = true;

            const nextState = redoStack.current.pop();
            undoStack.current.push(nextState);

            await fabricCanvas.current.loadFromJSON(JSON.parse(nextState));
            fabricCanvas.current.renderAll();

            isActionInProgress.current = false;
            updateSelectedState();
            queueSave(true);
        },
        deleteActiveObject,
        snapUndo: () => pushToUndo(),
        clearSelection: () => {
            if (!fabricCanvas.current) return;
            fabricCanvas.current.discardActiveObject();
            fabricCanvas.current.renderAll();
            setSelectedObject(null);
            setToolbarPos(null);
            setContextMenu(null);
        },
        getDesignSnapshot: () => {
            if (!fabricCanvas.current) return null;
            const rawJson = fabricCanvas.current.toObject(['id', 'metadata']);
            const stripped = stripObjectUrlsFromProject(rawJson);
            
            return {
                screenshot: fabricCanvas.current.toDataURL({ format: 'png', quality: 1, multiplier: 1 }),
                json: stripped
            };
        },
        loadDesign: async (json) => {
            if (!fabricCanvas.current) return;
            isActionInProgress.current = true;

            // Filter out broken images
            // Compatibility check: Our project uses 'layers', Fabric uses 'objects'
            const objects = json.layers || json.objects || (Array.isArray(json) ? json : []);

            const resolvePath = async (path) => {
                if (!path || typeof path !== 'string') return path;
                if (path.startsWith('blob:') || path.startsWith('http') || path.startsWith('data:')) return path;
                
                // For local relative paths, try to get an Object URL from the store
                try {
                    const { getAssetObjectUrl } = useCanvasStore.getState();
                    return await getAssetObjectUrl(path);
                } catch (error) {
                    console.warn(`Failed to resolve local path '${path}':`, error);
                    return path;
                }
            };

            const filteredLayers = await Promise.all(objects.map(async (obj) => {
                const newObj = { ...obj };
                
                // CRITICAL: If AI returned an object without metadata, try to recover it from the existing object on canvas
                // This preserves the originalPath which is essential for persistence.
                if ((!newObj.metadata || !newObj.metadata.originalPath) && newObj.id) {
                    const existingObj = fabricCanvas.current.getObjects().find(o => o.id === newObj.id);
                    if (existingObj && existingObj.metadata) {
                        newObj.metadata = { ...(newObj.metadata || {}), ...existingObj.metadata };
                    }
                }

                if (newObj.src) {
                    const path = newObj.src;
                    newObj.src = await resolvePath(path);
                    newObj.crossOrigin = 'anonymous';

                    // Critical: Preserve the original path for saving back to disk
                    if (!path.startsWith('blob:') && !path.startsWith('http') && !path.startsWith('data:')) {
                        if (!newObj.metadata) newObj.metadata = {};
                        newObj.metadata.originalPath = path;
                    }
                }
                // Handle Smart Frames (Patterns)
                if (newObj.fill && typeof newObj.fill === 'object' && newObj.fill.source) {
                    const fillPath = newObj.fill.source;
                    newObj.fill.source = await resolvePath(fillPath);

                    if (!fillPath.startsWith('blob:') && !fillPath.startsWith('http') && !fillPath.startsWith('data:')) {
                        if (!newObj.metadata) newObj.metadata = {};
                        newObj.metadata.fillSourcePath = fillPath;
                    }
                }
                return newObj;
            }));

            await fabricCanvas.current.loadFromJSON({
                objects: filteredLayers.filter(o => o !== null),
                background: json.background || fabricCanvas.current.backgroundColor
            });
            fabricCanvas.current.renderAll();
            isActionInProgress.current = false;
            pushToUndo();
            queueSave(true);
        },
        resetPan: () => {
            panOffsetX.current = 0;
            panOffsetY.current = 0;
            zoomLevel.current = 1;
            updateContainerTransform();
        },
        getCanvasSize: () => {
            if (!fabricCanvas.current) {
                return { width: 0, height: 0 };
            }
            return {
                width: fabricCanvas.current.width,
                height: fabricCanvas.current.height
            };
        },
        getBackgroundColor: () => {
            if (!fabricCanvas.current) return '#ffffff';
            return fabricCanvas.current.backgroundColor || '#ffffff';
        },
        setBackgroundColor: (color) => {
            if (!fabricCanvas.current) return;
            fabricCanvas.current.backgroundColor = color;
            fabricCanvas.current.renderAll();
            queueSave();
        }
    }));

    const queueSave = (skipHistory = false) => {
        if (isInitializing.current || !fabricCanvas.current) return;

        if (!skipHistory) {
            pushToUndo();
        }

        clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            const rawJson = fabricCanvas.current.toObject(['id', 'metadata']);
            const dataUrl = fabricCanvas.current.toDataURL({ format: 'png', quality: 0.5, multiplier: 0.5 });

            const layers = rawJson.objects;

            setCanvasData({
                ...canvasData,
                canvas: {
                    width: fabricCanvas.current.width,
                    height: fabricCanvas.current.height,
                    backgroundColor: fabricCanvas.current.backgroundColor,
                },
                layers: layers
            });
            await saveProjectState(dataUrl);
        }, 1000);
    };

    const updateSelectedState = () => {
        if (!fabricCanvas.current) return;
        const activeObject = fabricCanvas.current.getActiveObject();
        const activeObjects = fabricCanvas.current.getActiveObjects();

        if (activeObject) {
            const canvasWidth = fabricCanvas.current.width;
            const canvasHeight = fabricCanvas.current.height;
            const width = activeObject.getScaledWidth();
            const height = activeObject.getScaledHeight();
            const left = activeObject.left;
            const top = activeObject.top;
            const right = canvasWidth - (left + width);
            const bottom = canvasHeight - (top + height);

            const filters = { brightness: 0, contrast: 0, hue: 0, blur: 0 };
            if (activeObject.type === 'image' && activeObject.filters) {
                activeObject.filters.forEach(f => {
                    if (f.type === 'Brightness') filters.brightness = f.brightness || 0;
                    if (f.type === 'Contrast') filters.contrast = f.contrast || 0;
                    if (f.type === 'HueRotation') filters.hue = f.rotation || 0;
                    if (f.type === 'Blur') filters.blur = f.blur || 0;
                });
            }

            setSelectedObject({
                type: activeObject.type,
                fill: activeObject.fill,
                fontSize: activeObject.fontSize,
                text: activeObject.text,
                fontFamily: activeObject.fontFamily,
                opacity: activeObject.opacity,
                width: Math.round(width),
                height: Math.round(height),
                left: Math.round(left),
                top: Math.round(top),
                right: Math.round(right),
                bottom: Math.round(bottom),
                angle: Math.round(activeObject.angle) || 0,
                filters: filters,
                isLocked: activeObject.locked || false,
                isGroup: activeObject.type === 'group',
                isActiveSelection: activeObjects.length > 1,
                selectionCount: activeObjects.length,
                imageCount: activeObjects.filter(o => 
                    o.type === 'image' || o.type === 'fabricImage' || o.type?.toLowerCase().includes('image') || o.getSrc?.()
                ).length,
                isCurved: activeObject.isCurved || false,
                curveRadius: activeObject.curveRadius || 50
            });

            // Update floating toolbar position (hide if rotating)
            if (!isRotating.current) {
                const bound = activeObject.getBoundingRect();
                setToolbarPos({
                    left: bound.left + bound.width / 2,
                    top: bound.top - 80
                });
            }
        } else {
            setSelectedObject(null);
            setToolbarPos(null);
        }
    };

    useEffect(() => {
        if (!canvasEl.current || fabricCanvas.current) return;

        const initCanvas = async () => {
            const width = canvasData?.canvas?.width || 1080;
            const height = canvasData?.canvas?.height || 1080;

            fabricCanvas.current = new fabric.Canvas(canvasEl.current, {
                width: width,
                height: height,
                backgroundColor: canvasData?.canvas?.backgroundColor || '#ffffff',
                uniformScaling: false
            });

            // Keyboard Listeners
            const handleKeyDown = (e) => {
                if (!fabricCanvas.current) return;
                if (e.key === ' ' || e.code === 'Space') {
                    // Check if user is typing in an input field or textarea
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.isContentEditable;

                    if (isInputField) {
                        return; // Allow normal space in input fields
                    }

                    // Check if user is editing text in canvas - if so, allow normal space
                    const activeObject = fabricCanvas.current?.getActiveObject();
                    if (activeObject && activeObject.type === 'i-text' && activeObject.isEditing) {
                        return; // Don't interfere with text editing
                    }

                    // Only enable panning if mouse is in canvas
                    if (!isMouseInCanvas.current) {
                        return;
                    }

                    e.preventDefault(); // Prevent page scrolling
                    if (!isSpacePressed.current) {
                        isSpacePressed.current = true;
                        fabricCanvas.current.selection = false; // Disable selection
                        fabricCanvas.current.defaultCursor = 'grab';
                        fabricCanvas.current.hoverCursor = 'grab';
                        if (containerRef.current) {
                            containerRef.current.style.cursor = 'grab';
                        }
                        fabricCanvas.current.forEachObject((obj) => {
                            obj.selectable = false;
                            obj.evented = false;
                        });
                        fabricCanvas.current.discardActiveObject();
                        fabricCanvas.current.renderAll();
                    }
                }
                if (e.key === 'Control') {
                    if (fabricCanvas.current) {
                        fabricCanvas.current.uniformScaling = true;
                    }
                }
                // Copy with Ctrl+C
                if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.isContentEditable;

                    const activeObject = fabricCanvas.current.getActiveObject();
                    const isEditingText = activeObject && activeObject.type === 'i-text' && activeObject.isEditing;

                    if (!isInputField && !isEditingText && activeObject) {
                        e.preventDefault();
                        activeObject.clone(['id', 'metadata']).then((cloned) => {
                            clipboard.current = cloned;
                        });
                    }
                }

                // Paste with Ctrl+V
                if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.isContentEditable;

                    const activeObject = fabricCanvas.current.getActiveObject();
                    const isEditingText = activeObject && activeObject.type === 'i-text' && activeObject.isEditing;

                    if (!isInputField && !isEditingText && clipboard.current && !isPasting.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        isPasting.current = true;

                        clipboard.current.clone(['id', 'metadata']).then((cloned) => {
                            cloned.set({
                                left: cloned.left + 30,
                                top: cloned.top + 30,
                            });
                            fabricCanvas.current.discardActiveObject();
                            fabricCanvas.current.add(cloned);
                            fabricCanvas.current.setActiveObject(cloned);
                            fabricCanvas.current.requestRenderAll();
                            updateSelectedState();
                            queueSave();
                            isPasting.current = false;
                        }).catch((err) => {
                            console.error('Paste error:', err);
                            isPasting.current = false;
                        });
                    }
                }

                // Arrow keys for moving
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
                    const activeObject = fabricCanvas.current.getActiveObject();
                    const isEditingText = activeObject && activeObject.type.includes('text') && activeObject.isEditing;

                    if (!isInputField && !isEditingText && activeObject) {
                        e.preventDefault();
                        const step = e.shiftKey ? 10 : 1;
                        if (e.key === 'ArrowUp') activeObject.set('top', activeObject.top - step);
                        if (e.key === 'ArrowDown') activeObject.set('top', activeObject.top + step);
                        if (e.key === 'ArrowLeft') activeObject.set('left', activeObject.left - step);
                        if (e.key === 'ArrowRight') activeObject.set('left', activeObject.left + step);

                        activeObject.setCoords();
                        fabricCanvas.current.requestRenderAll();
                        updateSelectedState();
                        queueSave();
                    }
                }

                // Undo / Redo
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
                    if (!isInputField) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            // Redo
                            if (redoStack.current.length > 0) {
                                isActionInProgress.current = true;
                                const nextState = redoStack.current.pop();
                                undoStack.current.push(nextState);
                                fabricCanvas.current.loadFromJSON(JSON.parse(nextState)).then(() => {
                                    fabricCanvas.current.renderAll();
                                    isActionInProgress.current = false;
                                    updateSelectedState();
                                    queueSave(true);
                                });
                            }
                        } else {
                            // Undo
                            if (undoStack.current.length > 1) {
                                isActionInProgress.current = true;
                                const currentState = undoStack.current.pop();
                                redoStack.current.push(currentState);
                                const prevState = undoStack.current[undoStack.current.length - 1];
                                fabricCanvas.current.loadFromJSON(JSON.parse(prevState)).then(() => {
                                    fabricCanvas.current.renderAll();
                                    isActionInProgress.current = false;
                                    updateSelectedState();
                                    queueSave(true);
                                });
                            }
                        }
                    }
                }

                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
                    if (!isInputField) {
                        e.preventDefault();
                        if (redoStack.current.length > 0) {
                            isActionInProgress.current = true;
                            const nextState = redoStack.current.pop();
                            undoStack.current.push(nextState);
                            fabricCanvas.current.loadFromJSON(JSON.parse(nextState)).then(() => {
                                fabricCanvas.current.renderAll();
                                isActionInProgress.current = false;
                                updateSelectedState();
                                queueSave(true);
                            });
                        }
                    }
                }

                // Delete
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    // Check if not typing in text object or input field
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.isContentEditable;

                    if (isInputField) {
                        return; // Allow normal delete/backspace in input fields
                    }

                    // Ctrl+G grouping
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
                        e.preventDefault();
                        const activeObj = fabricCanvas.current.getActiveObject();
                        if (!activeObj) return;

                        if (activeObj.type === 'activeSelection') {
                            activeObj.toGroup();
                            fabricCanvas.current.requestRenderAll();
                            updateSelectedState();
                            queueSave(false);
                        } else if (activeObj.type === 'group') {
                            activeObj.toActiveSelection();
                            fabricCanvas.current.requestRenderAll();
                            updateSelectedState();
                            queueSave(false);
                        }
                        return;
                    }

                    const activeObject = fabricCanvas.current?.getActiveObject();
                    if (activeObject && (activeObject.type !== 'i-text' || !activeObject.isEditing)) {
                        deleteActiveObject();
                    }
                }
            };
            const handleKeyUp = (e) => {
                if (!fabricCanvas.current) return;
                if (e.key === ' ' || e.code === 'Space') {
                    // Check if user is typing in an input field or textarea
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.isContentEditable;

                    if (isInputField) {
                        return; // Don't reset panning state for input fields
                    }

                    isSpacePressed.current = false;
                    isPanning.current = false;
                    fabricCanvas.current.selection = true; // Enable selection
                    fabricCanvas.current.defaultCursor = 'default';
                    fabricCanvas.current.hoverCursor = 'move';
                    if (containerRef.current) {
                        containerRef.current.style.cursor = 'default';
                    }
                    fabricCanvas.current.forEachObject((obj) => {
                        obj.selectable = true;
                        obj.evented = true;
                    });
                    fabricCanvas.current.renderAll();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);

            // Handle Paste Events
            const handlePasteEvent = async (e) => {
                if (!fabricCanvas.current) return;
                const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
                if (!items) return;
                for (const item of items) {
                    if (item.type.indexOf('image/') === 0) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            const base64data = event.target.result;
                            try {
                                const result = await uploadPastedImage(blob);
                                const img = await fabric.FabricImage.fromURL(result.url, { crossOrigin: 'anonymous' });
                                img.set('metadata', { 
                                    source: "clipboard",
                                    originalPath: result.path 
                                });
                                fabricCanvas.current.add(img);
                                fabricCanvas.current.centerObject(img);
                                img.setCoords();
                                fabricCanvas.current.bringObjectToFront(img);
                                fabricCanvas.current.setActiveObject(img);
                                fabricCanvas.current.renderAll();
                                queueSave();
                            } catch (err) {
                                console.error("Paste upload error:", err);
                            }
                        };
                        reader.readAsDataURL(blob);
                        break;
                    }
                }
            };
            window.addEventListener('paste', handlePasteEvent);

            // Mouse Wheel Zoom (with Ctrl)
            const handleWheel = (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();

                    const delta = e.deltaY;
                    const zoomFactor = delta > 0 ? 0.9 : 1.1;

                    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.current * zoomFactor));
                    zoomLevel.current = newZoom;

                    updateContainerTransform();
                }
            };

            if (containerRef.current) {
                containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
            }
            window.addEventListener('wheel', handleWheel, { passive: false });

            // Panning Events - using window events so it works anywhere
            const handleMouseDown = (e) => {
                if (isSpacePressed.current && isMouseInCanvas.current) {
                    isPanning.current = true;
                    if (containerRef.current) {
                        containerRef.current.style.cursor = 'grabbing';
                    }
                    fabricCanvas.current.defaultCursor = 'grabbing';
                    lastPosX.current = e.clientX;
                    lastPosY.current = e.clientY;
                }
            };

            const handleMouseMove = (e) => {
                if (isPanning.current && isSpacePressed.current) {
                    const deltaX = e.clientX - lastPosX.current;
                    const deltaY = e.clientY - lastPosY.current;

                    panOffsetX.current += deltaX;
                    panOffsetY.current += deltaY;

                    // Update container position
                    updateContainerTransform();

                    lastPosX.current = e.clientX;
                    lastPosY.current = e.clientY;
                }
            };

            const handleMouseUp = () => {
                if (isPanning.current) {
                    isPanning.current = false;
                    if (isSpacePressed.current && containerRef.current) {
                        containerRef.current.style.cursor = 'grab';
                    }
                    fabricCanvas.current.defaultCursor = 'grab';
                }
            };

            window.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            // Track mouse enter/leave canvas area
            const handleCanvasMouseEnter = () => {
                isMouseInCanvas.current = true;
            };

            const handleCanvasMouseLeave = () => {
                isMouseInCanvas.current = false;
                // If space is pressed but mouse leaves canvas, reset cursor
                if (isSpacePressed.current && !isPanning.current && containerRef.current) {
                    containerRef.current.style.cursor = 'default';
                }
            };

            if (containerRef.current) {
                containerRef.current.addEventListener('mouseenter', handleCanvasMouseEnter);
                containerRef.current.addEventListener('mouseleave', handleCanvasMouseLeave);
            }

            // Drag and Drop (Native)
            const handleNativeDrop = async (e) => {
                e.preventDefault();
                const file = e.dataTransfer?.files?.[0];
                if (file && file.type.startsWith('image/')) {
                    try {
                        const imgRect = canvasEl.current.getBoundingClientRect();
                        const x = e.clientX - imgRect.left;
                        const y = e.clientY - imgRect.top;

                        // Apply zoom and pan inversion to get real canvas coords
                        const pointer = fabricCanvas.current.restorePointerVpt({ x, y });

                        const target = fabricCanvas.current.getObjects().reverse().find(obj => obj.isFrame && obj.containsPoint(pointer));

                        const result = await uploadLocalAsset(file);
                        
                        fabric.util.loadImage(result.url, (imgElement) => {
                            if (target) {
                                const pattern = new fabric.Pattern({ source: imgElement, repeat: 'no-repeat' });
                                const scaleX = target.width / imgElement.width;
                                const scaleY = target.height / imgElement.height;
                                const scale = Math.max(scaleX, scaleY);
                                const offsetX = (target.width - imgElement.width * scale) / 2;
                                const offsetY = (target.height - imgElement.height * scale) / 2;
                                pattern.patternTransform = [scale, 0, 0, scale, offsetX, offsetY];
                                target.set({ 
                                    fill: pattern, 
                                    stroke: null, 
                                    strokeWidth: 0, 
                                    isFrameFilled: true,
                                    metadata: { ...target.metadata, originalPath: result.path }
                                });
                            } else {
                                const img = new fabric.FabricImage(imgElement);
                                img.set({ 
                                    left: pointer.x, 
                                    top: pointer.y,
                                    metadata: { originalPath: result.path }
                                });
                                fabricCanvas.current.add(img);
                                fabricCanvas.current.setActiveObject(img);
                            }
                            fabricCanvas.current.renderAll();
                            queueSave();
                        }, null, 'anonymous');
                    } catch (err) {
                        console.error('Failed to upload dropped file:', err);
                    }
                }
            };

            const handleNativeDragOver = (e) => {
                e.preventDefault();
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
            };

            if (containerRef.current) {
                containerRef.current.addEventListener('drop', handleNativeDrop);
                containerRef.current.addEventListener('dragover', handleNativeDragOver);
            }

            // ── Canvas Events ────────────────────────────────────────────────
            fabricCanvas.current.on('selection:created', updateSelectedState);
            fabricCanvas.current.on('selection:updated', updateSelectedState);
            fabricCanvas.current.on('selection:cleared', updateSelectedState);

            // During scaling: update properties panel but DO NOT push undo
            fabricCanvas.current.on('object:scaling', (e) => {
                isScalingObj.current = true;
                const obj = e.target;
                
                // ─── NEW: Fix Text Resizing (Wrap vs Scale) ───
                // If it's a Textbox, convert scale to width change to force wrapping
                if (obj && obj.type === 'textbox') {
                    const newWidth = obj.width * obj.scaleX;
                    const newHeight = obj.height * obj.scaleY;
                    
                    obj.set({
                        width: Math.max(newWidth, 10), // minimum width
                        scaleX: 1,
                        scaleY: 1
                    });
                }
                
                updateSelectedState();
            });

            // Hide toolbar + properties when clicking empty canvas space
            fabricCanvas.current.on('mouse:down', (e) => {
                if (!e.target) {
                    setToolbarPos(null);
                    setContextMenu(null);
                }
            });

            // ── Smart Guide Lines (Biophilic Sage Green) ─────────────────────
            // SNAP_THRESHOLD: magnetic pull distance in canvas px
            const SNAP_THRESHOLD = 8;
            // Larger threshold for center-of-canvas alignment (easier to hit)
            const CENTER_SNAP_THRESHOLD = 12;

            const clearGuideLines = () => {
                if (guideLines.current.length > 0) {
                    guideLines.current.forEach(line => {
                        if (fabricCanvas.current) fabricCanvas.current.remove(line);
                    });
                    guideLines.current = [];
                }
            };

            const drawGuideLine = (coords, isCenter = false) => {
                const line = new fabric.Line(coords, {
                    stroke: isCenter ? '#A8C69F' : '#C8DEBC', // Sage green — brighter for center guides
                    strokeWidth: isCenter ? 1.5 : 1,
                    selectable: false,
                    evented: false,
                    strokeDashArray: isCenter ? [8, 5] : [5, 6],
                    opacity: isCenter ? 0.95 : 0.7,
                    id: 'guide',
                    shadow: isCenter
                        ? new fabric.Shadow({ color: 'rgba(168,198,159,0.6)', blur: 6, offsetX: 0, offsetY: 0 })
                        : null,
                });
                fabricCanvas.current.add(line);
                guideLines.current.push(line);
            };

            // object:moving — update position display + snap guides, but NO undo push
            fabricCanvas.current.on('object:moving', (e) => {
                const activeObj = e.target;
                if (!activeObj) return;
                isMoving.current = true;

                clearGuideLines();

                const canvasWidth = fabricCanvas.current.width;
                const canvasHeight = fabricCanvas.current.height;
                const halfW = canvasWidth / 2;
                const halfH = canvasHeight / 2;

                const objBounds = activeObj.getBoundingRect();
                const objCenter = activeObj.getCenterPoint();

                // Canvas edge + center snap targets
                const canvasXs = [
                    { val: 0, isCenter: false },
                    { val: halfW, isCenter: true },
                    { val: canvasWidth, isCenter: false },
                ];
                const canvasYs = [
                    { val: 0, isCenter: false },
                    { val: halfH, isCenter: true },
                    { val: canvasHeight, isCenter: false },
                ];

                // Collect sibling object edges + centers
                const siblingXs = [];
                const siblingYs = [];
                fabricCanvas.current.getObjects().forEach(obj => {
                    if (obj === activeObj || obj.id === 'guide') return;
                    const b = obj.getBoundingRect();
                    const c = obj.getCenterPoint();
                    siblingXs.push(
                        { val: b.left, isCenter: false },
                        { val: c.x, isCenter: true },
                        { val: b.left + b.width, isCenter: false }
                    );
                    siblingYs.push(
                        { val: b.top, isCenter: false },
                        { val: c.y, isCenter: true },
                        { val: b.top + b.height, isCenter: false }
                    );
                });

                const allXTargets = [...canvasXs, ...siblingXs];
                const allYTargets = [...canvasYs, ...siblingYs];

                const activeXEdges = [
                    objBounds.left,
                    objCenter.x,
                    objBounds.left + objBounds.width,
                ];
                const activeYEdges = [
                    objBounds.top,
                    objCenter.y,
                    objBounds.top + objBounds.height,
                ];

                let snappedX = false;
                let snappedY = false;

                for (const { val: targetX, isCenter: ic } of allXTargets) {
                    if (snappedX) break;
                    const threshold = ic ? CENTER_SNAP_THRESHOLD : SNAP_THRESHOLD;
                    for (const edgeX of activeXEdges) {
                        if (Math.abs(edgeX - targetX) < threshold) {
                            activeObj.set({ left: activeObj.left + (targetX - edgeX) });
                            drawGuideLine([targetX, 0, targetX, canvasHeight], ic);
                            snappedX = true;
                            break;
                        }
                    }
                }

                for (const { val: targetY, isCenter: ic } of allYTargets) {
                    if (snappedY) break;
                    const threshold = ic ? CENTER_SNAP_THRESHOLD : SNAP_THRESHOLD;
                    for (const edgeY of activeYEdges) {
                        if (Math.abs(edgeY - targetY) < threshold) {
                            activeObj.set({ top: activeObj.top + (targetY - edgeY) });
                            drawGuideLine([0, targetY, canvasWidth, targetY], ic);
                            snappedY = true;
                            break;
                        }
                    }
                }

                // Only update panel, no undo push
                updateSelectedState();
            });

            // Clear guides on mouse:up
            fabricCanvas.current.on('mouse:up', () => {
                clearGuideLines();
            });

            // Handle rotation — hide toolbar while rotating, no undo
            fabricCanvas.current.on('object:rotating', () => {
                isRotating.current = true;
                setToolbarPos(null);
            });

            // object:modified fires on mouseup after move/resize/rotate
            // This is the ONLY place we push undo for drag/resize/rotate actions
            fabricCanvas.current.on('object:modified', (e) => {
                isRotating.current = false;
                isMoving.current = false;
                isScalingObj.current = false;
                updateSelectedState();
                // Push a single undo snapshot for the entire drag/resize gesture
                queueSave();
            });

            fabricCanvas.current.on('object:added', () => queueSave());
            fabricCanvas.current.on('object:removed', () => queueSave());

            // Prevent page scrolling when editing text in transformed container
            fabricCanvas.current.on('text:editing:entered', () => {
                window.scrollTo(0, 0); // Failsafe
                const textarea = fabricCanvas.current.elements?.[0] || document.querySelector('.copy-paste-helper');
                if (textarea) {
                    textarea.style.position = 'fixed';
                    textarea.style.top = '0px';
                    textarea.style.left = '0px';
                    textarea.style.zIndex = '-9999';
                }
            });

            const cleanLayers = canvasData.layers || canvasData.objects || [];

                if (fabricCanvas.current) {
                    try {
                        fabricCanvas.current.selectionLineWidth = 2;
                        fabricCanvas.current.uniScaleKey = 'ctrlKey';

                        // Biophilic selection handles: sage green border + white handles with green stroke
                        fabric.Object.prototype.set({
                            transparentCorners: false,
                            cornerColor: '#ffffff',
                            cornerStrokeColor: '#A8C69F',   // sage green
                            borderColor: '#A8C69F',          // sage green bounding box
                            borderDashArray: null,           // solid line
                            cornerSize: 12,
                            padding: 8,
                            cornerStyle: 'circle',
                            borderScaleFactor: 2,            // 2px visual border
                            uniformScaling: true,
                        });

                        // Custom Rotation Handle (Biophilic Style)
                        // In Fabric 7, we use FabricObject and ensure controls are initialized
                        const TargetClass = fabric.FabricObject || fabric.Object;
                        if (TargetClass && TargetClass.prototype) {
                            // Safely access controls or initialize if missing
                            if (!TargetClass.prototype.controls) {
                                try {
                                    // Try to get default controls from various possible locations in different Fabric versions
                                    const defaultControls = (fabric.controlsUtils && typeof fabric.controlsUtils.createDefaultControls === 'function') 
                                        ? fabric.controlsUtils.createDefaultControls() 
                                        : (typeof fabric.createDefaultControls === 'function' ? fabric.createDefaultControls() : {});
                                    TargetClass.prototype.controls = defaultControls;
                                } catch (e) {
                                    TargetClass.prototype.controls = {};
                                }
                            }
                            
                            const rotateImg = new Image();
                            rotateImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.4853 3 16.7353 4.00736 18.364 5.63604M21 2V6H17" stroke="#A8C69F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            `);

                            if (TargetClass.prototype.controls) {
                                TargetClass.prototype.controls.mtr = new fabric.Control({
                            x: 0,
                            y: -0.5,
                            offsetY: -45,
                            cursorStyle: 'crosshair',
                            actionHandler: fabric.controlsUtils.rotationWithSnapping,
                            actionName: 'rotate',
                            render: function(ctx, left, top, styleOverride, fabricObject) {
                                const size = 28;
                                ctx.save();
                                ctx.translate(left, top);
                                ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
                                
                                // Background Circle
                                ctx.beginPath();
                                ctx.arc(0, 0, size / 2, 0, 2 * Math.PI, false);
                                ctx.fillStyle = '#ffffff';
                                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                                ctx.shadowBlur = 8;
                                ctx.fill();
                                
                                // Border
                                ctx.strokeStyle = '#A8C69F';
                                ctx.lineWidth = 1.5;
                                ctx.stroke();

                                // Icon
                                if (rotateImg.complete) {
                                    ctx.drawImage(rotateImg, -9, -9, 18, 18);
                                }
                                ctx.restore();
                            }
                        });
                    }
                }

                        await fabricCanvas.current.loadFromJSON({
                            objects: validateAndCleanLayers(cleanLayers),
                            background: (canvasData.canvas && canvasData.canvas.backgroundColor) || '#ffffff'
                        });
                        if (fabricCanvas.current) {
                            fabricCanvas.current.renderAll();
                        }
                    } catch (err) {
                        console.error('Error loading initial JSON:', err);
                    }
                }

            // Push initial state to undo
            const initialJson = fabricCanvas.current.toObject(['id', 'metadata']);
            undoStack.current = [JSON.stringify(initialJson)];

            isInitializing.current = false;
            resize();

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
                window.removeEventListener('wheel', handleWheel);
                window.removeEventListener('mousedown', handleMouseDown);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('paste', handlePasteEvent); // <--- Add this
                if (containerRef.current) {
                    containerRef.current.removeEventListener('wheel', handleWheel);
                    containerRef.current.removeEventListener('mouseenter', handleCanvasMouseEnter);
                    containerRef.current.removeEventListener('mouseleave', handleCanvasMouseLeave);
                }
            };
        };

        initCanvas();

        return () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.dispose();
                fabricCanvas.current = null;
            }
        };
    }, []);

    const updateContainerTransform = () => {
        if (containerRef.current && fabricCanvas.current) {
            const parent = containerRef.current.parentElement;
            if (!parent) return;
            const cw = fabricCanvas.current.width;
            const ch = fabricCanvas.current.height;

            const pw = parent.clientWidth - 60;
            const ph = parent.clientHeight - 60;
            const baseScale = Math.min(pw / cw, ph / ch);
            const finalScale = baseScale * zoomLevel.current;

            containerRef.current.style.transform = `translate(${panOffsetX.current}px, ${panOffsetY.current}px) scale(${finalScale})`;
            // Keep React in sync so toolbar can counter-scale
            setCanvasScale(finalScale);
        }
    };

    const resize = () => {
        updateContainerTransform();
        if (containerRef.current && fabricCanvas.current) {
            const cw = fabricCanvas.current.width;
            const ch = fabricCanvas.current.height;

            // Set explicit size to container so the scaling box is correct
            containerRef.current.style.width = `${cw}px`;
            containerRef.current.style.height = `${ch}px`;
        }
    };

    useEffect(() => {
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const isDarkMode = () => document.documentElement.classList.contains('dark');

    return (
        <div
            ref={containerRef}
            className="origin-center shadow-2xl bg-white dark:shadow-[0_0_0_1px_rgba(46,61,47,0.8),0_24px_64px_-12px_rgba(18,26,19,0.9)] border border-slate-200 dark:border-biophilic-dark-border relative"
            onContextMenu={(e) => {
                e.preventDefault();
                const rect = containerRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left) / canvasScale;
                const y = (e.clientY - rect.top) / canvasScale;
                setContextMenu({ x, y });
            }}
            onClick={() => {
                if (useCanvasStore.getState().contextMenu) setContextMenu(null);
            }}
        >
            <canvas ref={canvasEl} />

            <ContextMenu 
                handleContextMenuAction={handleContextMenuAction}
                canvasScale={canvasScale}
                isDarkMode={isDarkMode()}
            />

            <SelectionToolbar 
                canvasScale={canvasScale}
                isDarkMode={isDarkMode()}
                isRemovingBg={isRemovingBg}
                isMerging={isMerging}
                isRotating={isRotating.current}
                handleRemoveBackgroundActiveObject={handleRemoveBackgroundActiveObject}
                handleAIMerge={handleAIMerge}
                duplicateActiveObject={duplicateActiveObject}
                deleteActiveObject={deleteActiveObject}
                fabricCanvas={fabricCanvas}
                pushToUndo={pushToUndo}
                updateSelectedState={updateSelectedState}
                queueSave={queueSave}
                selectedObject={selectedObject}
            />
        </div>
    );
});

export default FabricCanvas;

/**
 * Utility to calculate the visual boundaries of an image (non-transparent pixels)
 */
function getVisualBoundaries(imgEl) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgEl.width;
    canvas.height = imgEl.height;
    ctx.drawImage(imgEl, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }

    if (!found) return null;

    return {
        left: minX,
        top: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}
