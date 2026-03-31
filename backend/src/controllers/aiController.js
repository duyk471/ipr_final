import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { createNewProject } from '../services/storageService.js';

import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT = path.join(__dirname, '../../../storage');

import { scrapeImages } from '../utils/scraper.js';

/**
 * Enhanced Download Image Helper
 */
const downloadImage = async (url) => {
    try {
        const response = await fetch(url, { 
            signal: AbortSignal.timeout(8000),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Referer': 'https://www.google.com/'
            }
        });
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Validation: Must be a decent size
        if (buffer.length < 1000) return null;
        
        return buffer;
    } catch (err) {
        console.error(`Download error for ${url}:`, err.message);
        return null;
    }
};

// Design Assistant Analysis
export const analyzeDesign = async (req, res) => {
    try {
        const { projectId, userPrompt } = req.body;

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
            ${userPrompt?.trim() ? `The user wants you to follow this additional creative direction: "${userPrompt.trim()}".` : 'No extra user direction was provided, so use your best professional judgment.'}
            
            TASKS:
            1. Review visual balance, color theory, typography, and spacing.
            2. Provide 3 specific, actionable suggestions for improvement.
            3. Generate a modified version of the "layers" array that implements your best suggestions.
            
            REQUIREMENTS:
                        - Treat the user's additional creative direction as a high-priority instruction unless it conflicts with the project structure.
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
        const { prompt, projectId, removeBackground, useWebSearch } = req.body;

        if (!prompt || !projectId) {
            return res.status(400).json({ success: false, message: 'Missing prompt or projectId' });
        }

        console.log(`Generating image for project ${projectId}: "${prompt}" (WebSearch: ${!!useWebSearch})`);

        let imageBuffer = null;
        let usedModel = "google-images";
        let source = "google-images-scrape";
        let lastError = "";

        // --- STRATEGY 1: ONLINE IMAGE SEARCH VIA PUPPETEER/CHEERIO ---
        if (useWebSearch) {
            try {
                const scrapedUrls = await scrapeImages(prompt, { limit: 5 });
                for (const url of scrapedUrls) {
                    console.log(`Attempting download scraped high-res link: ${url}`);
                    const buffer = await downloadImage(url);
                    if (buffer) {
                        imageBuffer = buffer;
                        break;
                    }
                }
            } catch (err) {
                console.warn("Image search failed, falling back to AI:", err.message);
            }
        } else {
            console.log("Web Search is disabled. Skipping scrape Strategy.");
        }

        // --- STRATEGY 2: AI FALLBACK (Or Default) ---
        if (!imageBuffer) {
            console.log(`Falling back to AI generation for project ${projectId}`);
            source = "huggingface-ai";
            const hfToken = process.env.HUGGINGFACE_API_KEY;
            const models = [
                "black-forest-labs/FLUX.1-schnell",
                "stabilityai/stable-diffusion-xl-base-1.0",
                "runwayml/stable-diffusion-v1-5"
            ];

            for (const modelId of models) {
                try {
                    console.log(`Trying AI model: ${modelId}...`);
                    const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${hfToken}`,
                            'Content-Type': 'application/json',
                            'x-use-cache': 'false'
                        },
                        body: JSON.stringify({
                            inputs: removeBackground ? `${prompt}, isolated on white background` : prompt
                        })
                    });

                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        imageBuffer = Buffer.from(arrayBuffer);
                        usedModel = modelId;
                        break;
                    } else {
                        const err = await response.json().catch(() => ({ error: 'Unknown' }));
                        lastError = err.error || "Request failed";
                    }
                } catch (err) {
                    lastError = err.message;
                }
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
                source: source,
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

export const generateProjectFromPrompt = async (req, res) => {
    try {
        const { prompt, useWebSearch } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, message: 'Missing prompt' });
        }

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        const geminiToken = process.env.GEMINI_API_KEY;

        if (!geminiToken) {
            return res.status(400).json({
                success: false,
                message: 'Missing GEMINI_API_KEY. Please check backend/.env'
            });
        }

        console.log(`\n=========================================\nGenerating entirely new Project from prompt: "${prompt}" (WebSearch: ${!!useWebSearch})\n=========================================`);

        // 1. SMART LAYOUT GENERATION WITH GEMINI
        const genAI = new GoogleGenerativeAI(geminiToken);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemPrompt = `
You are an expert Art Director and strict JSON API turning a user's prompt into a layered image composition.
The user wants to generate: "${prompt}".

RULES FOR ASSETS:
- Produce EXACTLY ONE "background" layer.
- Produce ALONG WITH IT 1 to 3 "foreground" layers.
- For each layer, define:
  - "id": a unique short alphanumeric string.
  - "prompt": highly descriptive AI generation prompt (e.g. "cinematic lighting, 8k, photorealistic").
  - "search_query": a very precise, concise 2-4 word keyword phase to find the real image on Google.
  - "type": "background" or "foreground".
  - "width" & "height": integer dimensions. Background must be 1080x1080.
  - "left" & "top": Canvas center coordinates for placement. (Background is always 540, 540).

Return ONLY the raw JSON object formatted like this, no markdown backticks, no extra text:
{
  "assets": [
    {
      "id": "bg1",
      "prompt": "detailed landscape background, empty scene, 8k",
      "search_query": "landscape background",
      "type": "background",
      "width": 1080,
      "height": 1080,
      "left": 540,
      "top": 540
    },
    {
      "id": "fg1",
      "prompt": "main subject isolated on plain white background",
      "search_query": "main subject clean background",
      "type": "foreground",
      "width": 600,
      "height": 600,
      "left": 540,
      "top": 600
    }
  ]
}`;

        const result = await model.generateContent(systemPrompt);
        let responseText = result.response.text();
        
        // Ensure no markdown block wraps the JSON
        responseText = responseText.replace(/```json\n?/, '').replace(/```\n?/, '').trim();
        
        let projectPlan;
        try {
            projectPlan = JSON.parse(responseText);
        } catch (err) {
            console.error("Gemini failed to generate valid JSON:", responseText);
            throw new Error('AI failed to return valid project structure.');
        }

        if (!projectPlan.assets || !Array.isArray(projectPlan.assets)) {
            throw new Error('Invalid project plan format from AI.');
        }

        // 2. CREATE PROJECT DB ENTRY
        const newProject = await createNewProject(`AI Gen: ${prompt.substring(0, 20)}...`, 1080, 1080);
        const projectId = newProject.projectInfo.id;
        const projectPath = path.join(STORAGE_ROOT, 'projects', projectId);
        const assetsPath = path.join(projectPath, 'assets');

        // 3. FETCH IMAGES USING HYBRID APPROACH (Scraper -> HF)
        const generatedLayers = [];
        const previewLayers = [];

        for (const asset of projectPlan.assets) {
            console.log(`\n--- Processing asset [${asset.id}]: ${asset.search_query}`);
            let imageBuffer = null;
            let usedModel = "google-images";
            let source = "google-images-scrape";
            
            // STRATEGY A: PUPPETEER/CHEERIO IMAGE SCRAPER
            if (useWebSearch) {
                try {
                    const scrapedUrls = await scrapeImages(asset.search_query, { limit: 3 });
                    for (const url of scrapedUrls) {
                        console.log(`-> Found high-res link, downloading: ${url}`);
                        const buffer = await downloadImage(url);
                        if (buffer) {
                            imageBuffer = buffer;
                            break;
                        }
                    }
                } catch (err) {
                    console.warn(`-> Scraping failed for ${asset.id}: ${err.message}`);
                }
            } else {
                console.log(`-> Web Search is disabled. Skipping scraper for ${asset.id}...`);
            }

            // STRATEGY B: AI TEXT-TO-IMAGE GENERATION (FALLBACK)
            if (!imageBuffer) {
                console.log(`-> Scraper failed. Falling back to AI Generation...`);
                source = "huggingface-ai";
                
                if (!hfToken) {
                    console.error("-> Cannot fallback to AI: HUGGINGFACE_API_KEY is missing.");
                    continue; // Skip this asset
                }

                const models = [
                    "black-forest-labs/FLUX.1-schnell",
                    "stabilityai/stable-diffusion-xl-base-1.0",
                ];

                for (const modelId of models) {
                    try {
                        console.log(`--> Calling ${modelId}`);
                        const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${hfToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ inputs: asset.type === 'foreground' ? `${asset.prompt}, plain white background isolated` : asset.prompt })
                        });

                        if (response.ok) {
                            const ab = await response.arrayBuffer();
                            imageBuffer = Buffer.from(ab);
                            usedModel = modelId;
                            console.log(`--> Success with ${modelId}`);
                            break;
                        } else {
                            const errRaw = await response.text();
                            console.warn(`--> ${modelId} failed: ${response.status}`, errRaw);
                        }
                    } catch (err) {
                        console.warn(`--> ${modelId} error: ${err.message}`);
                    }
                }
            }

            // IF BOTH FAILED, SKIP LAYER
            if (!imageBuffer) {
                console.warn(`[!] Skipping layer ${asset.id} because both Scraper and AI failed.`);
                continue;
            }

            // PROCESS IMAGE AND REMOVE BACKGROUND
            const metadata = await sharp(imageBuffer).metadata();
            const actualWidth = metadata.width || 1024;
            const actualHeight = metadata.height || 1024;
            
            let scale = 1;
            if (asset.type === 'background') {
                scale = Math.max(1080 / actualWidth, 1080 / actualHeight);
            } else {
                scale = Math.min((asset.width || 600) / actualWidth, (asset.height || 600) / actualHeight);
            }

            // Smart Flood-Fill Background Removal for Foregrounds
            if (asset.type === 'foreground') {
                console.log(`-> Extracting foreground object (removing background)...`);
                const { data, info } = await sharp(imageBuffer)
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true });
                
                const width = info.width;
                const height = info.height;
                const threshold = 240; // High tolerance for white/bright colors
                const visited = new Uint8Array(width * height);
                const queue = [];

                const isBg = (x, y) => {
                    const idx = (y * width + x) * 4;
                    // Check if pixel is white/very bright
                    return data[idx] > threshold && data[idx + 1] > threshold && data[idx + 2] > threshold;
                };

                for (let x = 0; x < width; x++) {
                    if (isBg(x, 0)) { visited[x] = 1; queue.push(x, 0); }
                    if (isBg(x, height - 1)) { visited[(height - 1) * width + x] = 1; queue.push(x, height - 1); }
                }
                for (let y = 1; y < height - 1; y++) {
                    if (isBg(0, y)) { visited[y * width] = 1; queue.push(0, y); }
                    if (isBg(width - 1, y)) { visited[y * width + (width - 1)] = 1; queue.push(width - 1, y); }
                }

                let head = 0;
                while (head < queue.length) {
                    const x = queue[head++];
                    const y = queue[head++];
                    const idx = y * width + x;
                    
                    data[idx * 4 + 3] = 0; // Set Alpha to 0

                    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = ny * width + nx;
                            if (!visited[nIdx] && isBg(nx, ny)) {
                                visited[nIdx] = 1;
                                queue.push(nx, ny);
                            }
                        }
                    }
                }

                imageBuffer = await sharp(data, {
                    raw: { width, height, channels: 4 }
                }).png().toBuffer();
            }

            // 4. WRITE ASSET TO DISK
            const filename = `layer_${asset.id}_${Date.now()}.png`;
            const filePath = path.join(assetsPath, filename);
            await fs.writeFile(filePath, imageBuffer);

            // 5. UPDATE FABRIC JSON
            generatedLayers.push({
                id: `obj_${asset.id}_${Date.now()}`,
                type: "image",
                version: "5.3.0",
                originX: "center",
                originY: "center",
                left: asset.left || 540,
                top: asset.top || 540,
                width: actualWidth,
                height: actualHeight,
                scaleX: scale,
                scaleY: scale,
                angle: 0,
                flipX: false,
                flipY: false,
                opacity: 1,
                visible: true,
                selectable: true,
                src: `assets/${filename}`,
                metadata: {
                    source: source,
                    model: usedModel,
                    prompt: asset.prompt
                }
            });

            // Prepare preview buffers
            try {
                const resized = await sharp(imageBuffer)
                    .resize(Math.round(actualWidth * scale), Math.round(actualHeight * scale))
                    .toBuffer();
                previewLayers.push({
                    input: resized,
                    top: Math.round((asset.top || 540) - (actualHeight * Math.abs(scale) / 2)),
                    left: Math.round((asset.left || 540) - (actualWidth * Math.abs(scale) / 2))
                });
            } catch (err) {
                console.warn(`-> Preview composition failed for ${asset.id}:`, err.message);
            }
        }

        // 6. SAVE PROJECT DATA AND PREVIEW
        const indexPath = path.join(projectPath, 'index.json');
        await fs.writeJson(indexPath, { 
            version: "5.3.0",
            projectInfo: newProject.projectInfo,
            objects: [],
            background: "#ffffff",
            canvas: { width: 1080, height: 1080 },
            layers: generatedLayers 
        }, { spaces: 2 });

        if (previewLayers.length > 0) {
            try {
                await sharp({
                    create: { width: 1080, height: 1080, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
                })
                .composite(previewLayers)
                .png()
                .toFile(path.join(projectPath, 'preview.png'));
            } catch (err) {
                console.error('Failed to generate preview.png:', err.message);
            }
        }

        console.log(`Project generation complete: ${projectId}`);

        res.json({
            success: true,
            projectId,
            message: 'Project generated successfully'
        });

    } catch (error) {
        console.error('Project Generation Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
