import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import * as fabric from 'fabric';
import { Trash2 } from 'lucide-react';
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
        addImage: async (url, metadata = null) => {
            if (!fabricCanvas.current) return;
            try {
                const fullUrl = `http://localhost:5000${url}?t=${Date.now()}`;
                const img = await fabric.FabricImage.fromURL(fullUrl, { crossOrigin: 'anonymous' });

                // Add without scaling to keep intact, but center it
                img.set({
                    left: (fabricCanvas.current.width - img.getScaledWidth()) / 2,
                    top: (fabricCanvas.current.height - img.getScaledHeight()) / 2
                });

                if (metadata) {
                    img.set('metadata', metadata);
                }
                fabricCanvas.current.add(img);
                fabricCanvas.current.bringObjectToFront(img);
                fabricCanvas.current.setActiveObject(img);
                fabricCanvas.current.renderAll();
                queueSave();
            } catch (err) {
                console.error('Error adding image:', err);
            }
        },
        updateObject: (props) => {
            const activeObject = fabricCanvas.current?.getActiveObject();
            if (activeObject) {
                activeObject.set(props);
                fabricCanvas.current.renderAll();
                updateSelectedState();
                queueSave();
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

            const filteredLayers = await Promise.all(objects.map(async (obj) => {
                if (obj.type === 'image' && obj.src) {
                    try {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        const src = obj.src.startsWith('http') ? obj.src : `http://localhost:5000${obj.src}`;
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                            img.src = src;
                            setTimeout(() => reject(new Error('Timeout')), 3000);
                        });
                        return obj;
                    } catch (err) {
                        return null;
                    }
                }
                return obj;
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
            const json = fabricCanvas.current.toObject(['id', 'metadata']);
            const dataUrl = fabricCanvas.current.toDataURL({ format: 'png', quality: 0.5, multiplier: 0.5 });

            setCanvasData({
                ...canvasData,
                canvas: {
                    width: fabricCanvas.current.width,
                    height: fabricCanvas.current.height,
                    backgroundColor: fabricCanvas.current.backgroundColor,
                },
                layers: json.objects
            });
            await saveProjectState(dataUrl);
        }, 1000);
    };

    const updateSelectedState = () => {
        if (!fabricCanvas.current) return;
        const activeObject = fabricCanvas.current.getActiveObject();
        if (activeObject) {
            setSelectedObject({
                type: activeObject.type,
                fill: activeObject.fill,
                fontSize: activeObject.fontSize,
                text: activeObject.text,
                fontFamily: activeObject.fontFamily,
                opacity: activeObject.opacity,
            });

            // Update floating toolbar position
            const bound = activeObject.getBoundingRect();
            setToolbarPos({
                left: bound.left + bound.width / 2,
                top: bound.top - 40
            });
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

            // Events
            fabricCanvas.current.on('selection:created', updateSelectedState);
            fabricCanvas.current.on('selection:updated', updateSelectedState);
            fabricCanvas.current.on('selection:cleared', updateSelectedState);
            fabricCanvas.current.on('object:scaling', updateSelectedState);
            fabricCanvas.current.on('object:moving', updateSelectedState);
            fabricCanvas.current.on('object:modified', () => { updateSelectedState(); queueSave(); });
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
                // Filter out broken images to prevent canvas from being empty
                const filteredLayers = await Promise.all(canvasData.layers.map(async (obj) => {
                    if (obj.type === 'image' && obj.src) {
                        try {
                            // Test if image exists
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            const src = obj.src.startsWith('http') ? obj.src : `http://localhost:5000${obj.src}`;

                            await new Promise((resolve, reject) => {
                                img.onload = resolve;
                                img.onerror = reject;
                                img.src = src;
                                // Timeout after 3 seconds
                                setTimeout(() => reject(new Error('Timeout')), 3000);
                            });
                            return obj;
                        } catch (err) {
                            console.warn('Removing missing asset:', obj.src);
                            return null;
                        }
                    }
                    return obj;
                }));

                await fabricCanvas.current.loadFromJSON({
                    objects: filteredLayers.filter(o => o !== null),
                    background: (canvasData.canvas && canvasData.canvas.backgroundColor) || '#ffffff'
                });
                fabricCanvas.current.renderAll();

                // If we filtered out some layers, trigger a save to update the backend index.json
                if (filteredLayers.some(l => l === null)) {
                    queueSave();
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
                    className="absolute bg-white rounded-lg shadow-xl border border-gray-100 p-1 flex items-center gap-1 z-[100] -translate-x-1/2"
                    style={{ left: toolbarPos.left, top: toolbarPos.top }}
                >
                    <button
                        onClick={deleteActiveObject}
                        className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded transition-all"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>
    );
});

export default FabricCanvas;
