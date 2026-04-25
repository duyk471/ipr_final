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

    const result = await model.generateContent([
        { text: systemPrompt },
        { inlineData: { data: base64Image, mimeType: "image/png" } },
        { text: `SOURCE_PROJECT_JSON: ${JSON.stringify(canvasJson)}` }
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI failed to return valid JSON');

    return JSON.parse(jsonMatch[0]);
};

export const generateLayoutFromPrompt = async (prompt) => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');
    
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
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
    responseText = responseText.replace(/```json\n?/, '').replace(/```\n?/, '').trim();

    return JSON.parse(responseText);
};

export const enhanceMergePrompt = async (base64Image, basePrompt) => {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');
    
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    
    const visionPrompt = `Analyze this composite image containing multiple layers. Write a highly detailed, descriptive prompt suitable for a text-to-image AI (like FLUX) to recreate this exact composition as a single, photorealistic, seamless image. Describe the main subjects, their exact positions, the background environment, and the lighting. Ensure the prompt starts with: "A seamless, professional photo-composite of...". Context: ${basePrompt}`;
    
    try {
        const result = await model.generateContent([
            visionPrompt,
            { inlineData: { data: base64Image, mimeType: "image/png" } }
        ]);
        return result.response.text().trim();
    } catch (err) {
        console.error("Gemini Vision failed, falling back to original prompt:", err.message);
        return basePrompt;
    }
};
