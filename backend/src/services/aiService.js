import { analyzeDesignWithVision, generateLayoutFromPrompt, enhanceMergePrompt, describeImageWithGemini, generateThemePaletteWithGemini, extractStylesWithGemini, generateTextWithGemini } from './ai/geminiProvider.js';
import { generateImageWithHF, describeImageWithHF } from './ai/huggingfaceProvider.js';
import { generateImageWithPollinations } from './ai/pollinationsProvider.js';
import { removeWhiteBackgroundSmart } from './imageProcessingService.js';
import { saveAssetBuffer } from './assetService.js';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export const analyzeDesignAndGenerateAssets = async (base64Image, canvasJson, userPrompt, projectId = null) => {
    // Get recommendations and JSON from Gemini
    const assistantRes = await analyzeDesignWithVision(base64Image, canvasJson, userPrompt);
    const assetsToReturn = [];
    const savedAssets = []; // Track saved asset info

    // Post-process to generate new images if the AI suggested any
    if (assistantRes.updatedJson && Array.isArray(assistantRes.updatedJson.layers)) {
        for (let i = 0; i < assistantRes.updatedJson.layers.length; i++) {
            const layer = assistantRes.updatedJson.layers[i];

            if (layer.type === 'image' && !layer.src && layer.prompt) {
                try {
                    const prompt = layer.prompt + ", isolated on plain white background";
                    const result = await generateImageWithPollinations(prompt);
                    
                    // Remove white background
                    const imgBuf = await removeWhiteBackgroundSmart(result.buffer);
                    
                    // Get dimensions
                    const metadata = await sharp(imgBuf).metadata();
                    const w = metadata.width || 500;
                    const h = metadata.height || 500;

                    const filename = `assistant_gen_${Date.now()}_${i}.png`;
                    assetsToReturn.push({ fileName: filename, base64: imgBuf.toString('base64') });

                    // Save to backend storage if projectId is provided
                    if (projectId) {
                        try {
                            const assetInfo = await saveAssetBuffer(projectId, filename, imgBuf);
                            savedAssets.push(assetInfo);
                            console.log(`Saved assistant-generated asset: ${filename}`);
                        } catch (saveErr) {
                            console.warn(`Failed to save assistant asset ${filename} to backend:`, saveErr);
                        }
                    }

                    layer.src = `assets/${filename}`;
                    layer.width = w; 
                    layer.height = h;
                    layer.scaleX = 500 / w; 
                    layer.scaleY = 500 / h;
                    delete layer.prompt;
                } catch (e) {
                    console.error("Assistant image gen failed:", e);
                }
            }
        }
    }

    return {
        suggestions: assistantRes.suggestions,
        updatedJson: assistantRes.updatedJson,
        assets: assetsToReturn,
        savedAssets: savedAssets // Include backend-saved asset info if available
    };
};

export const generateSingleImage = async (prompt, projectId, removeBgFlag) => {
    let imageBuffer = null;
    let usedModel = "unknown";
    let source = "huggingface-ai";

    const targetPrompt = removeBgFlag ? `${prompt}, isolated on white background` : prompt;

    // Try HF first
    try {
        const result = await generateImageWithHF(targetPrompt);
        imageBuffer = result.buffer;
        usedModel = result.model;
    } catch (err) {
        console.log(`--> Falling back to pollinations.ai for manual generation... (HF Error: ${err.message})`);
        const result = await generateImageWithPollinations(targetPrompt);
        imageBuffer = result.buffer;
        usedModel = result.model;
        source = "pollinations";
    }

    // Smart Background Removal
    if (removeBgFlag && imageBuffer) {
        imageBuffer = await removeWhiteBackgroundSmart(imageBuffer);
    }

    // Save
    const filename = `ai_${Date.now()}.png`;
    const assetInfo = await saveAssetBuffer(projectId, filename, imageBuffer);

    return {
        asset: assetInfo,
        metadata: {
            source,
            model: usedModel,
            prompt,
            removedBackground: !!removeBgFlag
        }
    };
};

