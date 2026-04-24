# Cross-Browser File System - Developer Quick Reference

## What Changed?

The file system access has been abstracted to work across all modern browsers. Instead of using the native `FileSystemDirectoryHandle` directly, all code now uses `AbstractDirectoryHandle` which works on both Chrome (persistent) and Firefox/Safari (session-based).

## Quick Start for Developers

### Working with Directories

```javascript
import {
    requestWorkspaceDirectory,
    getWorkspaceDirectory,
    getSubdirectory,
    createProjectDirectoryStructure
} from '@/services/localFilesystemService';

// Request new workspace (same API, works everywhere)
const workspaceHandle = await requestWorkspaceDirectory();

// Get saved workspace
const handle = await getWorkspaceDirectory();

// Navigate to subdirectory
const assetsDir = await getSubdirectory(projectHandle, 'assets', true);

// Create full project structure
const projectDir = await createProjectDirectoryStructure(workspaceHandle, projectId);
```

### Working with Files

```javascript
import {
    readJSONFile,
    writeJSONFile,
    readFileAsBlob,
    writeFile,
    getFileAsObjectURL
} from '@/services/localFilesystemService';

// Read JSON (works everywhere)
const projectData = await readJSONFile(projectHandle, 'index.json');

// Write JSON (works everywhere)
await writeJSONFile(projectHandle, 'index.json', myData);

// Read file as Blob
const fileBlob = await readFileAsBlob(assetsDir, 'image.png');

// Write arbitrary file
await writeFile(assetsDir, 'image.png', blobData);

// Get Object URL for canvas
const url = await getFileAsObjectURL(projectHandle, 'assets/image.png');
```

### Checking Browser Capabilities

```javascript
import {
    isFileSystemAccessSupported,
    isNativeFileSystemSupported,
    isUsingNativePersistentStorage
} from '@/services/localFilesystemService';

// Check if any file system API available
if (!isFileSystemAccessSupported()) {
    throw new Error('Browser not supported');
}

// Check for native API (Chrome/Edge)
if (isNativeFileSystemSupported()) {
    // Can use native features
}

// Check current handle type
if (isUsingNativePersistentStorage(handle)) {
    // Handle is persistent (Chrome/Edge)
    // Changes auto-saved
} else {
    // Handle is session-based (Firefox/Safari)
    // Need manual export
}
```

### Handling Exports for Non-Native Browsers

```javascript
import { exportProjectAsBundle } from '@/services/localFilesystemService';

// If on Firefox/Safari, automatically export
const { saveAndExportProject } = useCanvasStore.getState();
await saveAndExportProject(previewImage);
```

## Common Patterns

### Pattern 1: Creating a New Project

```javascript
async function createNewProject(name) {
    const { workspaceHandle } = useCanvasStore.getState();
    
    // Get workspace
    if (!workspaceHandle) {
        throw new Error('No workspace selected');
    }
    
    // Create structure
    const projectId = generateUUID();
    const projectHandle = await createProjectDirectoryStructure(
        workspaceHandle,
        projectId
    );
    
    // Create index.json
    const projectData = {
        projectInfo: { id: projectId, name },
        canvas: { width: 1080, height: 1080 },
        layers: []
    };
    
    await writeJSONFile(projectHandle, 'index.json', projectData);
    
    return projectData;
}
```

### Pattern 2: Saving Project (with Export)

```javascript
async function saveProject(previewImage) {
    const { currentProject, canvasData, currentProjectHandle } = 
        useCanvasStore.getState();
    
    // Prepare data
    const processed = stripObjectUrls(canvasData);
    processed.projectInfo.updatedAt = new Date().toISOString();
    
    // Save
    await writeJSONFile(currentProjectHandle, 'index.json', processed);
    
    // If fallback mode, trigger export
    if (!isUsingNativePersistentStorage(currentProjectHandle)) {
        await exportProjectAsBundle(currentProjectHandle, currentProject.name);
    }
}
```

### Pattern 3: Loading Assets for Canvas

```javascript
async function loadProjectAssets(projectHandle) {
    const urlMap = {};
    
    // Get assets directory
    const assetsDir = await getSubdirectory(projectHandle, 'assets', false);
    
    // Load all images
    const entries = await listDirectory(assetsDir);
    
    for (const entry of entries) {
        if (entry.kind === 'file') {
            const url = await getFileAsObjectURL(
                projectHandle,
                `assets/${entry.name}`
            );
            urlMap[entry.name] = url;
        }
    }
    
    return urlMap;
}
```

### Pattern 4: Uploading Files

```javascript
async function uploadAsset(file) {
    const { currentProjectHandle } = useCanvasStore.getState();
    
    // Get assets directory
    const assetsDir = await getSubdirectory(
        currentProjectHandle,
        'assets',
        true // create if not exists
    );
    
    // Write file
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(assetsDir, file.name, arrayBuffer);
    
    // Get URL for immediate preview
    const url = await getFileAsObjectURL(
        currentProjectHandle,
        `assets/${file.name}`
    );
    
    return { path: `assets/${file.name}`, url };
}
```

## Important: Handle Typing

All functions accept **both**:
- Native `FileSystemDirectoryHandle` (Chrome/Edge)
- `AbstractDirectoryHandle` (works everywhere)

