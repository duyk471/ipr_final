import express from 'express';
import { getAvailableFonts } from '../services/fontService.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const fonts = await getAvailableFonts();
        res.json({
            success: true,
            fonts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fonts',
            error: error.message
        });
    }
});

export default router;
