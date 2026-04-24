import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Biophilic Spinner
 * A premium sage green progress indicator that feels natural and organic.
 */
export const BiophilicSpinner = ({ size = 'md', message = '' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-16 h-16',
        lg: 'w-24 h-24'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in duration-700">
            <div className={`relative ${sizeClasses[size]}`}>
                {/* Organic pulsing background */}
                <div className="absolute inset-0 bg-biophilic-moss/20 dark:bg-biophilic-dark-green/20 rounded-full animate-pulse blur-xl" />
                
                {/* Main spinning ring */}
                <svg className="w-full h-full animate-[spin_3s_linear_infinite]" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-biophilic-moss/10 dark:text-biophilic-dark-green/10"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="70 200"
                        className="text-biophilic-moss dark:text-biophilic-dark-green shadow-glow-green"
                    />
                </svg>
                
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-1/3 h-1/3 text-biophilic-moss dark:text-biophilic-dark-green animate-pulse" />
                </div>
            </div>
            
            {message && (
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-biophilic-moss/60 dark:text-biophilic-dark-green/60 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );
};

export default BiophilicSpinner;
