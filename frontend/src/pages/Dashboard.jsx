import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Trash2, Download, Upload, Sparkles, BookOpen, Moon, Sun, FolderOpen } from 'lucide-react';
import { api } from '../store/useCanvasStore';
import useCanvasStore from '../store/useCanvasStore';
import { useTheme } from '../store/useTheme';
import NewProjectModal from '../components/Dashboard/NewProjectModal';
import ConfirmModal from '../components/UI/ConfirmModal';
import { deleteDirectory, isFileSystemAccessSupported, requestWorkspacePermission } from '../services/localFilesystemService';
import { getWorkspaceMetadata, getWorkspaceHandle } from '../services/indexedDBService';

const Dashboard = () => {
    const navigate = useNavigate();
    const { isDark, toggle } = useTheme();
    const { initializeWorkspace, selectWorkspace, fetchProjects: fetchProjectsFromStore, createProject, workspaceHandle, workspaceInitialized } = useCanvasStore();
    const [isSupported, setIsSupported] = useState(true);

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: '', message: '', isDestructive: true });
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [workspaceInitLoading, setWorkspaceInitLoading] = useState(true);
    const [savedWorkspace, setSavedWorkspace] = useState(null);

    // Initialize workspace and load projects on mount
    const initWorkspaceAndLoadProjects = async () => {
        if (!isFileSystemAccessSupported()) {
            setIsSupported(false);
            setLoading(false);
            setWorkspaceInitLoading(false);
            return;
        }

        try {
            setWorkspaceInitLoading(true);
            const handle = await initializeWorkspace();
            
            if (!handle) {
                // Check if we have a saved workspace but no permission
                const metadata = await getWorkspaceMetadata();
                if (metadata) {
                    setSavedWorkspace(metadata);
                }
            }

            if (handle) {
                await loadProjects();
            } else {
                setLoading(false);
                setWorkspaceInitLoading(false);
            }
        } catch (error) {
            console.error('Failed to initialize workspace:', error);
            setLoading(false);
            setWorkspaceInitLoading(false);
        }
    };

    const loadProjects = async () => {
        try {
            setLoading(true);
            const projectList = await fetchProjectsFromStore();
            setProjects(projectList || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
            setWorkspaceInitLoading(false);
        }
    };

    useEffect(() => {
        initWorkspaceAndLoadProjects();
    }, []);

    const handleChangeWorkspace = async () => {
        try {
            setWorkspaceInitLoading(true);
            await selectWorkspace();
            await loadProjects();
            setSavedWorkspace(null); // Clear saved workspace state as we now have a handle
        } catch (error) {
            console.error('Failed to select workspace:', error);
            setWorkspaceInitLoading(false);
        }
    };

    const handleReconnectWorkspace = async () => {
        try {
            setWorkspaceInitLoading(true);
            const handle = await getWorkspaceHandle();
            if (handle) {
                const granted = await requestWorkspacePermission(handle);
                if (granted) {
                    await initializeWorkspace(); // Re-init store with handle
                    await loadProjects();
                    setSavedWorkspace(null);
                } else {
                    setWorkspaceInitLoading(false);
                }
            }
        } catch (error) {
            console.error('Failed to reconnect workspace:', error);
            setWorkspaceInitLoading(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const res = await api.post('/ai/generate-project', { prompt: aiPrompt });
            if (res.data.success) {
                navigate(`/editor/${res.data.projectId}`);
            } else {
                alert(res.data.message || 'Failed to generate project.');
            }
        } catch (error) {
            console.error('Error generating project:', error);
            alert(error.response?.data?.message || 'Error generating project. Make sure API keys are set.');
        } finally {
            setIsGenerating(false);
            setAiPrompt('');
        }
    };

    const handleCreateProject = async ({ name, width, height }) => {
        try {
            const project = await createProject(name, width, height);
            if (project) {
                navigate(`/editor/${project.projectInfo.id}`);
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project');
        }
    };

    const handleDelete = async (e, projectId) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: "Delete Project",
            message: "Are you sure you want to delete this project? This action cannot be undone.",
            isDestructive: true,
            action: async () => {
                try {
                    if (!workspaceHandle) {
                        throw new Error('Workspace not initialized');
                    }
                    await deleteDirectory(workspaceHandle, projectId);
                    await loadProjects();
                } catch (error) {
                    console.error('Error deleting project:', error);
                    alert('Failed to delete project');
                }
            }
        });
    };

    const handleExportProject = async (e, projectId) => {
        e.stopPropagation();
        // For local-first, export is saving a ZIP from the local directory
        // For now, we'll use the backend export if available
        try {
            window.location.href = `http://localhost:5000/api/projects/${projectId}/export`;
        } catch (error) {
            console.error('Error exporting project:', error);
            alert('Failed to export project');
        }
    };

    const handleImportImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Read the image file
            const arrayBuffer = await file.arrayBuffer();

            // Create a project from the image
            if (!workspaceHandle) {
                throw new Error('Workspace not initialized');
            }

            // For simplicity, create a new project with the image
            const projectId = generateProjectId();
            const { createProjectDirectoryStructure, writeFile, writeJSONFile } = await import('../services/localFilesystemService');

            const projectHandle = await createProjectDirectoryStructure(workspaceHandle, projectId);
            const assetsDir = await projectHandle.getDirectoryHandle('assets');
            await writeFile(assetsDir, file.name, arrayBuffer);

            const now = new Date().toISOString();
            const projectData = {
                version: "1.0",
                projectInfo: {
                    id: projectId,
                    name: `${file.name.split('.')[0]} - ${new Date().toLocaleDateString()}`,
                    createdAt: now,
                    updatedAt: now,
                    previewUrl: "preview.png"
                },
                canvas: {
                    width: 1080,
                    height: 1080,
                    backgroundColor: "#ffffff",
                    backgroundImage: null,
                    zoom: 1,
                    viewportTransform: [1, 0, 0, 1, 0, 0]
                },
                layers: [
                    {
                        type: "Image",
                        version: "7.2.0",
                        originX: "center",
                        originY: "center",
                        left: 540,
                        top: 540,
                        fill: "rgb(0,0,0)",
                        stroke: null,
                        strokeWidth: 0,
                        opacity: 1,
                        scaleX: 1,
                        scaleY: 1,
                        angle: 0,
                        flipX: false,
                        flipY: false,
                        visible: true,
                        src: `assets/${file.name}`,
                        crossOrigin: "anonymous"
                    }
                ],
                history: {
                    undoStack: [],
                    redoStack: []
                }
            };

            await writeJSONFile(projectHandle, 'index.json', projectData);
            await loadProjects();
            navigate(`/editor/${projectId}`);
        } catch (error) {
            console.error('Error importing image:', error);
            alert('Failed to import image. Please try again.');
        }
        e.target.value = '';
    };

    // Show workspace selector if not initialized
    if (!workspaceInitialized && workspaceInitLoading) {
        return (
            <div className="h-screen bg-biophilic-cream dark:bg-biophilic-dark-bg flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 rounded-full border-4 border-biophilic-cream-dark dark:border-biophilic-dark-border border-t-biophilic-green dark:border-t-biophilic-dark-green animate-spin mx-auto" />
                    <p className="text-biophilic-bark dark:text-biophilic-dark-text">Initializing workspace...</p>
                </div>
            </div>
        );
    }

    if (!isSupported) {
        return (
            <div className="h-screen bg-biophilic-cream dark:bg-biophilic-dark-bg flex items-center justify-center p-6">
                <div className="text-center space-y-6 max-w-md bg-white dark:bg-biophilic-dark-card p-8 rounded-3xl shadow-organic border border-biophilic-cream-dark dark:border-biophilic-dark-border">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto">
                        <FolderOpen size={32} className="text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-biophilic-moss dark:text-biophilic-dark-text">
                        Browser Not Supported
                    </h2>
                    <p className="text-biophilic-bark/70 dark:text-biophilic-dark-text-muted">
                        Your browser doesn't support the <strong>File System Access API</strong>, which is required for this local-first editor.
                    </p>
                    <div className="text-left bg-biophilic-cream dark:bg-biophilic-dark-bg p-4 rounded-xl text-sm space-y-2">
                        <p className="font-semibold text-biophilic-moss dark:text-biophilic-dark-text">To fix this:</p>
                        <ul className="list-disc list-inside text-biophilic-bark dark:text-biophilic-dark-text-muted space-y-1">
                            <li>Use <strong>Chrome, Edge, or Opera</strong></li>
                            <li>Ensure you are using <strong>HTTPS</strong> or <strong>localhost</strong></li>
                            <li>Firefox and Safari do not support this feature yet</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg px-6 py-3 rounded-xl font-bold hover:bg-biophilic-green-dark transition-all"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (!workspaceInitialized) {
        return (
            <div className="h-screen bg-biophilic-cream dark:bg-biophilic-dark-bg flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md">
                    <div className="w-16 h-16 bg-biophilic-green-light/40 dark:bg-biophilic-dark-green/10 rounded-2xl flex items-center justify-center mx-auto">
                        <FolderOpen size={32} className="text-biophilic-green dark:text-biophilic-dark-green" />
                    </div>
                    {savedWorkspace ? (
                        <>
                            <h2 className="text-2xl font-bold text-biophilic-moss dark:text-biophilic-dark-text">
                                Welcome Back
                            </h2>
                            <p className="text-biophilic-bark/70 dark:text-biophilic-dark-text-muted">
                                Reconnect to your workspace folder <strong>{savedWorkspace.name}</strong> to continue working.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleReconnectWorkspace}
                                    className="bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg px-6 py-3 rounded-xl font-bold hover:bg-biophilic-green-dark transition-all active:scale-[0.98] shadow-organic dark:shadow-dark-green-glow"
                                >
                                    Reconnect to {savedWorkspace.name}
                                </button>
                                <button
                                    onClick={handleChangeWorkspace}
                                    className="text-biophilic-bark/60 dark:text-biophilic-dark-text-muted hover:text-biophilic-moss dark:hover:text-biophilic-dark-text text-sm font-semibold transition-colors"
                                >
                                    Select a different folder
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-biophilic-moss dark:text-biophilic-dark-text">
                                Welcome to Local-First Editor
                            </h2>
                            <p className="text-biophilic-bark/70 dark:text-biophilic-dark-text-muted">
                                Select a folder on your computer to start working with your projects. All changes are saved locally.
                            </p>
                            <button
                                onClick={handleChangeWorkspace}
                                className="bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg px-6 py-3 rounded-xl font-bold hover:bg-biophilic-green-dark transition-all active:scale-[0.98] shadow-organic dark:shadow-dark-green-glow"
                            >
                                <FolderOpen size={18} className="inline mr-2" />
                                Select Workspace Folder
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-biophilic-cream dark:bg-biophilic-dark-bg overflow-y-auto custom-scrollbar relative transition-colors duration-300">

            {/* ── Decorative background blobs (dark only) ── */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-0 dark:opacity-[0.06] bg-biophilic-dark-green blur-3xl transition-opacity duration-500" />
                <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full opacity-0 dark:opacity-[0.05] bg-biophilic-dark-rose blur-3xl transition-opacity duration-500" />
                <div className="absolute bottom-10 left-1/3 w-72 h-72 rounded-full opacity-0 dark:opacity-[0.04] bg-biophilic-dark-terra blur-3xl transition-opacity duration-500" />
            </div>

            {/* ── Header ── */}
            <header className="sticky top-6 z-50 mx-auto max-w-5xl w-full 
                bg-white/80 dark:bg-biophilic-dark-card/80 
                backdrop-blur-xl 
                border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                rounded-2xl p-3 px-6 
                shadow-organic dark:shadow-dark-md 
                flex items-center justify-between mb-16 transition-all duration-300">

                <h1 className="text-xl font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight flex items-center gap-2">
                    <span className="dark:glow-green">🌿</span>
                    AI Image Editor
                </h1>

                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <button
                        id="dashboard-theme-toggle"
                        onClick={toggle}
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        className="p-2.5 rounded-xl text-biophilic-bark dark:text-biophilic-dark-text-muted
                                   hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-border
                                   transition-all duration-200 active:scale-[0.95]"
                    >
                        {isDark
                            ? <Sun size={18} className="glow-green" />
                            : <Moon size={18} />
                        }
                    </button>


                    <div className="w-px h-6 bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-1" />

                    {/* Workspace selector button */}
                    <button
                        onClick={handleChangeWorkspace}
                        title="Change Workspace"
                        className="flex items-center gap-2 
                                   bg-biophilic-blue-light/30 dark:bg-biophilic-dark-blue/15
                                   border border-biophilic-blue dark:border-biophilic-dark-blue/40
                                   text-slate-700 dark:text-biophilic-dark-text 
                                   px-4 py-2.5 rounded-xl 
                                   hover:bg-biophilic-blue/50 dark:hover:bg-biophilic-dark-blue/25
                                   transition-all cursor-pointer font-semibold text-sm active:scale-[0.98]"
                    >
                        <FolderOpen size={16} className="text-biophilic-blue-dark dark:text-biophilic-dark-blue" />
                        <span className="hidden sm:inline">Workspace</span>
                    </button>

                    <label className="flex items-center gap-2 
                                      bg-biophilic-rose/30 dark:bg-biophilic-dark-rose/15
                                      border border-biophilic-rose dark:border-biophilic-dark-rose/40
                                      text-slate-700 dark:text-biophilic-dark-text 
                                      px-4 py-2.5 rounded-xl 
                                      hover:bg-biophilic-rose/50 dark:hover:bg-biophilic-dark-rose/25
                                      shadow-rose-glow dark:shadow-dark-rose-glow
                                      transition-all cursor-pointer font-semibold text-sm active:scale-[0.98]">
                        <Upload size={16} className="text-biophilic-bark dark:text-biophilic-dark-rose glow-rose" />
                        <span className="hidden sm:inline">Import ZIP</span>
                        <input
                            type="file"
                            accept=".zip"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append('file', file);
                                try {
                                    const res = await api.post('/projects/import', formData);
                                    if (res.data.success) {
                                        await loadProjects();
                                    }
                                } catch (err) {
                                    alert(err.response?.data?.message || 'Error importing project zip. Please make sure it is a valid project archive.');
                                }
                                e.target.value = '';
                            }}
                        />
                    </label>

                    <label className="flex items-center gap-2 
                                      bg-biophilic-rose/30 dark:bg-biophilic-dark-rose/15
                                      border border-biophilic-rose dark:border-biophilic-dark-rose/40
                                      text-slate-700 dark:text-biophilic-dark-text 
                                      px-4 py-2.5 rounded-xl 
                                      hover:bg-biophilic-rose/50 dark:hover:bg-biophilic-dark-rose/25
                                      shadow-rose-glow dark:shadow-dark-rose-glow
                                      transition-all cursor-pointer font-semibold text-sm active:scale-[0.98]">
                        <ImageIcon size={16} className="text-biophilic-bark dark:text-biophilic-dark-rose glow-rose" />
                        <span className="hidden sm:inline">Image</span>
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleImportImage}
                        />
                    </label>

                    <button
                        id="dashboard-create-btn"
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 
                                   bg-biophilic-green dark:bg-biophilic-dark-green 
                                   text-white dark:text-biophilic-dark-bg 
                                   px-5 py-2.5 rounded-xl 
                                   hover:bg-biophilic-green-dark dark:hover:bg-biophilic-green 
                                   shadow-organic dark:shadow-dark-green-glow 
                                   transition-all active:scale-[0.98] font-bold text-sm ml-2"
                    >
                        <Plus size={18} />
                        <span>Create Blank</span>
                    </button>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div className="max-w-6xl mx-auto flex flex-col px-8 pb-16 relative z-10">

                <NewProjectModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onCreate={handleCreateProject}
                />

                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    isDestructive={confirmModal.isDestructive}
                    onConfirm={() => {
                        if (confirmModal.action) confirmModal.action();
                        setConfirmModal({ ...confirmModal, isOpen: false });
                    }}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                />

                {/* ── Hero AI Command Palette ── */}
                <section className="w-full max-w-4xl mx-auto mb-20 text-center relative z-10">
                    <h2 className="text-[2.5rem] font-extrabold text-biophilic-moss dark:text-biophilic-dark-text mb-4 tracking-[-0.02em]">
                        What will you design today?
                    </h2>
                    <p className="text-biophilic-bark/80 dark:text-biophilic-dark-text-muted mb-8 text-lg">
                        Use AI to generate stunning starting points in seconds.
                    </p>

                    <div className="relative group 
                                    bg-white/90 dark:bg-biophilic-dark-card/90 
                                    shadow-organic dark:shadow-dark-md 
                                    rounded-3xl 
                                    border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                    transition-all duration-300 
                                    focus-within:shadow-organic-lg dark:focus-within:shadow-dark-green-glow
                                    focus-within:border-biophilic-green dark:focus-within:border-biophilic-dark-green 
                                    p-2 pl-3 flex flex-col sm:flex-row items-center gap-2">
                        <Sparkles
                            className="absolute left-7 text-biophilic-green dark:text-biophilic-dark-green group-focus-within:text-biophilic-moss dark:group-focus-within:text-biophilic-green-light transition-colors duration-300 glow-green"
                            size={24}
                        />
                        <input
                            type="text"
                            placeholder="Describe your scene: e.g., A minimalist coffee shop banner..."
                            className="flex-1 w-full pl-14 pr-4 py-4 text-lg bg-transparent focus:outline-none 
                                       text-slate-800 dark:text-biophilic-dark-text 
                                       placeholder:text-slate-400 dark:placeholder:text-biophilic-dark-text-muted/70"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAIGenerate(); }}
                            disabled={isGenerating}
                        />
                        <button
                            id="dashboard-ai-generate"
                            onClick={handleAIGenerate}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="bg-biophilic-green dark:bg-biophilic-dark-green 
                                       hover:bg-biophilic-green-dark dark:hover:bg-biophilic-green 
                                       text-white dark:text-biophilic-dark-bg 
                                       px-8 py-4 rounded-2xl font-bold transition-all 
                                       active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed 
                                       flex items-center justify-center gap-2 sm:w-auto w-full 
                                       shadow-organic dark:shadow-dark-green-glow group/btn"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    Building...
                                </>
                            ) : (
                                <>
                                    Generate
                                    <Sparkles size={18} className="opacity-80 group-hover/btn:opacity-100 transition-opacity" />
                                </>
                            )}
                        </button>
                    </div>

                    {isGenerating && (
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full">
                            <p className="text-sm text-biophilic-moss dark:text-biophilic-dark-text animate-pulse font-semibold 
                                         bg-biophilic-green-light/40 dark:bg-biophilic-dark-green/10 
                                         inline-block px-4 py-1.5 rounded-full border dark:border-biophilic-dark-border">
                                ✨ AI is analyzing your prompt and generating layers...
                            </p>
                        </div>
                    )}
                </section>

                {/* ── Projects Grid ── */}
                <section className="w-full">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-biophilic-moss dark:text-biophilic-dark-text">
                            <ImageIcon className="text-biophilic-green dark:text-biophilic-dark-green glow-green" size={20} />
                            Recent Projects
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex w-full h-40 items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-biophilic-cream-dark dark:border-biophilic-dark-border border-t-biophilic-green dark:border-t-biophilic-dark-green animate-spin" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center p-16 
                                        bg-white/60 dark:bg-biophilic-dark-card/60 
                                        rounded-3xl 
                                        border border-dashed border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                        flex flex-col items-center justify-center">
                            <div className="w-16 h-16 
                                            bg-biophilic-green-light/40 dark:bg-biophilic-dark-green/10 
                                            rounded-2xl shadow-organic-sm dark:shadow-dark-green-glow 
                                            border border-biophilic-green-light dark:border-biophilic-dark-border 
                                            flex items-center justify-center mb-4 
                                            text-biophilic-green dark:text-biophilic-dark-green glow-green">
                                <ImageIcon size={32} />
                            </div>
                            <h3 className="text-biophilic-moss dark:text-biophilic-dark-text font-bold text-lg mb-1">No projects yet</h3>
                            <p className="text-biophilic-bark/70 dark:text-biophilic-dark-text-muted font-medium">Create a blank project or use AI magic to start.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => navigate(`/editor/${project.id}`)}
                                    className="bg-white/90 dark:bg-biophilic-dark-card 
                                               rounded-2xl 
                                               shadow-organic-sm dark:shadow-dark-sm 
                                               border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                               overflow-hidden cursor-pointer 
                                               hover:shadow-organic dark:hover:shadow-dark-green-glow 
                                               hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green/60
                                               transition-all duration-300 group flex flex-col"
                                >
                                    {/* Preview thumbnail */}
                                    <div className="aspect-[4/3] 
                                                    bg-biophilic-cream dark:bg-biophilic-dark-bg 
                                                    relative overflow-hidden flex items-center justify-center 
                                                    border-b border-biophilic-cream-dark dark:border-biophilic-dark-border">
                                        {project.previewUrl ? (
                                            <img
                                                src={typeof project.previewUrl === 'string' && project.previewUrl.startsWith('blob:')
                                                    ? project.previewUrl
                                                    : `http://localhost:5000${project.previewUrl}?t=${new Date().getTime()}`
                                                }
                                                alt={project.name}
                                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div
                                            className="absolute inset-0 flex items-center justify-center text-biophilic-green dark:text-biophilic-dark-text-muted font-medium text-sm"
                                            style={{ display: project.previewUrl ? 'none' : 'flex' }}
                                        >
                                            No Preview
                                        </div>
                                    </div>

                                    {/* Card footer */}
                                    <div className="p-5 flex flex-col gap-2">
                                        <h3 className="font-bold text-biophilic-moss dark:text-biophilic-dark-text truncate text-[15px]" title={project.name}>
                                            {project.name}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-biophilic-bark/50 dark:text-biophilic-dark-text-muted uppercase tracking-wider">
                                                {new Date(project.updatedAt).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300 ease-out">
                                                <button
                                                    onClick={(e) => handleExportProject(e, project.id)}
                                                    className="p-1.5 text-biophilic-green dark:text-biophilic-dark-green 
                                                               hover:text-biophilic-moss dark:hover:text-biophilic-green-light 
                                                               hover:bg-biophilic-green-light/30 dark:hover:bg-biophilic-dark-green/15 
                                                               rounded-lg transition-colors"
                                                    title="Export ZIP"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, project.id)}
                                                    className="p-1.5 text-slate-400 dark:text-biophilic-dark-text-muted 
                                                               hover:text-red-600 dark:hover:text-red-400 
                                                               hover:bg-red-50 dark:hover:bg-red-900/20 
                                                               rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

/**
 * Helper function to generate a UUID-like project ID
 */
function generateProjectId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export default Dashboard;
