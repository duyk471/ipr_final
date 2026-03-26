import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT = path.join(__dirname, '../../../storage');
const PROJECTS_DIR = path.join(STORAGE_ROOT, 'projects');

export const ensureProjectDir = async (projectId) => {
    const projectPath = path.join(PROJECTS_DIR, projectId);
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, 'assets'));
    return projectPath;
};

export const createNewProject = async (name, width, height) => {
    const projectId = uuidv4();
    const projectPath = await ensureProjectDir(projectId);

    const now = new Date().toISOString();
    const initialData = {
        version: "1.0",
        projectInfo: {
            id: projectId,
            name: name || `Project ${projectId.substring(0, 8)}`,
            createdAt: now,
            updatedAt: now,
            previewUrl: "preview.png"
        },
        canvas: {
            width: width || 1080,
            height: height || 1080,
            backgroundColor: "#ffffff",
            backgroundImage: null,
            zoom: 1,
            viewportTransform: [1, 0, 0, 1, 0, 0]
        },
        layers: [],
        history: {
            undoStack: [],
            redoStack: []
        }
    };

    await fs.writeJson(path.join(projectPath, 'index.json'), initialData, { spaces: 2 });

    // Create an empty preview.png or copy a default one
    // For MVP we just leave it empty or missing until first save
    return initialData;
};

