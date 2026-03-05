"use client";

import { useState, FormEvent, useEffect, useRef, useCallback } from "react";

interface CommandInputProps {
    onSend: (text: string) => void;
    isProcessing: boolean;
}

export default function CommandInput({ onSend, isProcessing }: CommandInputProps) {
    const [input, setInput] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef<any>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore
            }
        }
        setIsListening(false);
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false; // We just want short bursts that the user can append
        recognition.interimResults = true;
        recognition.lang = "he-IL";

        recognition.onstart = () => {
            setIsListening(true);
        };

        let currentResult = "";
        let originalInput = input; // Capture what was already in the input box

        recognition.onresult = (event: any) => {
            let interim = "";
            let final = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) {
                    final += res[0].transcript;
                } else {
                    interim += res[0].transcript;
                }
            }

            // Append the new final/interim text to whatever the user already typed
            const newText = (originalInput + " " + final + " " + interim).trim().replace(/\s+/g, " ");
            setInput(newText);

            if (final) {
                currentResult = final;
            }
        };

        recognition.onerror = (event: any) => {
            console.warn("Speech error in inline mic:", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (e) {
            setIsListening(false);
        }
    }, [isListening, input, stopListening]);

    useEffect(() => {
        // Cleanup on unmount
        return () => stopListening();
    }, [stopListening]);

    useEffect(() => {
        // Check support on mount
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
        }
    }, []);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isProcessing) {
            stopListening();
            onSend(input.trim());
            setInput("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="command-input-form">
            <div className="command-input-wrapper">
                {isSupported && (
                    <button
                        type="button"
                        onClick={toggleListening}
                        disabled={isProcessing}
                        className={`command-input-mic-btn ${isListening ? 'active' : ''}`}
                        title={isListening ? "הפסק הקלטה" : "הקלט פקודה לחלון הטקסט"}
                    >
                        {isListening ? (
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor" />
                            </svg>
                        )}
                    </button>
                )}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='מצאתי חלב / הוסף במבה...'
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
