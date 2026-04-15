import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Trash2, Download, FileJson, Upload, Sparkles, BookOpen } from 'lucide-react';
import { api } from '../store/useCanvasStore';
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
        <div className="h-screen bg-[#FBFBFB] overflow-y-auto custom-scrollbar relative">
            <header className="sticky top-6 z-50 mx-auto max-w-5xl w-full bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-3 px-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex items-center justify-between mb-16">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    AI Image Editor
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/manual')}
                        className="flex items-center gap-2 bg-transparent text-slate-600 px-4 py-2.5 rounded-xl hover:bg-slate-100/80 transition-all font-medium text-sm"
                        title="Help & Tutorial"
                    >
                        <BookOpen size={18} className="text-slate-500" />
                        <span>Manual</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all cursor-pointer font-medium text-sm active:scale-[0.98]">
                        <Upload size={16} />
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
                    <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all cursor-pointer font-medium text-sm active:scale-[0.98]">
                        <ImageIcon size={16} className="text-slate-500" />
                        <span className="hidden sm:inline">Image</span>
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleImportImage}
                        />
                    </label>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 shadow-md shadow-slate-900/10 transition-all active:scale-[0.98] font-semibold text-sm ml-2"
                    >
                        <Plus size={18} />
                        <span>Create Blank</span>
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto flex flex-col px-8 pb-16">

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

                {/* Hero Command Palette */}
                <section className="w-full max-w-4xl mx-auto mb-20 text-center relative z-10">
                    <h2 className="text-[2.5rem] font-extrabold text-slate-900 mb-4 tracking-[-0.02em]">What will you design today?</h2>
                    <p className="text-slate-500 mb-8 text-lg">Use AI to generate stunning starting points in seconds.</p>
                    
                    <div className="relative group bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-3xl border border-slate-200/80 transition-all duration-300 focus-within:shadow-[0_8px_40px_rgba(0,0,0,0.12)] focus-within:border-slate-300 p-2 pl-3 flex flex-col sm:flex-row items-center gap-2">
                        <Sparkles className="absolute left-7 text-slate-400 group-focus-within:text-slate-600 transition-colors duration-300" size={24} />
                        <input 
                            type="text" 
                            placeholder="Describe your scene: e.g., A minimalist coffee shop banner..."
                            className="flex-1 w-full pl-14 pr-4 py-4 text-lg bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter') handleAIGenerate(); }}
                            disabled={isGenerating}
                        />
                        <button 
                            onClick={handleAIGenerate}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="bg-slate-900 text-white px-8 py-4 rounded-2xl hover:bg-slate-800 font-semibold transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:w-auto w-full group/btn"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                    Building...
                                </>
                            ) : (
                                <>
                                    Generate
                                    <Sparkles size={18} className="opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                                </>
                            )}
                        </button>
                    </div>
                    {isGenerating && (
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full">
                           <p className="text-sm text-slate-500 animate-pulse font-medium bg-slate-100 inline-block px-4 py-1.5 rounded-full">
                               ✨ AI is analyzing your prompt and generating layers...
                           </p>
                        </div>
                    )}
                </section>

                <section className="w-full">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <ImageIcon className="text-slate-400" size={20} /> Recent Projects
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex w-full h-40 items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin"></div>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center p-16 bg-white/50 rounded-3xl border border-slate-200/60 border-dashed flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
                                <ImageIcon size={32} />
                            </div>
                            <h3 className="text-slate-900 font-bold text-lg mb-1">No projects yet</h3>
                            <p className="text-slate-500 font-medium">Create a blank project or use AI magic to start.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => navigate(`/editor/${project.id}`)}
                                    className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300 transition-all duration-300 group flex flex-col"
                                >
                                    <div className="aspect-[4/3] bg-[#F9FAFB] relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                                        {project.previewUrl ? (
                                            <img
                                                src={`http://localhost:5000${project.previewUrl}?t=${new Date().getTime()}`}
                                                alt={project.name}
                                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium text-sm" style={{ display: project.previewUrl ? 'none' : 'flex' }}>
                                            No Preview
                                        </div>
                                    </div>
                                    <div className="p-5 flex flex-col gap-2">
                                        <h3 className="font-bold text-slate-800 truncate text-[15px]" title={project.name}>{project.name}</h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                {new Date(project.updatedAt).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300 ease-out">
                                                <button
                                                    onClick={(e) => handleExport(e, project.id)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Export ZIP"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, project.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
