import fs from 'fs-extra';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { saveAssetBase64, resolveAssetLocalPath, STORAGE_ROOT } from '../services/assetService.js';
import { removeBackgroundAI } from '../services/imageProcessingService.js';
import path from 'path';

export const uploadAsset = catchAsync(async (req, res) => {
    const { id: projectId } = req.params;
    
    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    const projectAssetsPath = path.join(STORAGE_ROOT, 'projects', projectId, 'assets');
    await fs.ensureDir(projectAssetsPath);

    const filename = `upload_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = path.join(projectAssetsPath, filename);

    await fs.writeFile(filePath, req.file.buffer);

    const relativePath = `assets/${filename}`;
    const displayUrl = `/storage/projects/${projectId}/assets/${filename}`;

    res.json({ success: true, asset: { relativePath, displayUrl } });
});

export const handlePastedImage = catchAsync(async (req, res) => {
    const { id: projectId } = req.params;
    const { imageBase64 } = req.body;

    if (!imageBase64) {
        throw new AppError('No image data provided', 400);
    }

    const filename = `paste_${Date.now()}.png`;
    const asset = await saveAssetBase64(projectId, filename, imageBase64);

    res.json({ success: true, asset: { relativePath: asset.relativePath, displayUrl: asset.displayUrl } });
});

export const removeAssetBackground = catchAsync(async (req, res) => {
    const { id: projectId } = req.params;
    const { imagePath } = req.body; 
    
    let inputSource;
    let filenameBase = `nobg_${Date.now()}`;
    let tempFilePath = null;

    try {
        if (req.file) {
            const projectAssetsPath = path.join(STORAGE_ROOT, 'projects', projectId, 'assets');
            await fs.ensureDir(projectAssetsPath);
            
            const tempName = `temp_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            tempFilePath = path.join(projectAssetsPath, tempName);
            await fs.writeFile(tempFilePath, req.file.buffer);
            
            inputSource = tempFilePath;
            filenameBase = `nobg_${Date.now()}_${req.file.originalname.split('.')[0]}`;
        } else if (imagePath) {
            inputSource = await resolveAssetLocalPath(projectId, imagePath);
        } else {
            throw new AppError('No image provided (either file or path)', 400);
        }
        
        const fileUri = `file://${inputSource.replace(/\\/g, '/')}`;
        const resultBuffer = await removeBackgroundAI(fileUri);

        if (tempFilePath) {
            await fs.remove(tempFilePath).catch(() => {});
        }

        const filename = `${filenameBase}.png`;
        const projectAssetsPath = path.join(STORAGE_ROOT, 'projects', projectId, 'assets');
        await fs.ensureDir(projectAssetsPath);
        
        const newPath = path.join(projectAssetsPath, filename);
        await fs.writeFile(newPath, resultBuffer);

        res.json({ 
            success: true, 
            asset: { 
                relativePath: `assets/${filename}`, 
                displayUrl: `/storage/projects/${projectId}/assets/${filename}` 
            } 
        });
    } catch (error) {
        if (tempFilePath) {
            await fs.remove(tempFilePath).catch(() => {});
        }
        throw new AppError('AI Background Removal failed: ' + error.message, 500);
    }
});