The abstraction layer handles the difference internally:

```javascript
// All of these work the same way:
const handle1 = await getWorkspaceDirectory();           // AbstractDirectoryHandle
const data1 = await readJSONFile(handle1, 'file.json'); // ✓ Works

const handle2 = new AbstractDirectoryHandle(nativeHandle); // Also AbstractDirectoryHandle
const data2 = await readJSONFile(handle2, 'file.json'); // ✓ Works
```

## Error Handling

### Permission Errors (Chrome/Edge)

```javascript
try {
    const handle = await requestWorkspaceDirectory();
} catch (error) {
    if (error.name === 'AbortError') {
        // User cancelled the picker
    } else if (error.message.includes('not granted')) {
        // Permission denied - need to request again
        await requestWorkspacePermission(savedHandle);
    }
}
```

### Browser Not Supported

```javascript
if (!isFileSystemAccessSupported()) {
    // Fallback to backend API or show "use modern browser" message
    useBackendAPI();
}
```

### File Not Found

```javascript
const exists = await fileExists(dirHandle, 'myfile.json');
if (!exists) {
    // Handle missing file
}
```

## Testing Across Browsers

### Chrome/Edge Testing

```bash
# Should use native API, show "Native Storage" badge
npm run dev
# Connect workspace → check DevTools for native handles
```

### Firefox Testing

```bash
# Should use fallback, show "Fallback Mode" badge
npm run dev
# Connect workspace → operations use File arrays
# Create project → "Save & Export" button appears
```

### Safari Testing

```bash
# Should use fallback (same as Firefox)
npm run dev
# Connect workspace → operations use File arrays
```

## Migration Guide for Existing Code

If you have existing code using native handles directly:

### Before (Chromium-only)

```javascript
const handle = await window.showDirectoryPicker();
const file = await handle.getFileHandle('data.json');
const fileObj = await file.getFile();
const text = await fileObj.text();
```

### After (Cross-browser)

```javascript
// Same code, but handle might be abstract
const handle = await requestWorkspaceDirectory();
const file = await handle.getFileHandle('data.json');
const fileObj = await file.getFile();
const text = await fileObj.text();
// ✓ Works on Chrome, Firefox, Safari
```

**No code changes needed** - the abstraction is transparent!

## Performance Tips

### For Native (Chrome/Edge)
- ✅ Direct write/read - very fast
- ✅ Use for frequent saves
- ✅ No memory concerns

### For Fallback (Firefox/Safari)
- ⚠️ All data in memory
- ⚠️ Export adds 1.33x size (base64 encoding)
- ⚠️ Large projects (>50MB) may hit memory limits

**Optimization**:
```javascript
// Compress before export on fallback
if (!isUsingNativePersistentStorage(handle)) {
    // Consider zip compression
    // Or upload to cloud instead
}
```

## Debugging

### Check Storage Type

```javascript
// In DevTools console
const { workspaceHandle } = useCanvasStore.getState();
console.log('Is native?', workspaceHandle?.isNative);
console.log('Is fallback?', !workspaceHandle?.isNative);
```

### Inspect Handle Structure

```javascript
// Native (Chrome)
{
  nativeHandle: FileSystemDirectoryHandle,
  isNative: true,
  name: 'workspace'
}

// Fallback (Firefox)
{
  files: File[], // Array of File objects with .path property
  isNative: false,
  name: 'workspace'
}
```

### Check IndexedDB Storage

```javascript
// Browser DevTools → Application → IndexedDB → photo-editor-workspace
// You'll see:
// - workspace-handle: Contains handle object + metadata
// - workspace-metadata: Contains isNative flag, selectedAt timestamp
```

## Troubleshooting

### Issue: "Handle is null on page reload"

**Firefox/Safari**: Expected! Fallback mode doesn't persist handles.

**Chrome**: May need to request permission again.

**Solution**:
```javascript
const handle = await getWorkspaceDirectory();
if (!handle) {
    // Prompt user to reconnect
    const newHandle = await requestWorkspaceDirectory();
}
```

### Issue: Large exports timing out

**Cause**: Serializing large projects to base64.

**Solution**:
```javascript
// On fallback mode, implement chunked export
if (!isUsingNativePersistentStorage(handle)) {
    // Split into multiple files
    // Or use ZIP compression
}
```

### Issue: Memory error on large imports

**Cause**: Fallback mode keeps all files in memory.

**Solution**:
```javascript
// Limit project size for fallback users
if (!isNativeFileSystemSupported()) {
    MAX_PROJECT_SIZE = 10 * 1024 * 1024; // 10MB
} else {
    MAX_PROJECT_SIZE = 100 * 1024 * 1024; // 100MB
}
```

## Further Reading

- [CROSS_BROWSER_SUPPORT.md](./guide/src/CROSS_BROWSER_SUPPORT.md) - Full architecture docs
- [filesystemAbstractionLayer.js](./frontend/src/services/filesystemAbstractionLayer.js) - Implementation
- [localFilesystemService.js](./frontend/src/services/localFilesystemService.js) - Public API
- [browser-fs-access NPM](https://www.npmjs.com/package/browser-fs-access)

