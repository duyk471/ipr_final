import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { createNewProject } from '../services/storageService.js';

import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT = path.join(__dirname, '../../../storage');

/**
 * Simple Google Image Scraper
 * @param {string} query 
 * @returns {Promise<string[]>}
 */
const scrapeGoogleImage = async (query) => {
    try {
        console.log(`Scraping Google Images for: "${query}"`);
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=active`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error("Google search failed");
        
        const html = await response.text();
        
        // Find image URLs in the HTML
        const results = [];
        
        // 1. Look for encrypted thumbnails (very reliable)
        const thumbnailPattern = /https:\/\/encrypted-tbn[0-9]\.gstatic\.com\/images\?q=tbn:[^"'\s]+/g;
        const matches = html.match(thumbnailPattern) || [];
        results.push(...new Set(matches));

        // 2. Look for common image extensions in the HTML (can find better quality)
        const imgLinksPattern = /"https?:\/\/[^"]+?\.(?:jpg|png|jpeg|webp)"/g;
        const imgMatches = html.match(imgLinksPattern) || [];
        const cleanedImgMatches = imgMatches.map(m => m.replace(/"/g, ''));
        results.push(...new Set(cleanedImgMatches));
        
        // 3. Look for data-iurl (another common source for thumbnails in script tags)
        const iurlPattern = /data-iurl="([^"]+)"/g;
        let iurlMatch;
        while ((iurlMatch = iurlPattern.exec(html)) !== null) {
            results.push(iurlMatch[1]);
        }
        
        // Filter out some common tracking/icon domains
        return [...new Set(results)].filter(u => 
            !u.includes('gstatic.com/m/') && 
            !u.includes('google-analytics.com') &&
            !u.includes('favicon')
        );
    } catch (err) {
        console.error("Scraping error:", err);
        return [];
    }
};

/**
 * Download Image Helper
 */
const downloadImage = async (url) => {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Basic validation: Check if it's actually an image
        if (buffer.length < 100) return null;
        
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

export const generateProjectFromPrompt = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, message: 'Missing prompt' });
        }

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        const geminiToken = process.env.GEMINI_API_KEY;

        if (!hfToken || !geminiToken) {
            return res.status(400).json({
                success: false,
                message: 'Missing required API keys. Please check backend/.env'
            });
        }

        console.log(`Generating project from prompt: "${prompt}"`);

        // 1. Ask Gemini to break down the prompt
        const genAI = new GoogleGenerativeAI(geminiToken);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemPrompt = `
You are an expert AI art director generating a structured project layout based on a user's prompt.
The user wants to generate an image composition: "${prompt}".

Break this down into logical assets. Always include exactly one "background" and one or more "foreground" subjects.
For each asset, define:
- id: a unique short string
- prompt: an optimized, highly descriptive image generation prompt. For foreground subjects, always include "isolated on plain white background. cinematic lighting, 8k".
- search_query: a very short, concise keyword phrase (2-4 words) for finding this image on Google.
- type: "background" or "foreground"
- width: 1080 (for background), 600-800 for main subjects, 200-400 for secondary subjects.
- height: 1080 (for background), 600-800 for main subjects, 200-400 for secondary subjects.

LAYOUT GUIDELINES (on a 1080x1080 canvas):
- Background: Always at left: 540, top: 540, width: 1080, height: 1080.
- Foreground Subject 1 (Subject): Usually centered horizontally (left: 540) but positioned lower (top: 600-800) to ground them in the scene.
- Foreground Subject 2+ (Accessories/Other): Offset them logically (left: 300 or 800) depending on the story.
- Avoid placing elements too close to the canvas edges unless it's a stylistic choice.
- Think about depth: subjects in front should be slightly lower on the canvas.

Return your response AS A VALID JSON OBJECT EXACTLY matching this format:
{
  "assets": [
    {
      "id": "bg",
      "prompt": "detailed magical forest background, cinematic lighting, 8k",
      "search_query": "magical forest background",
      "type": "background",
      "width": 1080,
      "height": 1080,
      "left": 540,
      "top": 540
    },
    {
      "id": "fg1",
      "prompt": "a cute golden retriever wearing a wizard hat, isolated on plain white background",
      "search_query": "golden retriever wizard hat",
      "type": "foreground",
      "width": 600,
      "height": 600,
      "left": 540,
      "top": 750
    }
  ]
}
No other text, just the JSON.
`;

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI failed to return valid JSON for project structure.');
        }

        const projectPlan = JSON.parse(jsonMatch[0]);
        if (!projectPlan.assets || !Array.isArray(projectPlan.assets)) {
            throw new Error('Invalid project plan format from AI.');
        }

        // 2. Create the project
        const newProject = await createNewProject(`AI Gen: ${prompt.substring(0, 20)}...`, 1080, 1080);
        const projectId = newProject.projectInfo.id;
        const projectPath = path.join(STORAGE_ROOT, 'projects', projectId);
        const assetsPath = path.join(projectPath, 'assets');

        // 3. Generate each image using HuggingFace
        const models = [
            "black-forest-labs/FLUX.1-schnell",
            "stabilityai/stable-diffusion-xl-base-1.0",
            "runwayml/stable-diffusion-v1-5"
        ];

        const generatedLayers = [];
        const previewLayers = [];

        for (const asset of projectPlan.assets) {
            console.log(`Processing asset ${asset.id}: ${asset.prompt}`);
            let imageBuffer = null;
            let usedModel = "google-scrape";
            let source = "google-images";

            // --- STRATEGY 1: SCRAPE GOOGLE IMAGES ---
            try {
                const query = asset.search_query || asset.prompt.split(',')[0];
                const scrapedUrls = await scrapeGoogleImage(query);
                for (const url of scrapedUrls.slice(0, 5)) { // Try first 5 results
                    console.log(`Trying to download scraped image: ${url}`);
                    const buffer = await downloadImage(url);
                    if (buffer) {
                        imageBuffer = buffer;
                        break;
                    }
                }
            } catch (err) {
                console.warn(`Scraping failed for asset ${asset.id}: ${err.message}`);
            }

            // --- STRATEGY 2: FALLBACK TO HUGGINGFACE AI ---
            if (!imageBuffer) {
                console.log(`Falling back to AI generation for asset ${asset.id}`);
                source = "huggingface-router";
                for (const modelId of models) {
                    try {
                        const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${hfToken}`,
                                'Content-Type': 'application/json',
                                'x-use-cache': 'false'
                            },
                            body: JSON.stringify({ inputs: asset.prompt })
                        });

                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            imageBuffer = Buffer.from(arrayBuffer);
                            usedModel = modelId;
                            break;
                        }
                    } catch (err) {
                        console.warn(`Model ${modelId} failed for asset ${asset.id}`);
                    }
                }
            }

            // Get actual dimensions and calculate scaling
            const metadata = await sharp(imageBuffer).metadata();
            const actualWidth = metadata.width || 1024;
            const actualHeight = metadata.height || 1024;
            
            let scaleX = 1;
            let scaleY = 1;

            if (asset.type === 'background') {
                // Background: Cover the entire 1080x1080 canvas
                const scale = Math.max(1080 / actualWidth, 1080 / actualHeight);
                scaleX = scale;
                scaleY = scale;
            } else {
                // Foreground: Fit into planned size but maintain aspect ratio
                const targetW = asset.width || 600;
                const targetH = asset.height || 600;
                const scale = Math.min(targetW / actualWidth, targetH / actualHeight);
                scaleX = scale;
                scaleY = scale;
            }

            // Remove Background if foreground
            if (asset.type === 'foreground') {
                console.log(`Removing background for ${asset.id}...`);
                // Re-process with sharp to get alpha channel and perform flood fill
                const { data, info } = await sharp(imageBuffer)
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true });
                
                const width = info.width;
                const height = info.height;
                const threshold = 240;
                const visited = new Uint8Array(width * height);
                const queue = [];

                const isWhite = (x, y) => {
                    const pos = (y * width + x) * 4;
                    return data[pos] > threshold && data[pos + 1] > threshold && data[pos + 2] > threshold;
                };

                for (let x = 0; x < width; x++) {
                    if (isWhite(x, 0)) { visited[x] = 1; queue.push(x, 0); }
                    if (isWhite(x, height - 1)) { visited[(height - 1) * width + x] = 1; queue.push(x, height - 1); }
                }
                for (let y = 1; y < height - 1; y++) {
                    if (isWhite(0, y)) { visited[y * width] = 1; queue.push(0, y); }
                    if (isWhite(width - 1, y)) { visited[y * width + (width - 1)] = 1; queue.push(width - 1, y); }
                }

                let head = 0;
                while (head < queue.length) {
                    const x = queue[head++];
                    const y = queue[head++];
                    const idx = y * width + x;
                    data[idx * 4 + 3] = 0;

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
                    raw: { width, height, channels: 4 }
                }).png().toBuffer();
            }

            // Save asset to folder
            const filename = `ai_${asset.id}_${Date.now()}.png`;
            const filePath = path.join(assetsPath, filename);
            await fs.writeFile(filePath, imageBuffer);

            // Add layer to composition
            generatedLayers.push({
                id: `layer_${asset.id}_${Date.now()}`,
                type: "image",
                version: "5.3.0",
                originX: "center",
                originY: "center",
                left: asset.left || 540,
                top: asset.top || 540,
                width: actualWidth,
                height: actualHeight,
                scaleX: scaleX,
                scaleY: scaleY,
                angle: 0,
                flipX: false,
                flipY: false,
                opacity: 1,
                visible: true,
                selectable: true,
                src: `assets/${filename}`,
                crossOrigin: "anonymous",
                metadata: {
                    source: source,
                    model: usedModel,
                    prompt: asset.prompt
                }
            });

            // Prepare for preview composition
            try {
                const resizedBuffer = await sharp(imageBuffer)
                    .resize(Math.round(actualWidth * scaleX), Math.round(actualHeight * scaleY))
                    .toBuffer();
                
                previewLayers.push({
                    input: resizedBuffer,
                    top: Math.round((asset.top || 540) - (actualHeight * scaleY / 2)),
                    left: Math.round((asset.left || 540) - (actualWidth * scaleX / 2))
                });
            } catch (err) {
                console.warn(`Failed to add layer ${asset.id} to preview:`, err.message);
            }
        }

        // Update the project's index.json
        const indexPath = path.join(projectPath, 'index.json');
        const projectData = await fs.readJson(indexPath);
        projectData.layers = generatedLayers;
        await fs.writeJson(indexPath, projectData, { spaces: 2 });

        // Generate preview.png
        if (previewLayers.length > 0) {
            try {
                console.log(`Generating preview.png for project ${projectId}...`);
                await sharp({
                    create: {
                        width: 1080,
                        height: 1080,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    }
                })
                .composite(previewLayers)
                .png()
                .toFile(path.join(projectPath, 'preview.png'));
            } catch (err) {
                console.error('Failed to generate preview.png:', err);
            }
        }

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
