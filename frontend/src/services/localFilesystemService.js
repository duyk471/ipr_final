/**
 * Local Filesystem Service - Abstracts Web File System Access API
 * Handles reading/writing files and directories in the workspace
 */

import { saveWorkspaceHandle, getWorkspaceHandle, saveWorkspaceMetadata } from './indexedDBService';

/**
 * Request a directory handle from the user
 * Persists the handle in IndexedDB for later access
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
export const requestWorkspaceDirectory = async () => {
    if (!isFileSystemAccessSupported()) {
        throw new Error('Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge, and ensure you are using a secure connection (HTTPS or localhost).');
    }

    try {
        const handle = await window.showDirectoryPicker({
            id: 'photo-editor-workspace',
            mode: 'readwrite',
        });

        // Save the handle in IndexedDB for persistence
        await saveWorkspaceHandle(handle);

        // Save metadata
        await saveWorkspaceMetadata({
            selectedAt: new Date().toISOString(),
            name: handle.name,
        });

        return handle;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('User cancelled directory selection');
        }

        throw error;
    }
};

/**
 * Get the workspace directory handle from storage
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export const getWorkspaceDirectory = async () => {
    try {
        const savedHandle = await getWorkspaceHandle();
        if (savedHandle) {
            // Verify permission is still granted.

            const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                return savedHandle;
            }
            // We have a handle but no permission. Return null to trigger UI re-auth
            return null;
        }
    } catch (error) {
        cóc
        console.warn('Failed to retrieve saved workspace handle:', error);
    }
    return null;
};

/**
 * Check if we have permission for a handle
 * @param {FileSystemDirectoryHandle} handle 
 * @returns {Promise<boolean>}
 */
export const verifyPermission = async (handle) => {
    if (!handle) return false;
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted';
};

/**
 * Request permission for a handle (must be called from user gesture)
 * @param {FileSystemDirectoryHandle} handle 
 * @returns {Promise<boolean>}
 */
export const requestWorkspacePermission = async (handle) => {
    if (!handle) return false;
    const result = await handle.requestPermission({ mode: 'readwrite' });
    return result === 'granted';
};

/**
 * Get a subdirectory handle, creating it if it doesn't exist
 * @param {FileSystemDirectoryHandle} parentHandle - Parent directory handle
 * @param {string} dirName - Name of subdirectory
 * @param {boolean} create - Whether to create if doesn't exist
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
export const getSubdirectory = async (parentHandle, dirName, create = true) => {
    try {
        return await parentHandle.getDirectoryHandle(dirName, { create });
    } catch (error) {
        console.error(`Failed to get subdirectory '${dirName}':`, error);
        throw error;
    }
};

/**
 * Read a JSON file from a directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} fileName - Name of file
 * @returns {Promise<Object>}
 */
export const readJSONFile = async (dirHandle, fileName) => {
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (error) {
        console.error(`Failed to read JSON file '${fileName}':`, error);
        throw error;
    }
};

/**
 * Write a JSON file to a directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} fileName - Name of file
 * @param {Object} data - Data to write
 * @returns {Promise<void>}
 */
export const writeJSONFile = async (dirHandle, fileName, data) => {
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    } catch (error) {
        console.error(`Failed to write JSON file '${fileName}':`, error);
        throw error;
    }
};

/**
 * Write a Blob/File to a directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} fileName - Name of file
 * @param {Blob|ArrayBuffer} data - Data to write
 * @returns {Promise<void>}
 */
export const writeFile = async (dirHandle, fileName, data) => {
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
    } catch (error) {
        console.error(`Failed to write file '${fileName}':`, error);
        throw error;
    }
};

/**
 * Read a file and return as Blob
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} fileName - Name of file
 * @returns {Promise<Blob>}
 */
export const readFileAsBlob = async (dirHandle, fileName) => {
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return file;
    } catch (error) {
        console.error(`Failed to read file '${fileName}' as Blob:`, error);
        throw error;
    }
};


/**
 * List all entries in a directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {Promise<Array>} Array of {name, kind, handle}
 */
export const listDirectory = async (dirHandle) => {
    try {
        const entries = [];
        for await (const entry of dirHandle.entries()) {
            entries.push({
                name: entry[0],
                kind: entry[1].kind, // 'file' or 'directory'
                handle: entry[1],
            });
        }
        return entries;
    } catch (error) {
        console.error('Failed to list directory:', error);
        throw error;
    }
};

/**
 * Check if a file exists in a directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} fileName - Name of file
 * @returns {Promise<boolean>}
 */
export const fileExists = async (dirHandle, fileName) => {
    try {
        await dirHandle.getFileHandle(fileName);
        return true;
    } catch {
        return false;
    }
};

/**
 * Check if a directory exists in a directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} dirName - Name of directory
 * @returns {Promise<boolean>}
 */
export const directoryExists = async (dirHandle, dirName) => {
    try {
        await dirHandle.getDirectoryHandle(dirName);
        return true;
    } catch {
        return false;
    }
};

/**
 * Delete a file from a directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} fileName - Name of file
 * @returns {Promise<void>}
 */
export const deleteFile = async (dirHandle, fileName) => {
    try {
        await dirHandle.removeEntry(fileName);
    } catch (error) {
        console.error(`Failed to delete file '${fileName}':`, error);
        throw error;
    }
};

/**
 * Delete a directory recursively
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} dirName - Name of directory
 * @returns {Promise<void>}
 */
export const deleteDirectory = async (dirHandle, dirName) => {
    try {
        await dirHandle.removeEntry(dirName, { recursive: true });
    } catch (error) {
        console.error(`Failed to delete directory '${dirName}':`, error);
        throw error;
    }
};

/**
 * Get a file from a directory as a Data URL for use in canvas
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {string} filePath - Path to file (e.g., 'assets/image.png')
 * @returns {Promise<string>} Data URL or Object URL
 */
export const getFileAsObjectURL = async (dirHandle, filePath) => {
    try {
        const parts = filePath.split('/').filter(p => p);
        let currentHandle = dirHandle;

        // Navigate to the directory containing the file
        for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
        }

        // Get the file
        const fileName = parts[parts.length - 1];
        const blob = await readFileAsBlob(currentHandle, fileName);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error(`Failed to get file as Object URL '${filePath}':`, error);
        throw error;
    }
};

/**
 * Create a project directory structure
 * @param {FileSystemDirectoryHandle} workspaceHandle - Workspace directory handle
 * @param {string} projectId - Project UUID
 * @returns {Promise<FileSystemDirectoryHandle>} Project directory handle
 */
export const createProjectDirectoryStructure = async (workspaceHandle, projectId) => {
    try {
        const projectDir = await getSubdirectory(workspaceHandle, projectId, true);
        await getSubdirectory(projectDir, 'assets', true);
        await getSubdirectory(projectDir, 'history', true);
        return projectDir;
    } catch (error) {
        console.error(`Failed to create project directory structure for '${projectId}':`, error);
        throw error;
    }
};

/**
 * Check browser support for File System Access API
 * @returns {boolean}
 */
export const isFileSystemAccessSupported = () => {
    return typeof window !== 'undefined' &&
        'showDirectoryPicker' in window &&
        'FileSystemDirectoryHandle' in window;
};
