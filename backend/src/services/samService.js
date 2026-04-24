import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * SAM (Segment Anything Model) Service
 * Uses Hugging Face Inference API with a Gemini fallback
 */

const HF_API_URL = 'https://api-inference.huggingface.co/models/facebook/sam-vit-huge';

/**
 * Generate a mask using SAM based on bounding box or points
 * @param {Buffer} imageBuffer - The image data
 * @param {Object} selectionData - Selection data (bbox or points)
 * @param {Array} selectionData.bbox - [x, y, width, height] bounding box
 * @param {Array} selectionData.points - Array of [x, y] points for prompting
 * @returns {Promise<{maskBuffer: Buffer, maskData: Array, bbox: Array}>}
 */
export const generateMask = async (imageBuffer, selectionData) => {
    try {
        const hfToken = process.env.HUGGINGFACE_API_KEY;
        const geminiToken = process.env.GEMINI_API_KEY;

        if (!hfToken) {
            throw new Error('HUGGINGFACE_API_KEY is not set');
        }

        // Get image dimensions
        const metadata = await sharp(imageBuffer).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;

        // Resize image for AI processing (max 800px) to avoid large payload errors
        const AI_MAX_SIZE = 800;
        const aiScale = Math.min(1, AI_MAX_SIZE / Math.max(originalWidth, originalHeight));
        // Use JPEG for AI services to significantly reduce payload size (prevents 413 error)
        const aiImageBuffer = aiScale < 1 
            ? await sharp(imageBuffer).resize(Math.round(originalWidth * aiScale)).jpeg({ quality: 85 }).toBuffer()
            : await sharp(imageBuffer).jpeg({ quality: 85 }).toBuffer();

        // Scale selection data to match AI image size
        const aiSelectionData = { ...selectionData };
        if (aiScale < 1) {
            if (aiSelectionData.bbox) {
                aiSelectionData.bbox = aiSelectionData.bbox.map(v => v * aiScale);
            }
            if (aiSelectionData.points) {
                aiSelectionData.points = aiSelectionData.points.map(p => ({
                    ...p,
                    x: p.x * aiScale,
                    y: p.y * aiScale
                }));
            }
        }

        // Try Hugging Face first
        try {
            console.log(`Attempting Hugging Face SAM API (Scaled to ${aiScale.toFixed(2)}x)...`);
            
            const samInput = {
                inputs: aiImageBuffer.toString('base64'),
                parameters: aiSelectionData
            };

            let response;
            let retries = 3;
            while (retries > 0) {
                response = await fetch(HF_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${hfToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(samInput)
                });

                if (response.status === 503) {
                    console.log('HF Model is loading, waiting 5s...');
                    await new Promise(r => setTimeout(r, 5000));
                    retries--;
                    continue;
                }
                break;
            }

            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const maskBuffer = Buffer.from(arrayBuffer);

                // Check if it's actually an image
                const maskMetadata = await sharp(maskBuffer).metadata().catch(() => null);
                if (maskMetadata) {
                    console.log('Successfully generated mask via HF');
                    const processedMask = await sharp(maskBuffer)
                        .resize(originalWidth, originalHeight)
                        .grayscale()
                        .threshold(128)
                        .png()
                        .toBuffer();

                    return {
                        maskBuffer: processedMask,
                        dimensions: { width: originalWidth, height: originalHeight }
                    };
                }
            }
            
            const errorText = await response.text().catch(() => 'Unknown error');
            console.warn(`HF SAM failed (${response.status}): ${errorText}`);
        } catch (hfError) {
            console.warn('HF SAM API error:', hfError.message);
        }

        // Fallback to Gemini if HF fails or is not available
        if (geminiToken) {
            console.log(`Falling back to Gemini for segmentation (Scaled to ${aiScale.toFixed(2)}x)...`);
            const genAI = new GoogleGenerativeAI(geminiToken);
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            const prompt = `
                I have an image and a selection.
                Selection Type: ${aiSelectionData.bbox ? 'Bounding Box' : 'Points'}
                Selection Details: ${JSON.stringify(aiSelectionData)}
                Scaled Image Dimensions: ${Math.round(originalWidth * aiScale)}x${Math.round(originalHeight * aiScale)}
                Original Dimensions: ${originalWidth}x${originalHeight}
                
                Please identify the object at this location and return a JSON object with a "polygon" property.
                The polygon should be a list of [x, y] coordinates (relative to the SCALED image) that form a VERY precise boundary around the object.
                Return ONLY the JSON.
            `;

            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: aiImageBuffer.toString('base64'),
                        mimeType: "image/jpeg"
                    }
                }
            ]);

            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                if (data.polygon && Array.isArray(data.polygon)) {
                    console.log(`Gemini generated a polygon with ${data.polygon.length} points`);
                    
                    // Upscale polygon points back to original size
                    const upscaledPolygon = data.polygon.map(p => [p[0] / aiScale, p[1] / aiScale]);
                    const svgPoints = upscaledPolygon.map(p => `${p[0]},${p[1]}`).join(' ');
                    const svgMask = `
                        <svg width="${originalWidth}" height="${originalHeight}">
                            <polygon points="${svgPoints}" fill="white" />
                        </svg>
                    `;

                    const maskBuffer = await sharp({
                        create: {
                            width: originalWidth,
                            height: originalHeight,
                            channels: 3,
                            background: { r: 0, g: 0, b: 0 }
                        }
                    })
                    .composite([{ input: Buffer.from(svgMask), blend: 'add' }])
                    .png()
                    .toBuffer();

                    return {
                        maskBuffer,
                        dimensions: { width: originalWidth, height: originalHeight }
                    };
                }
            }
        }

        throw new Error('All mask generation methods failed.');

    } catch (error) {
        console.error('SAM Service Error:', error);
        throw error;
    }
};

/**
 * Convert bounding box to SAM input format
 * @param {Array} bbox - [x, y, width, height]
 * @returns {Object} SAM-formatted input
 */
export const bboxToSAMInput = (bbox) => {
    const [x, y, width, height] = bbox;
    return {
        bbox: [x, y, x + width, y + height] // Convert to [x1, y1, x2, y2]
    };
};

/**
 * Convert points to SAM input format
 * @param {Array} points - Array of [x, y] coordinates
 * @returns {Object} SAM-formatted input
 */
export const pointsToSAMInput = (points) => {
    return {
        points: points.map(p => ({ x: p[0], y: p[1], label: 1 }))
    };
};
