import express from 'express';
import {
    generateImage,
    analyzeDesign,
    generateProjectFromPrompt,
    generateMaskFromSelection,
    performInpainting,
    blendImages
} from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generateImage);
router.post('/analyze-design', analyzeDesign);
router.post('/generate-project', generateProjectFromPrompt);
router.post('/mask', generateMaskFromSelection);
router.post('/inpaint', performInpainting);
router.post('/blend', blendImages);

export default router;
