import type { SpeechSynthesisAdapter } from "@assistant-ui/react";

/**
 * Speech Synthesis Adapter for LocalRuntime
 * Provides text-to-speech capabilities using Web Speech API
 * 
 * Features:
 * - Text-to-speech playback
 * - Configurable voice, rate, and pitch
 * - Cancel and status tracking
 */
export const speechAdapter: SpeechSynthesisAdapter = {
  /**
   * Speak the given text
   * Returns an utterance object with status tracking
   */
  speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume

    // Optional: Select a specific voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) => voice.lang.startsWith("en-") && voice.localService
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    const subscribers = new Set<() => void>();
    
    const result: SpeechSynthesisAdapter.Utterance = {
      status: { type: "running" },
      
      /**
       * Cancel speech playback
       */
      cancel: () => {
        speechSynthesis.cancel();
        result.status = { type: "ended", reason: "cancelled" };
        subscribers.forEach((cb) => cb());
      },
      
      /**
       * Subscribe to status changes
       */
      subscribe: (callback) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
    };

    // Handle completion
    utterance.addEventListener("end", () => {
      result.status = { type: "ended", reason: "finished" };
      subscribers.forEach((cb) => cb());
    });

    // Handle errors
    utterance.addEventListener("error", (event) => {
      result.status = { 
        type: "ended", 
        reason: "error", 
        error: event.error 
      };
      subscribers.forEach((cb) => cb());
    });

    // Start speaking
    speechSynthesis.speak(utterance);
    
    return result;
  },
};

/**
 * Helper function to check if speech synthesis is available
 */
export const isSpeechSynthesisSupported = () => {
  return typeof window !== "undefined" && "speechSynthesis" in window;
};
