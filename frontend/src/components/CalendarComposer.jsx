import { useState } from "react";
import {
  CalendarDays, X, Loader2, Sparkles, CheckCircle2,
  AlertCircle, RefreshCw, Lock, Users, MapPin, Clock, Calendar,
  ArrowRight, ExternalLink
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import API from "../services/api";

const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope("https://www.googleapis.com/auth/calendar.events");
calendarProvider.setCustomParameters({ prompt: "consent" });

const STEP = {
  PROMPT: "prompt",
  DRAFT: "draft",
  PERMISSION: "permission",
  SAVING: "saving",
  SUCCESS: "success",
  ERROR: "error",
};

const SUGGESTED_EVENTS = [
  "Team Architecture Review next Monday from 3:00 PM to 4:00 PM on Google Meet",
  "Design Sprint kickoff on Friday at 10 AM with dev team",
  "Client demonstration and roadmap presentation tomorrow at 2 PM",
  "1-on-1 performance review sync next Wednesday at 11:30 AM",
];

export default function CalendarComposer({ theme, profile, onClose, credits, fetchCredits, isPro }) {
  const dark = theme === "dark";
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;

  const [step, setStep] = useState(STEP.PROMPT);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [event, setEvent] = useState({
    title: "",
    description: "",
    date: "",
    start_time: "10:00",
    end_time: "11:00",
    attendees: [],
    location: "",
    suggestions: "",
  });
  const [accessToken, setAccessToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [attendeeInput, setAttendeeInput] = useState("");
  const [createdLink, setCreatedLink] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setErrorMsg("");
    try {
      const res = await API.post("/generate-calendar-event", {
        prompt: prompt.trim(),
        sender_name: profile?.nickname || "",
        user_email: profile?.email || "",
      });
      setEvent(res.data);
      setAttendeeInput(res.data.attendees?.join(", ") || "");
      setStep(STEP.DRAFT);
    } catch {
      setErrorMsg("AI couldn't parse your scheduling request. Please try again.");
      setStep(STEP.ERROR);
    } finally {
      setGenerating(false);
      if (fetchCredits) fetchCredits();
    }
  };

  const handleCreateEvent = async (token) => {
    const activeToken = token || accessToken;
    if (!activeToken) {
      setStep(STEP.PERMISSION);
      return;
    }

    setStep(STEP.SAVING);
    try {
      const attendees = attendeeInput
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
        .map((email) => ({ email }));

      const startDateTime = `${event.date}T${event.start_time}:00`;
      const endDateTime = `${event.date}T${event.end_time}:00`;

      const body = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: { dateTime: startDateTime, timeZone: "Asia/Kolkata" },
        end: { dateTime: endDateTime, timeZone: "Asia/Kolkata" },
        attendees,
        reminders: { useDefault: true },
      };

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Google Calendar API error.");
      }

      const data = await res.json();
      setCreatedLink(data.htmlLink || "");
      setStep(STEP.SUCCESS);
    } catch (err) {
      console.error("Calendar save error:", err);
      setErrorMsg(err.message || "Failed to create Google Calendar event.");
      setStep(STEP.ERROR);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const result = await signInWithPopup(auth, calendarProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setAccessToken(token);
        handleCreateEvent(token);
      } else {
        throw new Error("Could not retrieve access token.");
      }
    } catch (err) {
      console.error("Calendar permission error:", err);
      setErrorMsg("Google Calendar permission was not granted.");
      setStep(STEP.ERROR);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden">
        
        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <CalendarDays size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                AI Event Scheduler
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Parse natural language requests directly into Google Calendar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── MODAL BODY ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* STEP 1: PROMPT INPUT */}
          {step === STEP.PROMPT && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Describe your meeting or event:
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder={outOfCredits ? "Daily AI credits exhausted." : "e.g. Schedule a product review with team@example.com tomorrow at 3 PM for 45 minutes on Zoom..."}
                  disabled={outOfCredits || generating}
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-amber-500/50 transition"
                />
              </div>

              {/* Sample Prompts */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-2">
                  Sample Scheduling Prompts
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_EVENTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(p)}
                      className="p-2.5 rounded-xl text-left text-xs bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05] hover:border-amber-500/30 text-slate-600 dark:text-zinc-300 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating || outOfCredits}
                  className="btn-primary flex items-center gap-2"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{generating ? "Parsing Details..." : "Extract Calendar Event"}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: EVENT DETAILS REVIEW */}
          {step === STEP.DRAFT && (
            <div className="space-y-4">
              
              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={event.title}
                  onChange={(e) => setEvent({ ...event, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                    <Calendar size={13} />
                    <span>Date (YYYY-MM-DD)</span>
                  </label>
                  <input
                    type="date"
                    value={event.date}
                    onChange={(e) => setEvent({ ...event, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                    <Clock size={13} />
                    <span>Start Time</span>
                  </label>
                  <input
                    type="time"
                    value={event.start_time}
                    onChange={(e) => setEvent({ ...event, start_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                    <Clock size={13} />
                    <span>End Time</span>
                  </label>
                  <input
                    type="time"
                    value={event.end_time}
                    onChange={(e) => setEvent({ ...event, end_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Location & Attendees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                    <MapPin size={13} />
                    <span>Location / Link</span>
                  </label>
                  <input
                    type="text"
                    value={event.location}
                    onChange={(e) => setEvent({ ...event, location: e.target.value })}
                    placeholder="e.g. Google Meet / Room 4B"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                    <Users size={13} />
                    <span>Attendee Emails</span>
                  </label>
                  <input
                    type="text"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                  Description / Agenda
                </label>
                <textarea
                  value={event.description}
                  onChange={(e) => setEvent({ ...event, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50 font-sans"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                <button
                  onClick={() => setStep(STEP.PROMPT)}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={() => handleCreateEvent()}
                  className="btn-primary flex items-center gap-1.5"
                >
                  <CalendarDays size={13} />
                  <span>Create in Google Calendar</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: OAUTH PERMISSION */}
          {step === STEP.PERMISSION && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-500">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Connect Google Calendar
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Authorize Simha AI to schedule this event directly onto your Google Calendar.
                </p>
              </div>

              <button
                onClick={handleRequestPermission}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3"
              >
                <span>Authorize & Create Event</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* STEP 4: SAVING */}
          {step === STEP.SAVING && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-amber-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                Scheduling event in Google Calendar...
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === STEP.SUCCESS && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Event Scheduled!
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  "{event.title}" has been placed on your calendar.
                </p>
              </div>

              {createdLink && (
                <a
                  href={createdLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <span>Open in Google Calendar</span>
                  <ExternalLink size={13} />
                </a>
              )}

              <button
                onClick={onClose}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          )}

          {/* STEP 6: ERROR */}
          {step === STEP.ERROR && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-500">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Scheduling Failed
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {errorMsg || "An unexpected error occurred."}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(STEP.DRAFT)}
                  className="btn-secondary flex-1"
                >
                  Edit Details
                </button>
                <button
                  onClick={onClose}
                  className="btn-primary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
