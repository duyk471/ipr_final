import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, ImageIcon, Leaf, RefreshCw } from 'lucide-react';
import { api } from '../../store/useCanvasStore';

// ─── Curated Fallback Gallery ─────────────────────────────────────────────────
// Shown when no query is entered; guaranteed to load.
const CURATED_GALLERY = [
    { id: 'c01', label: 'Mountain Lake',    tags: ['mountain', 'lake', 'nature'],  thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=90' },
    { id: 'c02', label: 'Starry Night',     tags: ['night', 'stars', 'sky'],       thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=70', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=90' },
    { id: 'c03', label: 'Ocean Sunset',     tags: ['ocean', 'sunset', 'sea'],      thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=70', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=90' },
    { id: 'c04', label: 'Forest Path',      tags: ['forest', 'trees', 'nature'],   thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=70', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=90' },
    { id: 'c05', label: 'City Skyline',     tags: ['city', 'urban', 'buildings'],  thumb: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=70', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=90' },
    { id: 'c06', label: 'Spring Flowers',   tags: ['flowers', 'spring', 'bloom'],  thumb: 'https://images.unsplash.com/photo-1490750967868-88df5691cc27?w=400&q=70', url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc27?w=1200&q=90' },
    { id: 'c07', label: 'Architecture',     tags: ['architecture', 'design'],      thumb: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=70', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=90' },
    { id: 'c08', label: 'Tech Abstract',    tags: ['tech', 'abstract', 'blue'],    thumb: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=90' },
    { id: 'c09', label: 'Portrait',         tags: ['portrait', 'person'],          thumb: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=70', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&q=90' },
    { id: 'c10', label: 'Aerial View',      tags: ['aerial', 'drone', 'landscape'],thumb: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=70', url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=90' },
    { id: 'c11', label: 'Cute Dog',         tags: ['dog', 'animal', 'pet'],        thumb: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=70', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1200&q=90' },
    { id: 'c12', label: 'Coffee & Work',    tags: ['coffee', 'desk', 'office'],    thumb: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=70', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=90' },
    { id: 'c13', label: 'Abstract Art',     tags: ['abstract', 'art', 'color'],    thumb: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=70', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=90' },
    { id: 'c14', label: 'Minimalist',       tags: ['minimal', 'clean', 'white'],   thumb: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&q=70', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1200&q=90' },
    { id: 'c15', label: 'Fashion',          tags: ['fashion', 'model', 'style'],   thumb: 'https://images.unsplash.com/photo-1539109132382-3bf1df395ee0?w=400&q=70', url: 'https://images.unsplash.com/photo-1539109132382-3bf1df395ee0?w=1200&q=90' },
];

// ─── Source tabs ─────────────────────────────────────────────────────────────
const SOURCES = [
    { id: 'all',      label: 'All',      emoji: '🌈' },
    { id: 'unsplash', label: 'Unsplash', emoji: '📷' },
    { id: 'pixabay',  label: 'Pixabay',  emoji: '🖼' },
    { id: 'pexels',   label: 'Pexels',   emoji: '🎨' },
];

// ─── Skeleton Card ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="aspect-video rounded-xl overflow-hidden relative">
        <div className="w-full h-full bg-biophilic-cream-dark dark:bg-biophilic-dark-border animate-pulse" />
        <div className="absolute bottom-2 left-2 right-2 h-2.5 bg-biophilic-cream dark:bg-biophilic-dark-surface rounded-full animate-pulse opacity-60" />
    </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────
const ErrorState = ({ message, onRetry }) => (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-biophilic-bark/60 dark:text-biophilic-dark-text-muted">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/20 flex items-center justify-center text-red-400">
            <ImageIcon size={26} strokeWidth={1.5} />
        </div>
        <p className="text-sm text-center leading-relaxed text-slate-500 dark:text-biophilic-dark-text-muted max-w-[200px]">
            {message}
        </p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs font-semibold text-biophilic-green dark:text-biophilic-dark-green hover:underline transition-colors"
            >
                <RefreshCw size={12} />
                Try again
            </button>
        )}
    </div>
);

// ─── No Results State ─────────────────────────────────────────────────────────
const NoResults = ({ query, onClear }) => (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
        <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-biophilic-green-light/30 dark:bg-biophilic-dark-green/10 border border-biophilic-green-light dark:border-biophilic-dark-border flex items-center justify-center">
                <Leaf size={28} className="text-biophilic-green dark:text-biophilic-dark-green" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-biophilic-rose dark:bg-biophilic-dark-rose/30 rounded-full border-2 border-white dark:border-biophilic-dark-surface flex items-center justify-center">
                <X size={10} className="text-biophilic-bark dark:text-biophilic-dark-text" />
            </div>
        </div>
        <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-biophilic-moss dark:text-biophilic-dark-text">
                No photos found
            </p>
            <p className="text-xs text-biophilic-bark/60 dark:text-biophilic-dark-text-muted leading-relaxed max-w-[180px]">
                No results for <span className="font-bold text-biophilic-bark dark:text-biophilic-dark-text">"{query}"</span>. Try a different keyword.
            </p>
        </div>
        <button
            onClick={onClear}
            className="text-xs font-semibold text-biophilic-green dark:text-biophilic-dark-green px-4 py-1.5 rounded-full border border-biophilic-green-light dark:border-biophilic-dark-border hover:bg-biophilic-green-light/30 dark:hover:bg-biophilic-dark-green/10 transition-all"
        >
            Clear search
        </button>
    </div>
);

// ─── Search via backend proxy (avoids CORS + key management) ─────────────────
async function searchImages(query, source, page = 1) {
    try {
        console.log(`[Search] Querying backend for "${query}" from source "${source}" (page ${page})`);
        const res = await api.get('/assets/search', {
            params: { q: query, source, page, per_page: 20 },
        });
        
        if (res.data?.success && res.data.results && res.data.results.length > 0) {
            console.log(`[Search] Backend returned ${res.data.results.length} results`);
            return { results: res.data.results, error: null };
        }
        
        console.warn(`[Search] Backend returned no results for "${query}". Falling back to curated/picsum.`);
        if (page === 1) throw new Error('No results from backend');
        return { results: [], error: null };
    } catch (err) {
        console.warn('[Search] Backend search failed or returned empty, using fallback:', err.message);
        if (page > 1) return { results: [], error: null };

        // Fallback: search in curated gallery
        const localMatches = (CURATED_GALLERY || []).filter(
            (img) =>
                img.label?.toLowerCase().includes(query.toLowerCase()) ||
                img.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        ).map(img => ({
            ...img,
            thumbnail: img.thumb,
            fullRes: img.url,
            source: 'curated',
            author: 'Unsplash'
        }));
        
        // Always supplement with Picsum to ensure we have results
        const picsumCount = Math.max(4, 12 - localMatches.length);
        const picsum = Array.from({ length: picsumCount }, (_, i) => {
            const seed = `${query}-${source}-${i}`;
            return {
                id: `ps_${seed}_${Date.now()}`,
                label: `${query} ${i + 1}`,
                thumbnail: `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/300`,
                fullRes:   `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/800`,
                author: 'Picsum Photos',
                source: 'picsum',
                aspectRatio: 4/3
            };
        });
        
        return { results: [...localMatches, ...picsum], error: null };
    }
}

// ─── Component ────────────────────────────────────────────────────────────────
const ImageLibraryPanel = ({ canvasRef }) => {
    const [searchTerm, setSearchTerm]   = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [source, setSource]           = useState('all');
    const [results, setResults]         = useState(CURATED_GALLERY.map(img => ({
        ...img,
        thumbnail: img.thumb,
        fullRes: img.url,
        source: 'curated',
        author: 'Unsplash'
    })));
    const [isLoading, setIsLoading]     = useState(false);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [page, setPage]               = useState(1);
    const [hasMore, setHasMore]         = useState(true);
    const [loadingId, setLoadingId]     = useState(null);
    const [error, setError]             = useState(null);
    const abortRef = useRef(null);
    const observer = useRef();

    // ── Debounce search term: 500 ms
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedTerm(searchTerm.trim());
            setPage(1);
            setHasMore(true);
        }, 500);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // ── Run search on debounced term or source change
    useEffect(() => {
        runSearch(debouncedTerm, source, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedTerm, source]);

    // ── Intersection Observer for Infinite Scroll
    const lastElementRef = useCallback(node => {
        if (isLoading || isMoreLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && debouncedTerm) {
                loadMore();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, isMoreLoading, hasMore, debouncedTerm]);

    const runSearch = async (query, src, pageNum) => {
        if (abortRef.current) abortRef.current = false;
        const myToken = {};
        abortRef.current = myToken;

        setIsLoading(true);
        setError(null);

        if (!query) {
            setResults(CURATED_GALLERY.map(img => ({
                ...img,
                thumbnail: img.thumb,
                fullRes: img.url,
                source: 'curated',
                author: 'Unsplash'
            })));
            setIsLoading(false);
            setHasMore(false);
            return;
        }

        const { results: found, error: err } = await searchImages(query, src, pageNum);

        if (abortRef.current !== myToken) return;

        if (err) {
            setError(err);
            setResults([]);
        } else {
            setResults(found);
            setHasMore(found.length >= 10);
        }
        setIsLoading(false);
    };

    const loadMore = async () => {
        if (isMoreLoading || !hasMore) return;
        
        setIsMoreLoading(true);
        const nextPage = page + 1;
        
        const { results: found, error: err } = await searchImages(debouncedTerm, source, nextPage);
        
        if (!err) {
            if (found.length === 0) {
                setHasMore(false);
            } else {
                setResults(prev => [...prev, ...found]);
                setPage(nextPage);
            }
        }
        setIsMoreLoading(false);
    };

    const handleSelectImage = async (img) => {
        if (!canvasRef.current || loadingId) return;
        setLoadingId(img.id);
        try {
            let imageUrl = img.fullRes || img.url || img.thumbnail;

            if (imageUrl.startsWith('http')) {
                try {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const fileName = `${(img.author || 'photo').replace(/\s+/g, '_')}_${Date.now()}.jpg`;
                    const file = new File([blob], fileName, { type: blob.type });

                    const { uploadLocalAsset } = await import('../../services/localAssetService');
                    const assetInfo = await uploadLocalAsset(file);

                    imageUrl = assetInfo.url;
                } catch (downloadError) {
                    console.warn('Failed to download image locally:', downloadError);
                }
            }

            await canvasRef.current.addImage(imageUrl, { source: img.source });
        } catch (err) {
            console.error('Failed to add image:', err);
        } finally {
            setLoadingId(null);
        }
    };

    const handleRetry = () => runSearch(debouncedTerm, source, 1);
    const handleClear = () => setSearchTerm('');

    return (
        <div className="flex flex-col h-full bg-slate-50/30 dark:bg-biophilic-dark-surface transition-colors">
            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-10 
                            bg-white dark:bg-biophilic-dark-surface 
                            backdrop-blur-sm px-5 pt-5 pb-4 space-y-4 
                            border-b border-biophilic-cream-dark dark:border-biophilic-dark-border 
                            flex-shrink-0">

                <div className="flex items-center gap-2 mb-1">
                    <ImageIcon className="text-biophilic-green dark:text-biophilic-dark-green" size={18} />
                    <h3 className="font-black text-biophilic-moss dark:text-biophilic-dark-text tracking-tight text-[15px]">Image Library</h3>
                </div>

                {/* Search Input */}
                <div className="relative flex items-center">
                    <Search
                        size={14}
                        className="absolute left-3.5 text-biophilic-bark/50 dark:text-biophilic-dark-text-muted pointer-events-none"
                    />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search photos…"
                        className="w-full bg-biophilic-cream dark:bg-biophilic-dark-card
                                   border border-biophilic-cream-dark dark:border-biophilic-dark-border
                                   text-slate-800 dark:text-biophilic-dark-text
                                   rounded-xl pl-10 pr-10 py-2.5 text-sm
                                   placeholder:text-biophilic-bark/40 dark:placeholder:text-biophilic-dark-text-muted/60
                                   focus:outline-none focus:ring-4 focus:ring-biophilic-green/10
                                   focus:border-biophilic-green dark:focus:border-biophilic-dark-green
                                   transition-all shadow-sm"
                    />
                    {searchTerm && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3.5 text-biophilic-bark/40 dark:text-biophilic-dark-text-muted 
                                       hover:text-biophilic-moss dark:hover:text-biophilic-dark-green transition-colors"
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Source Selector */}
                <div className="flex gap-2">
                    {SOURCES.map((src) => (
                        <button
                            key={src.id}
                            onClick={() => setSource(src.id)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border ${
                                source === src.id
                                    ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg border-biophilic-green-dark shadow-organic-sm scale-[1.02]'
                                    : 'bg-white dark:bg-biophilic-dark-card text-slate-400 dark:text-biophilic-dark-text-muted border-biophilic-cream-dark dark:border-biophilic-dark-border hover:bg-biophilic-cream dark:hover:bg-biophilic-dark-border'
                            }`}
                        >
                            <span className="mr-1.5">{src.emoji}</span>
                            {src.label}
                        </button>
                    ))}
                </div>

                {/* Live status */}
                {!isLoading && debouncedTerm && results.length > 0 && (
                    <p className="text-[10px] font-bold text-slate-400 dark:text-biophilic-dark-text-muted uppercase tracking-widest px-1">
                        Found {results.length} results for <span className="text-biophilic-green dark:text-biophilic-dark-green italic">"{debouncedTerm}"</span>
                    </p>
                )}
            </div>

            {/* ── Image Grid ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : error ? (
                    <ErrorState message={error} onRetry={handleRetry} />
                ) : results.length === 0 ? (
                    <NoResults query={debouncedTerm} onClear={handleClear} />
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            {results.map((img, index) => {
                                const isAdding = loadingId === img.id;
                                const isLastElement = index === results.length - 1;

                                return (
                                    <button
                                        key={`${img.id}-${index}`}
                                        ref={isLastElement ? lastElementRef : null}
                                        onClick={() => handleSelectImage(img)}
                                        disabled={!!loadingId}
                                        className={`
                                            relative group overflow-hidden rounded-2xl
                                            border border-biophilic-cream-dark dark:border-biophilic-dark-border
                                            bg-white dark:bg-biophilic-dark-card
                                            aspect-square
                                            transition-all duration-300 ease-out shadow-sm
                                            ${!loadingId
                                                ? 'hover:scale-[1.05] hover:border-biophilic-green dark:hover:border-biophilic-green hover:shadow-organic dark:hover:shadow-dark-green-glow cursor-pointer'
                                                : 'opacity-60 cursor-wait'
                                            }
                                            ${isAdding ? 'ring-4 ring-biophilic-green/20' : ''}
                                        `}
                                    >
                                        {/* Thumbnail */}
                                        <img
                                            src={img.thumbnail}
                                            alt={img.author}
                                            loading="lazy"
                                            crossOrigin="anonymous"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.15]"
                                            onError={(e) => { e.target.style.opacity = '0.3'; }}
                                        />

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 pointer-events-none text-left">
                                            <div className="flex flex-col gap-0.5 w-full">
                                                <span className="text-white text-[10px] font-black uppercase tracking-widest drop-shadow-md truncate">
                                                    @{img.author}
                                                </span>
                                                <span className="text-white/60 text-[8px] font-bold uppercase tracking-tight">{img.source}</span>
                                            </div>
                                        </div>

                                        {/* Adding spinner */}
                                        {isAdding && (
                                            <div className="absolute inset-0 bg-white/80 dark:bg-biophilic-dark-surface/90 flex flex-col items-center justify-center gap-2 rounded-2xl pointer-events-none backdrop-blur-sm">
                                                <div className="w-6 h-6 border-2 border-biophilic-green/20 dark:border-biophilic-dark-green/20 border-t-biophilic-green dark:border-t-biophilic-dark-green rounded-full animate-spin" />
                                                <span className="text-[8px] font-black text-biophilic-green uppercase tracking-widest">Adding...</span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* More Loading Indicator */}
                        {isMoreLoading && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                        )}

                        {/* End of results message */}
                        {!hasMore && results.length > 0 && debouncedTerm && (
                            <p className="text-center text-[10px] text-biophilic-bark/30 dark:text-biophilic-dark-border mt-6 select-none font-bold uppercase tracking-[0.2em]">
                                No more photos to load
                            </p>
                        )}
                    </>
                )}

                {/* Attribution footer */}
                {!isLoading && !error && results.length > 0 && (
                    <p className="text-center text-[10px] text-biophilic-bark/30 dark:text-biophilic-dark-border mt-8 select-none">
                        Aggregated from Unsplash, Pexels, and Pixabay
                    </p>
                )}
            </div>
        </div>
    );
};

export default ImageLibraryPanel;
