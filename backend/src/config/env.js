import dotenv from 'dotenv';

dotenv.config();

export const config = {
    PORT: process.env.PORT || 5000,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY
};

// Validate required keys on startup
if (!config.GEMINI_API_KEY) {
    console.warn('⚠️ WARNING: GEMINI_API_KEY is not set in backend/.env');
}
if (!config.HUGGINGFACE_API_KEY) {
    console.warn('⚠️ WARNING: HUGGINGFACE_API_KEY is not set in backend/.env');
}
