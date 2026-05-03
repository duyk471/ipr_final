import { useState, useEffect } from 'react';
import { api } from '../store/useCanvasStore';

export const useFonts = () => {
    const [fonts, setFonts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFonts = async () => {
            try {
                const res = await api.get('/fonts');
                if (res.data.success) {
                    setFonts(res.data.fonts);
                } else {
                    setError('Failed to fetch fonts');
                }
            } catch (err) {
                console.error('Error fetching fonts:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFonts();
    }, []);

    const fontsByCategory = fonts.reduce((acc, font) => {
        const category = font.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(font);
        return acc;
    }, {});

    return { fonts, fontsByCategory, loading, error };
};
