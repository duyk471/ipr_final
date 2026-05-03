import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONTS_DIR = path.resolve(__dirname, '../../../frontend/src/assets/fonts');
const FONTS_JSON = path.join(FONTS_DIR, 'fonts.json');

export const getAvailableFonts = async () => {
    try {
        if (!fs.existsSync(FONTS_JSON)) {
            return [];
        }
        const data = fs.readFileSync(FONTS_JSON, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading fonts directory:', error);
        return [];
    }
};
