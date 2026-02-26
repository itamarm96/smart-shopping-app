"use client";

import { useState, FormEvent } from "react";

interface CommandInputProps {
    onSend: (text: string) => void;
    isProcessing: boolean;
}

export default function CommandInput({ onSend, isProcessing }: CommandInputProps) {
    const [input, setInput] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isProcessing) {
            onSend(input.trim());
            setInput("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="command-input-form">
            <div className="command-input-wrapper">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='כתבו פריט חדש או פקודה כמו "מצאתי חלב"...'
                    className="command-input-field"
                    dir="rtl"
                    disabled={isProcessing}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="command-input-send-btn"
                >
                    {isProcessing ? (
                        <div className="command-input-spinner" />
                    ) : (
                        <svg viewBox="0 0 24 24" className="command-input-send-icon">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
                        </svg>
                    )}
                </button>
            </div>
        </form>
    );
}
