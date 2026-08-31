import { useState } from "react";
import {
  CalendarDays, X, Loader2, Sparkles, CheckCircle2,
  AlertCircle, Lock, Users, MapPin, Clock, Calendar,
  ArrowRight, ExternalLink
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import API from "../services/api";

const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope("https://www.googleapis.com/auth/calendar.events");
calendarProvider.setCustomParameters({ prompt: "consent" });

const STEP = {
  PROMPT: "prompt", DRAFT: "draft", PERMISSION: "permission",
  SAVING: "saving", SUCCESS: "success", ERROR: "error",
};

const SUGGESTED_EVENTS = [
  "Team Architecture Review next Monday from 3:00 PM to 4:00 PM on Google Meet",
  "Design Sprint kickoff on Friday at 10 AM with dev team",
  "Client demonstration and roadmap presentation tomorrow at 2 PM",
  "1-on-1 performance review sync next Wednesday at 11:30 AM",
];

export default function CalendarComposer({ theme, profile, onClose, credits, fetchCredits, isPro }) {
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;

  const [step, setStep] = useState(STEP.PROMPT);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [event, setEvent] = useState({ title: "", description: "", date: "", start_time: "10:00", end_time: "11:00", attendees: [], location: "", suggestions: "" });
  const [accessToken, setAccessToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [attendeeInput, setAttendeeInput] = useState("");
  const [createdLink, setCreatedLink] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true); setErrorMsg("");
    try {
      const res = await API.post("/generate-calendar-event", { prompt: prompt.trim(), sender_name: profile?.nickname || "", user_email: profile?.email || "" });
      setEvent(res.data); setAttendeeInput(res.data.attendees?.join(", ") || ""); setStep(STEP.DRAFT);
    } catch { setErrorMsg("AI couldn't parse your scheduling request."); setStep(STEP.ERROR); }
    finally { setGenerating(false); if (fetchCredits) fetchCredits(); }
  };

  const handleCreateEvent = async (token) => {
    const activeToken = token || accessToken;
    if (!activeToken) { setStep(STEP.PERMISSION); return; }
    setStep(STEP.SAVING);
    try {
      const attendees = attendeeInput.split(",").map(e => e.trim()).filter(Boolean).map(email => ({ email }));
      const body = {
        summary: event.title, description: event.description, location: event.location,
        start: { dateTime: `${event.date}T${event.start_time}:00`, timeZone: "Asia/Kolkata" },
        end: { dateTime: `${event.date}T${event.end_time}:00`, timeZone: "Asia/Kolkata" },
        attendees, reminders: { useDefault: true },
      };
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
        method: "POST", headers: { Authorization: `Bearer ${activeToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Google Calendar API error."); }
      const data = await res.json(); setCreatedLink(data.htmlLink || ""); setStep(STEP.SUCCESS);
    } catch (err) { console.error("Calendar save error:", err); setErrorMsg(err.message || "Failed to create event."); setStep(STEP.ERROR); }
  };

  const handleRequestPermission = async () => {
    try {
      const result = await signInWithPopup(auth, calendarProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) { setAccessToken(token); handleCreateEvent(token); } else throw new Error("Could not retrieve access token.");
    } catch (err) { console.error("Calendar permission error:", err); setErrorMsg("Google Calendar permission was not granted."); setStep(STEP.ERROR); }
  };

  const inputCls = "w-full rounded-xl border border-[var(--edge-subtle)] bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[var(--mane-gold)] transition";
  const labelCls = "flex items-center gap-1.5 text-xs font-semibold mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" style={{ color: "var(--ink-1)" }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden glass-panel">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-[var(--edge-subtle)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] flex items-center justify-center" style={{ color: "var(--mane-gold)" }}>
              <CalendarDays size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold">AI Event Scheduler</h2>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Parse requests directly into Google Calendar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: "var(--ink-3)" }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {step === STEP.PROMPT && (
            <div className="space-y-4">
              <div>
                <label className={labelCls} style={{ color: "var(--ink-2)" }}>Describe your meeting or event:</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
                  placeholder={outOfCredits ? "Daily AI credits exhausted." : "e.g. Schedule a product review with team@example.com tomorrow at 3 PM..."}
                  disabled={outOfCredits || generating} className={`${inputCls} resize-none`} style={{ color: "var(--ink-1)" }} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: "var(--ink-3)" }}>Sample Prompts</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_EVENTS.map((p, i) => (
                    <button key={i} onClick={() => setPrompt(p)} className="float-card !rounded-xl p-2.5 text-left text-xs" style={{ color: "var(--ink-2)" }}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button onClick={handleGenerate} disabled={!prompt.trim() || generating || outOfCredits} className="btn-gold flex items-center gap-2 disabled:opacity-40">
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{generating ? "Parsing Details..." : "Extract Calendar Event"}</span>
                </button>
              </div>
            </div>
          )}

          {step === STEP.DRAFT && (
            <div className="space-y-4">
              <div>
                <label className={labelCls} style={{ color: "var(--ink-3)" }}>Event Title</label>
                <input type="text" value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} className={`${inputCls} font-semibold`} style={{ color: "var(--ink-1)" }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls} style={{ color: "var(--ink-3)" }}><Calendar size={13} /><span>Date</span></label>
                  <input type="date" value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} className={inputCls} style={{ color: "var(--ink-1)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--ink-3)" }}><Clock size={13} /><span>Start</span></label>
                  <input type="time" value={event.start_time} onChange={(e) => setEvent({ ...event, start_time: e.target.value })} className={inputCls} style={{ color: "var(--ink-1)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--ink-3)" }}><Clock size={13} /><span>End</span></label>
                  <input type="time" value={event.end_time} onChange={(e) => setEvent({ ...event, end_time: e.target.value })} className={inputCls} style={{ color: "var(--ink-1)" }} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={{ color: "var(--ink-3)" }}><MapPin size={13} /><span>Location / Link</span></label>
                  <input type="text" value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })} placeholder="Google Meet / Room 4B" className={inputCls} style={{ color: "var(--ink-1)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--ink-3)" }}><Users size={13} /><span>Attendees</span></label>
                  <input type="text" value={attendeeInput} onChange={(e) => setAttendeeInput(e.target.value)} placeholder="email1@example.com, email2@example.com" className={inputCls} style={{ color: "var(--ink-1)" }} />
                </div>
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--ink-3)" }}>Description / Agenda</label>
                <textarea value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} rows={3} className={`${inputCls} resize-none`} style={{ color: "var(--ink-1)" }} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--edge-subtle)]">
                <button onClick={() => setStep(STEP.PROMPT)} className="btn-ghost">Back</button>
                <button onClick={() => handleCreateEvent()} className="btn-gold flex items-center gap-1.5">
                  <CalendarDays size={13} /><span>Create in Google Calendar</span>
                </button>
              </div>
            </div>
          )}

          {step === STEP.PERMISSION && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] flex items-center justify-center mx-auto" style={{ color: "var(--mane-gold)" }}><Lock size={22} /></div>
              <div>
                <h3 className="text-base font-bold">Connect Google Calendar</h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ink-3)" }}>Authorize Simha AI to schedule this event.</p>
              </div>
              <button onClick={handleRequestPermission} className="btn-gold w-full flex items-center justify-center gap-2 py-3">
                <span>Authorize & Create Event</span><ArrowRight size={14} />
              </button>
            </div>
          )}

          {step === STEP.SAVING && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={32} className="animate-spin mx-auto" style={{ color: "var(--mane-gold)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>Scheduling event...</p>
            </div>
          )}

          {step === STEP.SUCCESS && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] flex items-center justify-center mx-auto text-emerald-400"><CheckCircle2 size={24} /></div>
              <div>
                <h3 className="text-base font-bold">Event Scheduled!</h3>
                <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>"{event.title}" has been placed on your calendar.</p>
              </div>
              {createdLink && (
                <a href={createdLink} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full flex items-center justify-center gap-2">
                  <span>Open in Google Calendar</span><ExternalLink size={13} />
                </a>
              )}
              <button onClick={onClose} className="btn-gold w-full">Done</button>
            </div>
          )}

          {step === STEP.ERROR && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mx-auto text-red-400"><AlertCircle size={24} /></div>
              <div>
                <h3 className="text-base font-bold">Scheduling Failed</h3>
                <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>{errorMsg || "An unexpected error occurred."}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(STEP.DRAFT)} className="btn-ghost flex-1">Edit Details</button>
                <button onClick={onClose} className="btn-gold flex-1">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
