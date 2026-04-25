import React from 'react';
import { FlipHorizontal, FlipVertical } from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';

const ContextMenu = ({ handleContextMenuAction, canvasScale, isDarkMode }) => {
    const contextMenu = useCanvasStore(state => state.contextMenu);

    if (!contextMenu) return null;

    return (
        <div
            className="absolute z-[200] flex flex-col min-w-[240px] max-h-[360px] overflow-y-auto overscroll-contain custom-scrollbar"
            style={{
                left: contextMenu.x,
                top: contextMenu.y,
                ...(isDarkMode ? {
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
            <div className="px-5 pt-4 pb-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-biophilic-green-dark dark:text-biophilic-dark-green">Actions</span>
            </div>

            {[['copy', 'Copy'], ['paste', 'Paste'], ['duplicate', 'Duplicate']].map(([action, label]) => (
                <button
                    key={action}
                    onClick={handleContextMenuAction(action)}
                    className="mx-2 px-4 py-3 text-[15px] text-left font-semibold text-[#2D3A30] dark:text-[#E0E8E1] rounded-xl transition-all duration-150 hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/15 hover:text-biophilic-moss dark:hover:text-biophilic-dark-green"
                >{label}</button>
            ))}

            <div className="h-px bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-3 my-2" />

            {[['bringToFront', 'Bring to Front'], ['bringForward', 'Bring Forward'], ['sendBackwards', 'Send Backward'], ['sendToBack', 'Send to Back']].map(([action, label]) => (
                <button
                    key={action}
                    onClick={handleContextMenuAction(action)}
                    className="mx-2 px-4 py-3 text-[15px] text-left font-semibold text-[#2D3A30] dark:text-[#E0E8E1] rounded-xl transition-all duration-150 hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-green/15 hover:text-biophilic-moss dark:hover:text-biophilic-dark-green"
                >{label}</button>
            ))}

            <div className="h-px bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-3 my-2" />

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
    );
};

export default ContextMenu;
