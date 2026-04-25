import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';

/**
 * Removes white background from a generated image using a flood-fill algorithm from edges.
 * @param {Buffer} imageBuffer - The image buffer to process
 * @param {number} threshold - The RGB threshold (default 240) above which is considered white
 * @returns {Promise<Buffer>} - The processed image buffer as PNG
 */
export const removeWhiteBackgroundSmart = async (imageBuffer, threshold = 240) => {
    const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
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

    return await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 }
    }).png().toBuffer();
};

/**
 * Removes background using AI model.
 * @param {string} fileUri - The input file URI format (e.g. file://C:/path)
 * @returns {Promise<Buffer>} - The processed image buffer as PNG
 */
export const removeBackgroundAI = async (fileUri) => {
    const blob = await removeBackground(fileUri);
    return Buffer.from(await blob.arrayBuffer());
};
