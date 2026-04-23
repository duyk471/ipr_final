/**
 * IndexedDB Service - Manages persistent storage of FileSystemDirectoryHandle
 * This allows the app to remember the workspace and re-request permission on page reload
 */

const DB_NAME = 'photo-editor-workspace';
const DB_VERSION = 1;
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
 * Save a FileSystemDirectoryHandle to IndexedDB
 * @param {FileSystemDirectoryHandle} handle - The directory handle to save
 * @returns {Promise<void>}
 */
export const saveWorkspaceHandle = async (handle) => {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(handle, 'workspace-handle');

        request.onerror = () => {
            reject(new Error('Failed to save workspace handle'));
        };

        request.onsuccess = () => {
            resolve();
        };
    });
};

/**
 * Retrieve the saved FileSystemDirectoryHandle from IndexedDB
 * @returns {Promise<FileSystemDirectoryHandle|null>}
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
            resolve(request.result || null);
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
