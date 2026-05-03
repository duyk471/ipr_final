import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDestructive = true }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-biophilic-dark-surface rounded-[2.5rem] w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-biophilic-cream-dark dark:border-biophilic-dark-border">
                {/* Header/Icon Area */}
                <div className="p-8 pb-4 flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-organic-sm ${
                        isDestructive 
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
                            : 'bg-biophilic-green/10 dark:bg-biophilic-dark-green/10 text-biophilic-green dark:text-biophilic-dark-green border border-biophilic-green/20 dark:border-biophilic-dark-green/20'
                    }`}>
                        <AlertTriangle size={32} />
                    </div>
                    
                    <h2 className="text-2xl font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight mb-3">
                        {title}
                    </h2>
                    
                    <p className="text-biophilic-bark/70 dark:text-biophilic-dark-text-muted font-medium leading-relaxed px-4">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="p-6 px-8 bg-biophilic-cream/50 dark:bg-biophilic-dark-bg/50 border-t border-biophilic-cream-dark dark:border-biophilic-dark-border flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border text-biophilic-bark dark:text-biophilic-dark-text-muted rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-border transition-all active:scale-[0.95] shadow-sm"
                    >
                        {cancelText}
                    </button>
                    
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-4 text-white dark:text-biophilic-dark-bg flex items-center justify-center rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.95] ${
                            isDestructive 
                                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' 
                                : 'bg-biophilic-green dark:bg-biophilic-dark-green hover:bg-biophilic-green-dark shadow-organic dark:shadow-dark-green-glow'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;

