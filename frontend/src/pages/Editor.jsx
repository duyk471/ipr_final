import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Undo2, Redo2, Settings, History, Sparkles, Moon, Sun } from 'lucide-react';
import useCanvasStore, { api } from '../store/useCanvasStore';
import { useTheme } from '../store/useTheme';
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
import ImageLibraryPanel from '../components/Editor/ImageLibraryPanel';
import VersionModal from '../components/UI/VersionModal';

const Editor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { 
        fetchProject, 
        currentProject, 
        isLoading, 
        selectedObject, 
        initializeWorkspace, 
        cleanupAssetUrls, 
        workspaceInitialized,
        saveProjectVersion,
        fetchHistory: fetchProjectHistory,
        restoreHistory: restoreProjectSnapshot
    } = useCanvasStore();
    const { isDark, toggle } = useTheme();

    const [activeTab, setActiveTab] = useState('properties');
    const [activeLeftPanel, setActiveLeftPanel] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showVersionModal, setShowVersionModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [historyList, setHistoryList] = useState([]);
    const [showExportModal, setShowExportModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: '', message: '', isDestructive: true });
    const [workspaceInitLoading, setWorkspaceInitLoading] = useState(true);

    const canvasRef = useRef(null);
    const historyDropdownRef = useRef(null);

    // Initialize workspace and load project
    useEffect(() => {
        const initializeAndFetch = async () => {
            try {
                // Initialize workspace if not already done
                if (!workspaceInitialized) {
                    await initializeWorkspace();
                }
                setWorkspaceInitLoading(false);

                // Then fetch the project
                if (id) {
                    await fetchProject(id);
                }
            } catch (error) {
                console.error('Failed to initialize workspace or fetch project:', error);
                setWorkspaceInitLoading(false);
                alert('Failed to load project. Please go back and try again.');
            }
        };

        initializeAndFetch();
    }, [id, workspaceInitialized, initializeWorkspace, fetchProject]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target)) {
                setShowHistory(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup Object URLs when leaving the editor
    useEffect(() => {
        return () => {
            cleanupAssetUrls();
        };
    }, [cleanupAssetUrls]);

    const fetchHistory = async () => {
        if (showHistory) {
            setShowHistory(false);
            return;
        }
        try {
            const history = await fetchProjectHistory();
            setHistoryList(history);
            setShowHistory(true);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const handleSaveVersion = async (name) => {
        try {
            await saveProjectVersion(name);
            setShowVersionModal(false);
            
            // Show toast
            setToast({ show: true, message: `Version "${name}" saved successfully!` });
            setTimeout(() => setToast({ show: false, message: '' }), 3000);
            
            // Refresh history if open
            if (showHistory) {
                const history = await fetchProjectHistory();
                setHistoryList(history);
            }
        } catch (error) {
            alert('Failed to save version: ' + error.message);
        }
    };

    const restoreHistory = async (filename) => {
        setConfirmModal({
            isOpen: true,
            title: "Restore Snapshot",
            message: `Restore to snapshot ${filename}? Your current unsaved state will be backed up.`,
            isDestructive: false,
            action: async () => {
                try {
                    await restoreProjectSnapshot(filename);
                    window.location.reload();
                } catch (error) {
                    alert('Failed to restore history: ' + error.message);
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

    useEffect(() => {
        if (selectedObject) {
            setActiveTab('properties');
        }
    }, [selectedObject]);

    if (workspaceInitLoading) {
        return (
            <div className="h-screen bg-biophilic-cream dark:bg-biophilic-dark-bg flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 rounded-full border-4 border-biophilic-cream-dark dark:border-biophilic-dark-border border-t-biophilic-green dark:border-t-biophilic-dark-green animate-spin mx-auto" />
                    <p className="text-biophilic-bark dark:text-biophilic-dark-text">Loading project...</p>
                </div>
            </div>
        );
    }

    if (isLoading || !currentProject) {
        return (
            <div className="min-h-screen bg-biophilic-cream dark:bg-biophilic-dark-bg flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-biophilic-cream-dark dark:border-biophilic-dark-border border-t-biophilic-green dark:border-t-biophilic-dark-green animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-biophilic-cream dark:bg-biophilic-dark-bg text-slate-700 dark:text-biophilic-dark-text overflow-hidden font-sans tracking-tight transition-colors duration-300">

            {/* ── Header ── */}
            <header className="h-14 
                               bg-white/90 dark:bg-biophilic-dark-surface/95 
                               border-b border-biophilic-cream-dark dark:border-biophilic-dark-border 
                               flex items-center justify-between px-6 shrink-0 z-10 relative 
                               backdrop-blur-sm shadow-sm dark:shadow-dark-sm">

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-1.5 hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-border 
                                   text-biophilic-green-dark dark:text-biophilic-dark-green 
                                   rounded-lg transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-[15px] text-slate-800 dark:text-biophilic-dark-text">
                            {currentProject.name}
                        </h2>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 
                                         bg-biophilic-green-light/50 dark:bg-biophilic-dark-green/15 
                                         text-biophilic-moss dark:text-biophilic-dark-green 
                                         rounded-lg font-medium 
                                         border border-biophilic-green-light dark:border-biophilic-dark-border">
                            Auto-saving
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <button
                        id="editor-theme-toggle"
                        onClick={toggle}
                        className="p-2 text-biophilic-bark dark:text-biophilic-dark-text-muted 
                                   hover:text-biophilic-moss dark:hover:text-biophilic-dark-text 
                                   hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-border 
                                   rounded-lg transition-all ease-out"
                        title="Toggle Dark Mode"
                    >
                        {isDark
                            ? <Sun size={18} className="glow-green" />
                            : <Moon size={18} />
                        }
                    </button>

                    {/* Undo / Redo */}
                    <div className="flex items-center 
                                    bg-slate-50 dark:bg-biophilic-dark-card 
                                    rounded-lg p-0.5 mr-2 
                                    border border-transparent dark:border-biophilic-dark-border">
                        <button
                            className="p-1.5 text-slate-400 dark:text-biophilic-dark-text-muted 
                                       hover:bg-white dark:hover:bg-biophilic-dark-border 
                                       hover:text-slate-600 dark:hover:text-biophilic-dark-text 
                                       rounded-lg transition-all shadow-sm"
                            title="Undo"
                            onClick={() => canvasRef.current?.handleUndo()}
                        >
                            <Undo2 size={16} />
                        </button>
                        <button
                            className="p-1.5 text-slate-400 dark:text-biophilic-dark-text-muted 
                                       hover:bg-white dark:hover:bg-biophilic-dark-border 
                                       hover:text-slate-600 dark:hover:text-biophilic-dark-text 
                                       rounded-lg transition-all"
                            title="Redo"
                            onClick={() => canvasRef.current?.handleRedo()}
                        >
                            <Redo2 size={16} />
                        </button>
                    </div>

                    {/* History */}
                    <div className="relative" ref={historyDropdownRef}>
                        <button
                            onClick={fetchHistory}
                            className={`p-2.5 rounded-lg transition-all
                                text-slate-500 dark:text-biophilic-dark-text-muted 
                                hover:text-slate-800 dark:hover:text-biophilic-dark-text 
                                hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-border
                                ${showHistory ? 'bg-biophilic-cream-dark dark:bg-biophilic-dark-border text-slate-800 dark:text-biophilic-dark-text' : ''}`}
                            title="Version History"
                        >
                            <History size={20} />
                        </button>

                        {showHistory && (
                            <div className="absolute top-full right-0 mt-2 w-72 
                                            bg-white dark:bg-biophilic-dark-card 
                                            border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                            shadow-organic dark:shadow-dark-md 
                                            rounded-[1.5rem] p-3 z-50 animate-in slide-in-from-top-2 duration-200">
                                
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-xs font-black text-biophilic-moss dark:text-biophilic-dark-text uppercase tracking-widest">
                                        History
                                    </h3>
                                    <button 
                                        onClick={() => { setShowVersionModal(true); setShowHistory(false); }}
                                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5
                                                 bg-biophilic-green dark:bg-biophilic-dark-green 
                                                 text-white dark:text-biophilic-dark-bg 
                                                 rounded-lg hover:shadow-organic-sm transition-all"
                                    >
                                        Save Version
                                    </button>
                                </div>

                                {historyList.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 dark:text-biophilic-dark-text-muted p-4 text-center italic border-t border-biophilic-cream dark:border-biophilic-dark-border">
                                        No history snapshots found.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto custom-scrollbar border-t border-biophilic-cream dark:border-biophilic-dark-border pt-3">
                                        {historyList.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => restoreHistory(item.filename)}
                                                className="text-left px-3 py-2.5 
                                                           bg-slate-50/50 dark:bg-biophilic-dark-surface/50
                                                           hover:bg-biophilic-green-light/30 dark:hover:bg-biophilic-dark-green/10
                                                           rounded-xl transition-all flex flex-col gap-0.5 group border border-transparent hover:border-biophilic-green-light/50"
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="font-bold text-[13px] text-slate-700 dark:text-biophilic-dark-text truncate pr-4">
                                                        {item.versionName || (item.isManual ? 'Manual Snapshot' : 'Daily Auto-save')}
                                                    </span>
                                                    <span className="text-[10px] text-biophilic-green font-black uppercase opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                        Restore
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 dark:text-biophilic-dark-text-muted font-medium">
                                                    {item.date.replace('.json', '').replace(/_/g, ' ')}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2.5 text-slate-500 dark:text-biophilic-dark-text-muted 
                                   hover:text-slate-800 dark:hover:text-biophilic-dark-text 
                                   hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-border 
                                   rounded-lg transition-all mr-2"
                        title="Project Settings"
                    >
                        <Settings size={20} />
                    </button>

                    {/* Export */}
                    <button
                        id="editor-export-btn"
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 
                                   bg-biophilic-green dark:bg-biophilic-dark-green 
                                   hover:bg-biophilic-green-dark dark:hover:bg-biophilic-green 
                                   text-white dark:text-biophilic-dark-bg 
                                   px-5 py-2 rounded-xl text-sm font-bold transition-all 
                                   shadow-organic dark:shadow-dark-green-glow 
                                   hover:shadow-organic-lg dark:hover:shadow-dark-green-glow 
                                   active:scale-[0.98] ml-2"
                    >
                        <Download size={16} /> Export
                    </button>
                </div>
            </header>

            {/* ── Main Editing Area ── */}
            {/*
                Dark mode: the outer wrapper is the darkest shade (#121A13 = dark-bg)
                so the canvas "pops" against it. Panels are dark-surface (#1A241B).
            */}
            <div className="flex flex-1 overflow-hidden relative p-4 pt-2 gap-4 
                            bg-biophilic-cream dark:bg-biophilic-dark-bg">

                {/* Left Floating Toolbars Wrapper */}
                <div className="flex z-20 h-full gap-3 pointer-events-none">

                    {/* Toolbar Island */}
                    <aside className="w-[68px] 
                                      bg-white/90 dark:bg-biophilic-dark-surface 
                                      border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                      rounded-2xl flex flex-col items-center py-4 
                                      shadow-organic-sm dark:shadow-dark-sm 
                                      transition-all flex-shrink-0 pointer-events-auto">
                        <Toolbar
                            canvasRef={canvasRef}
                            projectId={id}
                            activeLeftPanel={activeLeftPanel}
                            setActiveLeftPanel={setActiveLeftPanel}
                        />
                    </aside>

                    {/* Left Panel Expansion Island */}
                    {activeLeftPanel && (
                        <aside className="w-[320px] 
                                          bg-white/95 dark:bg-biophilic-dark-surface/95 
                                          backdrop-blur-xl 
                                          border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                          rounded-2xl flex flex-col shrink-0 
                                          shadow-organic dark:shadow-dark-md 
                                          overflow-hidden animate-in slide-in-from-left-4 duration-300 ease-out 
                                          pointer-events-auto">
                            <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-transparent">
                                <h3 className="text-[10px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest">
                                    {activeLeftPanel === 'elements' && 'Elements Library'}
                                    {activeLeftPanel === 'text' && 'Text Elements'}
                                    {activeLeftPanel === 'ai' && 'AI Generator'}
                                    {activeLeftPanel === 'assistant' && 'Design Assistant'}
                                    {activeLeftPanel === 'images' && 'Image Library'}
                                </h3>
                                <button
                                    onClick={() => setActiveLeftPanel(null)}
                                    className="p-1 text-slate-400 dark:text-biophilic-dark-text-muted 
                                               hover:text-slate-800 dark:hover:text-biophilic-dark-text 
                                               hover:bg-slate-100 dark:hover:bg-biophilic-dark-border 
                                               rounded-lg transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {activeLeftPanel === 'elements' && <ElementsPanel canvasRef={canvasRef} />}
                                {activeLeftPanel === 'text' && <TextPanel canvasRef={canvasRef} />}
                                {activeLeftPanel === 'ai' && <AIPrompt canvasRef={canvasRef} projectId={id} />}
                                {activeLeftPanel === 'assistant' && <AIDesignAssistant canvasRef={canvasRef} projectId={id} />}
                                {activeLeftPanel === 'images' && <ImageLibraryPanel canvasRef={canvasRef} />}
                            </div>
                        </aside>
                    )}
                </div>

                {/* Content Area (Properties Bar + Canvas) */}
                <div className="flex-1 flex flex-col min-w-0 gap-3">
                    {/* Horizontal Properties Context Bar */}
                    <div className="h-12 
                                    bg-white/90 dark:bg-biophilic-dark-surface/90 
                                    backdrop-blur-xl 
                                    border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                    rounded-xl flex items-center px-4 
                                    overflow-x-auto overflow-y-hidden custom-scrollbar 
                                    shadow-organic-sm dark:shadow-dark-sm 
                                    w-full max-w-4xl mx-auto shrink-0 transition-all">
                        <PropertiesPanel canvasRef={canvasRef} />
                    </div>

                    {/* Canvas area — darkest shade so artwork stands out */}
                    <main
                        className="flex-1 relative overflow-hidden flex items-center justify-center
                                   rounded-2xl bg-biophilic-cream dark:bg-biophilic-dark-bg"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                canvasRef.current?.clearSelection();
                            }
                        }}
                    >
                        <FabricCanvas
                            ref={canvasRef}
                            projectId={id}
                        />
                    </main>
                </div>
            </div>

            {/* ── Modals ── */}
            {showSettings && (
                <ProjectSettings project={currentProject} onClose={() => setShowSettings(false)} />
            )}

            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                currentProject={currentProject}
            />

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

            <VersionModal
                isOpen={showVersionModal}
                onClose={() => setShowVersionModal(false)}
                onSave={handleSaveVersion}
            />

            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-slate-900/90 dark:bg-biophilic-dark-surface/95 backdrop-blur-xl text-white dark:text-biophilic-dark-text px-6 py-4 rounded-2xl shadow-2xl border border-white/10 dark:border-biophilic-dark-border flex items-center gap-3">
                        <div className="w-8 h-8 bg-biophilic-green dark:bg-biophilic-dark-green rounded-full flex items-center justify-center">
                            <Sparkles size={16} className="text-white dark:text-biophilic-dark-bg" />
                        </div>
                        <span className="text-sm font-black tracking-tight">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Editor;
