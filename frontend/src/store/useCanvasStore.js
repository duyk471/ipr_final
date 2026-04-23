import { create } from 'zustand';
import axios from 'axios';
import {
    getWorkspaceDirectory,
    requestWorkspaceDirectory,
    createProjectDirectoryStructure,
    readJSONFile,
    writeJSONFile,
    writeFile,
    getFileAsObjectURL,
    getSubdirectory,
} from '../services/localFilesystemService';
import { scanProjectsInWorkspace, getProjectByIdLocal, getProjectHistory } from '../services/projectScannerService';

export const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

// Keep for AI processing and other stateless operations
const useCanvasStore = create((set, get) => ({
    // Workspace management
    workspaceHandle: null,
    workspaceInitialized: false,
    useLocalStorage: true, // Flag to use local storage instead of backend

    // Project state
    currentProject: null,
    currentProjectHandle: null, // FileSystemDirectoryHandle for current project
    canvasData: null,
    history: { undoStack: [], redoStack: [] },
    selectedObject: null,
    isLoading: false,
    error: null,

    // Asset URL mapping (for resolving local file paths to Object URLs)
    assetUrlMap: {}, // Maps local paths to Object URLs

    // ─── Workspace Management ───

    /**
     * Initialize the workspace - set up directory access
     */
    initializeWorkspace: async () => {
        try {
            set({ isLoading: true, error: null });
            const handle = await getWorkspaceDirectory();
            if (handle) {
                set({ workspaceHandle: handle, workspaceInitialized: true, isLoading: false });
                return handle;
            } else {
                set({ workspaceHandle: null, workspaceInitialized: false, isLoading: false });
                return null;
            }
        } catch (error) {
            console.error('Failed to initialize workspace:', error);
            set({ error: error.message, isLoading: false, workspaceInitialized: false });
            throw error;
        }
    },

    /**
     * Request a new workspace directory
     */
    selectWorkspace: async () => {
        try {
            set({ isLoading: true, error: null });
            const handle = await requestWorkspaceDirectory();
            set({ workspaceHandle: handle, workspaceInitialized: true, isLoading: false });
            return handle;
        } catch (error) {
            console.error('Failed to select workspace:', error);
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // ─── Project Management ───

    setCurrentProject: (project) => set({ currentProject: project }),
    setCanvasData: (data) => set({ canvasData: data }),
    setSelectedObject: (obj) => set({ selectedObject: obj }),

    updateProjectMeta: async (meta) => {
        set(state => ({
            currentProject: { ...state.currentProject, ...meta }
        }));
    },

    /**
     * Fetch project from local filesystem
     */
    fetchProject: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
            const { workspaceHandle } = get();
            if (!workspaceHandle) {
                throw new Error('Workspace not initialized. Please select a workspace first.');
            }

            const projectData = await getProjectByIdLocal(workspaceHandle, projectId);
            const projectHandle = projectData.handle;

            // Process layers to convert relative paths to Object URLs
            const processedData = await resolveAssetUrlsInProject(projectHandle, projectData);

            set({
                currentProject: projectData.projectInfo,
                currentProjectHandle: projectHandle,
                canvasData: projectData,
                history: projectData.history || { undoStack: [], redoStack: [] },
                isLoading: false
            });
            return projectData;
        } catch (error) {
            console.error('Failed to fetch project:', error);
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    /**
     * Save project state to local filesystem
     */
    saveProjectState: async (previewBase64 = null) => {
        const { currentProject, canvasData, currentProjectHandle } = get();
        if (!currentProject?.id || !canvasData || !currentProjectHandle) return;

        try {
            // Process layers to strip Object URLs and convert back to relative paths
            const processedData = stripObjectUrlsFromProject(canvasData);

            // Create history snapshot if it's a new day
            const today = new Date().toISOString().split('T')[0];
            const historyDir = await getSubdirectory(currentProjectHandle, 'history', true);
            const historyFile = `${today}.json`;
            try {
                await readJSONFile(historyDir, historyFile);
            } catch {
                // File doesn't exist, create a snapshot of the current state
                const currentIndexData = await readJSONFile(currentProjectHandle, 'index.json');
                await writeJSONFile(historyDir, historyFile, currentIndexData);
            }

            // Update project metadata
            processedData.projectInfo.updatedAt = new Date().toISOString();
            if (currentProject.name) {
                processedData.projectInfo.name = currentProject.name;
            }

            // Save index.json
            await writeJSONFile(currentProjectHandle, 'index.json', processedData);

            // Save preview if provided
            if (previewBase64) {
                const base64Data = previewBase64.replace(/^data:image\/\w+;base64,/, '');
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                await writeFile(currentProjectHandle, 'preview.png', bytes);
            }

            // Update timestamp
            set(state => ({
                currentProject: {
                    ...state.currentProject,
                    updatedAt: new Date().toISOString()
                }
            }));
        } catch (error) {
            console.error('Failed to save project:', error);
        }
    },

    /**
     * Create a new project locally
     */
    createProject: async (name, width = 1080, height = 1080) => {
        try {
            const { workspaceHandle } = get();
            if (!workspaceHandle) {
                throw new Error('Workspace not initialized');
            }

            const projectId = generateProjectId();
            const projectHandle = await createProjectDirectoryStructure(workspaceHandle, projectId);

            const now = new Date().toISOString();
            const projectData = {
                version: "1.0",
                projectInfo: {
                    id: projectId,
                    name: name || `Project ${projectId.substring(0, 8)}`,
                    createdAt: now,
                    updatedAt: now,
                    previewUrl: "preview.png"
                },
                canvas: {
                    width,
                    height,
                    backgroundColor: "#ffffff",
                    backgroundImage: null,
                    zoom: 1,
                    viewportTransform: [1, 0, 0, 1, 0, 0]
                },
                layers: [],
                history: {
                    undoStack: [],
                    redoStack: []
                }
            };

            await writeJSONFile(projectHandle, 'index.json', projectData);

            set({
                currentProject: projectData.projectInfo,
                currentProjectHandle: projectHandle,
                canvasData: projectData,
                history: projectData.history
            });

            return projectData;
        } catch (error) {
            console.error('Failed to create project:', error);
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * Save an uploaded asset to the project's assets folder
     */
    saveAssetToProject: async (file, fileName = null) => {
        const { currentProjectHandle } = get();
        if (!currentProjectHandle) {
            throw new Error('No active project');
        }

        try {
            const name = fileName || file.name;
            const assetsDir = await getSubdirectory(currentProjectHandle, 'assets', true);
            
            // Convert file to ArrayBuffer if needed
            const arrayBuffer = await file.arrayBuffer();
            await writeFile(assetsDir, name, arrayBuffer);

            // Return the relative path for storing in index.json
            return `assets/${name}`;
        } catch (error) {
            console.error('Failed to save asset:', error);
            throw error;
        }
    },

    /**
     * Get Object URL for an asset, caching the result
     */
    getAssetObjectUrl: async (relativePath) => {
        const { currentProjectHandle, assetUrlMap } = get();
        if (!currentProjectHandle) {
            throw new Error('No active project');
        }

        // Check cache
        if (assetUrlMap[relativePath]) {
            return assetUrlMap[relativePath];
        }

        try {
            const objectUrl = await getFileAsObjectURL(currentProjectHandle, relativePath);
            set(state => ({
                assetUrlMap: { ...state.assetUrlMap, [relativePath]: objectUrl }
            }));
            return objectUrl;
        } catch (error) {
            console.error(`Failed to get Object URL for '${relativePath}':`, error);
            throw error;
        }
    },

    /**
     * Clean up Object URLs to prevent memory leaks
     */
    cleanupAssetUrls: () => {
        const { assetUrlMap } = get();
        Object.values(assetUrlMap).forEach(url => {
            URL.revokeObjectURL(url);
        });
        set({ assetUrlMap: {} });
    },

    /**
     * Fetch all projects from the workspace
     */
    fetchProjects: async () => {
        try {
            const { workspaceHandle } = get();
            if (!workspaceHandle) {
                throw new Error('Workspace not initialized');
            }

            const projects = await scanProjectsInWorkspace(workspaceHandle);
            return projects;
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            throw error;
        }
    },
}));

// ─── Helper Functions ───

/**
 * Generate a UUID-like project ID
 */
function generateProjectId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Resolve relative asset paths to Object URLs in project data
 */
async function resolveAssetUrlsInProject(projectHandle, projectData) {
    const processed = JSON.parse(JSON.stringify(projectData));

    if (processed.layers && Array.isArray(processed.layers)) {
        for (const layer of processed.layers) {
                // Check if it's already an Object URL or external URL
                if (layer.src && typeof layer.src === 'string' && 
                    !layer.src.startsWith('blob:') && 
                    !layer.src.startsWith('http') && 
                    !layer.src.startsWith('data:')) {
                    try {
                        const originalPath = layer.src;
                        // Get Object URL from local file
                        const objectUrl = await getFileAsObjectURL(projectHandle, originalPath);
                        layer.src = objectUrl;
                        
                        // Store the original path in metadata for later stripping
                        if (!layer.metadata) layer.metadata = {};
                        layer.metadata.originalPath = originalPath;
                    } catch (error) {
                        console.warn(`Failed to resolve asset URL for '${layer.src}':`, error);
                    }
                }
        }
    }

    return processed;
}

/**
 * Strip Object URLs from project data, converting back to relative paths
 */
function stripObjectUrlsFromProject(projectData) {
    if (!projectData) return projectData;
    const processed = JSON.parse(JSON.stringify(projectData));

    // Remove non-serializable properties that might have leaked into the state
    delete processed.handle;
    delete processed.projectHandle;

    if (processed.layers && Array.isArray(processed.layers)) {
        for (const layer of processed.layers) {
            // Remove handles from layers too
            delete layer.handle;
            
            if ((layer.type === 'Image' || layer.type === 'image') && layer.src && typeof layer.src === 'string') {
                // If it's a blob URL, we MUST find the original path
                if (layer.src.startsWith('blob:')) {
                    if (layer.metadata?.originalPath) {
                        layer.src = layer.metadata.originalPath;
                    } else {
                        // If no original path, it's a new asset that wasn't saved properly
                        // This shouldn't happen if we save correctly on import
                        console.warn('Found blob URL without originalPath metadata during save');
                    }
                }
            }
        }
    }

    return processed;
}

export default useCanvasStore;
