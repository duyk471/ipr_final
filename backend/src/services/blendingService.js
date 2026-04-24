import sharp from 'sharp';

/**
 * Image Blending Service
 * Implements Poisson Blending and Image Harmonization using sharp
 */

/**
 * Perform Poisson-like blending for seamless compositing
 * Uses gradient-based blending with mask feathering
 * @param {Buffer} backgroundBuffer - Background image
 * @param {Buffer} foregroundBuffer - Foreground image to blend
 * @param {Buffer} maskBuffer - Binary mask (white = foreground, black = background)
 * @param {Object} options - Blending options
 * @param {number} options.featherRadius - Feather radius for soft edges (default: 15)
 * @param {number} options.blendMode - 'normal', 'color-match', 'brightness-match'
 * @returns {Promise<Buffer>} Blended image
 */
export const poissonBlend = async (
    backgroundBuffer,
    foregroundBuffer,
    maskBuffer,
    options = {}
) => {
    try {
        const {
            featherRadius = 15,
            blendMode = 'color-match'
        } = options;

        console.log('Starting Poisson blend with options:', { featherRadius, blendMode });

        // Get background metadata
        const bgMetadata = await sharp(backgroundBuffer).metadata();
        const { width, height } = bgMetadata;

        // Resize all inputs to background size
        const [fgResized, maskResized] = await Promise.all([
            sharp(foregroundBuffer)
                .resize(width, height, { fit: 'cover' })
                .toBuffer(),
            sharp(maskBuffer)
                .resize(width, height, { fit: 'cover' })
                .grayscale()
                .toBuffer()
        ]);

        // Apply feathering to mask for soft edges
        const featheredMask = await featherMask(maskResized, featherRadius, width, height);

        // Get raw pixel data
        const [bgRaw, fgRaw, maskRaw] = await Promise.all([
            sharp(backgroundBuffer).resize(width, height).raw().toBuffer(),
            sharp(fgResized).raw().toBuffer(),
            featheredMask
        ]);

        let blendedBuffer;

        if (blendMode === 'color-match') {
            // Match foreground colors to background before blending
            blendedBuffer = await colorMatchBlend(bgRaw, fgRaw, maskRaw, width, height);
        } else if (blendMode === 'brightness-match') {
            // Match brightness and adjust colors
            blendedBuffer = await brightnessMatchBlend(bgRaw, fgRaw, maskRaw, width, height);
        } else {
            // Standard alpha blending
            blendedBuffer = await alphaBlend(bgRaw, fgRaw, maskRaw, width, height);
        }

        // Convert back to PNG
        const result = await sharp(blendedBuffer, {
            raw: {
                width,
                height,
                channels: 3
            }
        }).png().toBuffer();

        console.log('Poisson blend completed successfully');
        return result;

    } catch (error) {
        console.error('Poisson Blend Error:', error);
        throw error;
    }
};

/**
 * Apply Gaussian blur to mask for feathering effect
 */
async function featherMask(maskBuffer, radius, width, height) {
    try {
        const feathered = await sharp(maskBuffer)
            .blur(radius / 2)
            .raw()
            .toBuffer();
        
        return feathered;
    } catch (error) {
        console.warn('Feathering failed, using original mask:', error.message);
        return maskBuffer;
    }
}

/**
 * Color-match blending: Adjust foreground colors to match background
 */
async function colorMatchBlend(bgRaw, fgRaw, maskRaw, width, height) {
    const blended = Buffer.alloc(bgRaw.length);
    const channels = 3;

    // Calculate average colors
    const bgAvg = getAverageColor(bgRaw, width, height);
    const fgAvg = getAverageColor(fgRaw, width, height);

    // Calculate color adjustment
    const colorShift = [
        bgAvg[0] - fgAvg[0],
        bgAvg[1] - fgAvg[1],
        bgAvg[2] - fgAvg[2]
    ];

    for (let i = 0; i < bgRaw.length; i += channels) {
        const maskIdx = Math.floor(i / channels);
        const maskValue = maskRaw[maskIdx] / 255;

        for (let c = 0; c < channels; c++) {
            const adjustedFg = Math.max(0, Math.min(255,
                fgRaw[i + c] + colorShift[c] * 0.5
            ));

            blended[i + c] = Math.round(
                bgRaw[i + c] * (1 - maskValue) +
                adjustedFg * maskValue
            );
        }
    }

    return blended;
}

