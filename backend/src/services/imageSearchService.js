import dotenv from 'dotenv';

dotenv.config();

const UNSPLASH_KEY = process.env.UNSPLASH_API_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

/**
 * Normalizes Unsplash API response
 */
const normalizeUnsplash = (photo) => ({
    id: `unsplash_${photo.id}`,
    thumbnail: photo.urls.small,
    fullRes: photo.urls.regular,
    author: photo.user.name,
    link: photo.links.html,
    source: 'unsplash',
    aspectRatio: photo.width / photo.height
});

/**
 * Normalizes Pexels API response
 */
const normalizePexels = (photo) => ({
    id: `pexels_${photo.id}`,
    thumbnail: photo.src.medium,
    fullRes: photo.src.large2x,
    author: photo.photographer,
    link: photo.url,
    source: 'pexels',
    aspectRatio: photo.width / photo.height
});

/**
 * Normalizes Pixabay API response
 */
const normalizePixabay = (photo) => ({
    id: `pixabay_${photo.id}`,
    thumbnail: photo.previewURL,
    fullRes: photo.largeImageURL,
    author: photo.user,
    link: photo.pageURL,
    source: 'pixabay',
    aspectRatio: photo.imageWidth / photo.imageHeight
});

/**
 * Fetch from Unsplash
 */
async function fetchUnsplash(query, page = 1, perPage = 20) {
    if (!UNSPLASH_KEY) return [];
    try {
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
            {
                headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` }
            }
        );
        if (!response.ok) {
            console.warn(`Unsplash API error: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return (data.results || []).map(normalizeUnsplash);
    } catch (error) {
        console.error('Unsplash fetch failed:', error);
        return [];
    }
}

/**
 * Fetch from Pexels
 */
async function fetchPexels(query, page = 1, perPage = 20) {
    if (!PEXELS_KEY) return [];
    try {
        const response = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
            {
                headers: { Authorization: PEXELS_KEY }
            }
        );
        if (!response.ok) {
            console.warn(`Pexels API error: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return (data.photos || []).map(normalizePexels);
    } catch (error) {
        console.error('Pexels fetch failed:', error);
        return [];
    }
}

/**
 * Fetch from Pixabay
 */
async function fetchPixabay(query, page = 1, perPage = 20) {
    if (!PIXABAY_KEY) return [];
    try {
        const response = await fetch(
            `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&image_type=photo`
        );
        if (!response.ok) {
            console.warn(`Pixabay API error: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return (data.hits || []).map(normalizePixabay);
    } catch (error) {
        console.error('Pixabay fetch failed:', error);
        return [];
    }
}

/**
 * Interleave results from multiple sources
 */
function interleaveResults(sources) {
    const interleaved = [];
    const maxLength = Math.max(...sources.map(s => s.length));
    
    for (let i = 0; i < maxLength; i++) {
        for (const source of sources) {
            if (source[i]) {
                interleaved.push(source[i]);
            }
        }
    }
    return interleaved;
}

/**
 * Unified Search Service
 */
export const searchImages = async (query, source = 'all', page = 1, perPage = 15) => {
    const perSource = Math.ceil(perPage / (source === 'all' ? 3 : 1));
    
    const tasks = [];
    
    if (source === 'all' || source === 'unsplash') {
        tasks.push(fetchUnsplash(query, page, perSource));
    }
    if (source === 'all' || source === 'pexels') {
        tasks.push(fetchPexels(query, page, perSource));
    }
    if (source === 'all' || source === 'pixabay') {
        tasks.push(fetchPixabay(query, page, perSource));
    }

    const results = await Promise.allSettled(tasks);
    
    const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
        
    if (source === 'all') {
        return interleaveResults(successfulResults);
    } else {
        return successfulResults.flat();
    }
};
