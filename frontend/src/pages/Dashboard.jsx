import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Trash2, Download, Upload, Sparkles, BookOpen, Moon, Sun } from 'lucide-react';
import { api } from '../store/useCanvasStore';
import { useTheme } from '../store/useTheme';
import NewProjectModal from '../components/Dashboard/NewProjectModal';
import ConfirmModal from '../components/UI/ConfirmModal';

const Dashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: '', message: '', isDestructive: true });
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const navigate = useNavigate();
    const { isDark, toggle } = useTheme();

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data.projects);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

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
            const res = await api.post('/projects', { name, width, height });
            if (res.data.success) {
                navigate(`/editor/${res.data.project.projectInfo.id}`);
            }
        } catch (error) {
            console.error('Error creating project:', error);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: "Delete Project",
            message: "Are you sure you want to delete this project? This action cannot be undone.",
            isDestructive: true,
            action: async () => {
                try {
                    await api.delete(`/projects/${id}`);
                    fetchProjects();
                } catch (error) {
                    console.error('Error deleting project:', error);
                }
            }
        });
    };

    const handleExport = async (e, id) => {
        e.stopPropagation();
        window.location.href = `http://localhost:5000/api/projects/${id}/export`;
    };

    const handleImportImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const res = await api.post('/projects/import-image', formData);
            if (res.data.success) {
                navigate(`/editor/${res.data.project.projectInfo.id}`);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error importing image. Please make sure it is a valid image file.');
        }
        e.target.value = '';
    };

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

                    <button
                        onClick={() => navigate('/manual')}
                        className="flex items-center gap-2 bg-transparent 
                                   text-slate-600 dark:text-biophilic-dark-text-muted 
                                   px-4 py-2.5 rounded-xl 
                                   hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-border 
                                   transition-all font-semibold text-sm"
                        title="Help & Tutorial"
                    >
                        <BookOpen size={18} className="text-biophilic-green-dark dark:text-biophilic-dark-green glow-green" />
                        <span>Manual</span>
                    </button>

                    <div className="w-px h-6 bg-biophilic-cream-dark dark:bg-biophilic-dark-border mx-1" />

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
                                        fetchProjects();
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
                                                src={`http://localhost:5000${project.previewUrl}?t=${new Date().getTime()}`}
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
                                                    onClick={(e) => handleExport(e, project.id)}
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

export default Dashboard;
