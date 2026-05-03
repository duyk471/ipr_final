import React from 'react';
import { Square, Circle, Triangle, Hexagon, Star, ArrowRight, Minus, Diamond, Heart, Pentagon, Octagon, X, Zap, Search, Home, Bell, Cloud, Lock, Camera, Sun, Music } from 'lucide-react';

const SHAPES = [
    { name: 'Rectangle', type: 'rect', icon: <Square size={24} /> },
    { name: 'Circle', type: 'circle', icon: <Circle size={24} /> },
    { name: 'Triangle', type: 'triangle', icon: <Triangle size={24} /> },
    { name: 'Ellipse', type: 'ellipse', icon: <Circle size={24} /> },
    { name: 'Star', type: 'star', icon: <Star size={24} /> },
    { name: 'Hexagon', type: 'hexagon', icon: <Hexagon size={24} /> },
    { name: 'Pentagon', type: 'pentagon', icon: <Pentagon size={24} /> },
    { name: 'Octagon', type: 'octagon', icon: <Octagon size={24} /> },
    { name: 'Diamond', type: 'diamond', icon: <Diamond size={24} /> },
    { name: 'Heart', type: 'heart', icon: <Heart size={24} /> },
    { name: 'Arrow', type: 'arrow', icon: <ArrowRight size={24} /> },
    { name: 'Cross', type: 'cross', icon: <X size={24} /> },
    { name: 'Lightning', type: 'lightning', icon: <Zap size={24} /> },
    { name: 'Line', type: 'line', icon: <Minus size={24} /> }
];

const ICONS = [
    { name: 'Search', type: 'search', icon: <Search size={24} /> },
    { name: 'Home', type: 'home', icon: <Home size={24} /> },
    { name: 'Bell', type: 'bell', icon: <Bell size={24} /> },
    { name: 'Cloud', type: 'cloud', icon: <Cloud size={24} /> },
    { name: 'Lock', type: 'lock', icon: <Lock size={24} /> },
    { name: 'Camera', type: 'camera', icon: <Camera size={24} /> },
    { name: 'Sun', type: 'sun', icon: <Sun size={24} /> },
    { name: 'Music', type: 'music', icon: <Music size={24} /> }
];

const ElementsPanel = ({ canvasRef }) => {
    const handleAddShape = (type) => {
        canvasRef.current?.addShape(type);
    };

    const handleDragStart = (e, type) => {
        e.dataTransfer.setData('shapeType', type);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="p-5 overflow-y-auto h-full space-y-8 bg-slate-50/50 dark:bg-biophilic-dark-surface transition-colors">
            {/* Basic Shapes */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Base Shapes</h3>
                <div className="grid grid-cols-5 gap-3">
                    {SHAPES.map((shape) => (
                        <button
                            key={shape.name}
                            onClick={() => handleAddShape(shape.type)}
                            onDragStart={(e) => handleDragStart(e, shape.type)}
                            draggable
                            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-biophilic-dark-card border border-slate-100 dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green hover:shadow-md transition-all group cursor-pointer"
                            title={`Click to add ${shape.name} to center or drag to position`}
                        >
                            <div className="text-slate-500 dark:text-biophilic-dark-text-muted group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green transition-colors mb-2">
                                {shape.icon}
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-biophilic-dark-text-muted group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green">{shape.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Icon Library */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Icon Library</h3>
                <div className="grid grid-cols-5 gap-3">
                    {ICONS.map((iconItem) => (
                        <button
                            key={iconItem.name}
                            onClick={() => handleAddShape(iconItem.type)}
                            onDragStart={(e) => handleDragStart(e, iconItem.type)}
                            draggable
                            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-biophilic-dark-card border border-slate-100 dark:border-biophilic-dark-border rounded-xl hover:border-biophilic-green-light dark:hover:border-biophilic-dark-green hover:shadow-md transition-all group cursor-pointer"
                            title={`Click to add ${iconItem.name} icon to center or drag to position`}
                        >
                            <div className="text-slate-500 dark:text-biophilic-dark-text-muted group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green transition-colors mb-2">
                                {iconItem.icon}
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-biophilic-dark-text-muted group-hover:text-biophilic-moss dark:group-hover:text-biophilic-dark-green">{iconItem.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ElementsPanel;
