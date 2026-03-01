import { create } from 'zustand';
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

const useCanvasStore = create((set, get) => ({
    currentProject: null,
    canvasData: null,
    history: { undoStack: [], redoStack: [] },
    selectedObject: null, // Holds properties of the selected object
    isLoading: false,
    error: null,

    setCurrentProject: (project) => set({ currentProject: project }),
    setCanvasData: (data) => set({ canvasData: data }),
    setSelectedObject: (obj) => set({ selectedObject: obj }),

    updateProjectMeta: async (meta) => {
        set(state => ({
            currentProject: { ...state.currentProject, ...meta }
        }));
        // We'll trigger a save manually or via auto-save
    },

    fetchProject: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.get(`/projects/${projectId}`);
            set({
                currentProject: res.data.project.projectInfo,
                canvasData: res.data.project,
                history: res.data.project.history || { undoStack: [], redoStack: [] },
                isLoading: false
            });
            return res.data.project;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    saveProjectState: async (previewBase64 = null) => {
        const { currentProject, canvasData } = get();
        if (!currentProject?.id || !canvasData) return;

        try {
            await api.put(`/projects/${currentProject.id}`, {
                canvasState: {
                    ...canvasData,
                    projectInfo: currentProject // Include metadata like name
                },
                previewBase64
            });
            // Update timestamp
            set(state => ({
                currentProject: {
                    ...state.currentProject,
                    updatedAt: new Date().toISOString()
                }
            }));
        } catch (error) {
            console.error('Failed to auto-save project:', error);
        }
    }
}));

export default useCanvasStore;
export { api };
