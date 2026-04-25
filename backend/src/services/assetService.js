import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const STORAGE_ROOT = path.join(__dirname, '../../../storage');

export const saveAssetBuffer = async (projectId, filename, buffer) => {
    const projectAssetsPath = path.join(STORAGE_ROOT, 'projects', projectId, 'assets');
    await fs.ensureDir(projectAssetsPath);
    
    const filePath = path.join(projectAssetsPath, filename);
    await fs.writeFile(filePath, buffer);
    
    return {
        relativePath: `assets/${filename}`,
        displayUrl: `/storage/projects/${projectId}/assets/${filename}`,
        absolutePath: filePath
    };
};

export const saveAssetBase64 = async (projectId, filename, base64String) => {
    const projectAssetsPath = path.join(STORAGE_ROOT, 'projects', projectId, 'assets');
    await fs.ensureDir(projectAssetsPath);

    // Expected format: data:image/png;base64,...
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const filePath = path.join(projectAssetsPath, filename);

    await fs.writeFile(filePath, base64Data, 'base64');

    return {
        relativePath: `assets/${filename}`,
        displayUrl: `/storage/projects/${projectId}/assets/${filename}`,
        absolutePath: filePath
    };
};

export const resolveAssetLocalPath = async (projectId, imagePath) => {
    let cleanPath = imagePath;
    try {
        const urlObj = new URL(imagePath);
        cleanPath = urlObj.pathname;
    } catch(e) {
        cleanPath = imagePath.split('?')[0];
    }

    let fullPath;
    if (cleanPath.startsWith('/storage')) {
        const relativeToStorage = cleanPath.replace(/^\/storage\//, '');
        fullPath = path.resolve(STORAGE_ROOT, relativeToStorage);
    } else {
        fullPath = path.resolve(STORAGE_ROOT, 'projects', projectId, cleanPath);
    }

    if (!(await fs.pathExists(fullPath))) {
        throw new Error(`Image not found at ${fullPath}`);
    }

    return fullPath;
};
