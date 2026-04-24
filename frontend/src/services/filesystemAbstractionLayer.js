/**
 * Filesystem Abstraction Layer - Unified interface for native and fallback modes
 * Handles both FileSystemDirectoryHandle (Chromium) and file arrays (Firefox/Safari)
 */

/**
 * Check if the native File System Access API is supported
 * @returns {boolean}
 */
export const isNativeAPISupported = () => {
    return typeof window !== 'undefined' &&
        'showDirectoryPicker' in window &&
        'FileSystemDirectoryHandle' in window;
};

/**
 * Abstract Directory Handle - wraps both native handles and file arrays
 */
export class AbstractDirectoryHandle {
    constructor(nativeHandle = null, files = null, isNative = true, basePath = '') {
        this.nativeHandle = nativeHandle;
        this.files = files || []; // Flat array of File objects with paths for non-native
        this.isNative = isNative;
        this.basePath = basePath; // For fallback mode: the base path prefix (e.g., 'project1')
        this.name = nativeHandle?.name || 'workspace';
    }

    /**
     * Get a subdirectory handle
     * On native: returns another AbstractDirectoryHandle wrapping a FileSystemDirectoryHandle
     * On fallback: returns another AbstractDirectoryHandle with filtered files
     */
    async getDirectoryHandle(name, options = {}) {
        if (this.isNative && this.nativeHandle) {
            const subHandle = await this.nativeHandle.getDirectoryHandle(name, options);
            return new AbstractDirectoryHandle(subHandle, null, true);
        }

        // Fallback: return filtered files matching the subdirectory path
        const subPath = this.basePath ? `${this.basePath}/${name}` : name;
        const prefix = `${subPath}/`;
        const subFiles = this.files.filter(f => 
            f.path && (f.path.startsWith(prefix) || f.path === subPath)
        );
        
        return new AbstractDirectoryHandle(null, subFiles, false, subPath);
    }

    /**
     * Get a file handle
     * On native: returns a wrapper around FileSystemFileHandle
     * On fallback: returns an AbstractFileHandle
     */
    async getFileHandle(name, options = {}) {
        if (this.isNative && this.nativeHandle) {
            const fileHandle = await this.nativeHandle.getFileHandle(name, options);
            return new AbstractFileHandle(fileHandle, null, true);
        }

        // Fallback: find file in the array
        const filePath = this.basePath ? `${this.basePath}/${name}` : name;
        const file = this.files.find(f => f.path === filePath);

        if (file) {
            return new AbstractFileHandle(null, file, false);
        }

        if (options.create) {
            // Create a new virtual file object
            const newFile = new File([], name, { type: 'application/octet-stream' });
            newFile.path = filePath;
            this.files.push(newFile);
            return new AbstractFileHandle(null, newFile, false);
        }

        throw new DOMException(`${name} not found`, 'NotFoundError');
    }

    /**
     * List all entries in the directory
     * On native: uses native iteration
     * On fallback: returns filtered file list
     */
    async *entries() {
        if (this.isNative && this.nativeHandle) {
            // Native: yield from async iterator
            for await (const entry of this.nativeHandle.entries()) {
                yield entry;
            }
        } else {
            // Fallback: construct entries from file list (top-level only)
            const topLevelEntries = new Map();
            
            // Determine the prefix to look for files under this basePath
            const searchPrefix = this.basePath ? `${this.basePath}/` : '';
            
            for (const file of this.files) {
                if (file.path && file.path.startsWith(searchPrefix)) {
                    // Get the relative path after basePath
                    const relativePath = file.path.substring(searchPrefix.length);
                    const parts = relativePath.split('/').filter(p => p);
                    
                    if (parts.length > 0) {
                        const name = parts[0];
                        if (!topLevelEntries.has(name)) {
                            topLevelEntries.set(name, {
                                name,
                                kind: parts.length > 1 ? 'directory' : 'file',
                            });
                        }
                    }
                }
            }

            // Yield entries - create AbstractDirectoryHandle for subdirectories
            for (const [name, entry] of topLevelEntries.entries()) {
                if (entry.kind === 'directory') {
                    // For directories, create an AbstractDirectoryHandle for that subdirectory
                    const subPath = this.basePath ? `${this.basePath}/${name}` : name;
                    const subHandle = new AbstractDirectoryHandle(null, this.files, false, subPath);
                    subHandle.name = name;
                    yield [name, subHandle];
                } else {
                    // For files, yield the entry as-is
                    yield [name, entry];
                }
            }
        }
    }

