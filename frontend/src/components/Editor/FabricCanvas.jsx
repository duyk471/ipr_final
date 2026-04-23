import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import * as fabric from 'fabric';
import { Trash2, Copy, MoreVertical, RotateCw, Sparkles, FlipHorizontal, FlipVertical, Layers } from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';
import { api } from '../../store/useCanvasStore';

const FabricCanvas = forwardRef(({ projectId }, ref) => {
    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    const containerRef = useRef(null);
    const { canvasData, currentProject, setCanvasData, saveProjectState, setSelectedObject, selectedObject } = useCanvasStore();

    const isInitializing = useRef(true);
    const saveTimeout = useRef(null);

    // Selection UI State
    const [toolbarPos, setToolbarPos] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const isRotating = useRef(false);
    // Track the CSS display scale so the floating toolbar can counter-scale
    const [canvasScale, setCanvasScale] = useState(1);
    // Remove Background loading state
    const [isRemovingBg, setIsRemovingBg] = useState(false);

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
        if (!activeObject || activeObject.type !== 'image') return;
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

            const res = await api.post(`/projects/${projectId}/assets/remove-bg`, {
                imagePath: src
            });

            if (res.data.success) {
                const newUrl = `http://localhost:5000${res.data.asset.displayUrl}?t=${Date.now()}`;

                const imgEl = new Image();
                imgEl.crossOrigin = 'anonymous';
                imgEl.onload = () => {
                    // Restore filters and opacity before swapping element
                    clearInterval(pulseInterval);
                    activeObject.filters = originalFilters;
                    activeObject.applyFilters();
                    activeObject.set('opacity', originalOpacity);

                    activeObject.setElement(imgEl);
                    activeObject.set('src', res.data.asset.displayUrl);
                    fabricCanvas.current.renderAll();
                    updateSelectedState();
                    queueSave();
                    setIsRemovingBg(false);
                };
                imgEl.onerror = () => {
                    clearInterval(pulseInterval);
                    activeObject.filters = originalFilters;
                    activeObject.applyFilters();
                    activeObject.set('opacity', originalOpacity);
                    fabricCanvas.current.renderAll();
                    setIsRemovingBg(false);
                };
                imgEl.src = newUrl;
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
            const text = new fabric.IText(options.text || 'Hello World', {
                left: options.left || 100,
                top: options.top || 100,
                fontFamily: options.fontFamily || 'Inter',
                fill: options.fill || '#000000',
                fontSize: options.fontSize || 40,
                fontWeight: options.fontWeight || 'normal'
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
                frame = new fabric.IText(textValue, {
                    ...commonProps, fontSize: 300, fontFamily: 'Inter', fontWeight: 'bold'
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
                // If url is already absolute (e.g. https://images.unsplash.com/...), use it directly.
                // Otherwise treat as a relative backend path.
                const isAbsolute = /^https?:\/\//i.test(url) || url.startsWith('data:');
                const fullUrl = isAbsolute ? url : `http://localhost:5000${url}?t=${Date.now()}`;
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
                            activeObject.set('metadata', { ...activeObject.metadata, ...metadata });
                        }
                        canvas.renderAll();
                        queueSave();
                    }, null, 'anonymous');
                    return;
                }

                const img = await fabric.FabricImage.fromURL(fullUrl, { crossOrigin: 'anonymous' });

                if (metadata) {
                    img.set('metadata', metadata);
                }

                canvas.add(img);
                canvas.centerObject(img);
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
            return {
                screenshot: fabricCanvas.current.toDataURL({ format: 'png', quality: 1, multiplier: 1 }),
                json: fabricCanvas.current.toObject(['id', 'metadata'])
            };
        },
        loadDesign: async (json) => {
            if (!fabricCanvas.current) return;
            isActionInProgress.current = true;

            // Filter out broken images
            // Compatibility check: Our project uses 'layers', Fabric uses 'objects'
            const objects = json.layers || json.objects || (Array.isArray(json) ? json : []);

            const resolvePath = (path) => {
                if (!path || typeof path !== 'string') return path;
                if (path.startsWith('http') || path.startsWith('data:')) return path;
                // Handle relative paths from storage
                const cleanPath = path.startsWith('/') ? path.slice(1) : path;
                return `http://localhost:5000/storage/projects/${projectId}/${cleanPath}?t=${Date.now()}`;
            };

            const filteredLayers = objects.map((obj) => {
                const newObj = { ...obj };
                if (newObj.src) {
                    newObj.src = resolvePath(newObj.src);
                    newObj.crossOrigin = 'anonymous';
                }
                // Handle Smart Frames (Patterns)
                if (newObj.fill && typeof newObj.fill === 'object' && newObj.fill.source) {
                    newObj.fill.source = resolvePath(newObj.fill.source);
                }
                return newObj;
            });

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

            // Helper to strip backend storage prefix back to relative
            const stripPath = (path) => {
                if (!path || typeof path !== 'string') return path;
                const prefix = `http://localhost:5000/storage/projects/${projectId}/`;
                if (path.startsWith(prefix)) {
                    return path.replace(prefix, '').split('?')[0];
                }
                return path;
            };

            const cleanObjects = rawJson.objects.map(obj => {
                const newObj = { ...obj };
                if (newObj.src) newObj.src = stripPath(newObj.src);
                if (newObj.fill && typeof newObj.fill === 'object' && newObj.fill.source) {
                    newObj.fill.source = stripPath(newObj.fill.source);
                }
                return newObj;
            });

            setCanvasData({
                ...canvasData,
                canvas: {
                    width: fabricCanvas.current.width,
                    height: fabricCanvas.current.height,
                    backgroundColor: fabricCanvas.current.backgroundColor,
                },
                layers: cleanObjects
            });
            await saveProjectState(dataUrl);
        }, 1000);
    };

    const updateSelectedState = () => {
        if (!fabricCanvas.current) return;
        const activeObject = fabricCanvas.current.getActiveObject();
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
                filters: filters,
                isLocked: activeObject.locked || false,
                isGroup: activeObject.type === 'group',
                isActiveSelection: activeObject.type === 'activeSelection',
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
                    const activeObject = fabricCanvas.current.getActiveObject();
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
                    fabricCanvas.current.uniformScaling = true;
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

                    const activeObject = fabricCanvas.current.getActiveObject();
                    if (activeObject && activeObject.type !== 'i-text' || (activeObject.type === 'i-text' && !activeObject.isEditing)) {
                        deleteActiveObject();
                    }
                }
            };
            const handleKeyUp = (e) => {
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
                                const res = await api.post(`/projects/${projectId}/assets/pasted`, {
                                    imageBase64: base64data
                                });
                                if (res.data.success) {
                                    const fullUrl = `http://localhost:5000${res.data.asset.displayUrl}?t=${Date.now()}`;
                                    const img = await fabric.FabricImage.fromURL(fullUrl, { crossOrigin: 'anonymous' });
                                    img.set('metadata', { source: "clipboard" });
                                    fabricCanvas.current.add(img);
                                    fabricCanvas.current.centerObject(img);
                                    img.setCoords();
                                    fabricCanvas.current.bringObjectToFront(img);
                                    fabricCanvas.current.setActiveObject(img);
                                    fabricCanvas.current.renderAll();
                                    queueSave();
                                }
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
            const handleNativeDrop = (e) => {
                e.preventDefault();
                const file = e.dataTransfer?.files?.[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (f) => {
                        const imgRect = canvasEl.current.getBoundingClientRect();
                        const x = e.clientX - imgRect.left;
                        const y = e.clientY - imgRect.top;

                        // Apply zoom and pan inversion to get real canvas coords
                        const pointer = fabricCanvas.current.restorePointerVpt({ x, y });

                        const target = fabricCanvas.current.getObjects().reverse().find(obj => obj.isFrame && obj.containsPoint(pointer));

                        fabric.util.loadImage(f.target.result, (imgElement) => {
                            if (target) {
                                const pattern = new fabric.Pattern({ source: imgElement, repeat: 'no-repeat' });
                                const scaleX = target.width / imgElement.width;
                                const scaleY = target.height / imgElement.height;
                                const scale = Math.max(scaleX, scaleY);
                                const offsetX = (target.width - imgElement.width * scale) / 2;
                                const offsetY = (target.height - imgElement.height * scale) / 2;
                                pattern.patternTransform = [scale, 0, 0, scale, offsetX, offsetY];
                                target.set({ fill: pattern, stroke: null, strokeWidth: 0, isFrameFilled: true });
                            } else {
                                const img = new fabric.FabricImage(imgElement);
                                img.set({ left: pointer.x, top: pointer.y });
                                fabricCanvas.current.add(img);
                                fabricCanvas.current.setActiveObject(img);
                            }
                            fabricCanvas.current.renderAll();
                            queueSave();
                        }, null, 'anonymous');
                    };
                    reader.readAsDataURL(file);
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

            if (canvasData?.layers?.length > 0) {
                const resolvePath = (path) => {
                    if (!path || typeof path !== 'string') return path;
                    if (path.startsWith('http') || path.startsWith('data:')) return path;
                    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
                    return `http://localhost:5000/storage/projects/${projectId}/${cleanPath}?t=${Date.now()}`;
                };

                const cleanLayers = canvasData.layers.map((obj) => {
                    const newObj = { ...obj };
                    if (newObj.src) {
                        newObj.src = resolvePath(newObj.src);
                        newObj.crossOrigin = 'anonymous';
                    }
                    if (newObj.fill && typeof newObj.fill === 'object' && newObj.fill.source) {
                        newObj.fill.source = resolvePath(newObj.fill.source);
                    }
                    return newObj;
                });

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

                        await fabricCanvas.current.loadFromJSON({
                            objects: cleanLayers,
                            background: (canvasData.canvas && canvasData.canvas.backgroundColor) || '#ffffff'
                        });
                        if (fabricCanvas.current) {
                            fabricCanvas.current.renderAll();
                        }
                    } catch (err) {
                        console.error('Error loading initial JSON:', err);
                    }
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
                if (contextMenu) setContextMenu(null);
            }}
        >
            <canvas ref={canvasEl} />

            {/* ── Context Menu (right-click) ── */}
            {contextMenu && (
                <div
                    className="absolute z-[200] flex flex-col min-w-[240px] max-h-[360px] overflow-y-auto overscroll-contain custom-scrollbar"
                    style={{
                        left: contextMenu.x,
                        top: contextMenu.y,
                        ...(isDarkMode() ? {
                            background: 'rgba(26, 36, 27, 0.82)',
                            border: '1.5px solid rgba(46, 61, 47, 0.9)',
                            borderRadius: '1.25rem',
                            boxShadow: '0 12px 40px -8px rgba(18,26,19,0.8), 0 0 0 0.5px rgba(184,212,175,0.08) inset',
                            backdropFilter: 'blur(24px) saturate(1.6)',
                            WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                        } : {
                            background: '#F9F7F2',
                            border: '1.5px solid #EEE9DF',
                            borderRadius: '1.25rem',
                            boxShadow: '0 12px 40px -8px rgba(44,58,48,0.18), 0 2px 8px rgba(168,198,159,0.12)',
                            backdropFilter: 'blur(16px)',
                        }),
                        transformOrigin: 'top left',
                        transform: `scale(${1 / canvasScale})`,
                    }}
                >
                    {/* Header label */}
                    <div className="px-5 pt-4 pb-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-biophilic-green-dark dark:text-biophilic-dark-green">Actions</span>
                    </div>

                    {/* Copy / Paste / Duplicate */}
                    {[['copy', 'Copy'], ['paste', 'Paste'], ['duplicate', 'Duplicate']].map(([action, label]) => (
                        <button
                            key={action}
                            onClick={handleContextMenuAction(action)}
                            className="mx-2 px-4 py-3 text-[15px] text-left font-semibold text-[#2D3A30] dark:text-[#E0E8E1] rounded-xl transition-all duration-150 hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/15 hover:text-biophilic-moss dark:hover:text-biophilic-dark-green"
                        >{label}</button>
                    ))}

                    <div className="h-px bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-3 my-2" />

                    {/* Layer order */}
                    {[['bringToFront', 'Bring to Front'], ['bringForward', 'Bring Forward'], ['sendBackwards', 'Send Backward'], ['sendToBack', 'Send to Back']].map(([action, label]) => (
                        <button
                            key={action}
                            onClick={handleContextMenuAction(action)}
                            className="mx-2 px-4 py-3 text-[15px] text-left font-semibold text-[#2D3A30] dark:text-[#E0E8E1] rounded-xl transition-all duration-150 hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/15 hover:text-biophilic-moss dark:hover:text-biophilic-dark-green"
                        >{label}</button>
                    ))}

                    <div className="h-px bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-3 my-2" />

                    {/* Flip */}
                    <button onClick={handleContextMenuAction('flipX')} className="mx-2 px-4 py-3 text-[15px] text-left font-semibold text-[#2D3A30] dark:text-[#E0E8E1] rounded-xl transition-all duration-150 hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/15 hover:text-biophilic-moss dark:hover:text-biophilic-dark-green flex items-center justify-between">
                        Flip Horizontal <FlipHorizontal size={18} className="text-biophilic-green dark:text-biophilic-dark-green" />
                    </button>
                    <button onClick={handleContextMenuAction('flipY')} className="mx-2 px-4 py-3 text-[15px] text-left font-semibold text-[#2D3A30] dark:text-[#E0E8E1] rounded-xl transition-all duration-150 hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/15 hover:text-biophilic-moss dark:hover:text-biophilic-dark-green flex items-center justify-between">
                        Flip Vertical <FlipVertical size={18} className="text-biophilic-green dark:text-biophilic-dark-green" />
                    </button>

                    <div className="h-px bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-3 my-2" />

                    <button onClick={handleContextMenuAction('group')} className="mx-2 px-4 py-3 text-[15px] text-left font-semibold text-[#2D3A30] dark:text-[#E0E8E1] rounded-xl transition-all duration-150 hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/15 hover:text-biophilic-moss dark:hover:text-biophilic-dark-green">
                        Group / Ungroup
                    </button>

                    <div className="h-px bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-3 my-2" />

                    <button onClick={handleContextMenuAction('delete')} className="mx-2 mb-2 px-4 py-3 text-[15px] text-left font-bold text-red-500 dark:text-red-400 rounded-xl transition-all duration-150 hover:bg-red-50/80 dark:hover:bg-red-900/20">
                        Delete
                    </button>
                </div>
            )}

            {/* ── Floating Selection Toolbar (Canva-style biophilic) ── */}
            {toolbarPos && !isRotating.current && (
                /* OUTER WRAPPER: Handles positioning and zoom-counter-scaling.
                   Does NOT have a 'key' prop, so it glides smoothly when dragging 
                   instead of unmounting/remounting and flickering. */
                <div
                    className="absolute z-[100] pointer-events-none"
                    style={{
                        left: toolbarPos.left,
                        top: toolbarPos.top,
                        transformOrigin: 'center bottom',
                        /* counter-scale: keep visual size constant at any zoom */
                        transform: `translateX(-50%) scale(${1 / canvasScale})`,
                        transition: 'left 0.1s ease-out, top 0.1s ease-out',
                    }}
                >
                    {/* INNER WRAPPER: Handles the spring animation and styling */}
                    <div
                        className="toolbar-pop flex items-center gap-1 pointer-events-auto"
                        style={isDarkMode() ? {
                            background: 'rgba(26, 36, 27, 0.78)',
                            border: '1.5px solid rgba(184, 212, 175, 0.18)',
                            borderRadius: '999px',
                            padding: '6px 10px',
                            boxShadow: '0 8px 32px -4px rgba(18,26,19,0.75), 0 0 0 0.5px rgba(184,212,175,0.12) inset, 0 0 20px -4px rgba(184,212,175,0.12)',
                            backdropFilter: 'blur(24px) saturate(1.7)',
                            WebkitBackdropFilter: 'blur(24px) saturate(1.7)',
                        } : {
                            background: '#F9F7F2',
                            border: '1.5px solid #EEE9DF',
                            borderRadius: '999px',
                            padding: '6px 10px',
                            boxShadow: '0 8px 32px -4px rgba(44,58,48,0.18), 0 2px 8px rgba(168,198,159,0.15)',
                        }}
                    >
                        {/* ── Remove BG (images only) ── */}
                        {selectedObject?.type === 'image' && (
                            <>
                                <button
                                    onClick={handleRemoveBackgroundActiveObject}
                                    disabled={isRemovingBg}
                                    title="Remove Background"
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold transition-all duration-150 ${
                                        isRemovingBg
                                            ? 'bg-biophilic-rose/30 dark:bg-biophilic-dark-rose/20 text-biophilic-bark dark:text-biophilic-dark-rose cursor-wait'
                                            : 'text-[#2D3A30] dark:text-[#E0E8E1] hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-rose/20'
                                    }`}
                                >
                                    {isRemovingBg ? (
                                        <>
                                            <svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="#B8D4AF" strokeWidth="3" strokeOpacity="0.3" />
                                                <path d="M12 2a10 10 0 0 1 10 10" stroke="#B8D4AF" strokeWidth="3" strokeLinecap="round" />
                                            </svg>
                                            <span>Removing…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={14} className="text-biophilic-green dark:text-biophilic-dark-green" />
                                            <span>Remove BG</span>
                                        </>
                                    )}
                                </button>
                                {/* divider */}
                                <div className="w-px h-6 mx-1 rounded-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border" />
                            </>
                        )}

                        {/* ── Text B / I / U (text objects only) ── */}
                        {selectedObject?.type?.includes('text') && (
                            <>
                                <div className="flex items-center gap-0.5">
                                    {/* Bold */}
                                    <button
                                        onClick={() => {
                                            const obj = fabricCanvas.current?.getActiveObject();
                                            if (!obj) return;
                                            pushToUndo();
                                            obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
                                            fabricCanvas.current.renderAll();
                                            updateSelectedState();
                                            queueSave(true);
                                        }}
                                        title="Bold"
                                        className={`w-9 h-9 flex items-center justify-center rounded-full font-black text-[15px] transition-all duration-150 ${
                                            selectedObject?.fontWeight === 'bold'
                                                ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg'
                                                : 'text-[#2D3A30] dark:text-[#E0E8E1] hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/20'
                                        }`}
                                    >B</button>
                                    {/* Italic */}
                                    <button
                                        onClick={() => {
                                            const obj = fabricCanvas.current?.getActiveObject();
                                            if (!obj) return;
                                            pushToUndo();
                                            obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
                                            fabricCanvas.current.renderAll();
                                            updateSelectedState();
                                            queueSave(true);
                                        }}
                                        title="Italic"
                                        className={`w-9 h-9 flex items-center justify-center rounded-full italic font-serif text-[16px] transition-all duration-150 ${
                                            selectedObject?.fontStyle === 'italic'
                                                ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg'
                                                : 'text-[#2D3A30] dark:text-[#E0E8E1] hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/20'
                                        }`}
                                    >I</button>
                                    {/* Underline */}
                                    <button
                                        onClick={() => {
                                            const obj = fabricCanvas.current?.getActiveObject();
                                            if (!obj) return;
                                            pushToUndo();
                                            obj.set('underline', !obj.underline);
                                            fabricCanvas.current.renderAll();
                                            updateSelectedState();
                                            queueSave(true);
                                        }}
                                        title="Underline"
                                        className={`w-9 h-9 flex items-center justify-center rounded-full underline text-[15px] transition-all duration-150 ${
                                            selectedObject?.underline
                                                ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg'
                                                : 'text-[#2D3A30] dark:text-[#E0E8E1] hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/20'
                                        }`}
                                    >U</button>
                                </div>
                                <div className="w-px h-6 mx-1 rounded-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border" />
                            </>
                        )}

                        {/* ── Duplicate ── */}
                        <button
                            onClick={duplicateActiveObject}
                            title="Duplicate"
                            className="w-10 h-10 flex items-center justify-center rounded-full text-[#2D3A30] dark:text-[#E0E8E1] hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/20 transition-all duration-150 group"
                        >
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="8" y="8" width="12" height="12" rx="2" />
                                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                            </svg>
                        </button>

                        {/* divider */}
                        <div className="w-px h-6 mx-0.5 rounded-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border" />

                        {/* ── Delete ── */}
                        <button
                            onClick={deleteActiveObject}
                            title="Delete"
                            className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 transition-all duration-150"
                        >
                            <Trash2 size={19} strokeWidth={2} />
                        </button>

                        {/* divider */}
                        <div className="w-px h-6 mx-0.5 rounded-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border" />

                        {/* ── More Options (three dots) ── */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setContextMenu({ x: toolbarPos.left + (50 / canvasScale), y: toolbarPos.top + (48 / canvasScale) });
                            }}
                            title="More options"
                            className="w-10 h-10 flex items-center justify-center rounded-full text-[#2D3A30] dark:text-[#E0E8E1] hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/20 transition-all duration-150"
                        >
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="19" cy="12" r="2" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default FabricCanvas;
