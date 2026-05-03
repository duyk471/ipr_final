import React from 'react';
import { Square, Circle, Triangle } from 'lucide-react';

const SHAPES = [
    { name: 'Rectangle', type: 'rect', icon: <Square size={24} /> },
    { name: 'Circle', type: 'circle', icon: <Circle size={24} /> },
    { name: 'Triangle', type: 'triangle', icon: <Triangle size={24} /> }
];

const ElementsPanel = ({ canvasRef }) => {
    const handleAddShape = (type) => {
        if (type === 'rect') canvasRef.current?.addShape('rect');
        else if (type === 'circle') canvasRef.current?.addShape('circle');
        else if (type === 'triangle') canvasRef.current?.addShape('triangle');
    };

    return (
        <div className="p-5 overflow-y-auto h-full space-y-8 bg-slate-50/50 dark:bg-biophilic-dark-surface transition-colors">
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
        </div>
    );
};

export default ElementsPanel;
