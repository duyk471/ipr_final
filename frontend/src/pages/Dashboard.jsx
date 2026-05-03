import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Trash2, Download, Upload, Sparkles, BookOpen, Moon, Sun, FolderOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../store/useCanvasStore';
import useCanvasStore from '../store/useCanvasStore';
import { useTheme } from '../store/useTheme';
import useNotificationStore from '../store/useNotificationStore';
import NewProjectModal from '../components/Dashboard/NewProjectModal';
import ConfirmModal from '../components/UI/ConfirmModal';
import { deleteDirectory, isFileSystemAccessSupported, requestWorkspacePermission, isNativeFileSystemSupported } from '../services/localFilesystemService';
import { getWorkspaceMetadata, getWorkspaceHandle } from '../services/indexedDBService';

const LockedFeature = ({ children, isLocked, tooltipText }) => {
    if (!isLocked) return children;
    
    return (
        <div className="relative group/locked">
            <div className="opacity-40 blur-[2px] pointer-events-none select-none">
                {children}
            </div>
            <div className="absolute inset-0 cursor-not-allowed z-10" />
            
            {/* Biophilic Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-3 
                            bg-biophilic-moss dark:bg-biophilic-dark-surface/95 
                            backdrop-blur-md text-white dark:text-biophilic-dark-text 
                            text-[10px] font-black uppercase tracking-[0.1em] rounded-[1.2rem] 
                            opacity-0 group-hover/locked:opacity-100 
                            pointer-events-none transition-all transform 
                            translate-y-2 group-hover/locked:translate-y-0 
                            duration-300 z-[60] shadow-organic-lg dark:shadow-dark-md 
                            border border-white/10 dark:border-biophilic-dark-border
                            w-max max-w-[240px] text-center leading-relaxed">
                {tooltipText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-biophilic-moss dark:bg-biophilic-dark-surface/95 rotate-45 -translate-y-1.5 border-r border-b border-white/10" />
            </div>
        </div>
    );
};

/**
 * Storage Type Badge - shows whether using native persistent storage
 */
const StorageTypeBadge = ({ isNative }) => {
    if (isNative === null) return null;

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
            isNative 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
        }`}>
            {isNative ? (
                <>
                    <CheckCircle size={14} />
                    <span>Native Storage</span>
                </>
            ) : (
                <>
                    <AlertCircle size={14} />
                    <span>Fallback Mode</span>
                </>
            )}
        </div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { isDark, toggle } = useTheme();
    const {
        initializeWorkspace,
        selectWorkspace,
        fetchProjects: fetchProjectsFromStore,
        createProject,
        saveAIGeneratedProject,
        workspaceHandle,
        workspaceInitialized
    } = useCanvasStore();
    const { notify } = useNotificationStore();
    const [isSupported, setIsSupported] = useState(true);
    const [isNativeStorage, setIsNativeStorage] = useState(null); // null, true, or false

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: '', message: '', isDestructive: true });
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isMagicPromptEnabled, setIsMagicPromptEnabled] = useState(false);
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

            // Detect storage type
            if (handle) {
                setIsNativeStorage(handle.isNative === true);
            }

            if (!handle) {
                // Check if we have a saved workspace but no permission
                const metadata = await getWorkspaceMetadata();
                if (metadata) {
                    setSavedWorkspace(metadata);
                    setIsNativeStorage(metadata.isNative === true);
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
            
            // Detect storage type for new workspace
            if (workspaceHandle) {
                setIsNativeStorage(workspaceHandle.isNative === true);
            }
            
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
            } else {
                console.warn('Workspace handle lost. Clearing metadata.');
                const { clearWorkspaceMetadata } = await import('../services/indexedDBService');
                await clearWorkspaceMetadata();
                setSavedWorkspace(null);
                setWorkspaceInitLoading(false);
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
            const res = await api.post('/ai/generate-project', { prompt: aiPrompt, magicPrompt: isMagicPromptEnabled });
            if (res.data.success) {
                const { projectData, assets } = res.data;
                const savedProject = await saveAIGeneratedProject(projectData, assets);
                notify({ message: 'Project generated successfully!', type: 'success' });
                navigate(`/editor/${savedProject.projectInfo.id}`);
            } else {
                notify({ message: res.data.message || 'Failed to generate project.', type: 'error' });
            }
        } catch (error) {
            console.error('Error generating project:', error);
            notify({ message: error.response?.data?.message || 'Error generating project. Make sure API keys are set.', type: 'error' });
        } finally {
            setIsGenerating(false);
            setAiPrompt('');
        }
    };

    const handleCreateProject = async ({ name, width, height }) => {
        try {
            const project = await createProject(name, width, height);
            if (project) {
                notify({ message: `Project "${name}" created.`, type: 'success' });
                setIsModalOpen(false);
                navigate(`/editor/${project.projectInfo.id}`);
            }
        } catch (error) {
            console.error('Error creating project:', error);
            notify({ message: 'Failed to create project', type: 'error' });
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
                    notify({ message: 'Project deleted.', type: 'success' });
                } catch (error) {
                    console.error('Error deleting project:', error);
                    notify({ message: 'Failed to delete project', type: 'error' });
                }
            }
        });
    };

    const handleExportProject = async (e, projectId) => {
        e.stopPropagation();
        try {
            const { exportProjectById } = useCanvasStore.getState();
            await exportProjectById(projectId);
        } catch (error) {
            console.error('Error exporting project:', error);
            notify({ message: 'Failed to export project: ' + error.message, type: 'error' });
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
            notify({ message: 'Failed to import image. Please try again.', type: 'error' });
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


    return (
        <div className="h-screen bg-biophilic-cream dark:bg-biophilic-dark-bg overflow-y-auto custom-scrollbar relative transition-colors duration-500">

            {/* ── Soft Decorative Background Blobs ── */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.03] dark:opacity-[0.06] bg-biophilic-green dark:bg-biophilic-dark-green blur-3xl transition-opacity duration-500" />
                <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full opacity-[0.02] dark:opacity-[0.05] bg-biophilic-rose dark:bg-biophilic-dark-rose blur-3xl transition-opacity duration-500" />
                <div className="absolute bottom-10 left-1/3 w-72 h-72 rounded-full opacity-[0.02] dark:opacity-[0.04] bg-biophilic-moss dark:bg-biophilic-dark-terra blur-3xl transition-opacity duration-500" />
            </div>

            {/* ── Gradient Overlay for Depth ── */}
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-biophilic-stone/10 to-biophilic-stone/5 dark:via-transparent dark:to-transparent pointer-events-none" />

            {/* ── Modals (Top Level) ── */}
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

            <div className="pt-8 px-6 relative z-10">
                {/* ── Header ── */}
                <header className="sticky top-0 z-50 mx-auto max-w-5xl w-full 
                    bg-white/80 dark:bg-biophilic-dark-card/80 
                    backdrop-blur-xl 
                    border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                    rounded-2xl p-3 px-6 
                    shadow-organic dark:shadow-dark-md 
                    flex items-center justify-between mb-12 transition-all duration-300">

                    <h1 className="text-xl font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight flex items-center gap-3">
                        <img src="/logo.svg" className="w-8 h-8 object-contain dark:drop-shadow-[0_0_15px_rgba(168,198,159,0.4)]" alt="Canvee" />
                        <span className="hidden xs:inline">Canvee</span>
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
                                ? <Sun size={18} className="text-biophilic-green glow-green" />
                                : <Moon size={18} />
                            }
                        </button>

                        <div className="w-px h-6 bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-1" />

                        {/* Storage type badge */}
                        {workspaceInitialized && isNativeStorage !== null && (
                            <StorageTypeBadge isNative={isNativeStorage} />
                        )}

                        {/* Workspace selector button */}
                        <button
                            onClick={handleChangeWorkspace}
                            title="Change Workspace"
                            className={`flex items-center gap-2 
                                    ${!workspaceInitialized 
                                        ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg px-5 py-2.5 shadow-organic-lg scale-105' 
                                        : 'bg-biophilic-stone/40 dark:bg-biophilic-dark-card border border-biophilic-stone-dark dark:border-biophilic-dark-border text-biophilic-bark/80 dark:text-biophilic-dark-text-muted px-3.5 py-2'}
                                    rounded-xl transition-all cursor-pointer font-bold text-xs uppercase tracking-wider active:scale-[0.98] animate-in fade-in duration-500`}
                        >
                            <FolderOpen size={14} />
                            <span>{!workspaceInitialized ? 'Connect Workspace' : 'Change Workspace'}</span>
                        </button>

                        <LockedFeature isLocked={!workspaceInitialized} tooltipText="Select a workspace to import projects.">
                            <label className="flex items-center gap-2 
                                            bg-biophilic-rose/20 dark:bg-biophilic-dark-rose/10
                                            border border-biophilic-rose/30 dark:border-biophilic-dark-rose/30
                                            text-biophilic-bark/80 dark:text-biophilic-dark-text-muted 
                                            px-3.5 py-2 rounded-xl 
                                            hover:bg-biophilic-rose/30 dark:hover:bg-biophilic-dark-rose/20
                                            transition-all cursor-pointer font-bold text-xs uppercase tracking-wider active:scale-[0.98]">
                                <Upload size={14} />
                                <span className="hidden sm:inline">Import</span>
                                <input
                                    type="file"
                                    accept=".zip"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        
                                        try {
                                            const { importProjectZip } = useCanvasStore.getState();
                                            await importProjectZip(file);
                                            await loadProjects();
                                        } catch (err) {
                                            notify({ message: err.message || 'Error importing project zip.', type: 'error' });
                                        }
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        </LockedFeature>

                        <LockedFeature isLocked={!workspaceInitialized} tooltipText="Select a workspace to create new projects.">
                            <button
                                id="dashboard-create-btn"
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 
                                        bg-biophilic-green dark:bg-biophilic-dark-green 
                                        text-white dark:text-biophilic-dark-bg 
                                        px-5 py-2 rounded-xl 
                                        hover:bg-biophilic-green-dark dark:hover:bg-biophilic-green 
                                        shadow-organic dark:shadow-dark-green-glow 
                                        transition-all active:scale-[0.98] font-black text-xs uppercase tracking-widest ml-1"
                            >
                                <Plus size={16} />
                                <span>Create Blank</span>
                            </button>
                        </LockedFeature>
                    </div>
                </header>

                {/* ── Main Content ── */}
                <main className="max-w-6xl mx-auto flex flex-col px-4 pb-16 relative z-10">

                    {/* ── Workspace Selection CTA Banner (Only when not initialized) ── */}
                    {!workspaceInitialized && (
                        <section className="w-full mb-12 animate-in slide-in-from-top-4 duration-500">
                            <div className="bg-gradient-to-r from-biophilic-green/10 via-biophilic-moss/5 to-transparent dark:from-biophilic-dark-green/20 dark:via-biophilic-dark-surface/10 rounded-[2.5rem] p-8 border border-biophilic-green/20 dark:border-biophilic-dark-green/20 flex flex-col md:flex-row items-center gap-8 shadow-organic-sm">
                                <div className="w-20 h-20 bg-white dark:bg-biophilic-dark-card rounded-3xl flex items-center justify-center text-biophilic-green shadow-organic shrink-0">
                                    <FolderOpen size={40} />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-black text-biophilic-moss dark:text-biophilic-dark-text mb-2 tracking-tight">
                                        {savedWorkspace ? `Welcome back to ${savedWorkspace.name}` : 'Ready to start your next masterpiece?'}
                                    </h3>
                                    <p className="text-biophilic-bark/60 dark:text-biophilic-dark-text-muted font-medium leading-relaxed max-w-xl">
                                        {savedWorkspace 
                                            ? 'Reconnect to your local folder to access all your designs and assets safely stored on your computer.' 
                                            : 'Select a workspace folder on your device to enable local saving, AI generation, and project management.'}
                                    </p>
                                </div>
                                <button
                                    onClick={savedWorkspace ? handleReconnectWorkspace : handleChangeWorkspace}
                                    className="whitespace-nowrap bg-biophilic-moss dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-organic hover:bg-biophilic-green-dark transition-all active:scale-[0.95] flex items-center gap-2"
                                >
                                    <FolderOpen size={16} />
                                    <span>{savedWorkspace ? 'Reconnect Folder' : 'Select Folder'}</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* ── Fallback Mode Info Banner ── */}
                    {workspaceInitialized && isNativeStorage === false && (
                        <section className="w-full mb-8 animate-in slide-in-from-top-4 duration-500">
                            <div className="bg-gradient-to-r from-amber-100/40 to-amber-50/20 dark:from-amber-900/20 dark:to-amber-900/5 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-800/30 flex items-start gap-4 shadow-sm">
                                <AlertCircle className="text-amber-600 dark:text-amber-500 shrink-0 mt-1" size={20} />
                                <div className="flex-1">
                                    <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-1">Fallback Storage Mode</h4>
                                    <p className="text-amber-800/70 dark:text-amber-200/70 text-sm">
                                        Your browser doesn't support persistent file system storage. Projects will be saved locally, but you'll need to manually export them using the "Save & Export" button to preserve changes between sessions.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ── Hero AI Command Palette ── */}
                    <section className="w-full max-w-4xl mx-auto mb-20 text-center relative z-10 pt-10">
                        <h2 className="text-[2.5rem] md:text-[3.5rem] font-black text-biophilic-moss dark:text-biophilic-dark-text mb-4 tracking-tighter leading-tight">
                            Design with <span className="text-biophilic-green italic">Nature's</span> AI.
                        </h2>
                        <p className="text-biophilic-bark/60 dark:text-biophilic-dark-text-muted mb-10 text-lg font-medium max-w-2xl mx-auto">
                            Transform your ideas into stunning layouts using our biophilic-inspired intelligence.
                        </p>

                        <LockedFeature isLocked={!workspaceInitialized} tooltipText="Select a workspace folder to enable AI design generation.">
                            <div className="relative group max-w-2xl mx-auto">
                                <div className="absolute -inset-1 bg-gradient-to-r from-biophilic-green via-biophilic-moss to-biophilic-blue rounded-[2.2rem] blur-xl opacity-20 group-focus-within:opacity-40 transition-opacity duration-500" />
                                <div className="relative bg-white dark:bg-biophilic-dark-card rounded-[2rem] shadow-organic-lg p-2.5 flex items-center border border-biophilic-cream-dark dark:border-biophilic-dark-border transition-all duration-300">
                                    <div className="w-12 h-12 flex items-center justify-center text-biophilic-green dark:text-biophilic-dark-green ml-2">
                                        <Sparkles size={24} />
                                    </div>
                                    <input
                                        type="text"
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
                                        placeholder="I want to design a minimalist poster for a coffee shop..."
                                        className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-biophilic-bark dark:text-biophilic-dark-text placeholder:text-biophilic-bark/30 dark:placeholder:text-biophilic-dark-text-muted/40 font-bold"
                                        disabled={isGenerating}
                                    />
                                    <button
                                        onClick={handleAIGenerate}
                                        disabled={isGenerating || !aiPrompt.trim()}
                                        className="bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg px-8 py-4 rounded-[1.4rem] font-black text-xs uppercase tracking-widest shadow-organic hover:bg-biophilic-green-dark transition-all disabled:opacity-50 flex items-center gap-2 ml-2"
                                    >
                                        {isGenerating ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Sparkles size={16} />
                                        )}
                                        <span>{isGenerating ? 'Building' : 'Generate'}</span>
                                    </button>
                                </div>
                                
                                <div className="mt-5 flex items-center justify-center">
                                    <label className="flex items-center gap-3 cursor-pointer group/toggle">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isMagicPromptEnabled}
                                                onChange={(e) => setIsMagicPromptEnabled(e.target.checked)}
                                            />
                                            <div className={`w-10 h-5 rounded-full transition-colors ${isMagicPromptEnabled ? 'bg-biophilic-green dark:bg-biophilic-dark-green shadow-organic-sm' : 'bg-biophilic-cream-dark dark:bg-biophilic-dark-border'}`}></div>
                                            <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${isMagicPromptEnabled ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Sparkles size={14} className={isMagicPromptEnabled ? 'text-biophilic-green glow-green' : 'text-biophilic-bark/40'} />
                                            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isMagicPromptEnabled ? 'text-biophilic-moss dark:text-biophilic-dark-text' : 'text-biophilic-bark/50 dark:text-biophilic-dark-text-muted'}`}>Magic Prompt</span>
                                        </div>
                                    </label>
                                </div>

                            </div>
                        </LockedFeature>

                        {isGenerating && (
                            <div className="mt-8 flex items-center justify-center gap-3">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-biophilic-green animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-biophilic-green animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-biophilic-green animate-bounce" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-biophilic-green italic">
                                    {isMagicPromptEnabled ? 'Designing your layout...' : 'AI is weaving your masterpiece...'}
                                </p>
                            </div>
                        )}
                    </section>

                    {/* ── Projects Grid ── */}
                    <section className="w-full">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-biophilic-green/10 dark:bg-biophilic-dark-green/10 rounded-xl flex items-center justify-center text-biophilic-green">
                                    <ImageIcon size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight">Recent Projects</h2>
                                    <p className="text-[10px] font-bold text-biophilic-bark/50 dark:text-biophilic-dark-text-muted uppercase tracking-widest">Manage your local designs</p>
                                </div>
                            </div>
                        </div>

                        <LockedFeature isLocked={!workspaceInitialized} tooltipText="Select a workspace folder to view and manage your projects.">
                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="bg-white dark:bg-biophilic-dark-card rounded-3xl h-64 animate-pulse border border-biophilic-cream-dark dark:border-biophilic-dark-border" />
                                    ))}
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="text-center p-20 
                                                bg-white/40 dark:bg-biophilic-dark-card/20 
                                                rounded-[3rem] 
                                                border-2 border-dashed border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                                flex flex-col items-center justify-center transition-colors">
                                    <div className="w-20 h-20 
                                                    bg-biophilic-green-light/40 dark:bg-biophilic-dark-green/10 
                                                    rounded-3xl shadow-organic-sm dark:shadow-dark-green-glow 
                                                    border border-biophilic-green-light dark:border-biophilic-dark-border 
                                                    flex items-center justify-center mb-6 
                                                    text-biophilic-green dark:text-biophilic-dark-green glow-green">
                                        <Plus size={40} />
                                    </div>
                                    <h3 className="text-biophilic-moss dark:text-biophilic-dark-text font-black text-xl mb-2">Grow your first design</h3>
                                    <p className="text-biophilic-bark/60 dark:text-biophilic-dark-text-muted font-bold text-sm max-w-xs leading-relaxed">
                                        Start from a blank canvas or use the AI generator to plant the seeds of your next project.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {projects.map((project) => (
                                        <div
                                            key={project.id}
                                            onClick={() => navigate(`/editor/${project.id}`)}
                                            className="bg-white dark:bg-biophilic-dark-card 
                                                    rounded-3xl 
                                                    shadow-organic-sm dark:shadow-dark-sm 
                                                    border border-biophilic-cream-dark dark:border-biophilic-dark-border 
                                                    overflow-hidden cursor-pointer 
                                                    hover:shadow-organic-lg dark:hover:shadow-dark-green-glow 
                                                    hover:border-biophilic-green dark:hover:border-biophilic-dark-green 
                                                    hover:-translate-y-1
                                                    transition-all duration-300 group flex flex-col"
                                        >
                                            {/* Preview thumbnail */}
                                            <div className="aspect-[4/3] 
                                                            bg-biophilic-cream dark:bg-biophilic-dark-bg 
                                                            relative overflow-hidden flex items-center justify-center 
                                                            border-b border-biophilic-cream-dark dark:border-biophilic-dark-border">
                                            {project.previewUrl ? (
                                                <img
                                                    src={typeof project.previewUrl === 'string' && (project.previewUrl.startsWith('blob:') || project.previewUrl.startsWith('data:'))
                                                        ? project.previewUrl
                                                        : project.previewUrl?.startsWith('http')
                                                            ? project.previewUrl
                                                            : `http://localhost:5000/${project.previewUrl?.startsWith('/') ? project.previewUrl.substring(1) : project.previewUrl}?t=${new Date().getTime()}`
                                                    }
                                                    alt={project.name}
                                                    className="w-full h-full object-cover group-hover:scale-[1.1] transition-transform duration-700 ease-out"
                                                    onError={(e) => {
                                                        console.warn('Image failed to load:', e.target.src);
                                                        e.target.style.display = 'none';
                                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-biophilic-green/40 dark:text-biophilic-dark-text-muted/30"
                                                style={{ display: project.previewUrl ? 'none' : 'flex' }}
                                            >
                                                <ImageIcon size={32} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">No Preview</span>
                                            </div>

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-biophilic-moss/10 dark:bg-biophilic-dark-green/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-white dark:bg-biophilic-dark-surface p-3 rounded-2xl shadow-organic-sm dark:shadow-dark-md transform scale-90 group-hover:scale-100 transition-transform font-black text-xs uppercase tracking-widest text-biophilic-moss dark:text-biophilic-dark-text">
                                                    Open Design
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card footer */}
                                        <div className="p-6 flex flex-col gap-3">
                                            <h3 className="font-black text-biophilic-moss dark:text-biophilic-dark-text truncate text-[15px] tracking-tight" title={project.name}>
                                                {project.name}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-biophilic-bark/40 dark:text-biophilic-dark-text-muted uppercase tracking-[0.1em]">
                                                    {new Date(project.updatedAt).toLocaleDateString()}
                                                </span>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 duration-300">
                                                    <button
                                                        onClick={(e) => handleExportProject(e, project.id)}
                                                        className="p-2 text-biophilic-green hover:bg-biophilic-green/10 rounded-xl transition-colors"
                                                        title="Export ZIP"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(e, project.id)}
                                                        className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
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
                        </LockedFeature>
                    </section>
                </main>
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