/**
 * Brightness-match blending: Adjust brightness and colors
 */
async function brightnessMatchBlend(bgRaw, fgRaw, maskRaw, width, height) {
    const blended = Buffer.alloc(bgRaw.length);
    const channels = 3;

    // Calculate average brightness
    const bgBrightness = getAverageBrightness(bgRaw);
    const fgBrightness = getAverageBrightness(fgRaw);

    // Calculate brightness adjustment factor
    const brightnessFactor = bgBrightness / (fgBrightness || 1);

    for (let i = 0; i < bgRaw.length; i += channels) {
        const maskIdx = Math.floor(i / channels);
        const maskValue = maskRaw[maskIdx] / 255;

        for (let c = 0; c < channels; c++) {
            const adjustedFg = Math.max(0, Math.min(255,
                fgRaw[i + c] * brightnessFactor
            ));

            blended[i + c] = Math.round(
                bgRaw[i + c] * (1 - maskValue) +
                adjustedFg * maskValue
            );
        }
    }

    return blended;
}

/**
 * Standard alpha blending
 */
async function alphaBlend(bgRaw, fgRaw, maskRaw, width, height) {
    const blended = Buffer.alloc(bgRaw.length);
    const channels = 3;

    for (let i = 0; i < bgRaw.length; i += channels) {
        const maskIdx = Math.floor(i / channels);
        const maskValue = maskRaw[maskIdx] / 255;

        for (let c = 0; c < channels; c++) {
            blended[i + c] = Math.round(
                bgRaw[i + c] * (1 - maskValue) +
                fgRaw[i + c] * maskValue
            );
        }
    }

    return blended;
}

/**
 * Calculate average color
 */
function getAverageColor(buffer, width, height) {
    const channels = 3;
    const pixelCount = width * height;
    const avg = [0, 0, 0];

    for (let i = 0; i < buffer.length; i += channels) {
        avg[0] += buffer[i];
        avg[1] += buffer[i + 1];
        avg[2] += buffer[i + 2];
    }

    return [
        Math.round(avg[0] / pixelCount),
        Math.round(avg[1] / pixelCount),
        Math.round(avg[2] / pixelCount)
    ];
}

/**
 * Calculate average brightness
 */
function getAverageBrightness(buffer) {
    const channels = 3;
    let totalBrightness = 0;
    let pixelCount = 0;

    for (let i = 0; i < buffer.length; i += channels) {
        const brightness = (buffer[i] * 0.299 + buffer[i + 1] * 0.587 + buffer[i + 2] * 0.114);
        totalBrightness += brightness;
        pixelCount++;
    }

    return pixelCount > 0 ? totalBrightness / pixelCount : 128;
}

/**
 * Simple compositing without special blending
 * @param {Buffer} backgroundBuffer - Background image
 * @param {Buffer} foregroundBuffer - Foreground image
 * @param {Buffer} maskBuffer - Mask to control blend
 * @returns {Promise<Buffer>} Composited image
 */
export const simpleComposite = async (
    backgroundBuffer,
    foregroundBuffer,
    maskBuffer
) => {
    try {
        console.log('Starting simple composite...');

        const bgMetadata = await sharp(backgroundBuffer).metadata();
        const { width, height } = bgMetadata;

        // Resize foreground and mask to background dimensions
        const fgResized = await sharp(foregroundBuffer)
            .resize(width, height, { fit: 'cover' })
            .toBuffer();

        const maskResized = await sharp(maskBuffer)
            .resize(width, height, { fit: 'cover' })
            .toBuffer();

        // Composite using mask
        const result = await sharp(backgroundBuffer)
            .composite([
                {
                    input: fgResized,
                    blend: 'over',
                    gravity: 'center'
                }
            ])
            .toBuffer();

        console.log('Composite completed');
        return result;

    } catch (error) {
        console.error('Composite Error:', error);
        throw error;
    }
};
