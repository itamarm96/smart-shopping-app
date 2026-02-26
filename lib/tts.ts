"use client";

// Post-TTS buffer: extra silence after speech ends to ensure
// the mic doesn't pick up the tail echo on mobile speakers
const POST_TTS_BUFFER_MS = 1500;

export function speakHebrew(text: string): Promise<void> {
    return new Promise((resolve) => {
        if (!window.speechSynthesis || !text) {
            resolve();
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "he-IL";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a Hebrew voice
        const voices = window.speechSynthesis.getVoices();
        const hebrewVoice = voices.find(
            (v) => v.lang.startsWith("he") || v.lang.startsWith("iw")
        );
        if (hebrewVoice) {
            utterance.voice = hebrewVoice;
        }

        utterance.onend = () => {
            // Wait extra buffer after speech finishes to let the echo die
            setTimeout(() => resolve(), POST_TTS_BUFFER_MS);
        };
        utterance.onerror = () => {
            setTimeout(() => resolve(), POST_TTS_BUFFER_MS);
        };

        window.speechSynthesis.speak(utterance);
    });
}

// Preload voices (some browsers load them asynchronously)
export function preloadVoices() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
}
