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
import ElementsPanel from '../components/Editor/ElementsPanel';

const Editor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { fetchProject, currentProject, isLoading, selectedObject } = useCanvasStore();
    const [activeTab, setActiveTab] = useState('properties'); // 'properties', 'ai', or 'assistant'
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    
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
        if (!window.confirm(`Restore to snapshot ${date}? Current state will be backed up.`)) return;
        try {
            const res = await api.post(`/projects/${id}/history/restore`, { date });
            if (res.data.success) {
                window.location.reload();
            }
        } catch (error) {
            alert('Failed to restore history');
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
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-t-indigo-600 animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#F3F4F6] dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <header className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">{currentProject.name}</h2>
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full font-medium border border-green-200 dark:border-green-800">Auto-saving</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-all"
                        title="Toggle Dark Mode"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-800 mr-2">
                        <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border-r dark:border-gray-600" title="Undo" onClick={() => canvasRef.current?.handleUndo()}>
                            <Undo2 size={18} />
                        </button>
                        <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Redo" onClick={() => canvasRef.current?.handleRedo()}>
                            <Redo2 size={18} />
                        </button>
                    </div>

                    <div className="relative" ref={historyDropdownRef}>
                        <button
                            onClick={fetchHistory}
                            className={`p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-all ${showHistory ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-600' : ''}`}
                            title="Version History"
                        >
                            <History size={20} />
                        </button>
                        
                        {showHistory && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white border shadow-xl rounded-xl p-2 z-50">
                                <h3 className="text-sm font-semibold text-gray-700 px-2 py-1 border-b mb-2">Version History</h3>
                                {historyList.length === 0 ? (
                                    <p className="text-xs text-gray-500 p-2">No history snapshots found. (Saved daily upon first edit).</p>
                                ) : (
                                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                                        {historyList.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => restoreHistory(item.date)}
                                                className="text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex justify-between items-center group"
                                            >
                                                <span>{item.date}</span>
                                                <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Restore</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all mr-2"
                        title="Project Settings"
                    >
                        <Settings size={20} />
                    </button>

                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => canvasRef.current?.exportImage('png')}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                        >
                            PNG
                        </button>
                        <button
                            onClick={() => canvasRef.current?.exportImage('jpeg')}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                        >
                            JPG
                        </button>
                    </div>

                    <button
                        onClick={() => window.location.href = `http://localhost:5000/api/projects/${id}/export`}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md active:scale-95"
                    >
                        <Download size={16} /> ZIP
                    </button>
                </div>
            </header>

            {/* Main Editing Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar Toolbar */}
                <aside className="w-20 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col shrink-0 items-center py-6 shadow-sm z-10 transition-colors">
                    <Toolbar canvasRef={canvasRef} projectId={id} />
                </aside>

                {/* Central Canvas Workspace */}
                <main className="flex-1 bg-gray-200 dark:bg-gray-900 relative overflow-hidden flex items-center justify-center p-4 transition-colors">
                    <FabricCanvas
                        ref={canvasRef}
                        projectId={id}
                    />
                </main>

                {/* Right Sidebar UI Gen / Options */}
                <aside className="w-80 bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col shrink-0 shadow-lg z-10 relative transition-colors">
                    {/* Tabs */}
                    <div className="flex border-b dark:border-gray-700 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('properties')}
                            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all whitespace-nowrap px-2 ${activeTab === 'properties' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <Sliders size={12} /> Design
                        </button>
                        <button
                            onClick={() => setActiveTab('elements')}
                            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all whitespace-nowrap px-2 ${activeTab === 'elements' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <Sparkles size={12} /> Elements
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all whitespace-nowrap px-2 ${activeTab === 'ai' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50 dark:bg-purple-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <Sparkles size={12} /> AI Gen
                        </button>
                        <button
                            onClick={() => setActiveTab('assistant')}
                            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all whitespace-nowrap px-2 ${activeTab === 'assistant' ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50 dark:bg-pink-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <Wand2 size={12} /> AI Assist
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 transition-colors">
                        {activeTab === 'properties' && (
                            <PropertiesPanel canvasRef={canvasRef} />
                        )}
                        {activeTab === 'elements' && (
                            <ElementsPanel canvasRef={canvasRef} />
                        )}
                        {activeTab === 'ai' && (
                            <AIPrompt canvasRef={canvasRef} projectId={id} />
                        )}
                        {activeTab === 'assistant' && (
                            <AIDesignAssistant canvasRef={canvasRef} projectId={id} />
                        )}
                    </div>
                </aside>
            </div>

            {/* Modals */}
            {showSettings && <ProjectSettings onClose={() => setShowSettings(false)} />}
        </div>
    );
};

export default Editor;
