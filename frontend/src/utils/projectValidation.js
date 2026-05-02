/**
 * Project Structure Validation Utilities
 * Validates project metadata and structure to prevent silent failures
 */

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether project passes validation
 * @property {Array} errors - Array of validation errors
 * @property {Array} warnings - Array of validation warnings
 */

/**
 * Validate complete project structure
 * Checks required fields and types
 * @param {Object} projectData - Full project data from index.json
 * @returns {ValidationResult} Validation result with errors/warnings
 */
export const validateProjectStructure = (projectData) => {
    const errors = [];
    const warnings = [];

    if (!projectData || typeof projectData !== 'object') {
        return {
            valid: false,
            errors: ['Project data is not a valid object'],
            warnings: []
        };
    }

    // Check root structure
    if (!projectData.projectInfo) {
        errors.push('Missing required field: projectInfo');
    } else if (typeof projectData.projectInfo !== 'object') {
        errors.push('projectInfo must be an object');
    } else {
        // Validate projectInfo fields
        const projectInfoErrors = validateProjectInfo(projectData.projectInfo);
        errors.push(...projectInfoErrors);
    }

    // Check canvas structure
    if (!projectData.canvas) {
        errors.push('Missing required field: canvas');
    } else if (typeof projectData.canvas !== 'object') {
        errors.push('canvas must be an object');
    } else {
        const canvasErrors = validateCanvasStructure(projectData.canvas);
        errors.push(...canvasErrors);
    }

    // Check layers - can be either 'layers' or 'objects' (legacy)
    const layersField = projectData.layers !== undefined ? 'layers' : 'objects';
    if (projectData[layersField]) {
        if (!Array.isArray(projectData[layersField])) {
            errors.push(`${layersField} must be an array`);
        }
    } else {
        warnings.push(`No layers/objects found – empty project`);
    }

    // Check history structure
    if (projectData.history) {
        if (typeof projectData.history !== 'object') {
            errors.push('history must be an object');
        } else {
            if (!Array.isArray(projectData.history.undoStack)) {
                warnings.push('history.undoStack is not an array (will be reset)');
            }
            if (!Array.isArray(projectData.history.redoStack)) {
                warnings.push('history.redoStack is not an array (will be reset)');
            }
        }
    } else {
        warnings.push('No history found – will start fresh');
    }

    // Check version
    if (!projectData.version) {
        warnings.push('No version field – assuming v1.0');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validate projectInfo object
 * @param {Object} projectInfo - projectInfo object
 * @returns {Array} Array of error messages
 */
const validateProjectInfo = (projectInfo) => {
    const errors = [];

    if (!projectInfo.id) {
        errors.push('projectInfo.id is required');
    } else if (typeof projectInfo.id !== 'string') {
        errors.push('projectInfo.id must be a string');
    }

    if (!projectInfo.name) {
        errors.push('projectInfo.name is required');
    } else if (typeof projectInfo.name !== 'string') {
        errors.push('projectInfo.name must be a string');
    }

    if (!projectInfo.createdAt) {
        errors.push('projectInfo.createdAt is required');
    } else if (typeof projectInfo.createdAt !== 'string') {
        errors.push('projectInfo.createdAt must be an ISO string');
    } else if (isNaN(Date.parse(projectInfo.createdAt))) {
        errors.push('projectInfo.createdAt is not a valid ISO date');
    }

    if (!projectInfo.updatedAt) {
        errors.push('projectInfo.updatedAt is required');
    } else if (typeof projectInfo.updatedAt !== 'string') {
        errors.push('projectInfo.updatedAt must be an ISO string');
    } else if (isNaN(Date.parse(projectInfo.updatedAt))) {
        errors.push('projectInfo.updatedAt is not a valid ISO date');
    }

    return errors;
};

/**
 * Validate canvas configuration
 * @param {Object} canvas - canvas object
 * @returns {Array} Array of error messages
 */
const validateCanvasStructure = (canvas) => {
    const errors = [];

    if (typeof canvas.width !== 'number' || canvas.width <= 0) {
        errors.push('canvas.width must be a positive number');
    }

    if (typeof canvas.height !== 'number' || canvas.height <= 0) {
        errors.push('canvas.height must be a positive number');
    }

    // backgroundColor is optional but should be a valid hex/color string if present
    if (canvas.backgroundColor && typeof canvas.backgroundColor !== 'string') {
        errors.push('canvas.backgroundColor must be a string');
    }

    return errors;
};

/**
 * Sanitize project data to ensure it won't cause rendering errors
 * Strips problematic data but preserves project structure
 * @param {Object} projectData - Project data to sanitize
 * @returns {Object} Sanitized project data
 */
export const sanitizeProjectData = (projectData) => {
    const sanitized = {
        version: projectData.version || '1.0',
        projectInfo: projectData.projectInfo || {},
        canvas: projectData.canvas || {
            width: 1280,
            height: 720,
            backgroundColor: '#ffffff',
            zoom: 1,
            viewportTransform: [1, 0, 0, 1, 0, 0]
        },
        [projectData.layers !== undefined ? 'layers' : 'objects']: Array.isArray(projectData.layers || projectData.objects) ? (projectData.layers || projectData.objects) : [],
        history: projectData.history || { undoStack: [], redoStack: [] }
    };

    // Ensure required projectInfo fields
    if (!sanitized.projectInfo.id) {
        sanitized.projectInfo.id = `recovered_${Date.now()}`;
    }
    if (!sanitized.projectInfo.name) {
        sanitized.projectInfo.name = `Recovered Project ${sanitized.projectInfo.id.substring(0, 8)}`;
    }
    if (!sanitized.projectInfo.createdAt) {
        sanitized.projectInfo.createdAt = new Date().toISOString();
    }
    if (!sanitized.projectInfo.updatedAt) {
        sanitized.projectInfo.updatedAt = new Date().toISOString();
    }

    return sanitized;
};

/**
 * Log validation result in a user-friendly format
 * @param {ValidationResult} result - Validation result
 * @param {string} projectName - Project name for logging context
 * @returns {void}
 */
export const logValidationResult = (result, projectName = 'Unknown') => {
    if (result.valid) {
        console.info(`✓ Project '${projectName}' is valid`);
    } else {
        console.error(`✗ Project '${projectName}' has validation errors:`);
        result.errors.forEach(err => console.error(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
        console.warn(`Project '${projectName}' has warnings:`);
        result.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }
};
