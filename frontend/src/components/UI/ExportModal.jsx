import React, { useState } from 'react';
import { X, Download, Image as ImageIcon, FileArchive } from 'lucide-react';

const ExportModal = ({ isOpen, onClose, onExport, currentProject }) => {
    const [fileName, setFileName] = useState(currentProject?.name || 'Untitled Project');
    const [format, setFormat] = useState('png');
    
    if (!isOpen) return null;

    const handleExport = () => {
        onExport(format, fileName);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ease-out flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Export Design</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col gap-5 text-sm">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">File Name</label>
                        <input 
                            type="text" 
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all font-medium text-slate-700"
                            placeholder="Enter file name..."
                        />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">File Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button 
                                onClick={() => setFormat('png')}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${format === 'png' ? 'border-slate-800 bg-slate-50 text-slate-800' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                            >
                                <ImageIcon size={24} />
                                <span className="font-semibold text-xs">PNG</span>
                            </button>
                            <button 
                                onClick={() => setFormat('jpeg')}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${format === 'jpeg' ? 'border-slate-800 bg-slate-50 text-slate-800' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                            >
                                <ImageIcon size={24} />
                                <span className="font-semibold text-xs">JPG</span>
                            </button>
                            <button 
                                onClick={() => setFormat('zip')}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${format === 'zip' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                            >
                                <FileArchive size={24} />
                                <span className="font-semibold text-xs">Full ZIP</span>
                            </button>
                        </div>
                    </div>
                    
                    {format === 'zip' && (
                        <p className="text-xs text-slate-500 text-center bg-indigo-50/50 p-2 rounded-lg">
                            ZIP includes high-res images and project source data for maximum portability.
                        </p>
                    )}
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleExport}
                        className="px-6 py-2.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 rounded-xl transition-all flex items-center gap-2"
                    >
                        <Download size={16} /> Export {format.toUpperCase()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
