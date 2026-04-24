import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

/**
 * AI Service for interacting with server-side AI features
 */

/**
 * Generate a mask from an image with selection
 * @param {string} imageBase64 - Base64 encoded image
 * @param {Object} selection - Selection data
 * @param {string} selection.type - 'bbox' or 'points'
 * @param {Array} selection.bbox - [x, y, width, height]
 * @param {Array} selection.points - [[x, y], ...]
 * @returns {Promise<{mask: string, dimensions: {width, height}}>}
 */
export const generateMask = async (imageBase64, selection) => {
    try {
        const response = await axios.post(`${API_BASE}/ai/mask`, {
            image: imageBase64,
            selectionType: selection.type,
            bbox: selection.bbox,
            points: selection.points
        });

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (error) {
        console.error('Mask generation error:', error);
        throw error;
    }
};

/**
 * Perform inpainting on an image
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} maskBase64 - Base64 encoded mask
 * @param {string} prompt - Inpainting prompt
 * @param {string} negativePrompt - Negative prompt (optional)
 * @param {string} projectId - Project ID to save result (optional)
 * @returns {Promise<{inpaintedImage: string, savedPath?: string, metadata: Object}>}
 */
export const inpaintImage = async (
    imageBase64,
    maskBase64,
    prompt,
    negativePrompt = '',
    projectId = null
) => {
    try {
        const response = await axios.post(`${API_BASE}/ai/inpaint`, {
            image: imageBase64,
            mask: maskBase64,
            prompt,
            negativePrompt,
            projectId
        });

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (error) {
        console.error('Inpainting error:', error);
        throw error;
    }
};

/**
 * Blend images seamlessly
 * @param {string} backgroundBase64 - Base64 encoded background
 * @param {string} foregroundBase64 - Base64 encoded foreground
 * @param {string} maskBase64 - Base64 encoded mask
 * @param {string} blendMode - 'normal' | 'color-match' | 'brightness-match'
 * @param {string} projectId - Project ID to save result (optional)
 * @returns {Promise<{blendedImage: string, savedPath?: string, metadata: Object}>}
 */
export const blendImages = async (
    backgroundBase64,
    foregroundBase64,
    maskBase64,
    blendMode = 'color-match',
    projectId = null
) => {
    try {
        const response = await axios.post(`${API_BASE}/ai/blend`, {
            background: backgroundBase64,
            foreground: foregroundBase64,
            mask: maskBase64,
            blendMode,
            projectId
        });

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (error) {
        console.error('Blending error:', error);
        throw error;
    }
};

/**
 * Generic AI Processing
 * @param {string} taskType - 'expand' | 'erase' | 'relight'
 * @param {Object} data - Task specific data
 * @returns {Promise<Object>} Result with image and metadata
 */
export const processAI = async (taskType, data) => {
    try {
        const response = await axios.post(`${API_BASE}/ai/process`, {
            task_type: taskType,
            ...data
        });

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (error) {
        console.error(`AI ${taskType} error:`, error);
        throw error;
    }
};

/**
 * Convert canvas to base64 image
 * @param {HTMLCanvasElement} canvas
 * @param {string} format - 'image/png' or 'image/jpeg'
 * @returns {string} Base64 encoded image
 */
export const canvasToBase64 = (canvas, format = 'image/png') => {
    return canvas.toDataURL(format);
};

/**
 * Convert base64 to blob
 * @param {string} base64String
 * @returns {Blob}
 */
export const base64ToBlob = (base64String) => {
    const base64Data = base64String.startsWith('data:')
        ? base64String.split(',')[1]
        : base64String;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/png' });
};

/**
 * Create an image from base64 string
 * @param {string} base64String
 * @returns {Promise<HTMLImageElement>}
 */
export const base64ToImage = (base64String) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base64String.startsWith('data:')
            ? base64String
            : `data:image/png;base64,${base64String}`;
    });
};
