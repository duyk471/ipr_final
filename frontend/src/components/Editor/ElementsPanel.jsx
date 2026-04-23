import React, { useState, useMemo, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import * as fabric from 'fabric';
import { Search, Square, Circle, Triangle, Star, Hexagon, Frame, Type } from 'lucide-react';

const SHAPES = [
    { name: 'Rectangle', type: 'rect', icon: <Square size={24} /> },
    { name: 'Circle', type: 'circle', icon: <Circle size={24} /> },
    { name: 'Triangle', type: 'triangle', icon: <Triangle size={24} /> },
    { name: 'Square Frame', type: 'rect-frame', icon: <Frame size={24} /> },
    { name: 'Circle Frame', type: 'circle-frame', icon: <Circle size={24} /> },
    { name: 'Star Frame', type: 'star-frame', icon: <Star size={24} /> },
    { name: 'Text Box', type: 'text-frame', icon: <Type size={24} /> }
];

const ElementsPanel = ({ canvasRef }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const iconNames = useMemo(() => {
        return Object.keys(LucideIcons).filter(name => 
            name !== 'createLucideIcon' && 
            name !== 'default' &&
            name !== 'Icon' &&
            name !== 'LucideProps' &&
            typeof LucideIcons[name] === 'function' || typeof LucideIcons[name] === 'object'
        );
    }, []);

    const filteredIcons = useMemo(() => {
        if (!searchTerm) return iconNames.slice(0, 50); // Show first 50 initially to prevent lag
        return iconNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 100);
    }, [searchTerm, iconNames]);

    const handleAddShape = (type) => {
        if (type === 'rect') canvasRef.current?.addShape('rect');
        else if (type === 'circle') canvasRef.current?.addShape('circle');
        else if (type === 'triangle') canvasRef.current?.addShape('triangle');
        else if (type === 'star-frame') canvasRef.current?.addFrame('star');
        else if (type === 'circle-frame') canvasRef.current?.addFrame('circle');
        else if (type === 'rect-frame') canvasRef.current?.addFrame('rect');
        else if (type === 'text-frame') canvasRef.current?.addFrame('text');
    };

    const handleAddIcon = (IconComponent) => {
        if (!canvasRef.current || !canvasRef.current.canvas) return;
        
        // We render it to a string essentially by rendering it to DOM and getting innerHTML
        const tempDiv = document.createElement('div');
        import('react-dom/client').then(({ createRoot }) => {
            const root = createRoot(tempDiv);
            root.render(<IconComponent size={64} color="#000000" strokeWidth={2} />);
            
            // Wait for render
            setTimeout(() => {
                const svgElement = tempDiv.querySelector('svg');
                if (svgElement) {
                    const svgString = svgElement.outerHTML;
                    fabric.loadSVGFromString(svgString).then(({ objects, options }) => {
                        const obj = fabric.util.groupSVGElements(objects, options);
                        obj.set({
                            left: 100,
                            top: 100,
                            originX: 'center',
                            originY: 'center',
                            scaleX: 1,
                            scaleY: 1
                        });
                        canvasRef.current.canvas.add(obj);
                        canvasRef.current.canvas.setActiveObject(obj);
                        canvasRef.current.canvas.renderAll();
                    }).catch(err => console.error("SVG Parse Error", err));
                }
                root.unmount();
            }, 50);
        });
    };

    return (
        <div className="p-5 overflow-y-auto h-full space-y-8 bg-slate-50/50 dark:bg-biophilic-dark-surface transition-colors">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search icons..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-biophilic-dark-card border border-slate-200 dark:border-biophilic-dark-border text-slate-900 dark:text-biophilic-dark-text rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-biophilic-green/20 focus:border-biophilic-green outline-none transition-all shadow-sm"
                />
            </div>

            {/* Basic Shapes */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Base Shapes</h3>
                <div className="grid grid-cols-3 gap-3">
                    {SHAPES.map((shape) => (
                        <button
                            key={shape.name}
                            onClick={() => handleAddShape(shape.type)}
                            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-biophilic-dark-card border border-slate-100 dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green hover:shadow-md transition-all group"
                            title={shape.name}
                        >
                            <div className="text-slate-500 dark:text-biophilic-dark-text-muted group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green transition-colors mb-2">
                                {shape.icon}
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-biophilic-dark-text-muted group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green">{shape.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Icons */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Libraries</h3>
                <div className="grid grid-cols-4 gap-2">
                    {filteredIcons.map(name => {
                        const IconComponent = LucideIcons[name];
                        if (!IconComponent) return null;
                        return (
                            <button
                                key={name}
                                onClick={() => handleAddIcon(IconComponent)}
                                className="flex items-center justify-center p-3 bg-white dark:bg-biophilic-dark-card border border-slate-100 dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green hover:shadow-md transition-all group text-slate-600 dark:text-biophilic-dark-text-muted hover:text-biophilic-moss dark:hover:text-biophilic-dark-text"
                                title={name}
                            >
                                <IconComponent size={24} />
                            </button>
                        );
                    })}
                </div>
                {filteredIcons.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-400">
                        No icons found for "{searchTerm}"
                    </div>
                )}
            </div>
        </div>
    );
};

export default ElementsPanel;
