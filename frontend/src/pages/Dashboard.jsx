import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Trash2, Download, FileJson, Upload } from 'lucide-react';
import { api } from '../store/useCanvasStore';
import NewProjectModal from '../components/Dashboard/NewProjectModal';

const Dashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
        if (!window.confirm("Are you sure you want to delete this project?")) return;
        try {
            await api.delete(`/projects/${id}`);
            fetchProjects();
        } catch (error) {
            console.error('Error deleting project:', error);
        }
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
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto flex flex-col gap-8">
                <header className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        AI Image Editor
                    </h1>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 shadow-sm transition-all active:scale-95 cursor-pointer font-medium">
                            <Upload size={20} />
                            <span>Import ZIP</span>
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
                        <label className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-600 shadow-md transition-all active:scale-95 cursor-pointer font-medium">
                            <ImageIcon size={20} />
                            <span>Import Image</span>
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                className="hidden"
                                onChange={handleImportImage}
                            />
                        </label>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95 font-medium"
                        >
                            <Plus size={20} />
                            <span>Create Project</span>
                        </button>
                    </div>
                </header>

                <NewProjectModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onCreate={handleCreateProject}
                />

                <section>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <ImageIcon className="text-gray-500" /> Recent Projects
                    </h2>

                    {loading ? (
                        <div className="flex w-full h-40 items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-t-indigo-600 animate-spin"></div>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                            <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">No projects yet. Create one to get started!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => navigate(`/editor/${project.id}`)}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                                >
                                    <div className="aspect-square bg-gray-100 relative group-hover:opacity-90 transition-opacity flex items-center justify-center">
                                        {project.previewUrl ? (
                                            <img
                                                src={`http://localhost:5000${project.previewUrl}?t=${new Date().getTime()}`}
                                                alt={project.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400" style={{ display: project.previewUrl ? 'none' : 'flex' }}>
                                            No Preview
                                        </div>
                                    </div>
                                    <div className="p-4 flex flex-col gap-2">
                                        <h3 className="font-semibold text-gray-800 truncate" title={project.name}>{project.name}</h3>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-gray-400">
                                                {new Date(project.updatedAt).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleExport(e, project.id)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                                                    title="Export ZIP"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, project.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
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
