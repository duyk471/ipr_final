import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { removeBackground } from '@imgly/background-removal-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT = path.join(__dirname, '../../../storage');

export const uploadAsset = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const projectAssetsPath = path.join(STORAGE_ROOT, 'projects', projectId, 'assets');
        await fs.ensureDir(projectAssetsPath);

        const filename = `upload_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filePath = path.join(projectAssetsPath, filename);

        await fs.writeFile(filePath, req.file.buffer);

        // Required path in index.json should be relative to project root
        const relativePath = `assets/${filename}`;
        // The display URL for frontend to load
        const displayUrl = `/storage/projects/${projectId}/assets/${filename}`;

        res.json({ success: true, asset: { relativePath, displayUrl } });
    } catch (error) {
        console.error('Upload asset error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload asset' });
    }
};

export const handlePastedImage = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ success: false, message: 'No image data provided' });
        }

        const projectAssetsPath = path.join(STORAGE_ROOT, 'projects', projectId, 'assets');
        await fs.ensureDir(projectAssetsPath);

        // Expected format: data:image/png;base64,...
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const filename = `paste_${Date.now()}.png`;
        const filePath = path.join(projectAssetsPath, filename);

        await fs.writeFile(filePath, base64Data, 'base64');

        const relativePath = `assets/${filename}`;
        const displayUrl = `/storage/projects/${projectId}/assets/${filename}`;

        res.json({ success: true, asset: { relativePath, displayUrl } });
    } catch (error) {
        console.error('Handle pasted image error:', error);
        res.status(500).json({ success: false, message: 'Failed to process pasted image' });
    }
};

export const removeAssetBackground = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { imagePath } = req.body; 

        if (!imagePath) {
            return res.status(400).json({ success: false, message: 'No image path provided' });
        }

        console.log(`[AI] Received request to remove background for: ${imagePath}`);

        let cleanPath = imagePath;
        try {
            const urlObj = new URL(imagePath);
            cleanPath = urlObj.pathname; // Extract /storage/... from full http://localhost:5000/...
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
            console.error(`[AI] Image not found at resolved path: ${fullPath}`);
            return res.status(404).json({ success: false, message: `Image not found at ${fullPath}` });
        }

        console.log(`[AI] Removing background from resolved local path: ${fullPath}`);
        
        // Use Node.js version of the library
        const blob = await removeBackground(fullPath);
        const buffer = Buffer.from(await blob.arrayBuffer());

        console.log(`[AI] Background removed successfully. Saving new asset...`);

        // Save as a new PNG asset
        const filename = `nobg_${Date.now()}.png`;
        const projectAssetsPath = path.join(STORAGE_ROOT, 'projects', projectId, 'assets');
        await fs.ensureDir(projectAssetsPath);
        
        const newPath = path.join(projectAssetsPath, filename);
        await fs.writeFile(newPath, buffer);

        const relativePath = `assets/${filename}`;
        const displayUrl = `/storage/projects/${projectId}/assets/${filename}`;

        res.json({ 
            success: true, 
            asset: { relativePath, displayUrl } 
        });
    } catch (error) {
        console.error('Background removal error stack:', error.stack || error);
        res.status(500).json({ success: false, message: 'AI Background Removal failed: ' + (error.message || String(error)) });
    }
};
