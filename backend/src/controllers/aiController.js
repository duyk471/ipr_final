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
        const { canvasJson, screenshot, userPrompt } = req.body;

        if (!canvasJson) {
            return res.status(400).json({ success: false, message: 'Missing canvas JSON data' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'Gemini API Key is required. Please add it to backend/.env'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        console.log(`Analyzing design using Gemini Vision...`);

        let base64Image = "";
        if (screenshot) {
            base64Image = screenshot.split(',')[1] || screenshot;
        }

        if (!base64Image) {
            return res.status(400).json({ success: false, message: 'No visual design data found (screenshot required)' });
        }

        const systemPrompt = `
            You are a professional graphic designer and UI/UX expert.
            Review the attached design (screenshot) and its structure (JSON).
            ${userPrompt?.trim() ? `The user wants you to follow this additional creative direction: "${userPrompt.trim()}".` : 'No extra user direction was provided, so use your best professional judgment.'}
            
            TASKS:
            1. Review visual balance, color theory, typography, and spacing.
            2. Provide 3 specific, actionable suggestions for improvement.
            3. Generate a modified version of the "layers" array that implements your best suggestions.
            
            REQUIREMENTS:
            - Keep the EXACT SAME object structure as Fabric.js found in the source JSON.
            - **IMPORTANT**: If you believe adding a NEW AI-generated image (e.g. element, person, object) or text/rect would improve the design, you CAN insert new layer objects into the "layers" array!
            - For NEW images: Set type: "image", leave out the "src" property completely, and instead include a property "prompt" with a highly detailed description of the image to generate!
            - Return your response in this JSON format:
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
            { text: `SOURCE_PROJECT_JSON: ${JSON.stringify(canvasJson)}` }
        ]);

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI failed to return valid JSON');

        const assistantRes = JSON.parse(jsonMatch[0]);
        const assetsToReturn = [];

        // Post-process to generate new images if the AI suggested any
        if (assistantRes.updatedJson && Array.isArray(assistantRes.updatedJson.layers)) {
            for (let i = 0; i < assistantRes.updatedJson.layers.length; i++) {
                const layer = assistantRes.updatedJson.layers[i];

                if (layer.type === 'image' && !layer.src && layer.prompt) {
                    try {
                        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(layer.prompt + ", isolated on plain white background")}?nologo=true`;
                        const imgRes = await fetch(pollUrl);
                        if (imgRes.ok) {
                            let imgBuf = Buffer.from(await imgRes.arrayBuffer());

                            // Transparent Background extraction
                            const { data, info } = await sharp(imgBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
                            const w = info.width, h = info.height, threshold = 240;
                            const visited = new Uint8Array(w * h), queue = [];
                            const isBg = (x, y) => {
                                const idx = (y * w + x) * 4;
                                return data[idx] > threshold && data[idx + 1] > threshold && data[idx + 2] > threshold;
                            };
                            for (let x = 0; x < w; x++) {
                                if (isBg(x, 0)) { visited[x] = 1; queue.push(x, 0); }
                                if (isBg(x, h - 1)) { visited[(h - 1) * w + x] = 1; queue.push(x, h - 1); }
                            }
                            for (let y = 1; y < h - 1; y++) {
                                if (isBg(0, y)) { visited[y * w] = 1; queue.push(0, y); }
                                if (isBg(w - 1, y)) { visited[y * w + (w - 1)] = 1; queue.push(w - 1, y); }
                            }
                            let head = 0;
                            while (head < queue.length) {
                                const x = queue[head++], y = queue[head++], idx = y * w + x;
                                data[idx * 4 + 3] = 0;
                                const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                                for (const [nx, ny] of neighbors) {
                                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                        const nIdx = ny * w + nx;
                                        if (!visited[nIdx] && isBg(nx, ny)) { visited[nIdx] = 1; queue.push(nx, ny); }
                                    }
                                }
                            }
                            imgBuf = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();

                            const filename = `assistant_gen_${Date.now()}_${i}.png`;
                            assetsToReturn.push({ fileName: filename, base64: imgBuf.toString('base64') });

                            layer.src = `assets/${filename}`;
                            layer.width = w; layer.height = h;
                            layer.scaleX = 500 / w; layer.scaleY = 500 / h;
                            delete layer.prompt;
                        }
                    } catch (e) { console.error("Assistant image gen failed:", e); }
                }
            }
        }

        res.json({
            success: true,
            suggestions: assistantRes.suggestions,
            updatedJson: assistantRes.updatedJson,
            assets: assetsToReturn
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

        console.log(`Generating AI image for project ${projectId}: "${prompt}"`);

        let imageBuffer = null;
        let usedModel = "unknown";
        let source = "huggingface-ai";
        let lastError = "";

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

        if (!imageBuffer) {
            console.log(`--> Falling back to pollinations.ai for manual generation...`);
            try {
                const query = removeBackground ? `${prompt}, isolated on plain white background` : prompt;
                const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?nologo=true`;
                const response = await fetch(pollUrl);
                if (response.ok) {
                    const ab = await response.arrayBuffer();
                    imageBuffer = Buffer.from(ab);
                    usedModel = "pollinations.ai";
                    source = "pollinations";
                    console.log(`--> Success with pollinations.ai`);
                }
            } catch (err) {
                lastError = err.message;
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
        const { prompt } = req.body;
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

        console.log(`\n=========================================\nGenerating Project Layout: "${prompt}"\n=========================================`);

        // 1. SMART LAYOUT GENERATION WITH GEMINI
        const genAI = new GoogleGenerativeAI(geminiToken);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const systemPrompt = `
You are a world-class Art Director and a strict JSON API. Your job is to transform the user's prompt into a stunning, full-page, multi-layered design composition for a 1080x1080 canvas — like a professional Canva template.

The user wants to generate: "${prompt}".

=== MANDATORY COMPLEXITY RULES ===
- You MUST produce between 5 and 8 distinct elements in the "assets" array.
- The design MUST follow z-index order (bottom to top): Background → Decorative Shapes → Hero Image → Text Hierarchy.
- You MUST include ALL THREE text layers: a large HEADER, a SUBHEADER, and a BODY/CTA line.
- Every text layer MUST have different fontSize, fontWeight, and a fontFamily that matches the design tone.
- You MUST choose a coherent design palette. Do NOT use random colors. All colors must harmonize.

=== ELEMENT TYPES ===

1. TYPE "rect" — Rectangles (backgrounds, panels, accent bars):
   Required: "id", "type": "rect", "width", "height", "left", "top"
   Optional (USE THESE for richness):
   - "fill": hex string (use for solid fills)
   - "gradient": a Fabric.js linear gradient object, e.g.:
       { "type": "linear", "coords": { "x1": 0, "y1": 0, "x2": 0, "y2": 1080 }, "colorStops": [{ "offset": 0, "color": "#1a1a2e" }, { "offset": 1, "color": "#16213e" }] }
     Use gradient instead of fill for backgrounds. Do NOT set both fill and gradient.
   - "opacity": 0.0–1.0
   - "rx": number (border-radius, e.g. 16 for rounded panels)
   - "stroke": hex color
   - "strokeWidth": number
   - "strokeDashArray": [number, number] (e.g. [10, 5] for dashed borders)
   - "shadow": { "color": "rgba(0,0,0,0.5)", "blur": 30, "offsetX": 0, "offsetY": 10 }

2. TYPE "circle" — Circles (decorative orbs, badges):
   Required: "id", "type": "circle", "radius", "left", "top"
   Optional: "fill", "opacity", "stroke", "strokeWidth", "strokeDashArray", "shadow"

3. TYPE "triangle" — Triangles (geometric accents):
   Required: "id", "type": "triangle", "width", "height", "left", "top"
   Optional: "fill", "opacity", "angle" (rotation degrees), "shadow"

4. TYPE "image" — AI-generated photo or illustration:
   Required: "id", "type": "image", "prompt" (highly detailed text-to-image description), "width", "height", "left", "top"
   Optional: "removeBackground": boolean (true if it's a cutout subject on the design)

5. TYPE "text" — Typography:
   Required: "id", "type": "text", "text", "fontSize", "fontFamily", "fill", "left", "top"
   Optional (USE THESE for richness):
   - "fontWeight": "normal" | "bold"
   - "fontStyle": "normal" | "italic"
   - "textAlign": "left" | "center" | "right"
   - "charSpacing": number (letter-spacing, e.g. 200 for spaced-out headers)
   - "lineHeight": number (e.g. 1.3)
   - "width": number (wrap width in px, always set this for text blocks)
   - "shadow": { "color": "rgba(0,0,0,0.6)", "blur": 10, "offsetX": 2, "offsetY": 2 }
   - "stroke": hex
   - "strokeWidth": number
   FontFamily guide by tone:
     Modern/Tech: "Inter", "Helvetica", "Arial"
     Corporate: "Georgia", "Times New Roman"
     Elegant/Luxury: "Palatino", "Garamond"
     Playful: "Comic Sans MS", "Verdana"
     Bold/Impact: "Impact", "Arial Black"

=== COORDINATE RULES ===
- "left" and "top" are the CENTER of the object.
- Canvas is 1080x1080. Use rule-of-thirds: key content at ~360 or ~720 vertically.
- Header text: top third (y ≈ 180–350)
- Subheader: middle area (y ≈ 380–500)
- Body/CTA: lower third (y ≈ 750–900)
- Decorative shapes can bleed off-canvas edges for dynamic feel.

=== YOUR RESPONSE FORMAT ===
Return ONLY a raw JSON object — no markdown, no backticks, no explanation:
{
  "palette": "<Modern|Corporate|Elegant|Playful|Bold>",
  "canvasBackground": "<hex color — the dominant background color>",
  "assets": [ ...ordered array of 5-8 elements, background first, text last... ]
}
`;

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

        // 2. INITIALIZE PROJECT DATA
        const projectId = `ai_${Date.now()}`;
        const now = new Date().toISOString();
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
                width: 1080,
                height: 1080,
                backgroundColor: projectPlan.canvasBackground || "#ffffff",
                backgroundImage: null,
                zoom: 1,
                viewportTransform: [1, 0, 0, 1, 0, 0]
            },
            layers: [],
            history: { undoStack: [], redoStack: [] }
        };

        // 3. BUILD LAYERS & COLLECT ASSETS
        const generatedLayers = [];
        const assetsToReturn = []; // { fileName, base64 }

        for (const asset of projectPlan.assets) {
            // ── Helper: Build a Fabric.js shadow object ──
            const buildShadow = (s) => {
                if (!s) return undefined;
                return { color: s.color || 'rgba(0,0,0,0.3)', blur: s.blur || 10, offsetX: s.offsetX || 0, offsetY: s.offsetY || 0 };
            };

            // ── Helper: Build Fabric.js gradient ──
            const buildGradient = (g) => {
                if (!g || !g.colorStops) return undefined;
                return {
                    type: g.type || 'linear',
                    coords: g.coords || { x1: 0, y1: 0, x2: 0, y2: 1 },
                    colorStops: g.colorStops
                };
            };

            if (asset.type === 'text') {
                const shadow = buildShadow(asset.shadow);
                generatedLayers.push({
                    id: `obj_${asset.id}_${Date.now()}`,
                    type: "textbox",
                    version: "5.3.0",
                    originX: "center",
                    originY: "center",
                    left: asset.left || 540,
                    top: asset.top || 540,
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
                    ...(shadow ? { shadow } : {}),
                    visible: true,
                    selectable: true,
                    metadata: { source: "gemini-ai" }
                });
                continue;
            }

            if (asset.type === 'rect') {
                const gradient = buildGradient(asset.gradient);
                const shadow = buildShadow(asset.shadow);
                generatedLayers.push({
                    id: `obj_${asset.id}_${Date.now()}`,
                    type: "rect",
                    version: "5.3.0",
                    originX: "center",
                    originY: "center",
                    left: asset.left || 540,
                    top: asset.top || 540,
                    width: asset.width || 100,
                    height: asset.height || 100,
                    fill: gradient ? gradient : (asset.fill || "#000000"),
                    opacity: asset.opacity ?? 1,
                    rx: asset.rx ?? 0,
                    ry: asset.rx ?? 0,
                    ...(asset.stroke ? { stroke: asset.stroke, strokeWidth: asset.strokeWidth || 1 } : {}),
                    ...(asset.strokeDashArray ? { strokeDashArray: asset.strokeDashArray } : {}),
                    ...(shadow ? { shadow } : {}),
                    visible: true,
                    selectable: true,
                    metadata: { source: "gemini-ai" }
                });
                continue;
            }

            if (asset.type === 'circle') {
                const shadow = buildShadow(asset.shadow);
                generatedLayers.push({
                    id: `obj_${asset.id}_${Date.now()}`,
                    type: "circle",
                    version: "5.3.0",
                    originX: "center",
                    originY: "center",
                    left: asset.left || 540,
                    top: asset.top || 540,
                    radius: asset.radius || 50,
                    fill: asset.fill || "#000000",
                    opacity: asset.opacity ?? 1,
                    ...(asset.stroke ? { stroke: asset.stroke, strokeWidth: asset.strokeWidth || 1 } : {}),
                    ...(asset.strokeDashArray ? { strokeDashArray: asset.strokeDashArray } : {}),
                    ...(shadow ? { shadow } : {}),
                    visible: true,
                    selectable: true,
                    metadata: { source: "gemini-ai" }
                });
                continue;
            }

            if (asset.type === 'triangle') {
                const shadow = buildShadow(asset.shadow);
                generatedLayers.push({
                    id: `obj_${asset.id}_${Date.now()}`,
                    type: "triangle",
                    version: "5.3.0",
                    originX: "center",
                    originY: "center",
                    left: asset.left || 540,
                    top: asset.top || 540,
                    width: asset.width || 100,
                    height: asset.height || 100,
                    fill: asset.fill || "#000000",
                    opacity: asset.opacity ?? 1,
                    angle: asset.angle ?? 0,
                    ...(shadow ? { shadow } : {}),
                    visible: true,
                    selectable: true,
                    metadata: { source: "gemini-ai" }
                });
                continue;
            }

            // Image generation
            if (asset.type === 'image') {
                let imageBuffer = null;
                const models = ["black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-xl-base-1.0"];

                for (const modelId of models) {
                    try {
                        const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ inputs: asset.removeBackground ? `${asset.prompt}, isolated on plain white background` : asset.prompt })
                        });

                        if (response.ok) {
                            imageBuffer = Buffer.from(await response.arrayBuffer());
                            break;
                        }
                    } catch (err) { }
                }

                if (!imageBuffer) {
                    try {
                        const query = asset.removeBackground ? `${asset.prompt}, isolated on plain white background` : asset.prompt;
                        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?nologo=true`;
                        const response = await fetch(pollUrl);
                        if (response.ok) imageBuffer = Buffer.from(await response.arrayBuffer());
                    } catch (err) { }
                }

                if (!imageBuffer) continue;

                const metadata = await sharp(imageBuffer).metadata();
                const actualWidth = metadata.width || 1024;
                const actualHeight = metadata.height || 1024;
                const scale = asset.removeBackground
                    ? Math.min((asset.width || 500) / actualWidth, (asset.height || 500) / actualHeight)
                    : Math.max((asset.width || 500) / actualWidth, (asset.height || 500) / actualHeight);

                if (asset.removeBackground) {
                    const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
                    const w = info.width, h = info.height, threshold = 240;
                    const visited = new Uint8Array(w * h), queue = [];
                    const isBg = (x, y) => {
                        const idx = (y * w + x) * 4;
                        return data[idx] > threshold && data[idx + 1] > threshold && data[idx + 2] > threshold;
                    };
                    for (let x = 0; x < w; x++) {
                        if (isBg(x, 0)) { visited[x] = 1; queue.push(x, 0); }
                        if (isBg(x, h - 1)) { visited[(h - 1) * w + x] = 1; queue.push(x, h - 1); }
                    }
                    for (let y = 1; y < h - 1; y++) {
                        if (isBg(0, y)) { visited[y * w] = 1; queue.push(0, y); }
                        if (isBg(w - 1, y)) { visited[y * w + (w - 1)] = 1; queue.push(w - 1, y); }
                    }
                    let head = 0;
                    while (head < queue.length) {
                        const x = queue[head++], y = queue[head++], idx = y * w + x;
                        data[idx * 4 + 3] = 0;
                        const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                        for (const [nx, ny] of neighbors) {
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                const nIdx = ny * w + nx;
                                if (!visited[nIdx] && isBg(nx, ny)) { visited[nIdx] = 1; queue.push(nx, ny); }
                            }
                        }
                    }
                    imageBuffer = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
                }

                const filename = `layer_${asset.id}_${Date.now()}.png`;
                assetsToReturn.push({ fileName: filename, base64: imageBuffer.toString('base64') });

                generatedLayers.push({
                    id: `obj_${asset.id}_${Date.now()}`,
                    type: "image",
                    version: "5.3.0",
                    originX: "center", originY: "center",
                    left: asset.left || 540, top: asset.top || 540,
                    width: actualWidth, height: actualHeight,
                    scaleX: scale, scaleY: scale,
                    opacity: 1, visible: true, selectable: true,
                    src: `assets/${filename}`,
                    metadata: { source: "ai-gen", prompt: asset.prompt }
                });
            }
        }

        projectData.layers = generatedLayers;

        res.json({
            success: true,
            projectData: projectData,
            assets: assetsToReturn
        });

    } catch (error) {
        console.error('Project Generation Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const mergeImages = async (req, res) => {
    try {
        const { image, prompt, projectId, strength = 0.5, num_inference_steps = 4 } = req.body;

        if (!image || !projectId) {
            return res.status(400).json({ success: false, message: 'Missing image or projectId' });
        }

        const actualPrompt = prompt || "A seamless, professional photo-composite of the subjects placed in the background environment, matching lighting, consistent shadows, high resolution, 8k.";

        console.log(`Merging AI images for project ${projectId} with prompt: "${actualPrompt}"`);

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        if (!hfToken) {
            return res.status(400).json({ success: false, message: 'Hugging Face API key is missing' });
        }

        // Prepare image data (strip base64 prefix if present)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        
        let imageBuffer = null;
        let usedModel = "unknown";
        let lastError = "";

        const models = [
            "black-forest-labs/FLUX.1-schnell",
            "black-forest-labs/FLUX.1-dev"
        ];

        for (const modelId of models) {
            try {
                console.log(`Trying AI model for merge: ${modelId}...`);
                const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${hfToken}`,
                        'Content-Type': 'application/json',
                        'x-use-cache': 'false'
                    },
                    body: JSON.stringify({
                        inputs: base64Data,
                        parameters: {
                            prompt: actualPrompt,
                            strength: strength,
                            num_inference_steps: num_inference_steps
                        }
                    })
                });

                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    imageBuffer = Buffer.from(arrayBuffer);
                    usedModel = modelId;
                    break;
                } else if (response.status === 503) {
                    lastError = "503";
                    break; // Specific handling for 503 requested by user
                } else {
                    const err = await response.json().catch(() => ({ error: 'Unknown' }));
                    lastError = err.error || `Request failed with status ${response.status}`;
                    console.error(`Merge failed on ${modelId}:`, lastError);
                }
            } catch (err) {
                lastError = err.message;
                console.error(`Merge fetch error on ${modelId}:`, lastError);
            }
        }

        if (lastError === "503") {
            return res.status(503).json({ success: false, message: "AI Server is busy. Please try again in a few seconds." });
        }

        if (!imageBuffer) {
            throw new Error(`All AI models failed to merge. Last error: ${lastError}`);
        }

        // Save result
        const projectPath = path.join(STORAGE_ROOT, 'projects', projectId);
        const assetsPath = path.join(projectPath, 'assets');
        await fs.ensureDir(assetsPath);

        const filename = `ai_merged_${Date.now()}.png`;
        const filePath = path.join(assetsPath, filename);
        await fs.writeFile(filePath, imageBuffer);

        res.json({
            success: true,
            asset: {
                relativePath: `assets/${filename}`,
                displayUrl: `/storage/projects/${projectId}/assets/${filename}`
            },
            metadata: {
                source: "huggingface-ai-merge",
                model: usedModel,
                prompt: actualPrompt
            }
        });

    } catch (error) {
        console.error('AI Merge Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
