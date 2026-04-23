/**
 * Local Asset Service - Handles uploading and managing assets in the project directory
 */

import useCanvasStore from '../store/useCanvasStore';

/**
 * Upload an image file to the project's assets directory
 * @param {File} file - The image file to upload
 * @returns {Promise<Object>} {path: relative path, url: Object URL, displayUrl: relative path}
 */
export const uploadLocalAsset = async (file) => {
    try {
        // Get the relative path where it was saved
        const relativePath = await useCanvasStore.getState().saveAssetToProject(file);
        
        // Get Object URL for immediate display
        const objectUrl = await useCanvasStore.getState().getAssetObjectUrl(relativePath);
        
        return {
            path: relativePath,
            url: objectUrl,
            displayUrl: relativePath, // Keep track of original path for serialization
            fileName: file.name,
            size: file.size,
            type: file.type
        };
    } catch (error) {
        console.error('Failed to upload asset:', error);
        throw error;
    }
};

/**
 * Upload multiple image files to the project
 * @param {File[]} files - Array of image files
 * @returns {Promise<Array>} Array of uploaded asset info
 */
export const uploadMultipleAssets = async (files) => {
    try {
        const results = [];
        for (const file of files) {
            const result = await uploadLocalAsset(file);
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Failed to upload multiple assets:', error);
        throw error;
    }
};

/**
 * Handle image paste from clipboard and upload to local storage
 * @param {Blob} imageBlob - The image blob from clipboard
 * @returns {Promise<Object>} Uploaded asset info
 */
export const uploadPastedImage = async (imageBlob) => {
    try {
        // Generate a filename for the pasted image
        const timestamp = Date.now();
        const file = new File([imageBlob], `pasted_${timestamp}.png`, {
            type: imageBlob.type || 'image/png'
        });

        return await uploadLocalAsset(file);
    } catch (error) {
        console.error('Failed to upload pasted image:', error);
        throw error;
    }
};

/**
 * Handle image from canvas (e.g., after background removal)
 * @param {string} canvasDataUrl - Data URL from canvas
 * @param {string} fileName - Optional filename
 * @returns {Promise<Object>} Uploaded asset info
 */
export const uploadCanvasImage = async (canvasDataUrl, fileName = null) => {
    try {
        // Convert data URL to blob
        const response = await fetch(canvasDataUrl);
        const blob = await response.blob();

        // Create a file from the blob
        const timestamp = Date.now();
        const name = fileName || `canvas_${timestamp}.png`;
        const file = new File([blob], name, { type: 'image/png' });

        return await uploadLocalAsset(file);
    } catch (error) {
        console.error('Failed to upload canvas image:', error);
        throw error;
    }
};

/**
 * Download a remote asset (from backend or external URL) and save it to the local project
 * @param {string} remoteUrl - The URL of the remote asset
 * @param {string} preferredName - Optional preferred filename
 * @returns {Promise<Object>} Asset info
 */
export const persistBackendAsset = async (remoteUrl, preferredName = null) => {
    try {
        // Ensure we have an absolute URL
        const absoluteUrl = remoteUrl.startsWith('http') 
            ? remoteUrl 
            : `http://localhost:5000${remoteUrl.startsWith('/') ? '' : '/'}${remoteUrl}`;
            
        // Download the image
        const response = await fetch(absoluteUrl);
        if (!response.ok) throw new Error(`Failed to fetch remote asset: ${response.statusText}`);
        
        const blob = await response.blob();
        
        // Extract filename from URL if not provided
        let fileName = preferredName;
        if (!fileName) {
            const urlParts = remoteUrl.split('?')[0].split('/');
            fileName = urlParts[urlParts.length - 1];
            
            // Add extension if missing
            if (!fileName.includes('.')) {
                const type = blob.type.split('/')[1] || 'png';
                fileName = `${fileName}.${type}`;
            }
            
            // Ensure uniqueness
            fileName = `${Date.now()}_${fileName}`;
        }
        
        const file = new File([blob], fileName, { type: blob.type });
        return await uploadLocalAsset(file);
    } catch (error) {
        console.error('Failed to persist backend asset:', error);
        throw error;
    }
};

/**
 * Get an asset's Object URL (for displaying in canvas)
 * @param {string} relativePath - Relative path to asset (e.g., 'assets/image.png')
 * @returns {Promise<string>} Object URL
 */
export const getAssetUrl = async (relativePath) => {
    try {
        return await useCanvasStore.getState().getAssetObjectUrl(relativePath);
    } catch (error) {
        console.error('Failed to get asset URL:', error);
        throw error;
    }
};
