import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import {
    analyzeDesignAndGenerateAssets,
    generateSingleImage,
    createProjectLayout,
    mergeLayerImages,
    describeImage,
    generateContent,
    enhancePrompt,
    generateTheme,
    extractStyles
} from '../services/aiService.js';

export const analyzeDesign = catchAsync(async (req, res) => {
    const { canvasJson, screenshot, userPrompt } = req.body;

    if (!canvasJson) {
        throw new AppError('Missing canvas JSON data', 400);
    }
    
    let base64Image = "";
    if (screenshot) {
        base64Image = screenshot.split(',')[1] || screenshot;
    }

    if (!base64Image) {
        throw new AppError('No visual design data found (screenshot required)', 400);
    }

    const result = await analyzeDesignAndGenerateAssets(base64Image, canvasJson, userPrompt);

    res.json({
        success: true,
        ...result
    });
});

export const generateImage = catchAsync(async (req, res) => {
    const { prompt, projectId, removeBackground } = req.body;

    if (!prompt || !projectId) {
        throw new AppError('Missing prompt or projectId', 400);
    }

    const result = await generateSingleImage(prompt, projectId, removeBackground);

    res.json({
        success: true,
        ...result
    });
});

export const generateProjectFromPrompt = catchAsync(async (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt) {
        throw new AppError('Missing prompt', 400);
    }

    const result = await createProjectLayout(prompt);

    res.json({
        success: true,
        ...result
    });
});

export const mergeImages = catchAsync(async (req, res) => {
    const { image, prompt, projectId } = req.body;

    if (!image || !projectId) {
        throw new AppError('Missing image or projectId', 400);
    }

    const actualPrompt = prompt || "A seamless, professional photo-composite of the subjects placed in the background environment, matching lighting, consistent shadows, high resolution, 8k.";
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const result = await mergeLayerImages(base64Data, actualPrompt, projectId);

    res.json({
        success: true,
        ...result
    });
});

export const handleDescribeImage = catchAsync(async (req, res) => {
    const { image } = req.body;
    
    if (!image) {
        throw new AppError('Missing image data', 400);
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const result = await describeImage(base64Data);

    res.json({
        success: true,
        ...result
    });
});

export const handleGenerateText = catchAsync(async (req, res) => {
    const { keyword } = req.body;
    
    if (!keyword) {
        throw new AppError('Missing keyword', 400);
    }

    const result = await generateContent(keyword);

    res.json({
        success: true,
        ...result
    });
});

export const handleEnhancePrompt = catchAsync(async (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt) {
        throw new AppError('Missing prompt', 400);
    }

    const result = await enhancePrompt(prompt);

    res.json({
        success: true,
        ...result
    });
});

export const handleGenerateTheme = catchAsync(async (req, res) => {
    const { mood, canvasJson } = req.body;
    
    if (!mood) {
        throw new AppError('Missing mood description', 400);
    }

    const result = await generateTheme(mood, canvasJson);

    res.json({
        success: true,
        ...result
    });
});

export const handleExtractStyles = catchAsync(async (req, res) => {
    const { base64Image } = req.body;
    
    if (!base64Image) {
        throw new AppError('Missing image data', 400);
    }

    const styles = await extractStyles(base64Image);

    res.json({
        success: true,
        styles
    });
});