export const createProjectLayout = async (prompt, magicPrompt = false) => {
    const projectPlan = await generateLayoutFromPrompt(prompt, magicPrompt);
    
    const projectId = uuidv4();
    const now = new Date().toISOString();

    const canvasWidth = projectPlan.canvas?.width || 1080;
    const canvasHeight = projectPlan.canvas?.height || 1080;
    const canvasBgColor = projectPlan.canvas?.backgroundColor || projectPlan.canvasBackground || "#ffffff";

    const projectData = {
        version: "1.0",
        projectInfo: {
            id: projectId,
            name: `AI Gen: ${prompt.substring(0, 30)}`,
            createdAt: now,
            updatedAt: now,
            previewUrl: "preview.png"
        },
        canvas: {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: canvasBgColor,
            backgroundImage: null,
            zoom: 1,
            viewportTransform: [1, 0, 0, 1, 0, 0]
        },
        layers: [],
        history: { undoStack: [], redoStack: [] }
    };

    const generatedLayers = [];
    const assetsToReturn = [];
    const savedAssets = []; // Track backend-saved assets

    // Helper functions
    const buildShadow = (s) => s ? { color: s.color || 'rgba(0,0,0,0.3)', blur: s.blur || 10, offsetX: s.offsetX || 0, offsetY: s.offsetY || 0 } : undefined;
    const buildGradient = (g) => g && g.colorStops ? { type: g.type || 'linear', coords: g.coords || { x1: 0, y1: 0, x2: 0, y2: 1 }, colorStops: g.colorStops } : undefined;

    for (const asset of projectPlan.assets) {
        const baseLayerProps = {
            id: `obj_${asset.id}_${Date.now()}`,
            version: "5.3.0",
            originX: "center",
            originY: "center",
            left: asset.left || (canvasWidth / 2),
            top: asset.top || (canvasHeight / 2),
            visible: true,
            selectable: true,
            metadata: { source: "gemini-ai" }
        };

        if (asset.type === 'text') {
            generatedLayers.push({
                ...baseLayerProps,
                type: "textbox",
                width: asset.width || 500,
                text: asset.text || "Text",
                fontSize: asset.fontSize || 48,
                fontFamily: asset.fontFamily || "Arial",
                fontWeight: asset.fontWeight || "normal",
                fontStyle: asset.fontStyle || "normal",
                textAlign: asset.textAlign || "left",
                charSpacing: asset.charSpacing ?? 0,
                lineHeight: asset.lineHeight ?? 1.16,
                fill: asset.fill || "#000000",
                opacity: asset.opacity ?? 1,
                ...(asset.stroke ? { stroke: asset.stroke, strokeWidth: asset.strokeWidth || 1 } : {}),
                ...(buildShadow(asset.shadow) ? { shadow: buildShadow(asset.shadow) } : {})
            });
        } else if (asset.type === 'rect') {
            generatedLayers.push({
                ...baseLayerProps,
                type: "rect",
                width: asset.width || 100,
                height: asset.height || 100,
                fill: buildGradient(asset.gradient) || asset.fill || "#000000",
                opacity: asset.opacity ?? 1,
                rx: asset.rx ?? 0,
                ry: asset.rx ?? 0,
                ...(asset.stroke ? { stroke: asset.stroke, strokeWidth: asset.strokeWidth || 1 } : {}),
                ...(asset.strokeDashArray ? { strokeDashArray: asset.strokeDashArray } : {}),
                ...(buildShadow(asset.shadow) ? { shadow: buildShadow(asset.shadow) } : {})
            });
        } else if (asset.type === 'circle') {
            generatedLayers.push({
                ...baseLayerProps,
                type: "circle",
                radius: asset.radius || 50,
                fill: asset.fill || "#000000",
                opacity: asset.opacity ?? 1,
                ...(asset.stroke ? { stroke: asset.stroke, strokeWidth: asset.strokeWidth || 1 } : {}),
                ...(asset.strokeDashArray ? { strokeDashArray: asset.strokeDashArray } : {}),
                ...(buildShadow(asset.shadow) ? { shadow: buildShadow(asset.shadow) } : {})
            });
        } else if (asset.type === 'triangle') {
            generatedLayers.push({
                ...baseLayerProps,
                type: "triangle",
                width: asset.width || 100,
                height: asset.height || 100,
                fill: asset.fill || "#000000",
                opacity: asset.opacity ?? 1,
                angle: asset.angle ?? 0,
                ...(buildShadow(asset.shadow) ? { shadow: buildShadow(asset.shadow) } : {})
            });
        } else if (asset.type === 'image') {
            let imageBuffer = null;
            const targetPrompt = asset.removeBackground ? `${asset.prompt}, isolated on plain white background` : asset.prompt;
            
            try {
                const res = await generateImageWithHF(targetPrompt);
                imageBuffer = res.buffer;
            } catch (e) {
                try {
                    const res = await generateImageWithPollinations(targetPrompt);
                    imageBuffer = res.buffer;
                } catch (err) {}
            }

            if (!imageBuffer) continue;

            if (asset.removeBackground) {
                imageBuffer = await removeWhiteBackgroundSmart(imageBuffer);
            }

            const metadata = await sharp(imageBuffer).metadata();
            const actualWidth = metadata.width || 1024;
            const actualHeight = metadata.height || 1024;
            const scale = asset.removeBackground
                ? Math.min((asset.width || 500) / actualWidth, (asset.height || 500) / actualHeight)
                : Math.max((asset.width || 500) / actualWidth, (asset.height || 500) / actualHeight);

            const filename = `layer_${asset.id}_${Date.now()}.png`;
            assetsToReturn.push({ fileName: filename, base64: imageBuffer.toString('base64') });

            // Save to backend storage
            try {
                const assetInfo = await saveAssetBuffer(projectId, filename, imageBuffer);
                savedAssets.push(assetInfo);
                console.log(`Saved AI-generated layer asset: ${filename}`);
            } catch (saveErr) {
                console.warn(`Failed to save layer asset ${filename} to backend:`, saveErr);
            }

            generatedLayers.push({
                ...baseLayerProps,
                type: "image",
                width: actualWidth, height: actualHeight,
                scaleX: scale, scaleY: scale,
                opacity: 1, src: `assets/${filename}`,
                metadata: { source: "ai-gen", prompt: asset.prompt }
            });
        }
    }

    projectData.layers = generatedLayers;

    return { projectData, assets: assetsToReturn, projectId, savedAssets };
};