    /**
     * Remove an entry (file or directory)
     * On native: uses native removeEntry
     * On fallback: filters out files
     */
    async removeEntry(name, options = {}) {
        if (this.isNative && this.nativeHandle) {
            return this.nativeHandle.removeEntry(name, options);
        }

        // Fallback: remove files matching name
        const filePath = this.basePath ? `${this.basePath}/${name}` : name;
        if (options.recursive) {
            const prefix = `${filePath}/`;
            this.files = this.files.filter(f => 
                f.path !== filePath && !f.path?.startsWith(prefix)
            );
        } else {
            this.files = this.files.filter(f => f.path !== filePath);
        }
    }

    /**
     * Query permission (always granted for fallback)
     */
    async queryPermission(options = {}) {
        if (this.isNative && this.nativeHandle) {
            return this.nativeHandle.queryPermission(options);
        }
        return 'granted';
    }

    /**
     * Request permission (always granted for fallback)
     */
    async requestPermission(options = {}) {
        if (this.isNative && this.nativeHandle) {
            return this.nativeHandle.requestPermission(options);
        }
        return 'granted';
    }
}

/**
 * Abstract File Handle - wraps both native handles and File objects
 */
export class AbstractFileHandle {
    constructor(nativeHandle = null, file = null, isNative = true) {
        this.nativeHandle = nativeHandle;
        this.file = file;
        this.isNative = isNative;
        this.name = nativeHandle?.name || file?.name || '';
    }

    /**
     * Get the File object
     * On native: calls getFile() on the native handle
     * On fallback: returns the File object
     */
    async getFile() {
        if (this.isNative && this.nativeHandle) {
            return this.nativeHandle.getFile();
        }
        return this.file;
    }

    /**
     * Create a writable stream for writing
     * On native: uses native createWritable
     * On fallback: returns a mock writable that buffers data
     */
    async createWritable() {
        if (this.isNative && this.nativeHandle) {
            return this.nativeHandle.createWritable();
        }

        // Fallback: return a buffered writable
        return new MockWritable(this.file);
    }
}

/**
 * Mock Writable Stream for fallback mode
 * Buffers writes and updates the underlying File object
 */
class MockWritable {
    constructor(file) {
        this.file = file;
        this.buffer = [];
    }

    async write(data) {
        this.buffer.push(data);
    }

    async close() {
        // Combine buffered data into a single blob
        const blob = new Blob(this.buffer, { type: this.file?.type || 'application/octet-stream' });
        const newFile = new File([blob], this.file?.name || 'file', { type: blob.type });
        
        // Copy path if it exists
        if (this.file?.path) {
            newFile.path = this.file.path;
        }

        // Update the original file reference
        Object.assign(this.file, newFile);
    }

    async abort() {
        this.buffer = [];
    }
}

/**
 * Export a project directory as a downloadable bundle
 * For non-Chromium browsers: creates a zip or JSON bundle
 * @param {AbstractDirectoryHandle} dirHandle
 * @param {string} projectName
 * @returns {Promise<Blob>}
 */
export async function exportProjectAsZip(dirHandle, projectName = 'project') {
    // Dynamically import JSZip if available, otherwise use JSON serialization
    // For now, we'll create a simple JSON bundle
    const projectBundle = {
        name: projectName,
        timestamp: new Date().toISOString(),
        files: {}
    };

    // Collect all files
    async function collectFiles(handle, prefix = '') {
        for await (const [name, entry] of await handle.entries()) {
            const fullPath = prefix ? `${prefix}/${name}` : name;
            
            if (entry.kind === 'file') {
                const fileHandle = await handle.getFileHandle(name);
                const file = await fileHandle.getFile();
                const buffer = await file.arrayBuffer();
                projectBundle.files[fullPath] = {
                    type: 'file',
                    mimeType: file.type,
                    size: file.size,
                    data: Array.from(new Uint8Array(buffer))
                };
            } else if (entry.kind === 'directory') {
                const subHandle = await handle.getDirectoryHandle(name);
                await collectFiles(subHandle, fullPath);
            }
        }
    }

    await collectFiles(dirHandle);

    // Return as JSON blob
    const jsonStr = JSON.stringify(projectBundle, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
}

/**
 * Download a blob to the user's computer
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Trigger a save dialog for non-native browsers
 * @param {AbstractDirectoryHandle} dirHandle
 * @param {string} projectName
 */
export async function triggerProjectExport(dirHandle, projectName = 'project') {
    try {
        const blob = await exportProjectAsZip(dirHandle, projectName);
        downloadBlob(blob, `${projectName}-export.json`);
    } catch (error) {
        console.error('Failed to export project:', error);
        throw error;
    }
}
