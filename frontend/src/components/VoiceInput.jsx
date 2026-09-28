import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, AlertCircle, Check, Loader2, Volume2 } from "lucide-react";

// Safe cross-browser check for SpeechRecognition
const getSpeechRecognitionClass = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export default function VoiceInput({ onTranscript, theme, disabled }) {
  const [status, setStatus] = useState("idle"); // "idle" | "listening" | "processing" | "completed" | "permission_denied" | "unsupported" | "error"
  const [interimText, setInterimText] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const recognitionRef = useRef(null);
  const statusTimerRef = useRef(null);

  const SpeechRecognition = getSpeechRecognitionClass();
  const isSupported = Boolean(SpeechRecognition);

  // Clear timers and stop speech engine on unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore abort error on unmount */
        }
      }
    };
  }, []);

  const handleStatusReset = useCallback((delay = 2200) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatus("idle");
      setInterimText("");
      setErrorDetails("");
    }, delay);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (disabled) return;

    if (!isSupported) {
      setStatus("unsupported");
      handleStatusReset(3500);
      return;
    }

    // Stop existing session cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = navigator.language || "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setStatus("listening");
        setInterimText("");
        setErrorDetails("");
      };

      recognition.onresult = (event) => {
        let finalTrans = "";
        let interimTrans = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTrans += res[0].transcript;
          } else {
            interimTrans += res[0].transcript;
          }
        }

        if (interimTrans) {
          setInterimText(interimTrans);
        }

        if (finalTrans.trim()) {
          onTranscript(finalTrans.trim());
          setStatus("completed");
          setInterimText("");
          handleStatusReset(1800);
        }
      };

      recognition.onerror = (event) => {
        console.warn("[Simha Voice] Speech recognition event error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setStatus("permission_denied");
          setErrorDetails("Microphone permission denied");
        } else if (event.error === "no-speech") {
          setStatus("idle");
        } else {
          setStatus("error");
          setErrorDetails(event.error ? `Voice error: ${event.error}` : "Voice capture failed");
        }
        setInterimText("");
        handleStatusReset(3000);
      };

      recognition.onend = () => {
        // Only reset if we were actively listening and didn't complete with transcript
        setStatus((prev) => (prev === "listening" ? "idle" : prev));
        setInterimText("");
      };

      recognition.start();
    } catch (err) {
      console.error("[Simha Voice] Start error:", err);
      setStatus("error");
      setErrorDetails("Could not access microphone");
      handleStatusReset(3000);
    }
  }, [disabled, isSupported, onTranscript, handleStatusReset]);

  const toggleListening = () => {
    if (status === "listening") {
      stopListening();
    } else {
      startListening();
    }
  };

  // ── Button visual configuration based on active status ──
  const getButtonStyles = () => {
    switch (status) {
      case "listening":
        return "bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/10 animate-pulse";
      case "processing":
        return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
      case "completed":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
      case "permission_denied":
      case "error":
        return "bg-rose-500/20 text-rose-400 border border-rose-500/40";
      case "unsupported":
        return "opacity-50 text-[var(--ink-3)] cursor-not-allowed";
      default:
        return "text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-white/5";
    }
  };

  const getTooltipText = () => {
    switch (status) {
      case "listening":
        return "🔴 Listening... (Click to stop)";
      case "processing":
        return "Processing speech...";
      case "completed":
        return "✓ Voice captured";
      case "permission_denied":
        return "⚠️ Microphone permission denied";
      case "unsupported":
        return "Voice recognition unsupported in this browser";
      case "error":
        return errorDetails || "Microphone error";
      default:
        return "🎙 Click to speak";
    }
  };

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled || status === "unsupported"}
        title={getTooltipText()}
        className={`p-1.5 rounded-lg transition duration-200 relative flex items-center justify-center ${getButtonStyles()}`}
      >
        {status === "listening" && <MicOff size={15} />}
        {status === "completed" && <Check size={15} />}
        {(status === "permission_denied" || status === "error") && <AlertCircle size={15} />}
        {status === "processing" && <Loader2 size={15} className="animate-spin" />}
        {status !== "listening" && status !== "completed" && status !== "permission_denied" && status !== "error" && status !== "processing" && (
          <Mic size={15} />
        )}
      </button>

      {/* Floating status pill for active live feedback */}
      {(status === "listening" || status === "completed" || status === "permission_denied" || interimText) && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium shadow-xl border bg-[var(--surface-1)] border-[var(--edge-subtle)] text-[var(--ink-1)] pointer-events-none z-30 flex items-center gap-2">
          {status === "listening" && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-red-400 font-semibold">Listening...</span>
              {interimText && <span className="italic text-[var(--ink-2)] max-w-xs truncate">"{interimText}"</span>}
            </>
          )}
          {status === "completed" && (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Voice captured</span>
            </>
          )}
          {status === "permission_denied" && (
            <>
              <AlertCircle size={13} className="text-rose-400" />
              <span className="text-rose-400">Microphone permission denied</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
