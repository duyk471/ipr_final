import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, ImageIcon, Leaf, RefreshCw } from 'lucide-react';
import { api } from '../../store/useCanvasStore';

// ─── Curated Fallback Gallery ─────────────────────────────────────────────────
// Shown when no query is entered; guaranteed to load.
const CURATED_GALLERY = [
    { id: 'c01', label: 'Mountain Lake',    tags: ['mountain', 'lake', 'nature'],  thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=90' },
    { id: 'c02', label: 'Starry Night',     tags: ['night', 'stars', 'sky'],       thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=70', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=90' },
    { id: 'c03', label: 'Ocean Sunset',     tags: ['ocean', 'sunset', 'sea'],      thumb: 'https://images.unsplash.com/photo-1718363534265-43c08c01d048?w=400&q=70', url: 'https://images.unsplash.com/photo-1718363534265-43c08c01d048?w=1200&q=90' },
    { id: 'c04', label: 'Forest Path',      tags: ['forest', 'trees', 'nature'],   thumb: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=400&q=70', url: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=90' },
    { id: 'c05', label: 'City Skyline',     tags: ['city', 'urban', 'buildings'],  thumb: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=70', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=90' },
    { id: 'c06', label: 'Spring Flowers',   tags: ['flowers', 'spring', 'bloom'],  thumb: 'https://images.unsplash.com/photo-1490750967868-88df5691cc27?w=400&q=70', url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc27?w=1200&q=90' },
    { id: 'c07', label: 'Architecture',     tags: ['architecture', 'design'],      thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=90' },
    { id: 'c08', label: 'Tech Abstract',    tags: ['tech', 'abstract', 'blue'],    thumb: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&q=70', url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&q=90' },
    { id: 'c09', label: 'Portrait',         tags: ['portrait', 'person'],          thumb: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=70', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&q=90' },
    { id: 'c10', label: 'Aerial View',      tags: ['aerial', 'drone', 'landscape'],thumb: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=70', url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=90' },
    { id: 'c11', label: 'Cute Dog',         tags: ['dog', 'animal', 'pet'],        thumb: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=70', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1200&q=90' },
    { id: 'c12', label: 'Coffee & Work',    tags: ['coffee', 'desk', 'office'],    thumb: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=70', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=90' },
    { id: 'c13', label: 'Abstract Art',     tags: ['abstract', 'art', 'color'],    thumb: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=70', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=90' },
    { id: 'c14', label: 'Mountain Peak',    tags: ['mountain', 'snow', 'hiking'],  thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=90' },
    { id: 'c15', label: 'Fashion',          tags: ['fashion', 'model', 'style'],   thumb: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=70', url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&q=90' },
];

// ─── Source tabs ─────────────────────────────────────────────────────────────
const SOURCES = [
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
async function searchImages(query, source) {
    try {
        const res = await api.get('/assets/search', {
            params: { q: query, source, per_page: 16 },
        });
        if (res.data?.results?.length > 0) {
            return { results: res.data.results, error: null };
        }
        return { results: [], error: null };
    } catch (err) {
        // Backend not configured / no API key — fall back to local curated filter
        const localMatches = CURATED_GALLERY.filter(
            (img) =>
                img.label.toLowerCase().includes(query.toLowerCase()) ||
                img.tags.some((t) => t.includes(query.toLowerCase()))
        );
        // Supplement with Picsum seeds when local has < 4 hits (always some results)
        const picsum = Array.from({ length: Math.max(0, 8 - localMatches.length) }, (_, i) => {
            const seed = `${query}-${source}-${i}`;
            return {
                id: `ps_${seed}`,
                label: `${query} ${i + 1}`,
                thumb: `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/300`,
                url:   `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/800`,
            };
        });
        return { results: [...localMatches, ...picsum], error: null };
    }
}

// ─── Component ────────────────────────────────────────────────────────────────
const ImageLibraryPanel = ({ canvasRef }) => {
    const [searchTerm, setSearchTerm]   = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [source, setSource]           = useState('unsplash');
    const [results, setResults]         = useState(CURATED_GALLERY);
    const [isLoading, setIsLoading]     = useState(false);
    const [loadingId, setLoadingId]     = useState(null);
    const [error, setError]             = useState(null);
    const abortRef = useRef(null);

    // ── Debounce search term: 450 ms
    useEffect(() => {
        const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 450);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // ── Run search on debounced term or source change
    useEffect(() => {
        runSearch(debouncedTerm, source);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedTerm, source]);

    const runSearch = useCallback(async (query, src) => {
        // Cancel previous in-flight search
        if (abortRef.current) abortRef.current = false;
        const myToken = {};
        abortRef.current = myToken;

        setIsLoading(true);
        setError(null);

        if (!query) {
            // Reset to curated gallery instantly
            setResults(CURATED_GALLERY);
            setIsLoading(false);
            return;
        }

        const { results: found, error: err } = await searchImages(query, src);

        // Guard stale response
        if (abortRef.current !== myToken) return;

        if (err) {
            setError(err);
            setResults([]);
        } else {
            setResults(found);
        }
        setIsLoading(false);
    }, []);

    // ── Add image to Fabric.js canvas
    const handleSelectImage = async (img) => {
        if (!canvasRef.current || loadingId) return;
        setLoadingId(img.id);
        try {
            // For local-first storage: download external images and save locally
            let imageUrl = img.url;

            // Check if this is an external URL (http/https)
            if (imageUrl.startsWith('http')) {
                try {
                    // Download the image
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();

                    // Generate filename from the label or URL
                    const fileName = `${img.label.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
                    const file = new File([blob], fileName, { type: blob.type });

                    // Upload to local project storage
                    const { uploadLocalAsset } = await import('../../services/localAssetService');
                    const assetInfo = await uploadLocalAsset(file);

                    // Use the Object URL for display
                    imageUrl = assetInfo.url;
                    
                    // Store the relative path for serialization
                    img.metadata = { ...img.metadata, originalPath: assetInfo.path };
                } catch (downloadError) {
                    console.warn('Failed to download and save image locally, using external URL:', downloadError);
                    // Fall back to using the external URL directly
                }
            }

            await canvasRef.current.addImage(
                imageUrl,
                { source: img.label, ...img.metadata }
            );
        } catch (err) {
            console.error('Failed to add image:', err);
        } finally {
            setLoadingId(null);
        }
    };

    // ── Retry
    const handleRetry = () => runSearch(debouncedTerm, source);
    const handleClear = () => setSearchTerm('');

    return (
        <div className="flex flex-col h-full bg-biophilic-cream/40 dark:bg-biophilic-dark-bg/40">

            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-10 
                            bg-white/95 dark:bg-biophilic-dark-surface/95 
                            backdrop-blur-sm px-4 pt-3 pb-3 space-y-2.5 
                            border-b border-biophilic-cream-dark dark:border-biophilic-dark-border 
                            flex-shrink-0">

                {/* Search Input */}
                <div className="relative flex items-center">
                    <Search
                        size={14}
                        className="absolute left-3 text-biophilic-bark/50 dark:text-biophilic-dark-text-muted pointer-events-none"
                    />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search photos…"
                        className="w-full bg-biophilic-cream dark:bg-biophilic-dark-card
                                   border border-biophilic-cream-dark dark:border-biophilic-dark-border
                                   text-slate-800 dark:text-biophilic-dark-text
                                   rounded-xl pl-8 pr-8 py-2 text-sm
                                   placeholder:text-biophilic-bark/40 dark:placeholder:text-biophilic-dark-text-muted/60
                                   focus:outline-none focus:ring-2 focus:ring-biophilic-green/30 dark:focus:ring-biophilic-dark-green/25
                                   focus:border-biophilic-green dark:focus:border-biophilic-dark-green
                                   transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 text-biophilic-bark/40 dark:text-biophilic-dark-text-muted 
                                       hover:text-biophilic-bark dark:hover:text-biophilic-dark-text transition-colors"
                            title="Clear search"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Source Selector */}
                <div className="flex gap-1.5">
                    {SOURCES.map((src) => (
                        <button
                            key={src.id}
                            onClick={() => setSource(src.id)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${
                                source === src.id
                                    ? 'bg-biophilic-green dark:bg-biophilic-dark-green text-white dark:text-biophilic-dark-bg shadow-organic dark:shadow-dark-green-glow'
                                    : 'bg-biophilic-cream dark:bg-biophilic-dark-card text-biophilic-bark/60 dark:text-biophilic-dark-text-muted hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-border'
                            }`}
                        >
                            {src.emoji} {src.label}
                        </button>
                    ))}
                </div>

                {/* Live status */}
                {!isLoading && debouncedTerm && results.length > 0 && (
                    <p className="text-[10px] text-biophilic-bark/50 dark:text-biophilic-dark-text-muted -mb-1">
                        {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
                        <span className="font-semibold text-biophilic-moss dark:text-biophilic-dark-text">
                            "{debouncedTerm}"
                        </span>
                    </p>
                )}
            </div>

            {/* ── Image Grid ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : error ? (
                    <ErrorState message={error} onRetry={handleRetry} />
                ) : results.length === 0 ? (
                    <NoResults query={debouncedTerm} onClear={handleClear} />
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {results.map((img) => {
                            const isAdding = loadingId === img.id;
                            return (
                                <button
                                    key={img.id}
                                    onClick={() => handleSelectImage(img)}
                                    disabled={!!loadingId}
                                    title={`Add "${img.label}" to canvas`}
                                    className={`
                                        relative group overflow-hidden rounded-xl
                                        border border-biophilic-cream-dark dark:border-biophilic-dark-border
                                        bg-biophilic-cream dark:bg-biophilic-dark-card
                                        aspect-video
                                        transition-all duration-200 ease-out
                                        ${!loadingId
                                            ? 'hover:scale-[1.04] hover:border-biophilic-green dark:hover:border-biophilic-dark-green hover:shadow-organic dark:hover:shadow-dark-green-glow cursor-pointer'
                                            : 'opacity-60 cursor-wait'
                                        }
                                        ${isAdding ? 'ring-2 ring-biophilic-green dark:ring-biophilic-dark-green ring-offset-1 dark:ring-offset-biophilic-dark-surface' : ''}
                                    `}
                                >
                                    {/* Thumbnail */}
                                    <img
                                        src={img.thumb || img.url}
                                        alt={img.label}
                                        loading="lazy"
                                        crossOrigin="anonymous"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.08]"
                                        onError={(e) => { e.target.style.opacity = '0.3'; }}
                                    />

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2 pointer-events-none">
                                        <span className="text-white text-[10px] font-semibold drop-shadow leading-tight line-clamp-1">
                                            {img.label}
                                        </span>
                                    </div>

                                    {/* Adding spinner */}
                                    {isAdding && (
                                        <div className="absolute inset-0 bg-white/70 dark:bg-biophilic-dark-surface/80 flex items-center justify-center rounded-xl pointer-events-none backdrop-blur-sm">
                                            <div className="w-5 h-5 border-2 border-biophilic-green-light dark:border-biophilic-dark-border border-t-biophilic-green dark:border-t-biophilic-dark-green rounded-full animate-spin" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Attribution footer */}
                {!isLoading && !error && results.length > 0 && (
                    <p className="text-center text-[10px] text-biophilic-bark/30 dark:text-biophilic-dark-border mt-4 select-none">
                        Photos via {SOURCES.find(s => s.id === source)?.label}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ImageLibraryPanel;
