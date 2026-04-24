import sharp from 'sharp';

/**
 * Inpainting Service
 * Uses Hugging Face Inference API for Stable Diffusion Inpainting
 */

const HF_INPAINTING_MODELS = [
    'black-forest-labs/FLUX.2-dev'
];

/**
 * Perform inpainting on an image using Stable Diffusion
 * @param {Buffer} originalImageBuffer - Original image
 * @param {Buffer} maskBuffer - Binary mask (white = inpaint, black = preserve)
 * @param {string} prompt - Inpainting prompt/description
 * @param {string} negativePrompt - What NOT to generate (optional)
 * @returns {Promise<Buffer>} Inpainted image buffer
 */
export const inpaintImage = async (
    originalImageBuffer,
    maskBuffer,
    prompt,
    negativePrompt = ''
) => {
    try {
        const hfToken = process.env.HUGGINGFACE_API_KEY;
        if (!hfToken) {
            throw new Error('HUGGINGFACE_API_KEY is not set in environment variables');
        }

        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Prompt is required for inpainting');
        }

        // Prepare the "masked image" (blacken areas to change) for FLUX I2I
        // FLUX.2-devperforms best when the input image has the target areas blackened.
        console.log('Preparing blackened image for FLUX I2I...');
        
        // Ensure mask is same size as original
        const metadata = await sharp(originalImageBuffer).metadata();
        const { width, height } = metadata;
        
        const resizedMask = await sharp(maskBuffer)
            .resize(width, height)
            .grayscale()
            .toBuffer();

        // Blacken areas where mask is white (>= 128)
        // We use 'dest-out' to remove masked area, then flatten against black
        const blackenedImageBuffer = await sharp(originalImageBuffer)
            .composite([{
                input: resizedMask,
                blend: 'dest-out'
            }])
            .flatten({ background: '#000000' })
            .png()
            .toBuffer();

        const inputBase64 = blackenedImageBuffer.toString('base64');

        let result = null;
        let lastError = null;

        // Try each model in the list
        for (const modelId of HF_INPAINTING_MODELS) {
            try {
                console.log(`Attempting FLUX I2I with model: ${modelId}`);

                const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
                
                // FLUX I2I payload format
                const body = {
                    inputs: inputBase64,
                    parameters: {
                        prompt: prompt,
                        strength: 0.55, // Low denoising strength (0.4-0.6) as recommended
                        num_inference_steps: 30,
                        guidance_scale: 3.5
                    }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${hfToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                    timeout: 180000 // 3 minute timeout
                });

                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    result = Buffer.from(arrayBuffer);
                    console.log(`Success with model: ${modelId}`);
                    break;
                } else {
                    const errorText = await response.text();
                    lastError = `Model ${modelId}: ${response.status} - ${errorText}`;
                    console.warn(lastError);
                }
            } catch (error) {
                lastError = `Model ${modelId}: ${error.message}`;
                console.warn(lastError);
                continue;
            }
        }

        if (!result) {
            throw new Error(`All inpainting models failed. Last error: ${lastError}`);
        }

        // Validate result is a valid image
        const resultMetadata = await sharp(result).metadata();
        if (!resultMetadata || !resultMetadata.width) {
            throw new Error('Inpainting result is not a valid image');
        }

        console.log('Inpainting completed successfully');
        return result;

    } catch (error) {
        console.error('Inpainting Service Error:', error);
        throw error;
    }
};

/**
 * Blend inpainted result with original using a feathered mask transition
 * @param {Buffer} originalBuffer - Original image
 * @param {Buffer} inpaintedBuffer - Inpainted result
 * @param {Buffer} maskBuffer - Binary mask
 * @param {number} featherRadius - Radius for feathering blend (default: 10)
 * @returns {Promise<Buffer>} Blended result
 */
export const blendInpaintResult = async (
    originalBuffer,
    inpaintedBuffer,
    maskBuffer,
    featherRadius = 10
) => {
    try {
        console.log('Blending inpainted result with original image...');

        // Ensure all images are the same size
        const metadata = await sharp(originalBuffer).metadata();
        const { width, height } = metadata;

        const inpaintedResized = await sharp(inpaintedBuffer)
            .resize(width, height, { fit: 'cover' })
            .toBuffer();

        const maskResized = await sharp(maskBuffer)
            .resize(width, height, { fit: 'cover' })
            .toBuffer();

        // Get raw buffers for compositing
        const [originalRaw, inpaintedRaw, maskRaw] = await Promise.all([
            sharp(originalBuffer).raw().toBuffer(),
            sharp(inpaintedResized).raw().toBuffer(),
            sharp(maskResized).grayscale().raw().toBuffer()
        ]);

        // Composite using mask
        const blended = Buffer.alloc(originalRaw.length);
        const channels = 3; // Assuming RGB

        for (let i = 0; i < originalRaw.length; i += channels) {
            const maskIndex = Math.floor((i / channels) / channels);
            const maskValue = maskRaw[maskIndex] / 255; // Normalize to 0-1

            // Blend each channel
            for (let c = 0; c < channels; c++) {
                blended[i + c] = Math.round(
                    originalRaw[i + c] * (1 - maskValue) +
                    inpaintedRaw[i + c] * maskValue
                );
            }
        }

        // Convert back to PNG
        const result = await sharp(blended, {
            raw: {
                width,
                height,
                channels
            }
        }).png().toBuffer();

        console.log('Blending completed');
        return result;

    } catch (error) {
        console.error('Blend Error:', error);
        // Return inpainted result if blending fails
        return inpaintedBuffer;
    }
};
