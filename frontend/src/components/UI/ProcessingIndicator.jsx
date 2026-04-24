import React from 'react';
import { Loader } from 'lucide-react';

/**
 * Processing Indicator Component
 * Shows a modal overlay with loading animation during AI operations
 */
export const ProcessingIndicator = ({
    isVisible = false,
    message = 'Processing...',
    details = '',
    progress = null,
    showCancel = false,
    onCancel = null
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-biophilic-bark/20 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-[500] animate-in fade-in duration-300">
            <div className="bg-white dark:bg-biophilic-dark-card rounded-[40px] p-10 max-w-sm w-full mx-4 shadow-premium border border-biophilic-moss/10 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                {/* Spinner */}
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-biophilic-moss/20 border-t-biophilic-moss animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader className="w-8 h-8 text-biophilic-moss animate-pulse" />
                    </div>
                </div>

                <div className="text-center">
                    {/* Main message */}
                    <h3 className="text-xl font-black text-biophilic-bark dark:text-biophilic-dark-green mb-2">
                        {message}
                    </h3>

                    {/* Details */}
                    {details && (
                        <p className="text-sm font-medium text-biophilic-moss/80 dark:text-biophilic-dark-text-muted leading-relaxed">
                            {details}
                        </p>
                    )}
                </div>

                {/* Progress bar */}
                {progress !== null && (
                    <div className="w-full">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-biophilic-moss/60 mb-2">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-biophilic-cream dark:bg-biophilic-dark-border rounded-full h-2 overflow-hidden shadow-inner">
                            <div
                                className="bg-biophilic-moss dark:bg-biophilic-dark-green h-full rounded-full transition-all duration-300 shadow-glow-green"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Cancel button */}
                {showCancel && onCancel && (
                    <button
                        onClick={onCancel}
                        className="w-full mt-2 px-6 py-4 bg-biophilic-cream dark:bg-biophilic-dark-border text-biophilic-bark dark:text-biophilic-dark-text font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-biophilic-cream-dark dark:hover:bg-biophilic-dark-surface transition-all"
                    >
                        Cancel Operation
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProcessingIndicator;
