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
        title="Hold to speak"
        className={`p-2 rounded-xl transition-all touch-manipulation ${
          listening
            ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30 animate-pulse"
            : dark
            ? "text-gray-500 hover:text-amber-400 hover:bg-amber-500/10"
            : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
        }`}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Interim transcript tooltip */}
      {interim && (
        <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs shadow-lg border ${
          dark ? "bg-[#1a1a1a] border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-700"
        }`}>
          <span className="italic text-amber-500">{interim}</span>
        </div>
      )}
    </div>
  );
}
