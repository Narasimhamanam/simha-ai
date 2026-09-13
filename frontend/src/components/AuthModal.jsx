import { useState } from "react";
import { X, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import AstraLogo from "./AstraLogo";

/**
 * AuthModal — Full multi-provider Firebase auth modal.
 * Supports: Google, GitHub, Email/Password (login & signup), Password Reset.
 */
export default function AuthModal({
  mode,
  setMode,
  onClose,
  onGoogleLogin,
  onEmailLogin,
  onEmailSignup,
  onPasswordReset,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isReset = mode === "reset";
  const isSignup = mode === "signup";

  const clearState = () => { setError(""); setSuccess(""); };

  const handleSocialLogin = async (fn, name) => {
    clearState();
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e.code || e.message, name));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    clearState();
    if (!email.trim()) { setError("Email is required."); return; }
    if (isReset) {
      setLoading(true);
      try {
        await onPasswordReset(email.trim());
        setSuccess("Password reset email sent! Check your inbox.");
      } catch (err) {
        setError(friendlyError(err.code || err.message));
      } finally { setLoading(false); }
      return;
    }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (isSignup) {
        await onEmailSignup(email.trim(), password);
      } else {
        await onEmailLogin(email.trim(), password);
      }
    } catch (err) {
      setError(friendlyError(err.code || err.message));
    } finally { setLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md glass-panel p-8 animate-fade-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-white/5 transition"
        >
          <X size={16} />
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
          <AstraLogo size="md" showWordmark={false} className="mb-3" />
          <h2 className="text-lg font-black text-[var(--ink-1)] tracking-tight">
            {isReset ? "Reset Password" : isSignup ? "Create Account" : "Sign In to Astra"}
          </h2>
          <p className="text-xs text-[var(--ink-3)] mt-1">
            {isReset
              ? "Enter your email to receive a reset link."
              : isSignup
              ? "Join Astra AI — independent, powerful, private."
              : "Welcome back. Continue your AI workspace."}
          </p>
        </div>

        {/* Social Login Buttons */}
        {!isReset && (
          <div className="flex flex-col gap-2.5 mb-5">
            <button
              onClick={() => handleSocialLogin(onGoogleLogin, "Google")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[var(--edge-subtle)] bg-white/5 hover:bg-white/10 hover:border-[var(--edge)] text-[var(--ink-2)] text-sm font-medium transition disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          </div>
        )}

        {/* Divider */}
        {!isReset && (
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-[var(--edge-subtle)]" />
            <span className="text-[11px] text-[var(--ink-3)] font-medium">or with email</span>
            <div className="h-px flex-1 bg-[var(--edge-subtle)]" />
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-[var(--edge-subtle)] focus:border-[var(--astra-cyan)] focus:outline-none text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-3)] transition"
            />
          </div>

          {!isReset && (
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/5 border border-[var(--edge-subtle)] focus:border-[var(--astra-cyan)] focus:outline-none text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-3)] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] hover:text-[var(--ink-2)]"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <CheckCircle size={13} className="shrink-0" />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-astra w-full flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>
                {isReset ? "Send Reset Link" : isSignup ? "Create Account" : "Sign In"}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Mode Switchers */}
        <div className="mt-5 flex flex-col items-center gap-1.5 text-[11px] text-[var(--ink-3)]">
          {!isReset && (
            <button
              onClick={() => { clearState(); setMode(isSignup ? "login" : "signup"); }}
              className="hover:text-[var(--ink-1)] transition"
            >
              {isSignup ? "Already have an account? Sign in" : "No account yet? Create one free"}
            </button>
          )}
          {!isSignup && (
            <button
              onClick={() => { clearState(); setMode(isReset ? "login" : "reset"); }}
              className="hover:text-[var(--ink-1)] transition"
            >
              {isReset ? "← Back to sign in" : "Forgot password?"}
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-[10px] text-[var(--ink-3)] text-center leading-relaxed">
          Astra AI is an independent application and is not affiliated with or endorsed by OpenAI.
        </p>
      </div>
    </div>
  );
}

function friendlyError(code, provider) {
  const map = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Try again or reset it.",
    "auth/email-already-in-use": "This email is already registered. Sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/popup-closed-by-user": `${provider || "Login"} cancelled.`,
    "auth/account-exists-with-different-credential": "An account already exists with a different sign-in method.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/too-many-requests": "Too many attempts. Please wait before trying again.",
    "auth/invalid-credential": "Invalid credentials. Please check and try again.",
  };
  return map[code] || "Authentication failed. Please try again.";
}
