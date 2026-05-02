/**
 * Project Scanner - Scans the workspace directory for valid projects
 * A valid project contains an index.json file
 */

import { listDirectory, readJSONFile, fileExists, getFileAsObjectURL } from './localFilesystemService';
import { validateProjectStructure, sanitizeProjectData, logValidationResult } from '../utils/projectValidation';

/**
 * Scan a directory for valid projects
 * A project is valid if it contains an index.json file
 * @param {FileSystemDirectoryHandle} workspaceHandle - Workspace directory handle
 * @returns {Promise<Array>} Array of project objects {id, name, updatedAt, handle}
 */
export const scanProjectsInWorkspace = async (workspaceHandle) => {
    const projects = [];

    try {
        const entries = await listDirectory(workspaceHandle);

        for (const entry of entries) {
            if (entry.kind === 'directory') {
                const projectData = await loadProjectMetadata(entry.handle);
                if (projectData) {
                    let previewUrl = projectData.projectInfo?.previewUrl;

                    // If previewUrl is a relative path, resolve it to an Object URL
                    if (previewUrl && 
                        typeof previewUrl === 'string' && 
                        !previewUrl.startsWith('blob:') && 
                        !previewUrl.startsWith('http') && 
                        !previewUrl.startsWith('data:')) {
                        try {
                            if (await fileExists(entry.handle, previewUrl)) {
                                previewUrl = await getFileAsObjectURL(entry.handle, previewUrl);
                            } else {
                                previewUrl = null;
                            }
                        } catch (err) {
                            console.warn(`Failed to resolve preview URL for project '${entry.name}':`, err);
                            previewUrl = null;
                        }
                    }

                    projects.push({
                        id: entry.name, // Use folder name as project ID
                        handle: entry.handle,
                        name: projectData.projectInfo?.name || entry.name,
                        createdAt: projectData.projectInfo?.createdAt,
                        updatedAt: projectData.projectInfo?.updatedAt,
                        previewUrl: previewUrl,
                    });
                }
            }
        }

        // Sort by updatedAt descending
        projects.sort((a, b) => {
            const dateA = new Date(b.updatedAt || 0);
            const dateB = new Date(a.updatedAt || 0);
            return dateA - dateB;
        });

        return projects;
    } catch (error) {
        console.error('Failed to scan projects in workspace:', error);
        throw error;
    }
};

/**
 * Load project metadata from a project directory
 * @param {FileSystemDirectoryHandle} projectHandle - Project directory handle
 * @returns {Promise<Object|null>} Project data or null if invalid
 */
export const loadProjectMetadata = async (projectHandle) => {
    try {
        // Check if index.json exists
        if (!(await fileExists(projectHandle, 'index.json'))) {
            return null;
        }

        // Read the index.json
        const projectData = await readJSONFile(projectHandle, 'index.json');

        // Validate structure
        const validation = validateProjectStructure(projectData);
        
        if (!validation.valid) {
            console.warn(`Invalid project structure in '${projectHandle.name}':`);
            logValidationResult(validation, projectHandle.name);
            
            // Attempt to sanitize and recover
            try {
                console.info(`Attempting to repair project '${projectHandle.name}'...`);
                const sanitized = sanitizeProjectData(projectData);
                console.info(`Project '${projectHandle.name}' has been repaired with default values`);
                return sanitized;
            } catch (sanitizeError) {
                console.error(`Failed to repair project '${projectHandle.name}':`, sanitizeError);
                return null;
            }
        }

        return projectData;
    } catch (error) {
        if (error.message.includes('Corrupted JSON')) {
            console.error(`Project corruption detected in '${projectHandle.name}': JSON parsing failed`, error);
        } else {
            console.warn(`Failed to load project metadata from '${projectHandle.name}':`, error);
        }
        return null;
    }
};

/**
 * Get a specific project by ID (folder name)
 * @param {FileSystemDirectoryHandle} workspaceHandle - Workspace directory handle
 * @param {string} projectId - Project ID (folder name)
 * @returns {Promise<Object>} Project data
 */
export const getProjectByIdLocal = async (workspaceHandle, projectId) => {
    try {
        const projectHandle = await workspaceHandle.getDirectoryHandle(projectId);
        const projectData = await readJSONFile(projectHandle, 'index.json');

        // Validate structure
        const validation = validateProjectStructure(projectData);
        
        if (!validation.valid) {
            console.warn(`Project '${projectId}' validation failed:`);
            logValidationResult(validation, projectId);
            
            // Attempt recovery
            try {
                console.info(`Attempting to repair project '${projectId}'...`);
                const sanitized = sanitizeProjectData(projectData);
                return {
                    ...sanitized,
                    handle: projectHandle,
                };
            } catch (error) {
                throw new Error(`Failed to load project '${projectId}': ${error.message}`);
            }
        }

        return {
            ...projectData,
            handle: projectHandle,
        };
    } catch (error) {
        console.error(`Failed to get project '${projectId}':`, error);
        throw error;
    }
};

/**
 * Get all history snapshots for a project with metadata
 * @param {FileSystemDirectoryHandle} projectHandle - Project directory handle
 * @returns {Promise<Array>} Array of {date, filename, versionName, isManual}
 */
export const getProjectHistory = async (projectHandle) => {
    try {
        const historyHandle = await projectHandle.getDirectoryHandle('history', { create: false });
        const entries = await listDirectory(historyHandle);

        const historyFiles = [];
        for (const entry of entries) {
            if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                try {
                    const data = await readJSONFile(historyHandle, entry.name);
                    historyFiles.push({
                        date: entry.name.replace('.json', ''),
                        filename: entry.name,
                        versionName: data.metadata?.versionName || null,
                        isManual: data.metadata?.isManualVersion || false,
                        savedAt: data.metadata?.savedAt || null
                    });
                } catch (err) {
                    console.warn(`Failed to read history metadata for ${entry.name}:`, err);
                    historyFiles.push({
                        date: entry.name.replace('.json', ''),
                        filename: entry.name
                    });
                }
            }
        }

        return historyFiles.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
        // History directory might not exist
        if (error.name === 'NotFoundError') {
            return [];
        }
        console.error('Failed to get project history:', error);
        throw error;
    }
};

/**
 * Get list of assets in a project
 * @param {FileSystemDirectoryHandle} projectHandle - Project directory handle
 * @returns {Promise<Array>} Array of asset filenames
 */
export const getProjectAssets = async (projectHandle) => {
    try {
        const assetsHandle = await projectHandle.getDirectoryHandle('assets', { create: false });
        const entries = await listDirectory(assetsHandle);

        return entries
            .filter(entry => entry.kind === 'file')
            .map(entry => entry.name);
    } catch (error) {
        // Assets directory might not exist
        if (error.name === 'NotFoundError') {
            return [];
        }
        console.error('Failed to get project assets:', error);
        throw error;
    }
};

/**
 * Get asset handle from a project
 * @param {FileSystemDirectoryHandle} projectHandle - Project directory handle
 * @param {string} assetFileName - Asset file name
 * @returns {Promise<File>}
 */
export const getAssetFile = async (projectHandle, assetFileName) => {
    try {
        const assetsHandle = await projectHandle.getDirectoryHandle('assets');
        const fileHandle = await assetsHandle.getFileHandle(assetFileName);
        return await fileHandle.getFile();
    } catch (error) {
        console.error(`Failed to get asset '${assetFileName}':`, error);
        throw error;
    }
};
