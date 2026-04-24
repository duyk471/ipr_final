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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-2xl">
                {/* Spinner */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
                    </div>
                </div>

                {/* Main message */}
                <h3 className="text-center text-lg font-semibold text-gray-800 mb-2">
                    {message}
                </h3>

                {/* Details */}
                {details && (
                    <p className="text-center text-sm text-gray-600 mb-4">
                        {details}
                    </p>
                )}

                {/* Progress bar */}
                {progress !== null && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                )}

                {/* Cancel button */}
                {showCancel && onCancel && (
                    <button
                        onClick={onCancel}
                        className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProcessingIndicator;
