import React, { useState } from 'react';
import { X, Settings, Type as TypeIcon } from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';

const ProjectSettings = ({ onClose }) => {
    const { currentProject, updateProjectMeta, saveProjectState } = useCanvasStore();
    const [name, setName] = useState(currentProject?.name || '');

    const handleSave = async () => {
        await updateProjectMeta({ name });
        await saveProjectState();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-biophilic-dark-bg/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-[2.5rem] w-full max-w-md shadow-organic-lg dark:shadow-dark-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out">
                {/* Header */}
                <div className="p-6 border-b border-biophilic-cream dark:border-biophilic-dark-border flex items-center justify-between bg-biophilic-cream/30 dark:bg-biophilic-dark-surface/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-biophilic-green/10 dark:bg-biophilic-dark-green/10 rounded-xl flex items-center justify-center text-biophilic-green">
                            <Settings size={20} />
                        </div>
                        <h2 className="text-xl font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight">Project Settings</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 text-biophilic-bark/40 dark:text-biophilic-dark-text-muted hover:text-biophilic-moss dark:hover:text-biophilic-dark-text hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-border rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col gap-8">
                    <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-biophilic-moss/60 dark:text-biophilic-dark-text-muted flex items-center gap-2">
                            <TypeIcon size={14} />
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter project name..."
                            className="w-full px-5 py-4 bg-biophilic-cream/50 dark:bg-biophilic-dark-surface border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-2xl focus:ring-4 focus:ring-biophilic-green/10 focus:border-biophilic-green focus:outline-none transition-all font-bold text-biophilic-moss dark:text-biophilic-dark-text placeholder:text-biophilic-bark/30"
                        />
                    </div>


                </div>

                {/* Footer */}
                <div className="p-6 bg-biophilic-cream/30 dark:bg-biophilic-dark-surface/30 border-t border-biophilic-cream dark:border-biophilic-dark-border flex flex-col gap-3">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl font-black text-xs uppercase tracking-widest shadow-organic dark:shadow-dark-green-glow hover:bg-biophilic-green-dark transition-all active:scale-[0.98]"
                    >
                        Save & Apply
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 text-biophilic-moss/60 dark:text-biophilic-dark-text-muted rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-border transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectSettings;
