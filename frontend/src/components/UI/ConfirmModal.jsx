import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDestructive = true }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm shadow-2xl z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-700'}`}>
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
                    <p className="text-sm text-slate-500 font-medium">{message}</p>
                </div>
                <div className="p-6 bg-slate-50 border-t flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2.5 text-white flex items-center justify-center rounded-xl font-bold transition-all active:scale-[0.98] ${
                            isDestructive 
                                ? 'bg-red-500 hover:bg-red-600 shadow-sm' 
                                : 'bg-[#1E293B] hover:bg-[#0B1120] shadow-sm'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
