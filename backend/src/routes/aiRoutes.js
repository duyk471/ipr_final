import express from 'express';
import { generateImage, analyzeDesign } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generateImage);
router.post('/analyze-design', analyzeDesign);

export default router;
