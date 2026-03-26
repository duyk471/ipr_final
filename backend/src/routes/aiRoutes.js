import express from 'express';
import { generateImage, analyzeDesign, generateProjectFromPrompt } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generateImage);
router.post('/analyze-design', analyzeDesign);
router.post('/generate-project', generateProjectFromPrompt);

export default router;
