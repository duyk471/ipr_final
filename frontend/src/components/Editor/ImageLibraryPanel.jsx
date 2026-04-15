import React, { useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { Search, X, ImageIcon } from 'lucide-react';

// ─── Mock Database ────────────────────────────────────────────────────────────
// Pre-defined images with keyword tags. Used for instant filtering when a query
// matches a known subject without a simulated network round-trip.
const MOCK_DATABASE = [
    { id: 'm01', label: 'Mountain Lake', tags: ['mountain', 'lake', 'nature', 'landscape', 'water'], url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=60' },
    { id: 'm02', label: 'Starry Night', tags: ['night', 'stars', 'sky', 'dark', 'landscape'], url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=60' },
    { id: 'm03', label: 'Ocean Sunset', tags: ['ocean', 'sunset', 'sea', 'water', 'nature', 'orange'], url: 'https://images.unsplash.com/photo-1718363534265-43c08c01d048?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1718363534265-43c08c01d048?w=400&q=60' },
    { id: 'm04', label: 'Forest Path', tags: ['forest', 'trees', 'nature', 'green', 'path'], url: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=400&q=60' },
    { id: 'm05', label: 'City Skyline', tags: ['city', 'skyline', 'urban', 'buildings', 'architecture'], url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=60' },
    { id: 'm06', label: 'Spring Flowers', tags: ['flowers', 'spring', 'nature', 'color', 'pink', 'bloom'], url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc27?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1490750967868-88df5691cc27?w=400&q=60' },
    { id: 'm07', label: 'Architecture', tags: ['architecture', 'building', 'design', 'city', 'modern'], url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=60' },
    { id: 'm08', label: 'Tech Abstract', tags: ['tech', 'abstract', 'technology', 'digital', 'computer', 'blue'], url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&q=60' },
    { id: 'm09', label: 'Portrait', tags: ['portrait', 'person', 'woman', 'face', 'people'], url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=60' },
    { id: 'm10', label: 'Aerial View', tags: ['aerial', 'drone', 'landscape', 'top', 'nature', 'green'], url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=60' },
    { id: 'm11', label: 'Cute Dog', tags: ['dog', 'animal', 'pet', 'cute', 'puppy'], url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=60' },
    { id: 'm12', label: 'Fashion', tags: ['fashion', 'style', 'woman', 'clothes', 'model', 'portrait'], url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=60' },
    { id: 'm13', label: 'Mountain Peak', tags: ['mountain', 'peak', 'snow', 'landscape', 'hiking', 'nature'], url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=60' },
    { id: 'm14', label: 'Coffee & Work', tags: ['coffee', 'work', 'desk', 'laptop', 'business', 'office'], url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=60' },
    { id: 'm15', label: 'Abstract Art', tags: ['abstract', 'art', 'color', 'design', 'paint', 'creative'], url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=60' },
];

// ─── Source Configuration ─────────────────────────────────────────────────────
const SOURCES = [
    {
        id: 'unsplash',
        label: 'Unsplash',
        color: 'bg-black text-white',
        activeColor: 'bg-black text-white shadow',
        // source.unsplash.com returns a redirect to a real photo for a keyword
        generateUrls: (query, count) =>
            Array.from({ length: count }, (_, i) => ({
                id: `u_${query}_${i}`,
                label: `${query} ${i + 1}`,
                // Using sig (signature) param to get variety per slot
                url: `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(query)}&sig=${i * 37 + 1}`,
                thumb: `https://source.unsplash.com/featured/400x300/?${encodeURIComponent(query)}&sig=${i * 37 + 1}`,
            })),
    },
    {
        id: 'pexels',
        label: 'Pexels',
        color: 'bg-[#05A081] text-white',
        activeColor: 'bg-[#05A081] text-white shadow',
        // Picsum with keyword-derived seeds as Pexels mock
        generateUrls: (query, count) =>
            Array.from({ length: count }, (_, i) => {
                const seed = encodeURIComponent(`${query}-pexels-${i}`);
                return {
                    id: `p_${query}_${i}`,
                    label: `${query} ${i + 1}`,
                    url: `https://picsum.photos/seed/${seed}/800/600`,
                    thumb: `https://picsum.photos/seed/${seed}/400/300`,
                };
            }),
    },
    {
        id: 'pixabay',
        label: 'Pixabay',
        color: 'bg-[#2EC66E] text-white',
        activeColor: 'bg-[#2EC66E] text-white shadow',
        // LoremFlickr with keyword lock for Pixabay mock
        generateUrls: (query, count) =>
            Array.from({ length: count }, (_, i) => ({
                id: `px_${query}_${i}`,
                label: `${query} ${i + 1}`,
                url: `https://loremflickr.com/800/600/${encodeURIComponent(query)}?lock=${i + 100}`,
                thumb: `https://loremflickr.com/400/300/${encodeURIComponent(query)}?lock=${i + 100}`,
            })),
    },
];

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="aspect-video rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
);

// ─── Component ────────────────────────────────────────────────────────────────
const ImageLibraryPanel = ({ canvasRef }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [source, setSource] = useState('unsplash');
    const [results, setResults] = useState(MOCK_DATABASE);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingId, setLoadingId] = useState(null);

    // ── Debounce: push searchTerm → debouncedTerm after 500 ms ──
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ── Trigger search whenever debounced term or source changes ──
    useEffect(() => {
        runSearch(debouncedTerm.trim(), source);
    }, [debouncedTerm, source]);

    const runSearch = useCallback(async (query, src) => {
        setIsLoading(true);

        // Simulate network latency
        await new Promise((r) => setTimeout(r, 600));

        if (!query) {
            // Empty query → show mock database (local, no filtering)
            setResults(MOCK_DATABASE);
            setIsLoading(false);
            return;
        }

        // Try to find matching items in MOCK_DATABASE first
        const localMatches = MOCK_DATABASE.filter(
            (img) =>
                img.label.toLowerCase().includes(query.toLowerCase()) ||
                img.tags.some((t) => t.includes(query.toLowerCase()))
        );

        // Generate dynamic results from the selected source to supplement
        const sourceDef = SOURCES.find((s) => s.id === src);
        const dynamicResults = sourceDef ? sourceDef.generateUrls(query, 8) : [];

        // Merge: local matches first, then dynamic sources (deduplicated by id)
        const merged = [
            ...localMatches,
            ...dynamicResults.filter((d) => !localMatches.some((l) => l.id === d.id)),
        ];

        setResults(merged);
        setIsLoading(false);
    }, []);

    // ── Add image to Fabric.js canvas ──
    const handleSelectImage = (img) => {
        const canvas = canvasRef.current?.canvas;
        if (!canvas || loadingId) return;

        setLoadingId(img.id);

        fabric.FabricImage.fromURL(img.url, { crossOrigin: 'anonymous' })
            .then((fabricImg) => {
                const TARGET_WIDTH = 300;
                const scale = TARGET_WIDTH / fabricImg.width;

                fabricImg.set({
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    scaleX: scale,
                    scaleY: scale,
                });

                canvas.add(fabricImg);
                canvas.setActiveObject(fabricImg);
                canvas.requestRenderAll();
            })
            .catch((err) => console.error('Failed to load image onto canvas:', err))
            .finally(() => setLoadingId(null));
    };

    const handleClear = () => {
        setSearchTerm('');
    };

    const activeSource = SOURCES.find((s) => s.id === source);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#1E293B]">

            {/* ── Sticky Header: Search + Source Selector ── */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-sm px-5 pt-2 pb-3 space-y-3 border-b border-slate-100 dark:border-slate-700/60 flex-shrink-0">

                {/* Search Input */}
                <div className="relative flex items-center">
                    <Search
                        size={14}
                        className="absolute left-3 text-slate-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search images…"
                        className="w-full bg-slate-50 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600/60 text-slate-800 dark:text-slate-100 rounded-xl pl-9 pr-9 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/25 focus:border-slate-400 transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="Clear search"
                        >
                            <X size={14} />
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
                                    ? src.activeColor
                                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {src.label}
                        </button>
                    ))}
                </div>

                {/* Status line */}
                {!isLoading && debouncedTerm && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 -mb-1">
                        {results.length} result{results.length !== 1 ? 's' : ''} for "
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                            {debouncedTerm}
                        </span>
                        " via {activeSource?.label}
                    </p>
                )}
            </div>

            {/* ── Scrollable Image Grid ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
                {isLoading ? (
                    // Skeleton grid
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    // Empty state
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-600">
                        <ImageIcon size={36} strokeWidth={1.2} />
                        <p className="text-sm text-center leading-relaxed">
                            No images found for
                            <br />
                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                                "{debouncedTerm}"
                            </span>
                        </p>
                        <button
                            onClick={handleClear}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2 transition-colors"
                        >
                            Clear search
                        </button>
                    </div>
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
                                        relative group overflow-hidden rounded-lg border
                                        border-slate-200/70 dark:border-slate-700/60
                                        bg-slate-100 dark:bg-slate-800
                                        aspect-video
                                        transition-all duration-200 ease-out
                                        ${!loadingId
                                            ? 'hover:scale-[1.03] hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md cursor-pointer'
                                            : 'opacity-60 cursor-wait'
                                        }
                                        ${isAdding ? 'ring-2 ring-slate-400/50' : ''}
                                    `}
                                >
                                    {/* Thumbnail */}
                                    <img
                                        src={img.thumb || img.url}
                                        alt={img.label}
                                        loading="lazy"
                                        crossOrigin="anonymous"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.07]"
                                    />

                                    {/* Hover label overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2 pointer-events-none">
                                        <span className="text-white text-[10px] font-semibold drop-shadow leading-tight line-clamp-1">
                                            {img.label}
                                        </span>
                                    </div>

                                    {/* Spinner overlay while adding to canvas */}
                                    {isAdding && (
                                        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center rounded-lg pointer-events-none">
                                            <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-slate-700 dark:border-t-slate-200 rounded-full animate-spin" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Attribution */}
                {!isLoading && results.length > 0 && (
                    <p className="text-center text-[10px] text-slate-300 dark:text-slate-700 mt-4 select-none">
                        Photos via {activeSource?.label} (mock)
                    </p>
                )}
            </div>
        </div>
    );
};

export default ImageLibraryPanel;
