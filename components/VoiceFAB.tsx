"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";

interface VoiceFABProps {
    onTranscript: (text: string) => void;
    isProcessing: boolean;
    isMuted: boolean;
}

export interface VoiceFABRef {
    pauseListening: () => void;
    resumeListening: () => void;
}

const VoiceFAB = forwardRef<VoiceFABRef, VoiceFABProps>(
    ({ onTranscript, isProcessing, isMuted }, ref) => {
        const [isListening, setIsListening] = useState(false);
        const [isSupported, setIsSupported] = useState(true);
        const [interimText, setInterimText] = useState("");

        // This ref tracks if the USER wants the mic to be on.
        const userWantsListeningRef = useRef(false);

        // This tracks the actual speech recognition instance.
        const recognitionRef = useRef<any>(null);

        // We use a timeout to restart the mic if it drops dead
        const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        // A flag to quickly block all speech mapping if we are in a muted state
        const blockAudioRef = useRef(false);

        // Keep blockAudioRef synced with the prop, but add a 2 second tail to prevent echo
        useEffect(() => {
            if (isMuted) {
                blockAudioRef.current = true;
            } else {
                // When TTS finishes, wait 2 seconds before unblocking the mic
                const t = setTimeout(() => {
                    blockAudioRef.current = false;
                }, 2000);
                return () => clearTimeout(t);
            }
        }, [isMuted]);

        const stopAndCleanup = useCallback(() => {
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.onend = null;
                    recognitionRef.current.onerror = null;
                    recognitionRef.current.onresult = null;
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore abort errors
                }
                recognitionRef.current = null;
            }
            setInterimText("");
        }, []);

        const startListening = useCallback(() => {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setIsSupported(false);
                return;
            }

            stopAndCleanup();

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "he-IL";

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event: any) => {
                // If TTS is speaking, or we are in the 2s cooldown tail, ignore everything immediately.
                if (blockAudioRef.current) {
                    setInterimText("");
                    return;
                }

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

                if (finalTranscript.trim() && finalTranscript.trim().length >= 2) {
                    onTranscript(finalTranscript.trim());
                    setInterimText("");
                }
            };

            recognition.onerror = (event: any) => {
                console.warn("Speech error:", event.error);
                if (event.error === 'not-allowed') {
                    userWantsListeningRef.current = false;
                    setIsListening(false);
                    setIsSupported(false);
                }
            };

            recognition.onend = () => {
                setIsListening(false);
                // If the user didn't explicitly turn it off, Android Chrome likely killed it.
                // We recreate and restart it immediately.
                if (userWantsListeningRef.current) {
                    restartTimeoutRef.current = setTimeout(() => {
                        startListening();
                    }, 250);
                }
            };

            recognitionRef.current = recognition;

            try {
                recognition.start();
            } catch (e) {
                setIsListening(false);
            }
        }, [onTranscript, stopAndCleanup]);

        useImperativeHandle(ref, () => ({
            pauseListening: () => {
                // Do nothing to the actual stream, just let `blockAudioRef` reject everything!
                // Stopping the stream entirely causes Android to lock up.
            },
            resumeListening: () => {
                // The `blockAudioRef` handles resuming automatically after 2s.
            }
        }), []);

        const toggleMic = () => {
            if (userWantsListeningRef.current) {
                // Turn OFF
                userWantsListeningRef.current = false;
                setIsListening(false);
                stopAndCleanup();
            } else {
                // Turn ON
                userWantsListeningRef.current = true;
                startListening();
            }
        };

        useEffect(() => {
            return () => stopAndCleanup();
        }, [stopAndCleanup]);

        if (!isSupported) return null;

        return (
            <>
                {interimText && !blockAudioRef.current && (
                    <div className="voice-interim-display">
                        <span className="voice-interim-text">{interimText}</span>
                    </div>
                )}

                <button
                    onClick={toggleMic}
                    disabled={isProcessing}
                    className={`voice-fab ${isListening ? "voice-fab-active" : ""}`}
                    title={isListening ? "הפסק הקלטה" : "התחל הקלטה"}
                >
                    {isListening && !isMuted && <span className="voice-fab-pulse" />}
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
