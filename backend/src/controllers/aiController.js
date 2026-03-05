import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT = path.join(__dirname, '../../../storage');

// Design Assistant Analysis
export const analyzeDesign = async (req, res) => {
    try {
        const { screenshot, canvasJson, projectId } = req.body;

        if (!screenshot || !canvasJson || !projectId) {
            return res.status(400).json({ success: false, message: 'Missing screenshot, canvasJson or projectId' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            return res.status(400).json({
                success: false,
                message: 'Gemini API Key is required for the AI Design Assistant. Please add it to backend/.env'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log(`Analyzing design for project ${projectId} using Gemini 2.5 Flash...`);

        // Prepare image for Gemini (remove data:image/png;base64 prefix)
        const base64Image = screenshot.split(',')[1] || screenshot;

        const prompt = `
            You are a professional graphic designer and UI/UX expert.
            Analyze the attached screenshot and its current Fabric.js JSON state.
            
            1. Provide 3 specific, actionable suggestions to improve the design (layout, typography, color harmony, or balance).
            2. Return a modified version of the Fabric.js JSON that implements the most visual/impactful of these improvements.
            
            IMPORTANT: Return your response EXACTLY in this JSON format (no backticks or extra text):
            {
              "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
              "updatedJson": { ... }
            }
            
            The current JSON state is provided for reference: ${JSON.stringify(canvasJson)}
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png"
                }
            }
        ]);

        const responseText = result.response.text();

        // Sanitize response to extract JSON (Gemini sometimes adds markdown backticks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI failed to return valid JSON. Response was: ' + responseText);
        }

        const assistantRes = JSON.parse(jsonMatch[0]);

        res.json({
            success: true,
            suggestions: assistantRes.suggestions,
            updatedJson: assistantRes.updatedJson
        });

    } catch (error) {
        console.error('AI Assistant Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const generateImage = async (req, res) => {
    try {
        const { prompt, projectId, removeBackground } = req.body;

        if (!prompt || !projectId) {
            return res.status(400).json({ success: false, message: 'Missing prompt or projectId' });
        }

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        if (!hfToken || hfToken.includes('your_huggingface_key')) {
            return res.status(400).json({
                success: false,
                message: 'Hugging Face API Key is missing. Please add HUGGINGFACE_API_KEY to your backend/.env'
            });
        }

        console.log(`Generating AI image for project ${projectId}: "${prompt}" (Transparent: ${!!removeBackground})`);

        // We'll try FLUX.1 (Schnell) as primary, then Stable Diffusion XL as fallback
        const models = [
            "black-forest-labs/FLUX.1-schnell",
            "stabilityai/stable-diffusion-xl-base-1.0",
            "runwayml/stable-diffusion-v1-5"
        ];

        let imageBuffer = null;
        let usedModel = "";
        let lastError = "";

        for (const modelId of models) {
            try {
                console.log(`Trying model: ${modelId}...`);
                // The most robust URL according to latest HF migration
                const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${hfToken}`,
                        'Content-Type': 'application/json',
                        'x-use-cache': 'false'
                    },
                    body: JSON.stringify({
                        inputs: removeBackground ? `${prompt}, isolated on plain white background` : prompt
                        // Removed parameters to avoid 'wait_for_model' errors on some pipelines
                    })
                });

                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    imageBuffer = Buffer.from(arrayBuffer);
                    usedModel = modelId;
                    break;
                } else {
                    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
                    lastError = err.error || response.statusText;
                    console.warn(`Model ${modelId} failed: ${lastError}`);
                }
            } catch (err) {
                lastError = err.message;
                console.warn(`Model ${modelId} catch error: ${lastError}`);
            }
        }

        if (!imageBuffer) {
            throw new Error(`All AI models failed. Last error: ${lastError}`);
        }

        // Simple Background Removal (White-to-Alpha)
        if (removeBackground) {
            console.log('Applying background removal logic...');
            const { data, info } = await sharp(imageBuffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            for (let i = 0; i < data.length; i += 4) {
                // If pixel is mostly white (R,G,B > 230), make it transparent
                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
                    data[i + 3] = 0;
                }
            }
            imageBuffer = await sharp(data, {
                raw: { width: info.width, height: info.height, channels: 4 }
            }).png().toBuffer();
        }

        // Save result
        const projectPath = path.join(STORAGE_ROOT, 'projects', projectId);
        const assetsPath = path.join(projectPath, 'assets');
        await fs.ensureDir(assetsPath);

        const filename = `ai_${Date.now()}.png`;
        const filePath = path.join(assetsPath, filename);
        await fs.writeFile(filePath, imageBuffer);

        res.json({
            success: true,
            asset: {
                relativePath: `assets/${filename}`,
                displayUrl: `/storage/projects/${projectId}/assets/${filename}`
            },
            metadata: {
                source: 'huggingface-router',
                model: usedModel,
                prompt,
                removedBackground: !!removeBackground
            }
        });

    } catch (error) {
        console.error('AI Controller Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
