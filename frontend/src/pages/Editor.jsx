import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Undo2, Redo2, Settings, Sparkles, Sliders, Wand2 } from 'lucide-react';
import useCanvasStore from '../store/useCanvasStore';
import FabricCanvas from '../components/Editor/FabricCanvas';
import Toolbar from '../components/Editor/Toolbar';
import AIPrompt from '../components/Editor/AIPrompt';
import PropertiesPanel from '../components/Editor/PropertiesPanel';
import ProjectSettings from '../components/Editor/ProjectSettings';
import AIDesignAssistant from '../components/Editor/AIDesignAssistant';

const Editor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { fetchProject, currentProject, isLoading, selectedObject } = useCanvasStore();
    const [activeTab, setActiveTab] = useState('properties'); // 'properties', 'ai', or 'assistant'
    const [showSettings, setShowSettings] = useState(false);

    const canvasRef = useRef(null);

    useEffect(() => {
        if (id) {
            fetchProject(id);
        }
    }, [id, fetchProject]);

    // Switch to properties tab when an object is selected
    useEffect(() => {
        if (selectedObject) {
            setActiveTab('properties');
        }
    }, [selectedObject]);

    if (isLoading || !currentProject) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-t-indigo-600 animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#F3F4F6] overflow-hidden">
            {/* Header */}
            <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-lg text-gray-800">{currentProject.name}</h2>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Auto-saving</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white mr-2">
                        <button className="p-2 hover:bg-gray-50 text-gray-600 border-r" title="Undo" onClick={() => canvasRef.current?.handleUndo()}>
                            <Undo2 size={18} />
                        </button>
                        <button className="p-2 hover:bg-gray-50 text-gray-600" title="Redo" onClick={() => canvasRef.current?.handleRedo()}>
                            <Redo2 size={18} />
                        </button>
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
                <aside className="w-20 bg-white border-r flex flex-col shrink-0 items-center py-6 shadow-sm z-10">
                    <Toolbar canvasRef={canvasRef} projectId={id} />
                </aside>

                {/* Central Canvas Workspace */}
                <main className="flex-1 bg-gray-200 relative overflow-hidden flex items-center justify-center p-4">
                    <FabricCanvas
                        ref={canvasRef}
                        projectId={id}
                    />
                </main>

                {/* Right Sidebar UI Gen / Options */}
                <aside className="w-80 bg-white border-l flex flex-col shrink-0 shadow-lg z-10 relative">
                    {/* Tabs */}
                    <div className="flex border-b overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('properties')}
                            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all whitespace-nowrap px-2 ${activeTab === 'properties' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Sliders size={12} /> Design
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all whitespace-nowrap px-2 ${activeTab === 'ai' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Sparkles size={12} /> AI Gen
                        </button>
                        <button
                            onClick={() => setActiveTab('assistant')}
                            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all whitespace-nowrap px-2 ${activeTab === 'assistant' ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Wand2 size={12} /> AI Assist
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'properties' && (
                            <PropertiesPanel canvasRef={canvasRef} />
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
