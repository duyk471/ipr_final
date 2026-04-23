import React, { useState } from 'react';
import { X, Download, Image as ImageIcon, FileArchive, Sparkles } from 'lucide-react';

const ExportModal = ({ isOpen, onClose, onExport, currentProject }) => {
    const [fileName, setFileName] = useState(currentProject?.name || 'Untitled Project');
    const [format, setFormat] = useState('png');
    
    if (!isOpen) return null;

    const handleExport = () => {
        onExport(format, fileName);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-biophilic-dark-bg/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-biophilic-dark-card border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-[2.5rem] w-full max-w-md shadow-organic-lg dark:shadow-dark-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-biophilic-cream dark:border-biophilic-dark-border bg-biophilic-cream/30 dark:bg-biophilic-dark-surface/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-biophilic-green/10 dark:bg-biophilic-dark-green/10 rounded-xl flex items-center justify-center text-biophilic-green">
                            <Download size={20} />
                        </div>
                        <h2 className="text-xl font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight">Export Design</h2>
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
                    {/* File Name */}
                    <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-biophilic-moss/60 dark:text-biophilic-dark-text-muted flex items-center gap-2">
                            Project Title
                        </label>
                        <input 
                            type="text" 
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="w-full px-5 py-3.5 bg-biophilic-cream/50 dark:bg-biophilic-dark-surface border border-biophilic-cream-dark dark:border-biophilic-dark-border rounded-2xl focus:bg-white dark:focus:bg-biophilic-dark-surface focus:outline-none focus:ring-4 focus:ring-biophilic-green/10 focus:border-biophilic-green transition-all font-bold text-biophilic-moss dark:text-biophilic-dark-text placeholder:text-biophilic-bark/30"
                            placeholder="Enter file name..."
                        />
                    </div>
                    
                    {/* File Type Selection */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-biophilic-moss/60 dark:text-biophilic-dark-text-muted">Format Selection</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['png', 'jpeg', 'zip'].map((type) => (
                                <button 
                                    key={type}
                                    onClick={() => setFormat(type)}
                                    className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.95]
                                        ${format === type 
                                            ? type === 'zip' 
                                                ? 'border-biophilic-rose bg-biophilic-rose-light/20 text-biophilic-bark dark:text-biophilic-dark-rose' 
                                                : 'border-biophilic-green bg-biophilic-green-light/20 text-biophilic-moss dark:text-biophilic-dark-green' 
                                            : 'border-biophilic-cream dark:border-biophilic-dark-border bg-transparent text-biophilic-bark/40 dark:text-biophilic-dark-text-muted hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green'
                                        }`}
                                >
                                    {type === 'zip' ? <FileArchive size={24} /> : <ImageIcon size={24} />}
                                    <span className="font-black text-[10px] uppercase tracking-widest">{type}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Format Tip */}
                    {format === 'zip' && (
                        <div className="p-4 bg-biophilic-rose-light/10 dark:bg-biophilic-dark-rose/5 rounded-2xl border border-biophilic-rose-light/20 dark:border-biophilic-dark-rose/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="text-biophilic-rose shrink-0 mt-0.5">
                                <Sparkles size={14} />
                            </div>
                            <p className="text-[11px] text-biophilic-bark/70 dark:text-biophilic-dark-text-muted font-medium leading-relaxed">
                                ZIP includes high-res images and project source data for maximum portability.
                            </p>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-6 bg-biophilic-cream/30 dark:bg-biophilic-dark-surface/30 border-t border-biophilic-cream dark:border-biophilic-dark-border flex flex-col gap-3">
                    <button 
                        onClick={handleExport}
                        className="w-full py-4 bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg rounded-2xl font-black text-xs uppercase tracking-widest shadow-organic dark:shadow-dark-green-glow hover:bg-biophilic-green-dark transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <Download size={16} />
                        Export {format.toUpperCase()}
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-3 text-biophilic-moss/60 dark:text-biophilic-dark-text-muted rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-border transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
