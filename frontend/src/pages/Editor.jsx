import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Undo2, Redo2, Settings, History, Sparkles, Sliders, Wand2, Moon, Sun } from 'lucide-react';
import useCanvasStore, { api } from '../store/useCanvasStore';
import FabricCanvas from '../components/Editor/FabricCanvas';
import Toolbar from '../components/Editor/Toolbar';
import AIPrompt from '../components/Editor/AIPrompt';
import PropertiesPanel from '../components/Editor/PropertiesPanel';
import ProjectSettings from '../components/Editor/ProjectSettings';
import AIDesignAssistant from '../components/Editor/AIDesignAssistant';
import ConfirmModal from '../components/UI/ConfirmModal';
import ExportModal from '../components/UI/ExportModal';
import ElementsPanel from '../components/Editor/ElementsPanel';
import TextPanel from '../components/Editor/TextPanel';

const Editor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { fetchProject, currentProject, isLoading, selectedObject } = useCanvasStore();
    const [activeTab, setActiveTab] = useState('properties'); // Only 'properties' now
    const [activeLeftPanel, setActiveLeftPanel] = useState(null); // 'elements', 'ai', 'assistant' hoặc null
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [showExportModal, setShowExportModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: '', message: '', isDestructive: true });
    
    // Default to system preference for dark mode
    const [isDarkMode, setIsDarkMode] = useState(() => 
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    const canvasRef = useRef(null);
    const historyDropdownRef = useRef(null);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (id) {
            fetchProject(id);
        }
    }, [id, fetchProject]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target)) {
                setShowHistory(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchHistory = async () => {
        if (showHistory) {
            setShowHistory(false);
            return;
        }
        try {
            const res = await api.get(`/projects/${id}/history`);
            if (res.data.success) {
                setHistoryList(res.data.history);
                setShowHistory(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const restoreHistory = async (date) => {
        setConfirmModal({
            isOpen: true,
            title: "Restore Snapshot",
            message: `Restore to snapshot ${date}? Your current unsaved state will be backed up.`,
            isDestructive: false,
            action: async () => {
                try {
                    const res = await api.post(`/projects/${id}/history/restore`, { date });
                    if (res.data.success) {
                        window.location.reload();
                    }
                } catch (error) {
                    alert('Failed to restore history');
                }
            }
        });
    };

    const handleExport = (format, fileName) => {
        if (format === 'zip') {
            window.location.href = `http://localhost:5000/api/projects/${id}/export`;
        } else {
            canvasRef.current?.exportImage(format, fileName);
        }
    };

    // Switch to properties tab when an object is selected
    useEffect(() => {
        if (selectedObject) {
            setActiveTab('properties');
        }
    }, [selectedObject]);

    if (isLoading || !currentProject) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-t-slate-800 animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 overflow-hidden font-sans tracking-tight">
            {/* Header */}
            <header className="h-14 bg-white dark:bg-[#1E293B] border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-6 shrink-0 z-10 relative">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-[15px]">{currentProject.name}</h2>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-slate-100/50 dark:bg-indigo-900/30 text-slate-600 dark:text-slate-400 rounded-lg font-medium border border-slate-200/50 dark:border-slate-950/50">Auto-saving</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all ease-out"
                        title="Toggle Dark Mode"
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="flex items-center bg-slate-50 dark:bg-slate-700/50 rounded-lg p-0.5 mr-2">
                        <button className="p-1.5 text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all shadow-sm" title="Undo" onClick={() => canvasRef.current?.handleUndo()}>
                            <Undo2 size={16} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all" title="Redo" onClick={() => canvasRef.current?.handleRedo()}>
                            <Redo2 size={16} />
                        </button>
                    </div>

                    <div className="relative" ref={historyDropdownRef}>
                        <button
                            onClick={fetchHistory}
                            className={`p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all ${showHistory ? 'bg-slate-100 dark:bg-slate-700 text-slate-800' : ''}`}
                            title="Version History"
                        >
                            <History size={20} />
                        </button>
                        
                        {showHistory && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white border shadow-xl rounded-xl p-2 z-50">
                                <h3 className="text-sm font-semibold text-slate-700 px-2 py-1 border-b mb-2">Version History</h3>
                                {historyList.length === 0 ? (
                                    <p className="text-xs text-slate-500 p-2">No history snapshots found. (Saved daily upon first edit).</p>
                                ) : (
                                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                                        {historyList.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => restoreHistory(item.date)}
                                                className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex justify-between items-center group"
                                            >
                                                <span>{item.date}</span>
                                                <span className="text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">Restore</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all mr-2"
                        title="Project Settings"
                    >
                        <Settings size={20} />
                    </button>

                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98] ml-2"
                    >
                        <Download size={16} /> Export
                    </button>
                </div>
            </header>

            {/* Main Editing Area */}
            <div className="flex flex-1 overflow-hidden relative p-4 pt-2 gap-4 bg-slate-50 dark:bg-[#0B1120]">
                
                {/* Left Floating Toolbars Wrapper */}
                <div className="flex z-20 h-full gap-3 pointer-events-none">
                    {/* Toolbar Island */}
                    <aside className="w-[68px] bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex flex-col items-center py-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all flex-shrink-0 pointer-events-auto">
                        <Toolbar 
                            canvasRef={canvasRef} 
                            projectId={id} 
                            activeLeftPanel={activeLeftPanel}
                            setActiveLeftPanel={setActiveLeftPanel}
                        />
                    </aside>

                    {/* Left Panel Expansion Island */}
                    {activeLeftPanel && (
                        <aside className="w-[320px] bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex flex-col shrink-0 shadow-xl overflow-hidden animate-in slide-in-from-left-4 duration-300 ease-out pointer-events-auto">
                            <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-transparent">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {activeLeftPanel === 'elements' && 'Elements Library'}
                                    {activeLeftPanel === 'text' && 'Text Elements'}
                                    {activeLeftPanel === 'ai' && 'AI Generator'}
                                    {activeLeftPanel === 'assistant' && 'Design Assistant'}
                                </h3>
                                <button 
                                    onClick={() => setActiveLeftPanel(null)}
                                    className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {activeLeftPanel === 'elements' && <ElementsPanel canvasRef={canvasRef} />}
                                {activeLeftPanel === 'text' && <TextPanel canvasRef={canvasRef} />}
                                {activeLeftPanel === 'ai' && <AIPrompt canvasRef={canvasRef} projectId={id} />}
                                {activeLeftPanel === 'assistant' && <AIDesignAssistant canvasRef={canvasRef} projectId={id} />}
                            </div>
                        </aside>
                    )}
                </div>

                {/* Content Area (Properties + Canvas) */}
                <div className="flex-1 flex flex-col min-w-0 gap-3">
                    {/* Horizontal Properties Context Bar */}
                    <div className="h-12 bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center px-4 overflow-x-auto overflow-y-hidden custom-scrollbar shadow-sm w-full max-w-4xl mx-auto shrink-0 transition-all">
                        <PropertiesPanel canvasRef={canvasRef} />
                    </div>

                    <main className="flex-1 relative overflow-hidden flex items-center justify-center">
                        <FabricCanvas 
                            ref={canvasRef} 
                            projectId={id}
                        />
                    </main>
                </div>
            </div>

            {/* Modals */}
            {showSettings && <ProjectSettings project={currentProject} onClose={() => setShowSettings(false)} />}
            
            <ExportModal 
                isOpen={showExportModal} 
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                currentProject={currentProject}
            />

            {/* Confirm Modal */}
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                onConfirm={() => {
                    if (confirmModal.action) confirmModal.action();
                }}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />
        </div>
    );
};

export default Editor;
