/**
 * IndexedDB Service - Manages persistent storage of workspace handles
 * Supports both native FileSystemDirectoryHandle and AbstractDirectoryHandle
 */

const DB_NAME = 'photo-editor-workspace';
const DB_VERSION = 3; // Bumped for write locks support
const STORE_NAME = 'workspace';
const LOCKS_STORE = 'write-locks';

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
            if (!database.objectStoreNames.contains(LOCKS_STORE)) {
                database.createObjectStore(LOCKS_STORE);
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
/**
 * Clear workspace metadata
 * @returns {Promise<void>}
 */
export const clearWorkspaceMetadata = async () => {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete('workspace-metadata');

        request.onerror = () => {
            reject(new Error('Failed to clear workspace metadata'));
        };

        request.onsuccess = () => {
            resolve();
        };
    });
};

/**
 * Write lock mechanism to prevent race conditions during concurrent file writes
 * Stores lock state: { projectId, locked: boolean, lockTime: ISO timestamp }
 */

/**
 * Ensure locks store exists
 */
const ensureLocksStore = () => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        // If the store exists, resolve. Otherwise, retry after upgrade
        if (!db.objectStoreNames.contains(LOCKS_STORE)) {
            db.close();
            db = null;
            
            const request = indexedDB.open(DB_NAME, DB_VERSION + 1);
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(LOCKS_STORE)) {
                    database.createObjectStore(LOCKS_STORE);
                }
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME);
                }
            };
            
            request.onsuccess = () => {
                db = request.result;
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error('Failed to upgrade database'));
            };
        } else {
            resolve();
        }
    });
};

/**
 * Acquire a write lock for a project (blocks until lock is acquired)
 * @param {string} projectId - Project identifier
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<void>}
 */
export const acquireWriteLock = async (projectId, timeout = 10000) => {
    if (!db) {
        await initIndexedDB();
    }

    const startTime = Date.now();
    const LOCK_TIMEOUT = 30000; // 30 seconds - consider lock stale after this
    
    while (Date.now() - startTime < timeout) {
        try {
            const lock = await getWriteLock(projectId);
            
            // Check if lock exists and is still valid
            if (lock && lock.locked) {
                const lockAge = Date.now() - new Date(lock.lockTime).getTime();
                if (lockAge < LOCK_TIMEOUT) {
                    // Lock is held by another process, wait and retry
                    await new Promise(resolve => setTimeout(resolve, 50));
                    continue;
                }
                // Lock is stale, override it
                console.warn(`Overriding stale write lock for project '${projectId}' (${lockAge}ms old)`);
            }

            // Acquire the lock
            await setWriteLock(projectId, true);
            return;
        } catch (error) {
            console.error(`Error acquiring write lock for project '${projectId}':`, error);
            throw error;
        }
    }

    throw new Error(`Failed to acquire write lock for project '${projectId}' within ${timeout}ms`);
};

/**
 * Release a write lock for a project
 * @param {string} projectId - Project identifier
 * @returns {Promise<void>}
 */
export const releaseWriteLock = async (projectId) => {
    if (!db) {
        await initIndexedDB();
    }

    return setWriteLock(projectId, false);
};

/**
 * Get current write lock state
 * @param {string} projectId - Project identifier
 * @returns {Promise<Object|null>} Lock object or null
 */
const getWriteLock = async (projectId) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([LOCKS_STORE], 'readonly');
        const store = transaction.objectStore(LOCKS_STORE);
        const request = store.get(`lock-${projectId}`);

        request.onerror = () => {
            reject(new Error(`Failed to get write lock for project '${projectId}'`));
        };

        request.onsuccess = () => {
            resolve(request.result || null);
        };
    });
};

/**
 * Set write lock state
 * @param {string} projectId - Project identifier
 * @param {boolean} locked - Lock state
 * @returns {Promise<void>}
 */
const setWriteLock = async (projectId, locked) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([LOCKS_STORE], 'readwrite');
        const store = transaction.objectStore(LOCKS_STORE);
        
        const lockData = {
            projectId,
            locked,
            lockTime: new Date().toISOString(),
        };

        const request = store.put(lockData, `lock-${projectId}`);

        request.onerror = () => {
            reject(new Error(`Failed to set write lock for project '${projectId}'`));
        };

        request.onsuccess = () => {
            resolve();
        };
    });
};
