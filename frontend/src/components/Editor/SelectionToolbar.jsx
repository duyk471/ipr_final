import React from 'react';
import { Sparkles, Layers, Trash2 } from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';

const SelectionToolbar = ({
    canvasScale,
    isDarkMode,
    isRemovingBg,
    isMerging,
    isRotating,
    handleRemoveBackgroundActiveObject,
    handleAIMerge,
    duplicateActiveObject,
    deleteActiveObject,
    fabricCanvas,
    pushToUndo,
    updateSelectedState,
    queueSave,
    selectedObject
}) => {
    const toolbarPos = useCanvasStore(state => state.toolbarPos);
    const setContextMenu = useCanvasStore(state => state.setContextMenu);

    if (!toolbarPos || isRotating) return null;

    return (
        <div
            className="absolute z-[100] pointer-events-none"
            style={{
                left: toolbarPos.left,
                top: toolbarPos.top,
                transformOrigin: 'center bottom',
                transform: `translateX(-50%) scale(${1 / canvasScale})`,
                transition: 'left 0.1s ease-out, top 0.1s ease-out',
            }}
        >
            <div
                className="toolbar-pop flex items-center gap-1 pointer-events-auto"
                style={isDarkMode ? {
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
                        <div className="w-px h-6 mx-1 rounded-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border" />
                    </>
                )}

                {/* ── AI Merge (2+ images only) ── */}
                {selectedObject?.imageCount >= 2 && (
                    <>
                        <button
                            onClick={handleAIMerge}
                            disabled={isMerging}
                            title="Merge with AI"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold transition-all duration-150 ${
                                isMerging
                                    ? 'bg-biophilic-green/20 dark:bg-biophilic-dark-green/20 text-biophilic-moss dark:text-biophilic-dark-green cursor-wait'
                                    : 'text-[#2D3A30] dark:text-[#E0E8E1] hover:bg-biophilic-green/20 dark:hover:bg-biophilic-dark-green/20'
                            }`}
                        >
                            {isMerging ? (
                                <>
                                    <svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="#B8D4AF" strokeWidth="3" strokeOpacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#B8D4AF" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    <span>FLUX AI is harmonizing your layers...</span>
                                </>
                            ) : (
                                <>
                                    <Layers size={14} className="text-biophilic-green dark:text-biophilic-dark-green" />
                                    <span>AI Merge</span>
                                </>
                            )}
                        </button>
                        <div className="w-px h-6 mx-1 rounded-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border" />
                    </>
                )}

                {/* ── Text B / I / U (text objects only) ── */}
                {selectedObject?.type?.includes('text') && (
                    <>
                        <div className="flex items-center gap-0.5">
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

                <div className="w-px h-6 mx-0.5 rounded-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border" />

                {/* ── Delete ── */}
                <button
                    onClick={deleteActiveObject}
                    title="Delete"
                    className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 transition-all duration-150"
                >
                    <Trash2 size={19} strokeWidth={2} />
                </button>

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
    );
};

export default SelectionToolbar;
