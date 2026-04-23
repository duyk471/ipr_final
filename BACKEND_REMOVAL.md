# Backend Storage Endpoints - Marked for Removal

## Summary

This document lists all backend endpoints related to project file storage that are now obsolete due to the local-first refactoring. These endpoints can be safely removed as the frontend now handles all file operations locally using the Web File System Access API.

## File: `backend/src/routes/projectRoutes.js`

### Endpoints to REMOVE

```javascript
// ✗ REMOVE THESE ENDPOINTS

router.get('/', getAllProjects);           // Project listing
router.post('/', createProject);           // Project creation
router.get('/:id', getProjectById);        // Project retrieval
router.put('/:id', updateProject);         // Project update (autosave)
router.delete('/:id', deleteProject);      // Project deletion

router.post('/import', importProject);     // ZIP import
router.post('/import-image', importImage); // Image import

router.get('/:id/export', exportProject);  // ZIP export

router.get('/:id/history', getHistory);    // History listing
router.post('/:id/history/restore', restoreHistory); // Snapshot restore
```

### Endpoints to KEEP

```javascript
// ✓ KEEP THESE ENDPOINTS (stateless operations)

// AI/ML operations still use backend
// POST /ai/generate-project
// POST /projects/:id/assets/remove-bg
// GET /assets/search
```

## File: `backend/src/controllers/projectController.js`

### Functions to REMOVE

```javascript
// ✗ REMOVE THESE FUNCTIONS

export const getAllProjects = async (req, res) => {
    // Lists projects from /storage/projects/ directory
    // Replaced by: frontend scanProjectsInWorkspace()
};

export const createProject = async (req, res) => {
    // Creates /storage/projects/{id}/ directory
    // Replaced by: frontend createProject() with local filesystem
};

export const getProjectById = async (req, res) => {
    // Reads /storage/projects/{id}/index.json
    // Replaced by: frontend getProjectByIdLocal()
};

export const updateProject = async (req, res) => {
    // Writes /storage/projects/{id}/index.json
    // Replaced by: frontend saveProjectState() with local filesystem
};

export const deleteProject = async (req, res) => {
    // Deletes /storage/projects/{id}/ directory
    // Replaced by: frontend deleteDirectory()
};

export const exportProject = async (req, res) => {
    // Zips /storage/projects/{id}/ directory
    // Can be replaced by: frontend implementation or removed if unused
};

export const importProject = async (req, res) => {
    // Extracts ZIP to /storage/projects/{newId}/
    // Replaced by: frontend project creation from uploaded file
};

export const importImage = async (req, res) => {
    // Creates project from uploaded image
    // Replaced by: frontend handleImportImage() in Dashboard
};

export const getHistory = async (req, res) => {
    // Lists files in /storage/projects/{id}/history/
    // Replaced by: frontend getProjectHistory()
};

export const restoreHistory = async (req, res) => {
    // Restores from /storage/projects/{id}/history/{date}.json
    // Replaced by: frontend snapshot restore logic
};
```

## File: `backend/src/services/storageService.js`

### Functions to REMOVE

```javascript
// ✗ REMOVE ALL FILE OPERATIONS - Replaced by local-first

export const ensureProjectDir = async (projectId) => {
    // No longer needed - frontend creates directories
};

export const createNewProject = async (name, width, height) => {
    // Replaced by: frontend useCanvasStore.createProject()
};

export const listProjects = async () => {
    // Replaced by: frontend scanProjectsInWorkspace()
};

export const getProject = async (projectId) => {
    // Replaced by: frontend getProjectByIdLocal()
};

export const saveProject = async (projectId, canvasState, previewBase64) => {
    // Replaced by: frontend useCanvasStore.saveProjectState()
};

export const removeProject = async (projectId) => {
    // Replaced by: frontend deleteDirectory()
};

export const exportProjectZip = async (projectId, res) => {
    // Can be removed or kept for optional server-side backup
};

export const importProjectFromZip = async (zipBuffer) => {
    // Project creation now happens in frontend
};

export const createProjectFromImage = async (imageBuffer, originalFilename) => {
    // Replaced by: frontend Dashboard.handleImportImage()
};

export const getProjectHistory = async (projectId) => {
    // Replaced by: frontend getProjectHistory()
};

export const restoreProjectHistory = async (projectId, dateString) => {
    // Replaced by: frontend snapshot restore
};
```

