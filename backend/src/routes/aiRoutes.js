import express from 'express';
import { generateImage, analyzeDesign, generateProjectFromPrompt, mergeImages } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generateImage);
router.post('/analyze-design', analyzeDesign);
router.post('/generate-project', generateProjectFromPrompt);
router.post('/merge', mergeImages);

export default router;
