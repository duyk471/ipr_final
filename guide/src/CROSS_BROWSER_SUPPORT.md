# Cross-Browser File System Support

## Overview

The photo editor now supports cross-browser file system access with graceful fallback for Firefox and Safari browsers that don't have native support for the File System Access API.

### Architecture

The implementation uses three layers:

1. **`browser-fs-access` library** - Provides a unified API that works across browsers
2. **`AbstractDirectoryHandle` & `AbstractFileHandle`** - Abstract wrapper classes that unify native and fallback implementations
3. **`localFilesystemService`** - Service layer that implements project CRUD operations

## Browser Support Matrix

| Browser | Storage Type | Features |
|---------|--------------|----------|
| Chrome/Edge 86+ | Native | ✅ Persistent handles, Auto-save, Direct read/write |
| Firefox 50+ | Fallback | ✅ In-session file operations, Manual export required |
| Safari 15+ | Fallback | ✅ In-session file operations, Manual export required |
| Older browsers | Unsupported | ❌ Falls back to backend API only |

## Implementation Details

### 1. Filesystem Abstraction Layer (`filesystemAbstractionLayer.js`)

This new module provides abstract wrapper classes that handle both native and fallback modes:

#### `AbstractDirectoryHandle`
- **Native mode (Chrome/Edge)**: Wraps `FileSystemDirectoryHandle` for persistent directory access
- **Fallback mode (Firefox/Safari)**: Wraps an array of `File` objects with path metadata

Key methods:
- `getDirectoryHandle(name)` - Get subdirectory
- `getFileHandle(name)` - Get file
- `entries()` - List directory contents
- `removeEntry(name)` - Delete file/directory
- `queryPermission()` / `requestPermission()` - Permission management

#### `AbstractFileHandle`
- **Native mode**: Wraps `FileSystemFileHandle`
- **Fallback mode**: Wraps `File` objects with buffering support

Key methods:
- `getFile()` - Get File object
- `createWritable()` - Create writable stream (mock in fallback)

#### Export Utilities
- `exportProjectAsZip()` - Serialize project to JSON bundle
- `downloadBlob()` - Trigger browser download
- `triggerProjectExport()` - Handle export workflow

### 2. Local Filesystem Service Refactor (`localFilesystemService.js`)

All functions now work with `AbstractDirectoryHandle` instead of native handles:

```javascript
// Old (Chromium-only)
const handle = await window.showDirectoryPicker();

// New (Cross-browser)
const handle = await requestWorkspaceDirectory();
// Returns AbstractDirectoryHandle on both native and fallback
```

#### API Changes

**Detection Functions:**
```javascript
isNativeFileSystemSupported()      // Native API available
isFileSystemAccessSupported()      // Any API available
isUsingNativePersistentStorage(handle) // Check handle type
```

**Workspace Management:**
```javascript
requestWorkspaceDirectory()        // Select workspace with UI picker
getWorkspaceDirectory()            // Load saved workspace
verifyPermission()                 // Check permissions
requestWorkspacePermission()       // Request permissions
```

**File Operations:**
```javascript
readJSONFile(dirHandle, fileName)
writeJSONFile(dirHandle, fileName, data)
readFileAsBlob(dirHandle, fileName)
writeFile(dirHandle, fileName, data)
```

**Project-specific:**
```javascript
exportProjectAsBundle(dirHandle, projectName)  // Manual export for fallback
createProjectDirectoryStructure(workspaceHandle, projectId)
getFileAsObjectURL(dirHandle, filePath)        // For canvas rendering
```

### 3. IndexedDB Service Updates (`indexedDBService.js`)

Enhanced to store both native handles and metadata:

```javascript
// New storage format
{
    handle: FileSystemDirectoryHandle | AbstractDirectoryHandle,
    isNative: boolean,
    savedAt: string
}
```

New functions:
```javascript
getWorkspaceHandleMetadata()  // Get handle type info
saveWorkspaceHandle(handle, isNative)  // Save with type
```

### 4. Canvas Store Enhancements (`useCanvasStore.js`)

New export-aware functions:

```javascript
saveAndExportProject(previewBase64)    // Save + export for non-native
hasNativePersistentStorage()           // Check browser capability
getStorageType()                       // Returns 'native' or 'fallback'
```

### 5. UI Updates (`Dashboard.jsx`)

#### Storage Type Badge
Shows current storage mode:
- ✅ **Native Storage** (Chromium) - Green badge
- ⚠️ **Fallback Mode** (Firefox/Safari) - Amber badge

#### Fallback Mode Banner
Informs users on Firefox/Safari about manual export workflow.

#### Updated Workspace Selection
- Shows storage type immediately after workspace selection
- Provides clear feedback about capabilities

## Workflow Differences by Browser

### Chrome/Edge (Native Persistent Storage)

1. User selects workspace folder
2. Handle stored in IndexedDB with `isNative: true`
3. App can read/write directly to disk
4. Changes persisted automatically
5. **No manual save/export needed**

```
┌─────────────────┐
│  User selects   │
│  workspace      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store native   │
│  handle in IDB  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Direct read/   │
│  write to disk  │
└─────────────────┘
```

### Firefox/Safari (Fallback File Array)

1. User selects workspace folder
2. `browser-fs-access` returns array of File objects
3. Wrapped in `AbstractDirectoryHandle` with `isNative: false`
4. Changes stored in memory during session
5. **User must export to persist changes**

```
┌─────────────────┐
│  User selects   │
│  workspace      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  browser-fs-access returns  │
│  File[] + AbstractHandle    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Changes stored in memory   │
│  (session duration only)    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  User clicks "Save & Export"│
│  → JSON bundle downloaded   │
└─────────────────────────────┘
```

