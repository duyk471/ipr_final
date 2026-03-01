import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

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
