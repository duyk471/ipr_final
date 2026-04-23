import React, { useState } from 'react';
import { Camera, X } from 'lucide-react';

const VersionModal = ({ isOpen, onClose, onSave }) => {
    const [versionName, setVersionName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (versionName.trim()) {
            onSave(versionName.trim());
            setVersionName('');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-biophilic-dark-surface w-full max-w-md rounded-[2.5rem] shadow-organic-lg overflow-hidden border border-biophilic-cream-dark dark:border-biophilic-dark-border animate-in zoom-in-95 duration-300">
                <div className="px-8 pt-8 pb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-biophilic-green/10 dark:bg-biophilic-dark-green/10 text-biophilic-green dark:text-biophilic-dark-green rounded-2xl flex items-center justify-center shadow-organic-sm">
                                <Camera size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight">Create Version</h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest mt-0.5">Save a project snapshot</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-biophilic-dark-text hover:bg-slate-100 dark:hover:bg-biophilic-dark-border rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-8">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-biophilic-dark-text-muted mb-3 ml-1">
                                Version Name
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={versionName}
                                onChange={(e) => setVersionName(e.target.value)}
                                placeholder="e.g. Added biophilic background, Changed typography..."
                                className="w-full bg-slate-50 dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-2xl px-5 py-4 text-sm text-slate-700 dark:text-biophilic-dark-text outline-none transition-all focus:border-biophilic-green focus:ring-4 focus:ring-biophilic-green/10 shadow-inner placeholder:text-slate-300 dark:placeholder:text-biophilic-dark-text-muted/40 font-medium"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 bg-slate-100 dark:bg-biophilic-dark-border text-slate-600 dark:text-biophilic-dark-text font-bold text-sm rounded-2xl transition-all hover:bg-slate-200 dark:hover:bg-biophilic-dark-card active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!versionName.trim()}
                                className="flex-1 py-4 bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg font-bold text-sm rounded-2xl transition-all shadow-organic hover:bg-biophilic-green-dark dark:hover:shadow-dark-green-glow disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
                            >
                                Save Version
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default VersionModal;