export const listProjects = async () => {
    await fs.ensureDir(PROJECTS_DIR);
    const dirs = await fs.readdir(PROJECTS_DIR);
    const projects = [];

    for (const dir of dirs) {
        const indexPath = path.join(PROJECTS_DIR, dir, 'index.json');
        if (await fs.pathExists(indexPath)) {
            const data = await fs.readJson(indexPath);
            projects.push({
                id: data.projectInfo.id,
                name: data.projectInfo.name,
                updatedAt: data.projectInfo.updatedAt,
                previewUrl: `/storage/projects/${dir}/preview.png`
            });
        }
    }

    // Sort by updatedAt descending
    return projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

export const getProject = async (projectId) => {
    const indexPath = path.join(PROJECTS_DIR, projectId, 'index.json');
    if (!(await fs.pathExists(indexPath))) {
        throw new Error('Project not found');
    }
    return await fs.readJson(indexPath);
};

export const saveProject = async (projectId, canvasState, previewBase64) => {
    const projectPath = path.join(PROJECTS_DIR, projectId);
    const indexPath = path.join(projectPath, 'index.json');

    if (!(await fs.pathExists(indexPath))) {
        throw new Error('Project not found');
    }

    const data = await fs.readJson(indexPath);
    
    // Process layers to ensure relative paths for local assets
    const processedLayers = (canvasState.layers || data.layers).map(layer => {
        if ((layer.type === 'Image' || layer.type === 'image') && layer.src && typeof layer.src === 'string') {
            // Match absolute or root-relative project path:
            // (http://localhost:5000)?/storage/projects/UUID/assets/filename.png
            const storageRegex = new RegExp(`^(https?://[^/]+)?/storage/projects/${projectId}/`, 'i');
            layer.src = layer.src.replace(storageRegex, '');
            
            // Optional: Strip cache-busting query params (?, &t=...) for a cleaner index.json
            layer.src = layer.src.split('?')[0];
        }
        return layer;
    });

    data.canvas = canvasState.canvas || data.canvas;
    data.layers = processedLayers;
    data.projectInfo.updatedAt = new Date().toISOString();

    if (canvasState.projectInfo && canvasState.projectInfo.name) {
        data.projectInfo.name = canvasState.projectInfo.name;
    }

    await fs.writeJson(indexPath, data, { spaces: 2 });

    if (previewBase64) {
        // Expected format: data:image/png;base64,...
        const base64Data = previewBase64.replace(/^data:image\/\w+;base64,/, "");
        const previewPath = path.join(projectPath, 'preview.png');
        await fs.writeFile(previewPath, base64Data, 'base64');
    }

    return data;
};

export const removeProject = async (projectId) => {
    const projectPath = path.join(PROJECTS_DIR, projectId);
    await fs.remove(projectPath);
};

export const exportProjectZip = async (projectId, res) => {
    const projectPath = path.join(PROJECTS_DIR, projectId);
    if (!(await fs.pathExists(projectPath))) {
        throw new Error('Project not found');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment(`${projectId}.zip`);
    archive.pipe(res);
    archive.directory(projectPath, false);
    await archive.finalize();
};

export const importProjectFromZip = async (zipBuffer) => {
    const zip = new AdmZip(zipBuffer);
    const tempId = `temp_${Date.now()}`;
    const tempPath = path.join(PROJECTS_DIR, tempId);

    await fs.ensureDir(tempPath);
    zip.extractAllTo(tempPath, true);

    const indexPath = path.join(tempPath, 'index.json');
    if (!(await fs.pathExists(indexPath))) {
        await fs.remove(tempPath);
        throw new Error('Invalid project zip: Missing index.json');
    }

    const data = await fs.readJson(indexPath);
    if (!data.projectInfo || !data.projectInfo.name) {
        await fs.remove(tempPath);
        throw new Error('Invalid project zip: Malformed index.json');
    }

    const newProjectId = uuidv4();
    const newProjectPath = path.join(PROJECTS_DIR, newProjectId);

    await fs.move(tempPath, newProjectPath);

    // Strip absolute project paths to make them relative to the new project root
    const pathPattern = /\/storage\/projects\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//g;
    const httpPrefixPattern = /http:\/\/localhost:5000/g;
    
    let jsonString = JSON.stringify(data);
    jsonString = jsonString.replace(httpPrefixPattern, ''); // Remove http prefix if present
    jsonString = jsonString.replace(pathPattern, ''); // Make assets/... relative
    
    const updatedData = JSON.parse(jsonString);

    // Ensure project info is fresh and matches the new folder ID
    updatedData.projectInfo.id = newProjectId;
    updatedData.projectInfo.createdAt = new Date().toISOString();
    updatedData.projectInfo.updatedAt = new Date().toISOString();

    await fs.writeJson(path.join(newProjectPath, 'index.json'), updatedData, { spaces: 2 });

    return updatedData;
};

export const createProjectFromImage = async (imageBuffer, originalFilename) => {
    const projectId = uuidv4();
    const projectPath = await ensureProjectDir(projectId);
    
    // Save image to assets
    const filename = `imported_${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const assetPath = path.join(projectPath, 'assets', filename);
    await fs.writeFile(assetPath, imageBuffer);
    
    const imageUrl = `/storage/projects/${projectId}/assets/${filename}`;
    
    // Get image dimensions using a lightweight approach
    // For now, we'll use default dimensions and let the frontend handle sizing
    const canvasWidth = 1080;
    const canvasHeight = 1080;
    
    const now = new Date().toISOString();
    const projectData = {
        version: "1.0",
        projectInfo: {
            id: projectId,
            name: `${originalFilename.replace(/\.[^/.]+$/, '')} - ${new Date().toLocaleDateString()}`,
            createdAt: now,
            updatedAt: now,
            previewUrl: "preview.png"
        },
        canvas: {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: "#ffffff",
            backgroundImage: null,
            zoom: 1,
            viewportTransform: [1, 0, 0, 1, 0, 0]
        },
        layers: [
            {
                type: "Image",
                version: "7.2.0",
                originX: "center",
                originY: "center",
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                fill: "rgb(0,0,0)",
                stroke: null,
                strokeWidth: 0,
                opacity: 1,
                scaleX: 1,
                scaleY: 1,
                angle: 0,
                flipX: false,
                flipY: false,
                visible: true,
                src: `assets/${filename}`,
                crossOrigin: "anonymous"
            }
        ],
        history: {
            undoStack: [],
            redoStack: []
        }
    };
    
    await fs.writeJson(path.join(projectPath, 'index.json'), projectData, { spaces: 2 });
    
    return projectData;
};
