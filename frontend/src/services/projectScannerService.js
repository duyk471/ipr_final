/**
 * Project Scanner - Scans the workspace directory for valid projects
 * A valid project contains an index.json file
 */

import { listDirectory, readJSONFile, fileExists } from './localFilesystemService';

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
                    projects.push({
                        id: entry.name, // Use folder name as project ID
                        handle: entry.handle,
                        name: projectData.projectInfo?.name || entry.name,
                        createdAt: projectData.projectInfo?.createdAt,
                        updatedAt: projectData.projectInfo?.updatedAt,
                        previewUrl: projectData.projectInfo?.previewUrl,
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
        if (!projectData || !projectData.projectInfo) {
            console.warn(`Invalid project structure in '${projectHandle.name}': Missing projectInfo`);
            return null;
        }

        return projectData;
    } catch (error) {
        console.warn(`Failed to load project metadata from '${projectHandle.name}':`, error);
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

        if (!projectData || !projectData.projectInfo) {
            throw new Error('Invalid project structure: Missing projectInfo');
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
 * Get all history snapshots for a project
 * @param {FileSystemDirectoryHandle} projectHandle - Project directory handle
 * @returns {Promise<Array>} Array of {date, filename}
 */
export const getProjectHistory = async (projectHandle) => {
    try {
        const historyHandle = await projectHandle.getDirectoryHandle('history', { create: false });
        const entries = await listDirectory(historyHandle);

        const historyFiles = entries
            .filter(entry => entry.kind === 'file' && entry.name.endsWith('.json'))
            .map(entry => ({
                date: entry.name.replace('.json', ''),
                filename: entry.name,
            }))
            .sort((a, b) => b.date.localeCompare(a.date));

        return historyFiles;
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
