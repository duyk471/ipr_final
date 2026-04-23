# Local-First Refactoring - Migration Guide

## Overview

This application has been refactored to use **Web File System Access API** for local-first storage instead of storing project files on the backend server. All project data, assets, and previews are now saved directly to the user's local filesystem.

## Architecture Changes

### Before (Backend-Dependent)
- Projects saved to: `/ROOT/storage/projects/{projectId}/`
- API calls for all CRUD operations
- Backend file I/O operations
- Asset uploads through multipart forms

### After (Local-First)
- Projects saved to: `user-selected-directory/{projectId}/`
- Browser-based file system access via Web File System Access API
- IndexedDB persistence for workspace handle
- Direct local file I/O through browser APIs

## New Frontend Services

### 1. **indexedDBService.js**
Manages persistent storage of FileSystemDirectoryHandle in IndexedDB.

**Key Functions:**
- `initIndexedDB()` - Initialize database
- `saveWorkspaceHandle(handle)` - Save directory handle for persistence
- `getWorkspaceHandle()` - Retrieve saved handle
- `saveWorkspaceMetadata(metadata)` - Store workspace info
- `getWorkspaceMetadata()` - Retrieve metadata

**Usage:**
```javascript
import { saveWorkspaceHandle, getWorkspaceHandle } from './services/indexedDBService';

const handle = await window.showDirectoryPicker();
await saveWorkspaceHandle(handle);

// Later, retrieve without re-prompting
const savedHandle = await getWorkspaceHandle();
```

### 2. **localFilesystemService.js**
Abstracts Web File System Access API for file operations.

**Key Functions:**
- `getWorkspaceDirectory()` - Get or request workspace handle
- `readJSONFile(dirHandle, fileName)` - Read JSON files
- `writeJSONFile(dirHandle, fileName, data)` - Write JSON files
- `writeFile(dirHandle, fileName, data)` - Write binary files
- `listDirectory(dirHandle)` - List directory contents
- `createProjectDirectoryStructure(workspaceHandle, projectId)` - Create project folders
- `getFileAsObjectURL(dirHandle, filePath)` - Convert files to Object URLs

**Usage:**
```javascript
import {
    getWorkspaceDirectory,
    readJSONFile,
    writeJSONFile,
    getFileAsObjectURL
} from './services/localFilesystemService';

const workspace = await getWorkspaceDirectory();
const projectData = await readJSONFile(workspace, 'index.json');
const imageUrl = await getFileAsObjectURL(workspace, 'assets/image.png');
```

### 3. **projectScannerService.js**
Scans local workspace for valid projects (those containing index.json).

**Key Functions:**
- `scanProjectsInWorkspace(workspaceHandle)` - Find all projects
- `loadProjectMetadata(projectHandle)` - Read project info
- `getProjectByIdLocal(workspaceHandle, projectId)` - Load specific project
- `getProjectHistory(projectHandle)` - List history snapshots
- `getProjectAssets(projectHandle)` - List assets in project

**Usage:**
```javascript
import { scanProjectsInWorkspace, getProjectByIdLocal } from './services/projectScannerService';

const projects = await scanProjectsInWorkspace(workspaceHandle);
const project = await getProjectByIdLocal(workspaceHandle, projectId);
```

### 4. **localAssetService.js** (New)
Handles asset uploads and downloads in local projects.

**Key Functions:**
- `uploadLocalAsset(file)` - Upload image to project assets
- `uploadMultipleAssets(files)` - Batch upload
- `uploadPastedImage(imageBlob)` - Handle clipboard paste
- `uploadCanvasImage(canvasDataUrl, fileName)` - Save canvas exports
- `getAssetUrl(relativePath)` - Get Object URL for display

**Usage:**
```javascript
import { uploadLocalAsset } from './services/localAssetService';

const assetInfo = await uploadLocalAsset(imageFile);
// Returns: { path: 'assets/image.png', url: 'blob:...', displayUrl: '...' }
```

