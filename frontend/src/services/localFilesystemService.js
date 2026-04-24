/**
 * Local Filesystem Service - Cross-browser support with browser-fs-access
 * Handles reading/writing files and directories with fallback for Firefox/Safari
 */

import { directoryOpen, fileOpen, fileSave, supported as browserFsAccessSupported } from 'browser-fs-access';
import { saveWorkspaceHandle, getWorkspaceHandle, getWorkspaceHandleMetadata, saveWorkspaceMetadata, clearWorkspaceHandle } from './indexedDBService';
import { AbstractDirectoryHandle, isNativeAPISupported } from './filesystemAbstractionLayer';

/**
 * Check if native File System Access API is supported (Chromium)
 * @returns {boolean}
 */
export const isNativeFileSystemSupported = () => {
    return isNativeAPISupported();
};

/**
 * Check if any file system API is supported (native or via fallback)
 * @returns {boolean}
 */
export const isFileSystemAccessSupported = () => {
    // We support fallback mode on all modern browsers (Firefox, Safari, etc.)
    // browser-fs-access handles the fallback internally.
    return typeof window !== 'undefined' && (
        isNativeAPISupported() || 
        // Even if native isn't supported, we allow it if we're in a browser
        true 
    );
};

/**
 * Request a directory handle from the user
 * Persists the handle in IndexedDB for later access
 * Uses browser-fs-access for cross-browser compatibility
 * @returns {Promise<AbstractDirectoryHandle>}
 */
export const requestWorkspaceDirectory = async () => {
    if (!isFileSystemAccessSupported()) {
        throw new Error('Your browser does not support file system access. Please use a modern browser (Chrome, Edge, Firefox, or Safari) and ensure you are using a secure connection (HTTPS or localhost).');
    }

    try {
        let handle;
        let isNative = false;

        if (isNativeAPISupported()) {
            // Chromium: Use native API directly to get a persistent handle
            const nativeHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
            });
            // Wrap native handle in abstract wrapper
            handle = new AbstractDirectoryHandle(nativeHandle, null, true);
            isNative = true;
        } else {
            // Firefox/Safari: Use fallback (returns array of files)
            const files = await directoryOpen({
                recursive: true,
                mode: 'readwrite',
            });
            handle = new AbstractDirectoryHandle(null, files, false);
            isNative = false;
        }

        // Save the handle in IndexedDB for persistence
        await saveWorkspaceHandle(handle, isNative);

        // Save metadata
        await saveWorkspaceMetadata({
            selectedAt: new Date().toISOString(),
            name: handle.name || 'workspace',
            isNative,
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
 * @returns {Promise<AbstractDirectoryHandle|null>}
 */
export const getWorkspaceDirectory = async () => {
    try {
        const savedHandle = await getWorkspaceHandle();
        const metadata = await getWorkspaceHandleMetadata();
        
        if (!savedHandle) {
            return null;
        }

        // Use metadata to determine if this was a native handle
        const isNative = metadata?.isNative === true;

        if (isNative && savedHandle) {
            // Native handle retrieved from IndexedDB
            try {
                // Defensive check: ensure queryPermission exists
                if (savedHandle && typeof savedHandle.queryPermission === 'function') {
                    const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        // Wrap native handle in AbstractDirectoryHandle
                        return new AbstractDirectoryHandle(savedHandle, null, true);
                    }
                } else {
                    console.warn('Saved handle is missing queryPermission method. It may be corrupted or an old version.');
                }
            } catch (permError) {
                // If it's a NotFoundError, the directory might have been moved or deleted
                if (permError.name === 'NotFoundError') {
                    console.warn('Saved workspace directory not found. Clearing handle.');
                    await clearWorkspaceHandle();
                } else {
                    console.warn('Failed to verify permission on native handle:', permError);
                }
            }
            // For other states (like 'prompt'), just return null so the UI can show the Reconnect button
            return null;
        } else if (!isNative) {
            // Fallback mode - file array can't be persisted across sessions
            // Return null to prompt user to reconnect
            return null;
        }

        return null;
    } catch (error) {
        console.warn('Failed to retrieve saved workspace handle:', error);
        return null;
    }
};

/**
 * Check if we have permission for a handle
 * @param {AbstractDirectoryHandle} handle 
 * @returns {Promise<boolean>}
 */
export const verifyPermission = async (handle) => {
    if (!handle) return false;
    // Check if it's an AbstractDirectoryHandle or a raw FileSystemHandle
    if (typeof handle.queryPermission === 'function') {
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        return permission === 'granted';
    }
    return false;
};

/**
 * Request permission for a handle (must be called from user gesture)
 * @param {AbstractDirectoryHandle} handle 
 * @returns {Promise<boolean>}
 */
export const requestWorkspacePermission = async (handle) => {
    if (!handle) return false;
    // Check if it's an AbstractDirectoryHandle or a raw FileSystemHandle
    if (typeof handle.requestPermission === 'function') {
        const result = await handle.requestPermission({ mode: 'readwrite' });
        return result === 'granted';
    }
    return false;
};

/**
 * Get a subdirectory handle, creating it if it doesn't exist
 * @param {AbstractDirectoryHandle} parentHandle - Parent directory handle
 * @param {string} dirName - Name of subdirectory
 * @param {boolean} create - Whether to create if doesn't exist
 * @returns {Promise<AbstractDirectoryHandle>}
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
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
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
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
 * @param {string} fileName - Name of file
 * @param {Object} data - Data to write
 * @returns {Promise<void>}
 */
export const writeJSONFile = async (dirHandle, fileName, data) => {
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        // Explicitly truncate to ensure no garbage is left if new content is shorter
        await writable.truncate(0);
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    } catch (error) {
        console.error(`Failed to write JSON file '${fileName}':`, error);
        throw error;
    }
};

/**
 * Write a Blob/File to a directory
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
 * @param {string} fileName - Name of file
 * @param {Blob|ArrayBuffer} data - Data to write
 * @returns {Promise<void>}
 */
export const writeFile = async (dirHandle, fileName, data) => {
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        // Explicitly truncate to ensure no garbage is left if new content is shorter
        await writable.truncate(0);
        await writable.write(data);
        await writable.close();
    } catch (error) {
        console.error(`Failed to write file '${fileName}':`, error);
        throw error;
    }
};

/**
 * Read a file and return as Blob
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
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
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
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
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
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
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
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
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
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
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
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
 * Handles both native handles and fallback file objects
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
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
 * @param {AbstractDirectoryHandle} workspaceHandle - Workspace directory handle
 * @param {string} projectId - Project UUID
 * @returns {Promise<AbstractDirectoryHandle>} Project directory handle
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
 * Export project for non-native browsers (Firefox/Safari)
 * Triggers download of project as JSON bundle
 * @param {AbstractDirectoryHandle} dirHandle - Directory handle
 * @param {string} projectName - Project name for export file
 * @returns {Promise<void>}
 */
export const exportProjectAsBundle = async (dirHandle, projectName = 'project') => {
    if (!dirHandle.isNative) {
        // For non-native browsers, trigger export
        const { triggerProjectExport } = await import('./filesystemAbstractionLayer');
        await triggerProjectExport(dirHandle, projectName);
    } else {
        // For native browsers, we have persistent storage, no export needed
        console.log('Native browser - persistent storage available, export not needed');
    }
};

/**
 * Check if using native persistent storage
 * @param {AbstractDirectoryHandle} handle
 * @returns {boolean}
 */
export const isUsingNativePersistentStorage = (handle) => {
    return handle && handle.isNative === true;
};
