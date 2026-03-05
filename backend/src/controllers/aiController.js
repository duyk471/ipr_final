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
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ success: false, message: 'Missing projectId' });
        }

        const projectPath = path.join(STORAGE_ROOT, 'projects', projectId);
        const indexPath = path.join(projectPath, 'index.json');
        const previewPath = path.join(projectPath, 'preview.png');

        if (!(await fs.pathExists(indexPath))) {
            return res.status(404).json({ success: false, message: 'Project files not found. Please save your project first.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            return res.status(400).json({
                success: false,
                message: 'Gemini API Key is required for the AI Design Assistant. Please add it to backend/.env'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Using 2.0 or 1.5 flash depending on what's stable/available
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log(`Analyzing design for project ${projectId} using Gemini...`);

        // Read files from disk
        const indexJson = await fs.readJson(indexPath);
        let base64Image = "";

        if (await fs.pathExists(previewPath)) {
            const imageBuffer = await fs.readFile(previewPath);
            base64Image = imageBuffer.toString('base64');
        } else if (req.body.screenshot) {
            // Fallback to screenshot from body if preview.png doesn't exist yet
            base64Image = req.body.screenshot.split(',')[1] || req.body.screenshot;
        }

        if (!base64Image) {
            return res.status(400).json({ success: false, message: 'No visual design data found (preview.png or screenshot)' });
        }

        const systemPrompt = `
            You are a professional graphic designer and UI/UX expert.
            Review the attached design (preview.png) and its structure (index.json).
            
            TASKS:
            1. Review visual balance, color theory, typography, and spacing.
            2. Provide 3 specific, actionable suggestions for improvement.
            3. Generate a modified version of the "layers" array that implements your best suggestions.
            
            REQUIREMENTS:
            - Keep the EXACT SAME object structure as Fabric.js found in the source JSON.
            - Return your response EQUIVALENT to this JSON format:
            {
              "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
              "updatedJson": {
                "layers": [...modified layers...],
                "canvas": { ...original or modified canvas settings... }
              }
            }
        `;

        const result = await model.generateContent([
            { text: systemPrompt },
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png"
                }
            },
            { text: `SOURCE_PROJECT_JSON: ${JSON.stringify(indexJson)}` }
        ]);

        const responseText = result.response.text();

        // Sanitize response to extract JSON
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

        // Smart Background Removal (Flood Fill from edges)
        if (removeBackground) {
            console.log('Applying smart background removal (flood fill)...');
            const { data, info } = await sharp(imageBuffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            const width = info.width;
            const height = info.height;
            const threshold = 240; // Only target very bright white
            const visited = new Uint8Array(width * height);
            const queue = [];

            // Helper to check if a pixel is "whitish"
            const isWhite = (x, y) => {
                const pos = (y * width + x) * 4;
                return data[pos] > threshold && data[pos + 1] > threshold && data[pos + 2] > threshold;
            };

            // Seed the queue with all border pixels
            for (let x = 0; x < width; x++) {
                if (isWhite(x, 0)) { visited[x] = 1; queue.push(x, 0); }
                if (isWhite(x, height - 1)) { visited[(height - 1) * width + x] = 1; queue.push(x, height - 1); }
            }
            for (let y = 1; y < height - 1; y++) {
                if (isWhite(0, y)) { visited[y * width] = 1; queue.push(0, y); }
                if (isWhite(width - 1, y)) { visited[y * width + (width - 1)] = 1; queue.push(width - 1, y); }
            }

            // Simple iterative flood fill
            let head = 0;
            while (head < queue.length) {
                const x = queue[head++];
                const y = queue[head++];

                const idx = y * width + x;
                data[idx * 4 + 3] = 0; // Make transparent

                // Check 4 neighbors
                const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                for (const [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        if (!visited[nIdx] && isWhite(nx, ny)) {
                            visited[nIdx] = 1;
                            queue.push(nx, ny);
                        }
                    }
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
