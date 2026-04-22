import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, MousePointer2, Keyboard, Sparkles, History, Layers, Type, Image as ImageIcon } from 'lucide-react';

const UserManual = () => {
    const navigate = useNavigate();

    const sections = [
        {
            title: "Getting Started",
            icon: <BookOpen className="text-biophilic-green" />,
            content: "Welcome to AI Image Editor! You can start by creating a new blank project, importing an existing image, or using our AI Magic Generation to build a scene from a text description."
        },
        {
            title: "Keyboard Shortcuts",
            icon: <Keyboard className="text-biophilic-green" />,
            isList: true,
            items: [
                "Ctrl + C: Copy selected object",
                "Ctrl + V: Paste object",
                "Ctrl + Z: Undo last action",
                "Ctrl + Y: Redo last action",
                "Arrow Keys: Move object by 1px",
                "Shift + Arrows: Move object by 10px",
                "Delete / Backspace: Remove selected object"
            ]
        },
        {
            title: "Mouse Interactions",
            icon: <MousePointer2 className="text-biophilic-green" />,
            content: "Right-click on any object on the canvas to open the Context Menu. From there, you can quickly Duplicate, Delete, or change the Layer order (Bring to Front, Send to Back, etc.)."
        },
        {
            title: "AI Magic Features",
            icon: <Sparkles className="text-biophilic-green" />,
            isList: true,
            items: [
                "AI Gen: Describe what you want to see, and the AI will generate layers for you.",
                "AI Assist: Chat with the AI to ask for design advice or automated edits.",
                "Background Removal: Select an image and use 'Remove Background' in the properties panel."
            ]
        },
        {
            title: "Elements Library",
            icon: <Layers className="text-biophilic-green" />,
            content: "Access the 'Elements' tab in the left sidebar to add Shapes, SVGs, and Smart Frames. You can search thousands of vector icons to enhance your design."
        },
        {
            title: "Smart Snap",
            icon: <MousePointer2 className="text-biophilic-green" />,
            content: "When moving objects, purple guidelines will automatically appear to help you align elements perfectly with the canvas center or other objects."
        },
        {
            title: "Version History",
            icon: <History className="text-biophilic-green" />,
            content: "Your work is auto-saved. Click the clock icon in the top header to view and restore daily snapshots if you want to revert to an older version."
        }
    ];

    return (
        <div className="min-h-screen bg-biophilic-cream py-12 px-4 sm:px-6 lg:px-8 custom-scrollbar overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-biophilic-green-dark hover:text-biophilic-moss mb-8 transition-colors group font-semibold"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Dashboard</span>
                </button>

                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-extrabold text-biophilic-moss mb-4 tracking-tight">User Manual</h1>
                    <p className="text-lg text-biophilic-bark/80">Everything you need to know to create stunning designs with AI.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sections.map((section, idx) => (
                        <div key={idx} className="bg-white/90 p-8 rounded-2xl shadow-organic-sm border border-biophilic-cream-dark hover:shadow-organic transition-shadow">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-biophilic-green-light/30 rounded-xl">
                                    {section.icon}
                                </div>
                                <h3 className="text-xl font-bold text-biophilic-moss">{section.title}</h3>
                            </div>
                            
                            {section.isList ? (
                                <ul className="space-y-2">
                                    {section.items.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-slate-600 text-sm">
                                            <span className="text-biophilic-green mt-1">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-600 leading-relaxed text-sm">
                                    {section.content}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <footer className="mt-16 pt-8 border-t border-biophilic-cream-dark text-center text-biophilic-bark/50 text-sm">
                    © 2026 AI Image Editor • Built for Creativity.
                </footer>
            </div>
        </div>
    );
};

export default UserManual;
