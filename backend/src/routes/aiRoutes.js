import express from 'express';
import { generateImage, analyzeDesign, generateProjectFromPrompt, mergeImages, handleDescribeImage, handleGenerateText, handleEnhancePrompt, handleGenerateTheme, handleExtractStyles } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generateImage);
router.post('/analyze-design', analyzeDesign);
router.post('/generate-project', generateProjectFromPrompt);
router.post('/merge', mergeImages);
router.post('/describe-image', handleDescribeImage);
router.post('/generate-text', handleGenerateText);
router.post('/enhance-prompt', handleEnhancePrompt);
router.post('/generate-theme', handleGenerateTheme);
router.post('/extract-styles', handleExtractStyles);

export default router;
