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
    isNativeFileSystemSupported,
    isUsingNativePersistentStorage,
    exportProjectAsBundle,
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
        const { workspaceHandle, workspaceInitialized } = get();
        
        // If already initialized in memory, reuse it
        // This is essential for Fallback Mode (Firefox/Safari) where handles aren't persistent on disk
        if (workspaceInitialized && workspaceHandle) {
            return workspaceHandle;
        }

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
                canvasData: processedData,
                history: processedData.history || { undoStack: [], redoStack: [] },
                isLoading: false
            });
            return processedData;
        } catch (error) {
            console.error('Failed to fetch project:', error);
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    /**
     * Save project state to local filesystem
     */
    /**
     * Save a manual version/snapshot of the project
     */
    saveProjectVersion: async (versionName) => {
        try {
            const { currentProjectHandle, canvasData } = get();
            if (!currentProjectHandle || !canvasData) throw new Error('No project or canvas data');

            // 1. Prepare data
            const processedData = stripObjectUrlsFromProject(canvasData);
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('-').slice(0, 5).join('-'); // YYYY-MM-DD_HH-mm
            const safeName = versionName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
            
            // 2. Add metadata to the version
            if (!processedData.metadata) processedData.metadata = {};
            processedData.metadata.versionName = versionName;
            processedData.metadata.isManualVersion = true;
            processedData.metadata.savedAt = now.toISOString();

            // 3. Save to history folder
            const historyDir = await getSubdirectory(currentProjectHandle, 'history', true);
            const fileName = `${timestamp}_${safeName}.json`;
            await writeJSONFile(historyDir, fileName, processedData);

            return { fileName, versionName };
        } catch (error) {
            console.error('Failed to save project version:', error);
            throw error;
        }
    },

    /**
     * Fetch project history locally
     */
    fetchHistory: async () => {
        try {
            const { currentProjectHandle } = get();
            if (!currentProjectHandle) throw new Error('No active project');
            
            const history = await getProjectHistory(currentProjectHandle);
            return history;
        } catch (error) {
            console.error('Failed to fetch history:', error);
            throw error;
        }
    },

    /**
     * Restore project from a history snapshot
     */
    restoreHistory: async (snapshotFilename) => {
        try {
            const { currentProjectHandle, canvasData } = get();
            if (!currentProjectHandle) throw new Error('No active project');

            const historyDir = await getSubdirectory(currentProjectHandle, 'history', true);
            const snapshotData = await readJSONFile(historyDir, snapshotFilename);

            // 1. Backup current state before restoring
            const backupName = `rollback_${Date.now()}.json`;
            const currentProcessed = stripObjectUrlsFromProject(canvasData);
            await writeJSONFile(historyDir, backupName, currentProcessed);

            // 2. Restore snapshot
            await writeJSONFile(currentProjectHandle, 'index.json', snapshotData);

            // 3. Reload the project in the store
            const processedData = await resolveAssetUrlsInProject(currentProjectHandle, snapshotData);
            set({
                canvasData: processedData,
                currentProject: processedData.projectInfo,
                history: processedData.history || { undoStack: [], redoStack: [] }
            });

            return processedData;
        } catch (error) {
            console.error('Failed to restore history:', error);
            throw error;
        }
    },

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

            // Sync with backend (for backup support)
            // Skip sync if we have a workspace handle to avoid race conditions 
            // especially when the workspace is the same as the backend storage
            if (!get().workspaceHandle) {
                try {
                    await api.put(`/projects/${currentProject.id}`, {
                        canvasState: processedData,
                        previewBase64: previewBase64
                    });
                } catch (backendError) {
                    console.warn('Backend sync failed (local save succeeded):', backendError);
                }
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

    exportProjectAsZip: async () => {
        try {
            const { currentProjectHandle, canvasData } = get();
            if (!currentProjectHandle) throw new Error('No active project');

            // 1. Initialize JSZip
            if (typeof window.JSZip === 'undefined') {
                throw new Error('JSZip library not loaded. Please check your internet connection.');
            }
            const zip = new window.JSZip();

            // 2. Add index.json
            const processedData = stripObjectUrlsFromProject(canvasData);
            zip.file('index.json', JSON.stringify(processedData, null, 2));

            // 3. Add preview.png (if exists)
            try {
                const previewFile = await currentProjectHandle.getFileHandle('preview.png');
                const previewBlob = await previewFile.getFile();
                zip.file('preview.png', previewBlob);
            } catch (err) {
                console.warn('preview.png not found during export');
            }

            // 4. Add Assets
            try {
                const assetsDir = await currentProjectHandle.getDirectoryHandle('assets');
                const assetFiles = [];
                for await (const entry of assetsDir.values()) {
                    if (entry.kind === 'file') {
                        assetFiles.push(entry);
                    }
                }

                if (assetFiles.length > 0) {
                    const assetsFolder = zip.folder('assets');
                    for (const entry of assetFiles) {
                        const file = await entry.getFile();
                        assetsFolder.file(entry.name, file);
                    }
                }
            } catch (err) {
                console.warn('assets directory not found during export');
            }

            // 5. Generate and Download
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${processedData.projectInfo.name || 'project'}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Frontend ZIP export failed:', error);
            throw error;
        }
    },

    /**
     * Save an AI-generated project and its assets locally
     */
    saveAIGeneratedProject: async (projectData, assets) => {
        try {
            const { workspaceHandle } = get();
            if (!workspaceHandle) throw new Error('Workspace not initialized');

            const projectId = projectData.projectInfo.id;
            const projectHandle = await createProjectDirectoryStructure(workspaceHandle, projectId);

            // 1. Save Assets
            if (assets && Array.isArray(assets)) {
                const assetsDir = await getSubdirectory(projectHandle, 'assets', true);
                for (const asset of assets) {
                    const binaryString = atob(asset.base64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    await writeFile(assetsDir, asset.fileName, bytes);
                }
            }

            // 2. Save index.json
            await writeJSONFile(projectHandle, 'index.json', projectData);

            // 3. Update state
            set({
                currentProject: projectData.projectInfo,
                currentProjectHandle: projectHandle,
                canvasData: projectData,
                history: projectData.history || { undoStack: [], redoStack: [] }
            });

            return projectData;
        } catch (error) {
            console.error('Failed to save AI generated project:', error);
            throw error;
        }
    },

    /**
     * Save an array of base64 assets to the current project
     */
    saveBase64Assets: async (assets) => {
        const { currentProjectHandle } = get();
        if (!currentProjectHandle) throw new Error('No active project');

        try {
            const assetsDir = await getSubdirectory(currentProjectHandle, 'assets', true);
            for (const asset of assets) {
                const binaryString = atob(asset.base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                await writeFile(assetsDir, asset.fileName, bytes);
            }
        } catch (error) {
            console.error('Failed to save base64 assets:', error);
            throw error;
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

    /**
     * Import a ZIP file into the local workspace
     */
    importProjectZip: async (zipFile) => {
        try {
            const { workspaceHandle } = get();
            if (!workspaceHandle) throw new Error('Workspace not initialized');

            if (typeof window.JSZip === 'undefined') {
                throw new Error('JSZip library not loaded.');
            }

            const zip = await window.JSZip.loadAsync(zipFile);
            
            // 1. Find index.json to get project info
            const indexEntry = zip.file('index.json');
            if (!indexEntry) throw new Error('Invalid project zip: Missing index.json');
            
            const indexContent = await indexEntry.async('string');
            const projectData = JSON.parse(indexContent);
            
            if (!projectData.projectInfo) throw new Error('Invalid project zip: Malformed index.json');

            // 2. Generate new ID to avoid collisions (or use original if preferred)
            const newProjectId = `imported_${Date.now()}`;
            projectData.projectInfo.id = newProjectId;
            
            // 3. Create directory
            const projectHandle = await workspaceHandle.getDirectoryHandle(newProjectId, { create: true });
            
            // 4. Extract files
            for (const [relativePath, file] of Object.entries(zip.files)) {
                if (file.dir) {
                    const parts = relativePath.split('/').filter(Boolean);
                    let current = projectHandle;
                    for (const part of parts) {
                        current = await current.getDirectoryHandle(part, { create: true });
                    }
                } else {
                    const parts = relativePath.split('/');
                    const fileName = parts.pop();
                    let current = projectHandle;
                    for (const part of parts) {
                        current = await current.getDirectoryHandle(part, { create: true });
                    }
                    
                    const content = await file.async('uint8array');
                    
                    if (relativePath === 'index.json') {
                        const writable = await current.getFileHandle(fileName, { create: true });
                        const stream = await writable.createWritable();
                        await stream.write(JSON.stringify(projectData, null, 2));
                        await stream.close();
                    } else {
                        const writable = await current.getFileHandle(fileName, { create: true });
                        const stream = await writable.createWritable();
                        await stream.write(content);
                        await stream.close();
                    }
                }
            }

            return projectData;
        } catch (error) {
            console.error('Frontend Import failed:', error);
            throw error;
        }
    },

    /**
     * Export a project by ID from the local workspace
     */
    exportProjectById: async (projectId) => {
        try {
            const { workspaceHandle } = get();
            if (!workspaceHandle) throw new Error('Workspace not initialized');

            if (typeof window.JSZip === 'undefined') {
                throw new Error('JSZip library not loaded.');
            }

            const projectHandle = await workspaceHandle.getDirectoryHandle(projectId);
            const zip = new window.JSZip();

            const addFolderToZip = async (handle, folderZip) => {
                for await (const entry of handle.values()) {
                    if (entry.kind === 'file') {
                        const file = await entry.getFile();
                        folderZip.file(entry.name, file);
                    } else if (entry.kind === 'directory') {
                        const subFolderZip = folderZip.folder(entry.name);
                        await addFolderToZip(entry, subFolderZip);
                    }
                }
            };

            await addFolderToZip(projectHandle, zip);

            let projectName = projectId;
            try {
                const indexFile = await projectHandle.getFileHandle('index.json');
                const content = await (await indexFile.getFile()).text();
                const data = JSON.parse(content);
                projectName = data.projectInfo?.name || projectId;
            } catch (err) {
                console.warn('Could not read index.json for project name', err);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${projectName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Frontend Export failed:', error);
            throw error;
        }
    },

    /**
     * Save and export project for non-native browsers (Firefox/Safari)
     * On native browsers, just saves normally
     * On non-native browsers, triggers an export download
     */
    saveAndExportProject: async (previewBase64 = null) => {
        try {
            const { currentProject, canvasData, currentProjectHandle } = get();
            if (!currentProject?.id || !canvasData || !currentProjectHandle) {
                throw new Error('No project to save');
            }

            // First, save the project locally
            const processedData = stripObjectUrlsFromProject(canvasData);
            processedData.projectInfo.updatedAt = new Date().toISOString();
            await writeJSONFile(currentProjectHandle, 'index.json', processedData);

            if (previewBase64) {
                const base64Data = previewBase64.replace(/^data:image\/\w+;base64,/, '');
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                await writeFile(currentProjectHandle, 'preview.png', bytes);
            }

            // If using non-native browser, trigger export
            if (!isUsingNativePersistentStorage(currentProjectHandle)) {
                await exportProjectAsBundle(currentProjectHandle, currentProject.name || 'project');
            }

            set(state => ({
                currentProject: {
                    ...state.currentProject,
                    updatedAt: new Date().toISOString()
                }
            }));

            return processedData;
        } catch (error) {
            console.error('Failed to save and export project:', error);
            throw error;
        }
    },

    /**
     * Check if the browser supports native persistent file system
     */
    hasNativePersistentStorage: () => isNativeFileSystemSupported(),

    /**
     * Get current workspace storage type (native vs fallback)
     */
    getStorageType: () => {
        const { workspaceHandle } = get();
        if (!workspaceHandle) return 'none';
        return isUsingNativePersistentStorage(workspaceHandle) ? 'native' : 'fallback';
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
export async function resolveAssetUrlsInProject(projectHandle, projectData) {
    const processed = JSON.parse(JSON.stringify(projectData));

    if (processed.layers && Array.isArray(processed.layers)) {
        for (const layer of processed.layers) {
                // Check if it's already an Object URL or external URL
                // Resolve if it's a relative path OR if it's a blob URL with originalPath metadata
                const isBlob = layer.src?.startsWith('blob:');
                const hasOriginalPath = layer.metadata?.originalPath;
                const isExternal = layer.src?.startsWith('http') || layer.src?.startsWith('data:');

                if (layer.src && typeof layer.src === 'string' && !isExternal && (!isBlob || hasOriginalPath)) {
                    try {
                        const originalPath = hasOriginalPath ? layer.metadata.originalPath : layer.src;
                        // Get Object URL from local file
                        const objectUrl = await getFileAsObjectURL(projectHandle, originalPath);
                        layer.src = objectUrl;
                        
                        // Store/ensure the original path in metadata for later stripping
                        if (!layer.metadata) layer.metadata = {};
                        layer.metadata.originalPath = originalPath;
                    } catch (error) {
                        console.warn(`Failed to resolve asset URL for '${layer.src}':`, error);
                        // If it's a dead blob URL and we can't resolve it, we might want to clear it 
                        // to prevent Fabric from crashing during load
                        if (isBlob) {
                            layer.src = ''; 
                        }
                    }
                }
        }
    }

    return processed;
}

/**
 * Strip Object URLs from project data, converting back to relative paths
 */
export function stripObjectUrlsFromProject(projectData) {
    if (!projectData) return projectData;
    const processed = JSON.parse(JSON.stringify(projectData));

    // Remove non-serializable properties that might have leaked into the state
    delete processed.handle;
    delete processed.projectHandle;

    const layers = processed.layers || processed.objects;
    if (layers && Array.isArray(layers)) {
        for (const layer of layers) {
            // Remove handles from layers too
            delete layer.handle;
            
            if (layer.src && typeof layer.src === 'string' && layer.src.startsWith('blob:')) {
                const type = layer.type ? layer.type.toLowerCase() : '';
                if (type === 'image' || type === 'fabricimage' || type === 'itext' || type === 'text') {
                    // If it's a blob URL, we MUST find the original path
                    if (layer.metadata?.originalPath) {
                        layer.src = layer.metadata.originalPath;
                    } else {
                        console.warn(`Found blob URL without originalPath metadata for layer ${layer.id || 'unknown'}. This asset may be lost on next load.`);
                        // Fail-safe: if we can't recover, it's better to leave it as is or clear it?
                        // Clearing it prevents ERR_FILE_NOT_FOUND, but the user loses the image anyway.
                        // We'll keep it so they might see what's missing, but it's a known issue.
                    }
                }
            }

            // Restore fill source if it was resolved from a local path
            if (layer.fill && typeof layer.fill === 'object' && layer.fill.source) {
                if (layer.fill.source.startsWith('blob:') && layer.metadata?.fillSourcePath) {
                    layer.fill.source = layer.metadata.fillSourcePath;
                }
            }
        }
    }

    return processed;
}

export default useCanvasStore;
