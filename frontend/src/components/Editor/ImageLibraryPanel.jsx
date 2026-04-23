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

                    imageUrl = assetInfo.url;
                    img.metadata = { ...img.metadata, originalPath: assetInfo.path };
                } catch (downloadError) {
                    console.warn('Failed to download and save image locally, using external URL:', downloadError);
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

    const handleRetry = () => runSearch(debouncedTerm, source);
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
                    <div className="grid grid-cols-2 gap-3">
                        {results.map((img) => {
                            const isAdding = loadingId === img.id;
                            return (
                                <button
                                    key={img.id}
                                    onClick={() => handleSelectImage(img)}
                                    disabled={!!loadingId}
                                    title={`Add "${img.label}" to canvas`}
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
                                        src={img.thumb || img.url}
                                        alt={img.label}
                                        loading="lazy"
                                        crossOrigin="anonymous"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.15]"
                                        onError={(e) => { e.target.style.opacity = '0.3'; }}
                                    />

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 pointer-events-none">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest drop-shadow-md">
                                                {img.label}
                                            </span>
                                            <span className="text-white/60 text-[8px] font-bold">Unsplash Photo</span>
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
