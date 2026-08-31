import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

// Check if browser supports Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSupported = !!SpeechRecognition;

export default function VoiceInput({ onTranscript, theme, disabled }) {
  const dark = theme === "dark";
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = () => {
    if (!isSupported || disabled) return;

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setListening(true);
      recognition.onend = () => {
        setListening(false);
        setInterim("");
      };

      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        setInterim(interimText);

        if (finalText) {
          onTranscript(finalText.trim());
          setInterim("");
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setListening(false);
        setInterim("");
      };

      recognition.start();
    } catch (e) {
      console.error("Speech start error:", e);
      setListening(false);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  };

  if (!isSupported) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={(e) => { e.preventDefault(); startListening(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
        disabled={disabled}
        title={listening ? "Listening... (Release to stop)" : "Hold to speak"}
        className={`p-1.5 rounded-lg transition duration-150 ${
          listening
            ? "bg-red-500 text-white shadow-md shadow-red-500/30 scale-105 animate-pulse"
            : "text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
        }`}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Interim live speech tooltip */}
      {interim && (
        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium shadow-xl border bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 animate-fade-in z-50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="italic">{interim}</span>
          </div>
        </div>
      )}
    </div>
  );
}
