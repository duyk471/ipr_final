import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env.js';

export const analyzeDesignWithVision = async (base64Image, canvasJson, userPrompt) => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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

    // Strip data URI header if present
    const rawBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const result = await model.generateContent([
        { text: systemPrompt },
        { inlineData: { data: rawBase64, mimeType: "image/png" } },
        { text: `SOURCE_PROJECT_JSON: ${JSON.stringify(canvasJson)}` }
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI failed to return valid JSON');

    return JSON.parse(jsonMatch[0]);
};

export const generateLayoutFromPrompt = async (prompt, magicPrompt = false) => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    let finalPrompt = prompt;

    if (magicPrompt) {
        const magicSystemPrompt = `You are a world-class Art Director. The user has provided a short idea for a design layout: "${prompt}".
Your task is to expand this into a highly detailed professional design specification.
Describe the ideal layout hierarchy, the exact color palette to use, the types of typography (sans-serif, serif, display), the exact mood, and the visual assets (images, shapes) needed.
Output a single detailed paragraph that will be used as the ultimate instruction to a design-generating AI.`;

        try {
            const magicResult = await model.generateContent(magicSystemPrompt);
            finalPrompt = magicResult.response.text().trim();
            console.log("Magic Prompt Expanded:", finalPrompt);
        } catch (err) {
            console.error("Magic Prompt expansion failed, falling back to original prompt", err);
        }
    }

    const systemPrompt = `
You are a world-class Art Director and a strict JSON API. Your job is to transform the user's prompt into a stunning, full-page, multi-layered design composition — like a professional Canva template.

The user wants to generate: "${finalPrompt}".

=== MANDATORY COMPLEXITY RULES ===
- You MUST produce between 5 and 8 distinct elements in the "assets" array.
- The design MUST follow z-index order (bottom to top): Background → Decorative Shapes → Hero Image → Text Hierarchy.
- You MUST include ALL THREE text layers: a large HEADER, a SUBHEADER, and a BODY/CTA line.
- Every text layer MUST have different fontSize, fontWeight, and a fontFamily that matches the design tone.
- You MUST choose a coherent design palette. Do NOT use random colors. All colors must harmonize.
- DO NOT create large rectangle "rect" layers just to act as the canvas background. Use the canvas background property instead.

=== INTELLIGENT SIZING LOGIC ===
Determine the optimal canvas size based on the user's intent:
- "Portrait", "Story", "TikTok", "Reels" -> width: 1080, height: 1920
- "Landscape", "YouTube", "Thumbnail", "Presentation" -> width: 1920, height: 1080
- "Banner", "Cover", "Header" -> width: 1200, height: 630
- "Post", "Square", "Instagram" -> width: 1080, height: 1080
If unsure, default to 1080x1080.

=== ELEMENT TYPES ===

1. TYPE "rect" — Rectangles (panels, accent bars):
   Required: "id", "type": "rect", "width", "height", "left", "top"
   Optional (USE THESE for richness):
   - "fill": hex string (use for solid fills)
   - "gradient": a Fabric.js linear gradient object, e.g.:
       { "type": "linear", "coords": { "x1": 0, "y1": 0, "x2": 0, "y2": 1080 }, "colorStops": [{ "offset": 0, "color": "#1a1a2e" }, { "offset": 1, "color": "#16213e" }] }
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
    FontFamily guide by category (ONLY use these exact names):
      Sans-Serif (Modern): "Inter", "Roboto", "Montserrat", "Poppins", "Open Sans", "Lato", "Raleway", "Nunito"
      Serif (Classic/Elegant): "Playfair Display", "Lora", "Merriweather", "PT Serif", "Crimson Text"
      Display (Bold/Unique): "Oswald", "Syne", "Anton", "Bebas Neue"
      Handwriting (Creative): "Pacifico", "Dancing Script", "Caveat"

=== COORDINATE RULES ===
- "left" and "top" are the CENTER of the object.
- Base your coordinates on the canvas size you chose. Use rule-of-thirds.
- Decorative shapes can bleed off-canvas edges for dynamic feel.

=== YOUR RESPONSE FORMAT ===
Return ONLY a raw JSON object — no markdown, no backticks, no explanation:
{
  "palette": "<Modern|Corporate|Elegant|Playful|Bold>",
  "canvas": {
    "width": <determined width>,
    "height": <determined height>,
    "backgroundColor": "<hex color — the dominant background color>"
  },
  "assets": [ ...ordered array of 5-8 elements, text last... ]
}
`;

    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/, '').replace(/```\n?/, '').trim();

    return JSON.parse(responseText);
};

export const enhanceMergePrompt = async (base64Image, basePrompt, aspectRatio = "1:1") => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const visionPrompt = `Analyze this composite image containing multiple layers. Your task is to write a highly detailed, descriptive prompt for a text-to-image AI to recreate this EXACT composition as a single, photorealistic, seamless image.

CRITICAL INSTRUCTIONS:
1. FOCUS ON SUBJECTS: Identify the main subjects in the image. Do NOT invent unrelated objects, people, faces, hands, or human figures. If the input shows products or inanimate objects, the output MUST NOT contain any humans.
2. COMPOSITION: Describe the exact placement, scale, and orientation of each subject as seen in the composite.
3. BACKGROUND: The output must have a clean, neutral, minimal background (like a solid color or a simple studio surface) to make it easy to isolate. Do NOT describe complex environments, crowds, or busy scenes.
4. STYLE: Professional product photography style, sharp focus, 8k, realistic lighting and shadows.
5. NO HALLUCINATIONS: Do not add elements that are not present in the source layers unless requested by the goal.
6. OUTPUT FORMAT: Output ONLY the final prompt string. No preamble.

Goal/Creative Direction: ${basePrompt}`;

    try {
        console.log("--- Gemini Vision Prompt ---");
        console.log(visionPrompt);
        console.log("----------------------------");

        // Strip data URI header if present
        const rawBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

        const result = await model.generateContent([
            visionPrompt,
            { inlineData: { data: rawBase64, mimeType: "image/png" } }
        ]);
        let finalPrompt = result.response.text().trim();

        console.log("Gemini Raw Response:", finalPrompt);

        // Use natural language for aspect ratio and background
        finalPrompt = `${finalPrompt}. Aspect ratio ${aspectRatio}. High quality, isolated on a simple background.`;
        return finalPrompt;
    } catch (err) {
        console.error("Gemini Vision failed. Full Error:", err);
        return `${basePrompt} --ar ${aspectRatio} --no background`;
    }
};

export const describeImageWithGemini = async (base64Image) => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    // User requested specific model: gemma-4-26b-a4b-it
    const model = genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" });

    const prompt = "Describe this image in detail. Provide a creative, evocative description including style, colors, subjects, and mood. Ensure the output is a concise paragraph suitable for a designer.";

    try {
        // Strip data URI header if present
        const rawBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { data: rawBase64, mimeType: "image/png" } }
        ]);
        return result.response.text().trim();
    } catch (err) {
        console.error("Gemini Vision Description failed:", err.message);
        throw err;
    }
};

export const generateThemePaletteWithGemini = async (mood, canvasJson = null) => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    // Use the standard model for fast, reliable JSON text generation
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const systemPrompt = `You are a master color theorist and UI / UX designer.
Your task is to curate a theme and apply it to a user's design project.

USER MOOD / VIBE: "${mood}"

${canvasJson ? `EXISTING PROJECT JSON: 
${JSON.stringify(canvasJson)}

TASKS:
1. Analyze the existing elements (text, shapes, backgrounds).
2. Curate a 5-color palette that perfectly reflects the requested mood while maintaining maximum legibility.
3. MODIFY the provided Project JSON:
   - Update 'fill' and 'stroke' properties of all text and shapes.
   - Update the canvas 'backgroundColor' (or the largest background rectangle if one exists).
   - Ensure excellent contrast (Light on Dark or Dark on Light).
   - DO NOT MODIFY image filters or image sources.` : 'No project context provided. Just generate a palette.'
        }

=== RESPONSE FORMAT ===
            Return a raw JSON object with NO MARKDOWN:
            {
                "palette_name": "Creative Palette Name",
                    "hex_codes": ["#color1", "#color2", "#color3", "#color4", "#color5"],
                        "updatedJson": ${canvasJson ? "{ ...the modified project JSON structure... }" : "null"}
            } `;

    try {
        const result = await model.generateContent(systemPrompt);
        let responseText = result.response.text();
        // Clean up markdown if model still included it
        responseText = responseText.replace(/```json\n ? /, '').replace(/```\n?/, '').trim();
        return JSON.parse(responseText);
    } catch (err) {
        console.error("Gemini Theme Generation failed:", err.message);
        throw new Error("Failed to generate theme palette. Please try another mood.");
    }
};

export const extractStylesWithGemini = async (base64Image) => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const systemPrompt = `You are a world - class Art Director and Style Analyst.
Analyze the provided image and extract 4 DISTINCT technical design styles that could be used to recreate this aesthetic or variations of it in an AI Image Generator.
Each style should have a catchy 'name' and a 'tags' string containing a comma - separated list of highly effective, technical prompt keywords(e.g., lighting, camera angle, color grading, art movement, texture).

Return EXACTLY a raw JSON array of 4 objects with NO MARKDOWN formatting:
        [
            {
                "name": "Cinematic Realism",
                "tags": "8k resolution, cinematic lighting, photorealistic, volumetric fog, dramatic shadows, 35mm lens"
            },
            ...
]`;

    try {
        const result = await model.generateContent([
            { text: systemPrompt },
            { inlineData: { data: base64Image, mimeType: "image/png" } }
        ]);
        let responseText = result.response.text();
        responseText = responseText.replace(/```json\n ? /, '').replace(/```\n?/, '').trim();
        return JSON.parse(responseText);
    } catch (err) {
        console.error("Gemini Style Extraction failed:", err.message);
        throw new Error("Failed to extract styles from the image.");
    }
};

export const generateTextWithGemini = async (prompt, systemInstruction = "") => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", // Use 1.5 flash for fast text generation
        systemInstruction: systemInstruction
    });

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (err) {
        console.error("Gemini Text Generation failed:", err.message);
        throw err;
    }
};