## File: `backend/src/routes/assetRoutes.js` (if exists)

### Endpoints to REMOVE

```javascript
// ✗ REMOVE ASSET UPLOAD ENDPOINTS

router.post('/:projectId/assets/upload', uploadAsset);  // Asset upload
router.post('/:projectId/assets/pasted', uploadPasted); // Clipboard paste

// ✓ KEEP - Stateless operations
router.post('/:projectId/assets/remove-bg', removeBackground); // Still uses backend
```

## Database/Storage to REMOVE

### Directory: `/ROOT/storage/projects/`

```
storage/
├── projects/
│   ├── {projectId-uuid-1}/
│   │   ├── index.json
│   │   ├── preview.png
│   │   ├── assets/
│   │   └── history/
│   ├── {projectId-uuid-2}/
│   └── ...
```

**Action**: 
1. Migrate existing projects to a backup location (for reference)
2. Delete `/storage/projects/` directory after migration period
3. Keep `/storage/` directory if used by other services

## Dependency Removal

Remove NPM packages that are no longer needed for file operations:

```bash
npm uninstall fs-extra archiver adm-zip
```

These packages were used for server-side file operations. If any other backend services use them, keep them installed.

## API Response Changes

### Before (Backend)
```javascript
// GET /api/projects
{
    success: true,
    projects: [
        {
            id: "uuid",
            name: "Project Name",
            updatedAt: "2024-01-15T10:00:00Z",
            previewUrl: "/storage/projects/uuid/preview.png"
        }
    ]
}
```

### After (Frontend - No API call)
Frontend loads projects directly from local filesystem without API.

## Migration Timeline

### Phase 1 (Current)
- Frontend uses local storage by default
- Backend endpoints still functional (for backward compatibility)
- Mark endpoints as deprecated in API documentation

### Phase 2 (Month 1)
- Add deprecation warnings to endpoints
- Log usage of deprecated endpoints
- Update API documentation

### Phase 3 (Month 2)
- Remove endpoints entirely
- Delete storage service
- Clean up file system code

## Verification Checklist

Before removing backend endpoints, verify:

- [x] Frontend successfully loads projects from local filesystem
- [x] Frontend successfully saves projects locally
- [x] Frontend handles image uploads locally
- [x] Frontend handles project deletion locally
- [x] All tests pass with local-first mode
- [ ] Stateless endpoints (AI, search) still working
- [ ] No client code still calling removed endpoints
- [ ] Database migrations completed (if using DB)
- [ ] Storage directory can be safely deleted
- [ ] Documentation updated

## Questions / Concerns

**Q: What about users with existing projects in backend storage?**
A: Provide a one-time migration tool or export feature to download projects as ZIP files.

**Q: Can we keep the backend for users who don't support Web File System API?**
A: Yes, implement feature detection and fallback to backend mode for unsupported browsers.

**Q: What if users want to upload projects to a server?**
A: Implement optional export feature. Keep it separate from core functionality.

**Q: How do we handle large file uploads?**
A: Local filesystem has user's disk space limits. For very large projects, users can manage multiple workspaces.

## References

- Migration Guide: `guide/src/LOCAL_FIRST_MIGRATION.md`
- Frontend Services Documentation
- Web File System Access API docs

## Support

For questions about backend removal:
1. Review the migration guide first
2. Check current frontend implementation
3. Test with multiple project sizes
4. Verify error handling
5. Plan gradual deprecation if needed
