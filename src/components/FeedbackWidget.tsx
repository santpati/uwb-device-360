"use client";

import { useState, useRef } from "react";
import { MessageSquarePlus, Github, X, Paperclip, Loader2, Send } from "lucide-react";

export default function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("feedback", feedback);
        if (name) formData.append("name", name);
        if (email) formData.append("email", email);
        if (file) formData.append("image", file);

        // Basic user info if available from localStorage (client-side only trick)
        const ssoUser = localStorage.getItem("sso_user"); // We might not have this stored explicitly, but let's try
        const tenantId = localStorage.getItem("tenant_id");
        if (ssoUser) formData.append("ssoUser", ssoUser);
        if (tenantId) formData.append("tenantId", tenantId);

        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setIsOpen(false);
                    setFeedback("");
                    setName("");
                    setEmail("");
                    setFile(null);
                }, 2000);
            } else {
                alert("Failed to send feedback. Please try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 animate-in slide-in-from-bottom-6 fade-in duration-500">
            {/* Github Link */}
            <a
                href="https://github.com/santpati/uwb-device-360"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 border border-zinc-700"
                title="View Source on GitHub"
            >
                <Github className="w-5 h-5" />
            </a>

            {/* Make a Wish Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 border border-indigo-500/50 ${isOpen ? "bg-zinc-800 text-zinc-400 rotate-45" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                title="Make a Wish / Feedback"
            >
                {isOpen ? <X className="w-5 h-5" /> : <MessageSquarePlus className="w-6 h-6" />}
            </button>

            {/* Feedback Form Modal */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[360px] bg-zinc-900 border border-zinc-700 shadow-2xl rounded-2xl p-5 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-300">
                    {success ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
                                <Send className="w-6 h-6" />
                            </div>
                            <h3 className="text-white font-medium">Wish Granted!</h3>
                            <p className="text-zinc-400 text-sm">Thanks for your feedback.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-semibold">Make a Wish</h3>
                                <span className="text-xs text-zinc-500">Help us improve</span>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="I wish this dashboard could..."
                                    className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                                    required
                                />

                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Name (Optional)"
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email (Optional)"
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-indigo-400 transition-colors"
                                    >
                                        <Paperclip className="w-3.5 h-3.5" />
                                        {file ? (
                                            <span className="text-indigo-400 max-w-[120px] truncate">{file.name}</span>
                                        ) : (
                                            "Attach Screenshot"
                                        )}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        accept="image/*"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!feedback.trim() || isSubmitting}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <>
                                                Send Wish <Send className="w-3 h-3" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