## Updated Components

### Dashboard.jsx
- **Workspace Selection**: Shows directory picker on first load
- **Project Loading**: Uses `scanProjectsInWorkspace()` instead of API
- **Project Creation**: Uses local `createProject()` method
- **Project Deletion**: Uses `deleteDirectory()` from localFilesystemService
- **Image Import**: Downloads to local assets folder

### Editor.jsx
- **Workspace Initialization**: Auto-initializes workspace on load
- **Asset Cleanup**: Revokes Object URLs on unmount (prevents memory leaks)
- **Project Fetching**: Uses local filesystem instead of API

### FabricCanvas.jsx
- **Image URL Resolution**: Handles Object URLs (blob:) and relative paths
- **Asset Metadata**: Stores original paths in layer metadata for serialization
- **Cross-Origin**: All local files can skip CORS restrictions

### ImageLibraryPanel.jsx
- **External Images**: Downloads and saves to local assets when selected
- **Asset URLs**: Uses Object URLs for display
- **Local Path Storage**: Maintains relative paths for serialization

## Updated Store (useCanvasStore.js)

### New State
```javascript
{
    workspaceHandle: FileSystemDirectoryHandle,
    workspaceInitialized: boolean,
    currentProjectHandle: FileSystemDirectoryHandle,
    assetUrlMap: { [path]: objectUrl }, // Cache for Object URLs
}
```

### New Methods
- `initializeWorkspace()` - Initialize or retrieve workspace
- `selectWorkspace()` - Request new workspace directory
- `createProject(name, width, height)` - Create locally
- `saveAssetToProject(file)` - Upload to assets folder
- `getAssetObjectUrl(relativePath)` - Get cached or create Object URL
- `cleanupAssetUrls()` - Revoke all Object URLs
- `fetchProjects()` - Scan workspace for projects

### Updated Methods
- `fetchProject(projectId)` - Loads from local filesystem
- `saveProjectState(previewBase64)` - Saves to local files

## Backend Endpoints for Removal/Deprecation

The following backend endpoints are now obsolete and can be removed or deprecated:

### Storage Endpoints (Routes: `/api/projects`)

**✗ REMOVE - File Storage Operations**
```
GET    /api/projects                 - List projects (use local scan)
POST   /api/projects                 - Create project (use local create)
GET    /api/projects/:id             - Get project (use local read)
PUT    /api/projects/:id             - Update project (use local save)
DELETE /api/projects/:id             - Delete project (use local delete)
```

**✗ REMOVE - Asset Upload**
```
POST   /api/projects/:id/assets/upload - Upload assets (save locally)
POST   /api/projects/:id/assets/pasted - Paste handler (save locally)
POST   /api/projects/:id/assets/remove-bg - BG removal still uses backend
```

**✗ REMOVE - Import/Export**
```
POST   /api/projects/import          - ZIP import (use local create)
POST   /api/projects/import-image    - Image import (save locally)
GET    /api/projects/:id/export      - ZIP export (implement locally)
```

**✗ REMOVE - History**
```
GET    /api/projects/:id/history     - Get snapshots (use local read)
POST   /api/projects/:id/history/restore - Restore (use local copy)
```

### Keep These Endpoints (Stateless Operations)

**✓ KEEP - AI Processing**
```
POST   /ai/generate-project          - Generate design from prompt
POST   /projects/:id/assets/remove-bg - Remove background (GPU/ML)
GET    /assets/search          The Web File System Access API requires:
- Chrome/Edge 86+
- Firefox 111+ (behind flag)
- Safari 15.1+ (partial support)
      - Search for images (API proxy)
```

## Migration Checklist

