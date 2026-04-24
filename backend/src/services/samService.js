import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';

/**
 * SAM (Segment Anything Model) Service
 * Uses Hugging Face Inference API for masking
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
        if (!hfToken) {
            throw new Error('HUGGINGFACE_API_KEY is not set in environment variables');
        }

        // Convert image buffer to base64
        const base64Image = imageBuffer.toString('base64');

        // Prepare SAM input
        const samInput = {
            image: base64Image,
            ...selectionData // Include bbox or points
        };

        console.log('Calling Hugging Face SAM API for mask generation...');

        // Call Hugging Face Inference API
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(samInput),
            timeout: 120000 // 2 minute timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SAM API error:', errorText);
            throw new Error(`SAM API failed: ${response.status} - ${errorText}`);
        }

        // Response should be a mask image
        const maskBuffer = await response.buffer();

        // Convert mask to binary data and grayscale
        const { data, info } = await sharp(maskBuffer)
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Create binary mask (0 or 255)
        const binaryMask = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            binaryMask[i] = data[i] > 127 ? 255 : 0;
        }

        // Convert back to PNG
        const maskImageBuffer = await sharp(binaryMask, {
            raw: {
                width: info.width,
                height: info.height,
                channels: 1
            }
        }).png().toBuffer();

        console.log('Mask generated successfully');

        return {
            maskBuffer: maskImageBuffer,
            maskData: Array.from(binaryMask),
            dimensions: {
                width: info.width,
                height: info.height
            }
        };

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
