"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";

interface VoiceFABProps {
    onTranscript: (text: string) => void;
    isProcessing: boolean;
    isMuted: boolean;
}

interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    }
}

export interface VoiceFABRef {
    pauseListening: () => void;
    resumeListening: () => void;
}

// Auto-stop mic after this many ms of silence (no final transcript)
const INACTIVITY_TIMEOUT_MS = 60000; // 60 seconds

const VoiceFAB = forwardRef<VoiceFABRef, VoiceFABProps>(
    ({ onTranscript, isProcessing, isMuted }, ref) => {
        const [isListening, setIsListening] = useState(false);
        const [isSupported, setIsSupported] = useState(true);
        const [interimText, setInterimText] = useState("");
        const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
        const shouldRestartRef = useRef(false);
        const wasListeningBeforeMuteRef = useRef(false);
        const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const userActivatedRef = useRef(false); // tracks if user manually toggled

        const resetInactivityTimer = useCallback(() => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            inactivityTimerRef.current = setTimeout(() => {
                // Auto-stop after inactivity
                if (shouldRestartRef.current) {
                    shouldRestartRef.current = false;
                    recognitionRef.current?.stop();
                    recognitionRef.current = null;
                    setIsListening(false);
                    setInterimText("");
                    userActivatedRef.current = false;
                }
            }, INACTIVITY_TIMEOUT_MS);
        }, []);

        const clearInactivityTimer = useCallback(() => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
                inactivityTimerRef.current = null;
            }
        }, []);

        const startRecognition = useCallback(() => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setIsSupported(false);
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "he-IL";

            recognition.onstart = () => {
                setIsListening(true);
                resetInactivityTimer();
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = "";
                let interim = "";

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalTranscript += result[0].transcript;
                    } else {
                        interim += result[0].transcript;
                    }
                }

                setInterimText(interim);

                if (finalTranscript.trim()) {
                    // Reset inactivity timer on real speech
                    resetInactivityTimer();
                    onTranscript(finalTranscript.trim());
                    setInterimText("");
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error("Speech recognition error:", event.error);
                if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                    setIsSupported(false);
                    shouldRestartRef.current = false;
                    clearInactivityTimer();
                }
            };

            recognition.onend = () => {
                if (shouldRestartRef.current) {
                    try {
                        recognition.start();
                    } catch {
                        setIsListening(false);
                        shouldRestartRef.current = false;
                        clearInactivityTimer();
                    }
                } else {
                    setIsListening(false);
                    clearInactivityTimer();
                }
            };

            recognitionRef.current = recognition;

            try {
                recognition.start();
                shouldRestartRef.current = true;
            } catch {
                setIsListening(false);
            }
        }, [onTranscript, resetInactivityTimer, clearInactivityTimer]);

        const stopRecognition = useCallback(() => {
            shouldRestartRef.current = false;
            clearInactivityTimer();
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setIsListening(false);
            setInterimText("");
        }, [clearInactivityTimer]);

        // Expose pause/resume to parent
        useImperativeHandle(ref, () => ({
            pauseListening: () => {
                if (isListening) {
                    wasListeningBeforeMuteRef.current = true;
                    stopRecognition();
                }
            },
            resumeListening: () => {
                // Only resume if user originally activated the mic
                if (wasListeningBeforeMuteRef.current && userActivatedRef.current) {
                    wasListeningBeforeMuteRef.current = false;
                    startRecognition();
                } else {
                    wasListeningBeforeMuteRef.current = false;
                }
            },
        }), [isListening, stopRecognition, startRecognition]);

        // Handle external mute/unmute
        useEffect(() => {
            if (isMuted && isListening) {
                wasListeningBeforeMuteRef.current = true;
                stopRecognition();
            } else if (!isMuted && wasListeningBeforeMuteRef.current && userActivatedRef.current) {
                wasListeningBeforeMuteRef.current = false;
                const timer = setTimeout(() => startRecognition(), 800);
                return () => clearTimeout(timer);
            }
        }, [isMuted, isListening, stopRecognition, startRecognition]);

        const toggleListening = () => {
            if (isListening) {
                userActivatedRef.current = false;
                stopRecognition();
            } else {
                userActivatedRef.current = true;
                startRecognition();
            }
        };

        useEffect(() => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setIsSupported(false);
            }
            return () => {
                stopRecognition();
            };
        }, [stopRecognition]);

        if (!isSupported) return null;

        return (
            <>
                {interimText && (
                    <div className="voice-interim-display">
                        <span className="voice-interim-text">{interimText}</span>
                    </div>
                )}

                <button
                    onClick={toggleListening}
                    disabled={isProcessing}
                    className={`voice-fab ${isListening ? "voice-fab-active" : ""}`}
                    title={isListening ? "הפסק הקלטה" : "התחל הקלטה"}
                >
                    {isListening && <span className="voice-fab-pulse" />}
                    <svg viewBox="0 0 24 24" className="voice-fab-icon">
                        {isListening ? (
                            <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
                        ) : (
                            <>
                                <path
                                    d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
                                    fill="currentColor"
                                />
                            </>
                        )}
                    </svg>
                </button>
            </>
        );
    }
);

VoiceFAB.displayName = "VoiceFAB";
export default VoiceFAB;