- [x] Create IndexedDB service for workspace persistence
- [x] Create local filesystem service abstraction
- [x] Create project scanner utility
- [x] Refactor useCanvasStore for local storage
- [x] Update FabricCanvas image URL handling
- [x] Update Dashboard for workspace selection
- [x] Update Editor for workspace initialization
- [x] Implement local asset uploads
- [x] Update ImageLibraryPanel asset handling
- [ ] Remove storage endpoints from backend
- [ ] Implement browser support detection
- [ ] Add offline mode indicator
- [ ] Create backup/export feature
- [ ] Handle permission revocation gracefully

## Browser Compatibility

The Web File System Access API requires:
- Chrome/Edge 86+
- Firefox 111+ (behind flag)
- Safari 15.1+ (partial support)

**Fallback Strategy:**
Users on unsupported browsers should be directed to use the zip export/import feature.

```javascript
// Check support
if ('showDirectoryPicker' in window) {
    // Use local-first mode
} else {
    // Show legacy backend mode or unsupported message
}
```

## Performance Improvements

### Before (Backend)
- Upload latency: Network round-trip
- Storage limits: Server quota
- Concurrent operations: Limited by API rate

### After (Local-First)
- Save latency: Instant (OS filesystem)
- Storage limits: User's disk space
- Concurrent operations: Unlimited (no network contention)

## Data Structure

### Project Directory Layout
```
workspace/
├── {projectId-uuid}/
│   ├── index.json              # Project metadata & layers
│   ├── preview.png             # Thumbnail image
│   ├── assets/                 # Images added to canvas
│   │   ├── image1.png
│   │   ├── image2.jpg
│   │   └── ...
│   └── history/                # Daily snapshots
│       ├── 2024-01-15.json
│       ├── 2024-01-16.json
│       └── ...
└── {...more projects}
```

### index.json Structure
```json
{
    "version": "1.0",
    "projectInfo": {
        "id": "uuid",
        "name": "Project Name",
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T15:30:00Z",
        "previewUrl": "preview.png"
    },
    "canvas": {
        "width": 1080,
        "height": 1080,
        "backgroundColor": "#ffffff"
    },
    "layers": [
        {
            "type": "Image",
            "src": "assets/image.png",  // Relative paths for portability
            "left": 100,
            "top": 100,
            "scaleX": 1,
            "scaleY": 1
        }
    ],
    "history": {
        "undoStack": [],
        "redoStack": []
    }
}
```

## Security Considerations

### Web File System Access
- Requires explicit user permission via `showDirectoryPicker()`
- Permissions are per-directory (users choose exactly where to save)
- Permissions can be revoked by users in browser settings
- No access to system directories or other user files

### Data Privacy
- All data stays on user's device
- No data transmitted to servers (except stateless AI operations)
- No server logs of project contents
- Users can verify with dev tools/file inspector

## Troubleshooting

### "Permission Denied" Error
- User rejected directory access
- Solution: Click "Workspace" button and select directory again

### Object URLs Not Displaying
- Browser memory pressure or tab closed
- Solution: Refresh and re-select workspace

### Performance Issues with Large Projects
- Too many large images in memory as Object URLs
- Solution: Close other tabs, refresh editor

## Future Enhancements

1. **Cloud Sync** (optional)
   - Allow users to optionally sync projects to cloud storage
   - Keep local-first as default

2. **Collaborative Editing**
   - Share project directories via web share targets
   - Real-time sync using Service Workers

3. **Template System**
   - Pre-built project templates stored locally or synced
   - Quick project creation from templates

4. **Advanced Export**
   - Multi-format export (PSD, SVG, PDF)
   - Batch export multiple projects

5. **Performance Monitoring**
   - Usage statistics (storage used, projects created, etc.)
   - Performance metrics collection

## References

- [Web File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [Blob and File handling](https://developer.mozilla.org/en-US/docs/Web/API/Blob)

## Support

For issues or questions:
1. Check browser compatibility
2. Review browser console for error messages
3. Verify directory permissions in browser settings
4. Try with a different directory
5. Clear browser cache and refresh
