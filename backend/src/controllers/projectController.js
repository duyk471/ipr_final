import {
    listProjects,
    createNewProject,
    getProject,
    saveProject,
    removeProject,
    exportProjectZip,
    importProjectFromZip
} from '../services/storageService.js';

export const getAllProjects = async (req, res) => {
    try {
        const projects = await listProjects();
        res.json({ success: true, projects });
    } catch (error) {
        console.error('List projects error:', error);
        res.status(500).json({ success: false, message: 'Failed to list projects' });
    }
};

export const createProject = async (req, res) => {
    try {
        const { name, width, height } = req.body;
        const project = await createNewProject(name, width, height);
        res.status(201).json({ success: true, project });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ success: false, message: 'Failed to create project' });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await getProject(id);
        res.json({ success: true, project });
    } catch (error) {
        if (error.message === 'Project not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to get project' });
    }
};

// Also handles autosave update
export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { canvasState, previewBase64 } = req.body;
        const updatedProject = await saveProject(id, canvasState, previewBase64);
        res.json({ success: true, project: updatedProject });
    } catch (error) {
        console.error('Update project error:', error);
        if (error.message === 'Project not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to update project' });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        await removeProject(id);
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete project' });
    }
};

export const exportProject = async (req, res) => {
    try {
        const { id } = req.params;
        await exportProjectZip(id, res);
    } catch (error) {
        console.error('Export project error:', error);
        if (error.message === 'Project not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to export project' });
    }
};

export const importProject = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const data = await importProjectFromZip(req.file.buffer);
        res.status(201).json({ success: true, project: data });
    } catch (error) {
        console.error('Import project error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to import project' });
    }
};
