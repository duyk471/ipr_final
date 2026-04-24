/**
 * IndexedDB Service - Manages persistent storage of workspace handles
 * Supports both native FileSystemDirectoryHandle and AbstractDirectoryHandle
 */

const DB_NAME = 'photo-editor-workspace';
const DB_VERSION = 2; // Bumped for new schema
const STORE_NAME = 'workspace';

let db = null;

/**
 * Initialize the IndexedDB database
 */
export const initIndexedDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };
    });
};

/**
 * Save a workspace handle to IndexedDB
 * Supports both native FileSystemDirectoryHandle and AbstractDirectoryHandle
 * @param {FileSystemDirectoryHandle|AbstractDirectoryHandle} handle - The directory handle to save
 * @param {boolean} isNative - Whether this is a native handle
 * @returns {Promise<void>}
 */
export const saveWorkspaceHandle = async (handle, isNative = false) => {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Extract the actual handle from AbstractDirectoryHandle wrapper if needed
        let actualHandle = handle;
        if (handle && typeof handle === 'object' && 'nativeHandle' in handle && handle.nativeHandle) {
            // It's an AbstractDirectoryHandle wrapping a native handle
            // Ensure nativeHandle is not an array (which can happen with browser-fs-access directoryOpen)
            if (!Array.isArray(handle.nativeHandle)) {
                actualHandle = handle.nativeHandle;
            }
        }
        // Note: For fallback mode (AbstractDirectoryHandle with file array), we don't save the files
        // They can't be persisted across sessions anyway

        // Store both the handle and metadata about its type
        const handleData = {
            handle: actualHandle,
            isNative,
            savedAt: new Date().toISOString(),
        };

        const request = store.put(handleData, 'workspace-handle');

        request.onerror = () => {
            reject(new Error('Failed to save workspace handle'));
        };

        request.onsuccess = () => {
            resolve();
        };
    });
};

/**
 * Retrieve the saved workspace handle from IndexedDB
 * @returns {Promise<FileSystemDirectoryHandle|AbstractDirectoryHandle|null>}
 */
export const getWorkspaceHandle = async () => {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('workspace-handle');

        request.onerror = () => {
            reject(new Error('Failed to retrieve workspace handle'));
        };

        request.onsuccess = () => {
            const result = request.result;
            if (result) {
                // Return just the handle, not the wrapper
                resolve(result.handle);
            } else {
                resolve(null);
            }
        };
    });
};

/**
 * Get handle metadata (including isNative flag)
 * @returns {Promise<Object|null>}
 */
export const getWorkspaceHandleMetadata = async () => {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('workspace-handle');

        request.onerror = () => {
            reject(new Error('Failed to retrieve workspace handle metadata'));
        };

        request.onsuccess = () => {
            const result = request.result;
            resolve(result || null);
        };
    });
};

/**
 * Clear the saved workspace handle from IndexedDB
 * @returns {Promise<void>}
 */
export const clearWorkspaceHandle = async () => {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete('workspace-handle');

        request.onerror = () => {
            reject(new Error('Failed to clear workspace handle'));
        };

        request.onsuccess = () => {
            resolve();
        };
    });
};

/**
 * Save workspace metadata (path, name, etc.)
 * @param {Object} metadata - Workspace metadata
 * @returns {Promise<void>}
 */
export const saveWorkspaceMetadata = async (metadata) => {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(metadata, 'workspace-metadata');

        request.onerror = () => {
            reject(new Error('Failed to save workspace metadata'));
        };

        request.onsuccess = () => {
            resolve();
        };
    });
};

/**
 * Retrieve workspace metadata
 * @returns {Promise<Object|null>}
 */
export const getWorkspaceMetadata = async () => {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('workspace-metadata');

        request.onerror = () => {
            reject(new Error('Failed to retrieve workspace metadata'));
        };

        request.onsuccess = () => {
            resolve(request.result || null);
        };
    });
};
