import { searchImages } from '../services/imageSearchService.js';

export const handleImageSearch = async (req, res) => {
    try {
        const { q, source = 'all', page = 1, per_page = 15 } = req.query;

        if (!q) {
            return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
        }

        const results = await searchImages(q, source, parseInt(page), parseInt(per_page));

        res.json({
            success: true,
            results,
            metadata: {
                query: q,
                source,
                page: parseInt(page),
                per_page: parseInt(per_page),
                count: results.length
            }
        });
    } catch (error) {
        console.error('Image search controller error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during image search' });
    }
};