export const mergeLayerImages = async (base64Image, basePrompt, projectId) => {
    // Decode base64
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    
    // Get metadata
    const metadata = await sharp(imgBuffer).metadata();
    const origWidth = metadata.width;
    const origHeight = metadata.height;
    
    const TARGET_SIZE = 1024;
    
    // Calculate aspect ratio string for prompt
    const aspectRatio = origWidth / origHeight;
    let arStr = "1:1";
    if (aspectRatio > 1.2) arStr = "16:9";
    else if (aspectRatio < 0.8) arStr = "9:16";

    // Calculate scale to fit 1024x1024
    const scale = Math.min(TARGET_SIZE / origWidth, TARGET_SIZE / origHeight);
    const scaledWidth = Math.round(origWidth * scale);
    const scaledHeight = Math.round(origHeight * scale);
    
    // Resize image
    const resizedBuffer = await sharp(imgBuffer)
        .resize(scaledWidth, scaledHeight, { fit: 'inside' })
        .toBuffer();
    
    // Pad to 1024x1024 with white background
    const top = Math.floor((TARGET_SIZE - scaledHeight) / 2);
    const bottom = TARGET_SIZE - scaledHeight - top;
    const left = Math.floor((TARGET_SIZE - scaledWidth) / 2);
    const right = TARGET_SIZE - scaledWidth - left;
    
    const paddedBuffer = await sharp(resizedBuffer)
        .extend({ top, bottom, left, right, background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toBuffer();
    
    const paddedBase64 = `data:image/png;base64,${paddedBuffer.toString('base64')}`;

    // Pass padded image and aspect ratio to prompt enhancer
    const enhancedPrompt = await enhanceMergePrompt(paddedBase64, basePrompt, arStr);
    
    let imageBuffer = null;
    let usedModel = "unknown";
    try {
        const result = await generateImageWithHF(enhancedPrompt);
        imageBuffer = result.buffer;
        usedModel = result.model;
    } catch (err) {
        throw new Error(err.message === "503" ? "Model is currently loading (503). Try again." : err.message);
    }

    // Auto-remove background
    imageBuffer = await removeWhiteBackgroundSmart(imageBuffer);
    
    // Crop back to scaled dimensions
    imageBuffer = await sharp(imageBuffer)
        .extract({ left, top, width: scaledWidth, height: scaledHeight })
        .png()
        .toBuffer();

    const filename = `merge_${Date.now()}.png`;
    const assetInfo = await saveAssetBuffer(projectId, filename, imageBuffer);

    return {
        asset: assetInfo,
        metadata: { model: usedModel, enhancedPrompt }
    };
};

export const describeImage = async (base64Image) => {
    // Switching to Gemini as requested
    const description = await describeImageWithGemini(base64Image);
    return { description };
};

export const generateContent = async (keyword) => {
    const systemInstruction = "You are a creative copywriter. Generate a catchy slogan or short description based on the keyword provided by the user. Keep it concise, engaging, and professional.";
    const text = await generateTextWithGemini(keyword, systemInstruction);
    return { text };
};

export const enhancePrompt = async (simplePrompt) => {
    const systemInstruction = "You are an expert AI prompt engineer. The user will give you a simple idea for an image. Your job is to expand it into a highly detailed, descriptive prompt suitable for a text-to-image AI (like FLUX or Midjourney). Add details about lighting, camera angle, texture, environment, and mood. Ensure the final result is a single paragraph. Only output the enhanced prompt, do not add any conversational text.";
    const text = await generateTextWithGemini(simplePrompt, systemInstruction);
    return { text };
};

export const generateTheme = async (mood, canvasJson = null) => {
    const paletteData = await generateThemePaletteWithGemini(mood, canvasJson);
    return paletteData; // { palette_name, hex_codes: [] }
};

export const extractStyles = async (base64Image) => {
    const styles = await extractStylesWithGemini(base64Image);
    return styles;
};