## Export/Download Mechanism

For non-native browsers, projects are exported as JSON bundles:

```json
{
  "name": "My Project",
  "timestamp": "2026-04-24T12:34:56Z",
  "files": {
    "index.json": {
      "type": "file",
      "mimeType": "application/json",
      "size": 5000,
      "data": [...]
    },
    "assets/image.png": {
      "type": "file",
      "mimeType": "image/png",
      "size": 50000,
      "data": [...]
    },
    "history/2026-04-24.json": {
      "type": "file",
      "mimeType": "application/json",
      "size": 3000,
      "data": [...]
    }
  }
}
```

### Re-importing Exported Projects

When users import the exported JSON bundle:

1. Unpack the JSON structure
2. Recreate file hierarchy in workspace
3. Restore all project data including history
4. **Full round-trip compatibility** ✓

## Migration Path & Compatibility

### For Existing Chrome Users

- Existing projects continue to work with native persistent handles
- No migration needed
- Backward compatible with all operations

### For Firefox/Safari Users

- First-time setup: Select workspace, start editing
- Per-session workflow: Edit → Save & Export → Download
- Optional: Re-import exported projects in same session

### Data Structure Preservation

The implementation maintains the existing project structure:
```
workspace/
├── project-uuid-1/
│   ├── index.json
│   ├── preview.png
│   ├── assets/
│   │   ├── image1.png
│   │   └── image2.jpg
│   └── history/
│       ├── 2026-04-24.json
│       └── snapshot.json
└── project-uuid-2/
    └── ...
```

## Implementation Checklist

- ✅ Dependency integration (`browser-fs-access` added)
- ✅ Filesystem abstraction layer (`filesystemAbstractionLayer.js`)
- ✅ Service refactor (`localFilesystemService.js`)
- ✅ IndexedDB updates (`indexedDBService.js`)
- ✅ Canvas store enhancements (`useCanvasStore.js`)
- ✅ Dashboard UI updates
- ✅ Storage type detection & display
- ✅ Fallback mode information banner
- ✅ Export/download utilities
- ✅ Manual save & export workflow for non-native browsers

## Testing Recommendations

### Chrome/Edge
- [ ] Create project → Verify auto-save
- [ ] Reload page → Verify project loads
- [ ] Switch workspaces → Verify handle refresh
- [ ] Import ZIP → Verify import works

### Firefox/Safari
- [ ] Create project → Verify creation
- [ ] Edit project → Verify changes in memory
- [ ] Click "Save & Export" → Verify download
- [ ] Re-import JSON → Verify full restoration

### Cross-browser
- [ ] Fallback badge displays correctly
- [ ] Export doesn't error on Chrome
- [ ] Storage type detection works
- [ ] Graceful fallback if API unavailable

## API Reference

### Core Functions

```typescript
// Detection
isNativeFileSystemSupported(): boolean
isFileSystemAccessSupported(): boolean
isUsingNativePersistentStorage(handle: AbstractDirectoryHandle): boolean

// Workspace
requestWorkspaceDirectory(): Promise<AbstractDirectoryHandle>
getWorkspaceDirectory(): Promise<AbstractDirectoryHandle | null>
verifyPermission(handle: AbstractDirectoryHandle): Promise<boolean>
requestWorkspacePermission(handle: AbstractDirectoryHandle): Promise<boolean>

// File Operations
readJSONFile(dirHandle, fileName): Promise<Object>
writeJSONFile(dirHandle, fileName, data): Promise<void>
readFileAsBlob(dirHandle, fileName): Promise<Blob>
writeFile(dirHandle, fileName, data): Promise<void>
getFileAsObjectURL(dirHandle, filePath): Promise<string>

// Directory Operations
getSubdirectory(parentHandle, dirName, create): Promise<AbstractDirectoryHandle>
createProjectDirectoryStructure(workspaceHandle, projectId): Promise<AbstractDirectoryHandle>
listDirectory(dirHandle): Promise<Array>
directoryExists(dirHandle, dirName): Promise<boolean>
fileExists(dirHandle, fileName): Promise<boolean>
deleteDirectory(dirHandle, dirName): Promise<void>
deleteFile(dirHandle, fileName): Promise<void>

// Export
exportProjectAsBundle(dirHandle, projectName): Promise<void>
```

### Store Functions

```typescript
// Canvas Store
saveAndExportProject(previewBase64): Promise<void>
hasNativePersistentStorage(): boolean
getStorageType(): 'native' | 'fallback' | 'none'
```

## Troubleshooting

### Issue: "Your browser does not support file system access"

**Cause**: Browser doesn't support either native API or `browser-fs-access` fallback.

**Solution**: 
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Ensure HTTPS or localhost connection
- Check browser version support

### Issue: "Changes lost after page reload" (Firefox/Safari)

**Cause**: Fallback mode doesn't persist changes across sessions.

**Solution**:
- Explicitly click "Save & Export" before leaving
- Download the JSON bundle
- Re-import in next session if needed

### Issue: Export creates large JSON file

**Cause**: All file data including assets stored as base64 arrays.

**Solution**:
- This is expected for cross-browser compatibility
- Compress the JSON if needed before storing
- Consider ZIP alternative for large projects

## Future Enhancements

1. **ZIP Export**: Use JSZip library for compressed exports
2. **Cloud Sync**: Auto-backup to cloud storage for non-native browsers
3. **Import Optimization**: Streaming import for large projects
4. **Automatic Periodic Export**: Background save-to-download cycle
5. **Handle Persistence**: Improved cache & recovery for fallback mode

## References

- [browser-fs-access npm](https://www.npmjs.com/package/browser-fs-access)
- [File System Access API MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [Web Compatibility Index](https://caniuse.com/filesystem)

