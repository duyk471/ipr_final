import express from 'express';
import multer from 'multer';
import { uploadAsset, handlePastedImage, removeAssetBackground } from '../controllers/assetController.js';

const router = express.Router({ mergeParams: true });

// Multer in-memory storage to process the file and save manually using fs-extra
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('image'), uploadAsset);
router.post('/pasted', handlePastedImage);
router.post('/remove-bg', removeAssetBackground);

export default router;
