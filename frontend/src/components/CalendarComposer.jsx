import { useState } from "react";
import {
  CalendarDays, X, Loader2, Sparkles, CheckCircle2,
  AlertCircle, RefreshCw, Lock, Users, MapPin, Clock, Calendar
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, gmailProvider } from "../firebase";
import API from "../services/api";

// Add Google Calendar scope to gmailProvider dynamically
const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope("https://www.googleapis.com/auth/calendar.events");
calendarProvider.setCustomParameters({ prompt: "consent" });

const STEP = { PROMPT: "prompt", DRAFT: "draft", PERMISSION: "permission", SAVING: "saving", SUCCESS: "success", ERROR: "error" };

export default function CalendarComposer({ theme, profile, onClose, credits, fetchCredits, isPro }) {
  const dark = theme === "dark";
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
    setGenerating(true);
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
      setErrorMsg("AI couldn't parse your event. Please try again.");
      setStep(STEP.ERROR);
    } finally {
      setGenerating(false);
      if (fetchCredits) fetchCredits();
    }
  };

  const handleCreateEvent = async (token) => {
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
          Authorization: `Bearer ${token || accessToken}`,
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
      setErrorMsg(err.message || "Failed to create event.");
      setStep(STEP.ERROR);
    }
  };

  const handlePermission = async () => {
    setStep(STEP.PERMISSION);
    try {
      const result = await signInWithPopup(auth, calendarProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) throw new Error("No access token received.");
      setAccessToken(credential.accessToken);
      await handleCreateEvent(credential.accessToken);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") { setStep(STEP.DRAFT); return; }
      setErrorMsg(err.message || "Permission denied.");
      setStep(STEP.ERROR);
    }
  };

  const handleConfirm = async () => {
    if (!event.date || !event.title) { setErrorMsg("Please fill in the title and date."); return; }
    if (accessToken) await handleCreateEvent(accessToken);
    else await handlePermission();
  };

  const cardCls = `relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden ${
    dark ? "bg-[#111111] border-gray-800" : "bg-white border-gray-200"
  }`;

  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${
    dark ? "bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-600" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-violet-500"
  }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cardCls}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${dark ? "border-gray-800" : "border-gray-100"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <CalendarDays size={15} className="text-white" />
            </div>
            <div>
              <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>AI Calendar Scheduler</h2>
              <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Schedule events from natural language</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${dark ? "hover:bg-white/8 text-gray-500" : "hover:bg-gray-100 text-gray-400"}`}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* PROMPT */}
          {step === STEP.PROMPT && (
            <div className="p-5 space-y-4">
              <div>
                <label className={`text-xs font-semibold mb-2 block ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  📅 Describe the event you want to schedule
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={outOfCredits ? "Daily limit reached. Resets tomorrow." : `e.g. "Schedule a project review..."`}
                  disabled={outOfCredits}
                  rows={4}
                  style={{ fontSize: "16px" }}
                  className={`w-full rounded-xl border px-4 py-3 text-sm leading-6 outline-none resize-none transition ${
                    dark ? "bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-600" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-violet-500"
                  }`}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleGenerate(); }}
                />
                <p className={`text-[10px] mt-1.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                  Include date, time, attendees, and duration. Ctrl+Enter to generate.
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating || outOfCredits}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition disabled:opacity-50 touch-manipulation"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? "Generating event..." : "Generate Event Details"}
              </button>
            </div>
          )}

          {/* DRAFT */}
          {step === STEP.DRAFT && (
            <div className="p-5 space-y-3">
              {event.suggestions && (
                <div className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs ${dark ? "bg-violet-950/50 border border-violet-900 text-violet-300" : "bg-violet-50 border border-violet-100 text-violet-700"}`}>
                  <Sparkles size={13} className="shrink-0 mt-0.5" />
                  {event.suggestions}
                </div>
              )}

              <div>
                <label className={`text-[11px] font-semibold mb-1 block ${dark ? "text-gray-400" : "text-gray-500"}`}>EVENT TITLE *</label>
                <input type="text" value={event.title} onChange={(e) => setEvent((d) => ({ ...d, title: e.target.value }))} style={{ fontSize: "16px" }} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-semibold mb-1 flex items-center gap-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    <Calendar size={10} /> DATE *
                  </label>
                  <input type="date" value={event.date} onChange={(e) => setEvent((d) => ({ ...d, date: e.target.value }))} style={{ fontSize: "16px" }} className={inputCls} />
                </div>
                <div>
                  <label className={`text-[11px] font-semibold mb-1 flex items-center gap-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    <Clock size={10} /> TIME
                  </label>
                  <div className="flex items-center gap-1">
                    <input type="time" value={event.start_time} onChange={(e) => setEvent((d) => ({ ...d, start_time: e.target.value }))} style={{ fontSize: "16px" }} className={inputCls} />
                    <span className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>to</span>
                    <input type="time" value={event.end_time} onChange={(e) => setEvent((d) => ({ ...d, end_time: e.target.value }))} style={{ fontSize: "16px" }} className={inputCls} />
                  </div>
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-semibold mb-1 flex items-center gap-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  <Users size={10} /> ATTENDEES (comma-separated emails)
                </label>
                <input type="text" value={attendeeInput} onChange={(e) => setAttendeeInput(e.target.value)} placeholder="email1@gmail.com, email2@gmail.com" style={{ fontSize: "16px" }} className={inputCls} />
              </div>

              <div>
                <label className={`text-[11px] font-semibold mb-1 flex items-center gap-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  <MapPin size={10} /> LOCATION (optional)
                </label>
                <input type="text" value={event.location} onChange={(e) => setEvent((d) => ({ ...d, location: e.target.value }))} placeholder="Google Meet / Room 101 / Online" style={{ fontSize: "16px" }} className={inputCls} />
              </div>

              <div>
                <label className={`text-[11px] font-semibold mb-1 block ${dark ? "text-gray-400" : "text-gray-500"}`}>DESCRIPTION / AGENDA</label>
                <textarea value={event.description} onChange={(e) => setEvent((d) => ({ ...d, description: e.target.value }))} rows={3} style={{ fontSize: "16px" }} className={`${inputCls} resize-none`} />
              </div>
            </div>
          )}

          {/* PERMISSION */}
          {step === STEP.PERMISSION && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Lock size={28} className="text-white" />
              </div>
              <div>
                <h3 className={`text-base font-semibold mb-1.5 ${dark ? "text-white" : "text-gray-900"}`}>Google Calendar Permission</h3>
                <p className={`text-xs leading-5 max-w-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  A popup will ask you to grant Simha AI permission to create events in your Google Calendar.
                  <strong className={dark ? " text-orange-400" : " text-orange-600"}> We only create events — we never read or delete your calendar.</strong>
                </p>
              </div>
              <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          )}

          {/* SAVING */}
          {step === STEP.SAVING && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <Loader2 size={40} className="animate-spin text-violet-500" />
              <div>
                <h3 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Creating calendar event...</h3>
                <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Sending invites to attendees.</p>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {step === STEP.SUCCESS && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <div>
                <h3 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Event Created! 🎉</h3>
                <p className={`text-xs mt-1.5 max-w-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  <strong>{event.title}</strong> on {event.date} at {event.start_time} has been added to your Google Calendar.
                </p>
              </div>
              {createdLink && (
                <a href={createdLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition touch-manipulation">
                  <CalendarDays size={14} />
                  View in Google Calendar
                </a>
              )}
              <button onClick={() => { setStep(STEP.PROMPT); setPrompt(""); setEvent({ title: "", description: "", date: "", start_time: "10:00", end_time: "11:00", attendees: [], location: "", suggestions: "" }); setAttendeeInput(""); }} className={`text-sm ${dark ? "text-gray-600 hover:text-gray-400" : "text-gray-400 hover:text-gray-600"} transition`}>
                Schedule another
              </button>
            </div>
          )}

          {/* ERROR */}
          {step === STEP.ERROR && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={36} className="text-red-500" />
              </div>
              <div>
                <h3 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Something went wrong</h3>
                <p className={`text-xs mt-1.5 max-w-xs ${dark ? "text-red-400" : "text-red-600"}`}>{errorMsg}</p>
              </div>
              <button onClick={() => setStep(STEP.PROMPT)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm transition touch-manipulation">
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === STEP.DRAFT && (
          <div className={`shrink-0 px-5 py-4 border-t flex gap-3 ${dark ? "border-gray-800 bg-[#0e0e0e]" : "border-gray-100 bg-gray-50"}`}>
            <button onClick={() => setStep(STEP.PROMPT)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition touch-manipulation ${dark ? "border-gray-700 text-gray-400 hover:text-gray-200" : "border-gray-200 text-gray-500 hover:text-gray-700"}`}>
              <RefreshCw size={13} /> Regenerate
            </button>
            <button
              onClick={handleConfirm}
              disabled={!event.title || !event.date}
              className="flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition disabled:opacity-40 touch-manipulation"
            >
              <CalendarDays size={15} />
              {accessToken ? "Create Event" : "Grant Permission & Create"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
