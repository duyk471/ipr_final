import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import * as fabric from 'fabric';
import { removeBackground } from '@imgly/background-removal';
import { Trash2, Copy, MoreVertical, RotateCw } from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';
import { api } from '../../store/useCanvasStore';

const FabricCanvas = forwardRef(({ projectId }, ref) => {
    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    const containerRef = useRef(null);
    const { canvasData, currentProject, setCanvasData, saveProjectState, setSelectedObject } = useCanvasStore();

    const isInitializing = useRef(true);
    const saveTimeout = useRef(null);

    // Selection UI State
    const [toolbarPos, setToolbarPos] = useState(null);
    const isRotating = useRef(false);

    // Undo/Redo Stacks
    const undoStack = useRef([]);
    const redoStack = useRef([]);
    const isActionInProgress = useRef(false);

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
        if (isActionInProgress.current || !fabricCanvas.current) return;
        const json = fabricCanvas.current.toObject(['id', 'metadata']);
        undoStack.current.push(JSON.stringify(json));
        if (undoStack.current.length > 50) undoStack.current.shift(); // Limit history
        redoStack.current = []; // Clear redo on new action
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

    useImperativeHandle(ref, () => ({
        canvas: fabricCanvas.current,
        addText: () => {
            if (!fabricCanvas.current) return;
            const text = new fabric.IText('Hello World', {
                left: 100,
                top: 100,
                fontFamily: 'Inter',
                fill: '#000000',
                fontSize: 40
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
                    {x: 50, y: 0}, {x: 61, y: 35}, {x: 98, y: 35}, {x: 68, y: 57},
                    {x: 79, y: 91}, {x: 50, y: 70}, {x: 21, y: 91}, {x: 32, y: 57},
                    {x: 2, y: 35}, {x: 39, y: 35}
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
                const fullUrl = `http://localhost:5000${url}?t=${Date.now()}`;
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
                
                activeObject.set(props);
                activeObject.setCoords();
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
        removeBackgroundActiveObject: async () => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject && activeObject.type === 'image') {
                try {
                    // Extract the source URL
                    // For Fabric Image v7, src is a property or getSrc()
                    const src = activeObject.src || activeObject.getSrc();
                    
                    // Call the library
                    const blob = await removeBackground(src);
                    
                    // Convert blob to base64 for persistence in index.json
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result;
                        const img = new Image();
                        img.onload = () => {
                            activeObject.setElement(img);
                            activeObject.set('src', base64data); // Persist in JSON
                            fabricCanvas.current.renderAll();
                            updateSelectedState();
                            queueSave();
                        };
                        img.src = base64data;
                    };
                    reader.readAsDataURL(blob);
                } catch (err) {
                    console.error('Background removal error:', err);
                    throw err;
                }
            }
        },
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
        exportImage: (format) => {
            if (!fabricCanvas.current) return;
            const dataUrl = fabricCanvas.current.toDataURL({
                format: format,
                quality: 1,
                multiplier: 2
            });
            const link = document.createElement('a');
            link.download = `${currentProject.name}.${format}`;
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
                filters: filters
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

                if (e.key === 'Delete' || e.key === 'Backspace') {
                    // Check if not typing in text object or input field
                    const target = e.target;
                    const isInputField = target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.isContentEditable;

                    if (isInputField) {
                        return; // Allow normal delete/backspace in input fields
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
                if (e.key === 'Control') {
                    fabricCanvas.current.uniformScaling = false;
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);

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

            // Events
            fabricCanvas.current.on('selection:created', updateSelectedState);
            fabricCanvas.current.on('selection:updated', updateSelectedState);
            fabricCanvas.current.on('selection:cleared', updateSelectedState);
            fabricCanvas.current.on('object:scaling', updateSelectedState);
            
            // Magnetic Snapping Logic
            const SNAP_THRESHOLD = 5;
            
            const clearGuideLines = () => {
                if (guideLines.current.length > 0) {
                    guideLines.current.forEach(line => fabricCanvas.current.remove(line));
                    guideLines.current = [];
                }
            };

            const drawGuideLine = (coords) => {
                const line = new fabric.Line(coords, {
                    stroke: '#bd93f9',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false,
                    strokeDashArray: [5, 5],
                    opacity: 0.8,
                    id: 'guide'
                });
                fabricCanvas.current.add(line);
                guideLines.current.push(line);
            };

            fabricCanvas.current.on('object:moving', (e) => {
                const activeObj = e.target;
                if (!activeObj) return;

                clearGuideLines();

                const canvasWidth = fabricCanvas.current.width;
                const canvasHeight = fabricCanvas.current.height;
                
                const objBounds = activeObj.getBoundingRect();
                const objCenter = activeObj.getCenterPoint();
                
                const targetXs = [0, canvasWidth / 2, canvasWidth];
                const targetYs = [0, canvasHeight / 2, canvasHeight];

                fabricCanvas.current.getObjects().forEach(obj => {
                    if (obj === activeObj || obj.id === 'guide') return;
                    const bounds = obj.getBoundingRect();
                    const center = obj.getCenterPoint();
                    targetXs.push(bounds.left, center.x, bounds.left + bounds.width);
                    targetYs.push(bounds.top, center.y, bounds.top + bounds.height);
                });

                let snappedX = false;
                let snappedY = false;

                const activeXs = [
                    { type: 'left', val: objBounds.left },
                    { type: 'center', val: objCenter.x },
                    { type: 'right', val: objBounds.left + objBounds.width }
                ];

                for (let i = 0; i < targetXs.length && !snappedX; i++) {
                    const targetX = targetXs[i];
                    for (const { val } of activeXs) {
                        if (Math.abs(val - targetX) < SNAP_THRESHOLD) {
                            const offset = targetX - val;
                            activeObj.set({ left: activeObj.left + offset });
                            drawGuideLine([targetX, 0, targetX, canvasHeight]);
                            snappedX = true;
                            break;
                        }
                    }
                }

                const activeYs = [
                    { type: 'top', val: objBounds.top },
                    { type: 'center', val: objCenter.y },
                    { type: 'bottom', val: objBounds.top + objBounds.height }
                ];

                for (let i = 0; i < targetYs.length && !snappedY; i++) {
                    const targetY = targetYs[i];
                    for (const { val } of activeYs) {
                        if (Math.abs(val - targetY) < SNAP_THRESHOLD) {
                            const offset = targetY - val;
                            activeObj.set({ top: activeObj.top + offset });
                            drawGuideLine([0, targetY, canvasWidth, targetY]);
                            snappedY = true;
                            break;
                        }
                    }
                }

                updateSelectedState();
            });

            fabricCanvas.current.on('mouse:up', clearGuideLines);
            
            // Handle rotation - hide toolbar while rotating
            fabricCanvas.current.on('object:rotating', () => {
                isRotating.current = true;
                setToolbarPos(null); // Hide toolbar
            });
            
            fabricCanvas.current.on('object:modified', () => { 
                isRotating.current = false;
                updateSelectedState(); 
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

    return (
        <div ref={containerRef} className="origin-center shadow-2xl bg-white border border-gray-200 relative">
            <canvas ref={canvasEl} />

            {/* Floating Deletion Toolbar */}
            {toolbarPos && (
                <div
                    className="absolute rounded-xl shadow-2xl p-2 flex items-center gap-2 z-[100] -translate-x-1/2"
                    style={{ left: toolbarPos.left, top: toolbarPos.top, backgroundColor: '#1d1f26' }}
                >
                    <button
                        onClick={rotateActiveObject}
                        className="p-2.5 hover:bg-white/10 text-white rounded-lg transition-all"
                        title="Rotate 90°"
                    >
                        <RotateCw size={24} />
                    </button>
                    <div className="w-px h-6 bg-white/20"></div>
                    <button
                        onClick={duplicateActiveObject}
                        className="p-2.5 hover:bg-white/10 text-white rounded-lg transition-all"
                        title="Duplicate"
                    >
                        <Copy size={24} />
                    </button>
                    <div className="w-px h-6 bg-white/20"></div>
                    <button
                        onClick={deleteActiveObject}
                        className="p-2.5 hover:bg-white/10 text-white rounded-lg transition-all"
                        title="Delete"
                    >
                        <Trash2 size={24} />
                    </button>
                    <div className="w-px h-6 bg-white/20"></div>
                    <button
                        className="p-2.5 hover:bg-white/10 text-white rounded-lg transition-all"
                        title="More options"
                    >
                        <MoreVertical size={24} />
                    </button>
                </div>
            )}
        </div>
    );
});

export default FabricCanvas;
