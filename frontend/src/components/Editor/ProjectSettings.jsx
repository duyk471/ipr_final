import React, { useState } from 'react';
import { X, Settings, Layout, Type as TypeIcon } from 'lucide-react';
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Settings className="text-slate-800" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">Project Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm bg-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <TypeIcon size={16} className="text-slate-400" />
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter project name..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-600/10 focus:border-slate-600 focus:outline-none transition-all"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <Layout size={16} className="text-slate-400" />
                            Canvas Size Info
                        </label>
                        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
                            <p className="text-sm text-slate-900 font-medium">Fixed at 1080 x 1080px (Square)</p>
                            <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider font-bold">Resizing coming soon</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t flex flex-col gap-3">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-[#1E293B] text-white rounded-xl font-bold shadow-lg shadow-slate-800/20 hover:bg-[#0B1120] active:scale-[0.98] transition-all"
                    >
                        Save & Apply
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition-all border border-slate-200"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectSettings;
