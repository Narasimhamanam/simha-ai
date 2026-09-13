import { useState } from "react";
import { Check, Zap, ArrowLeft, ShieldCheck, Lock, Sparkles, Loader2, Calendar, RefreshCw } from "lucide-react";
import API from "../services/api";

export default function PricingPage({ user, usage, onBack, onStartFree }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isPassActive = usage?.is_premium || usage?.plan === "ASTRA_7_DAY";

  const handleCashfreeCheckout = async () => {
    if (!user?.email) {
      setError("Please sign in first to purchase the Astra 7-Day Pass.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Direct post-checkout return URL to our verification page
      const redirectUrl = `${window.location.origin}/payment/status`;
      const response = await API.post("/api/payments/create", {
        email: user.email,
        redirect_url: redirectUrl,
        customer_name: user.displayName || user.email.split("@")[0],
      });

      const { payment_link, checkout_url } = response.data;
      const targetUrl = payment_link || checkout_url;

      if (targetUrl) {
        // Redirect browser directly to official hosted Cashfree checkout
        window.location.href = targetUrl;
      } else {
        setError("Unable to retrieve Cashfree checkout link. Please try again.");
      }
    } catch (err) {
      console.error("Cashfree checkout error:", err);
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Payment gateway initialization failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[var(--void)] text-[var(--ink-1)] px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Back navigation */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-3)] hover:text-[var(--ink-1)] mb-6 transition"
        >
          <ArrowLeft size={14} /> Back to workspace
        </button>

        {/* Title */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--astra-glow)] border border-[var(--edge)] text-xs font-bold text-[var(--astra-cyan)] mb-3">
            <Zap size={13} /> Official Cashfree Integration
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Upgrade to Astra 7-Day Pass
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-3)] leading-relaxed">
            High-capacity AI intelligence for one full week. Single payment of ₹99. No recurring charges.
          </p>
        </div>

        {/* Existing Active Pass Banner */}
        {isPassActive && (
          <div className="mb-8 max-w-2xl mx-auto p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-300">Astra Pass Active</p>
                <p className="text-[11px] text-[var(--ink-2)]">
                  You currently have {usage?.days_remaining || 7} days remaining. Any additional pass safely stacks onto your current expiry.
                </p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"
            >
              Back to Chat
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 max-w-md mx-auto p-3.5 rounded-xl text-xs bg-red-500/10 border border-red-500/25 text-red-400 text-center font-medium">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          
          {/* Free Tier */}
          <div className="glass-panel p-6 sm:p-8 flex flex-col justify-between border-[var(--edge-subtle)]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--ink-1)]">Astra Free</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full border border-[var(--edge-subtle)] text-[var(--ink-3)]">
                  Active by Default
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black">₹0</span>
                <span className="text-xs text-[var(--ink-3)]">/ forever</span>
              </div>
              <ul className="space-y-3 text-xs text-[var(--ink-2)] mb-8">
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>10 messages per day</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>2 PDF uploads per day</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>Astra Chat, Code & Study access</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>Standard model response queue</span>
                </li>
              </ul>
            </div>
            <button
              onClick={onBack}
              className="btn-ghost w-full !py-2.5 text-xs font-semibold"
            >
              Continue with Free
            </button>
          </div>

          {/* 7-Day Pass Card */}
          <div className="glass-panel p-6 sm:p-8 flex flex-col justify-between border-[var(--astra-cyan)] relative shadow-2xl shadow-[var(--astra-glow)]">
            <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--astra-cyan)] to-[var(--royal-violet)] text-[10px] font-black text-[#0B0F17] uppercase tracking-wider">
              Popular Choice
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--ink-1)]">Astra 7-Day Pass</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--astra-glow)] text-[var(--astra-cyan)] font-bold">
                  7 Days
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-astra-gradient">₹99</span>
                <span className="text-xs text-[var(--ink-3)]">/ one-time payment</span>
              </div>
              <ul className="space-y-3 text-xs text-[var(--ink-2)] mb-8">
                <li className="flex items-center gap-2.5 font-semibold text-[var(--ink-1)]">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>Higher AI usage (100 messages/day)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>Astra premium features (Email & Calendar)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>Documents (20 PDF uploads + Vector RAG)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>Coding agent with automated debugging</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>Study agent with structured curricula</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                  <span>Vision (Image analysis & OCR)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleCashfreeCheckout}
              disabled={loading}
              className="btn-astra w-full !py-3 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating secure payment...</span>
                </>
              ) : (
                <>
                  <Lock size={13} />
                  <span>{isPassActive ? "Extend 7-Day Pass — ₹99" : "Get 7-Day Pass — ₹99"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security Trust Badges */}
        <div className="mt-10 max-w-xl mx-auto flex flex-wrap items-center justify-center gap-6 text-[11px] text-[var(--ink-3)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--astra-cyan)]" />
            <span>Official Cashfree Payments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock size={14} className="text-[var(--astra-cyan)]" />
            <span>256-Bit SSL Encryption</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[var(--astra-cyan)]" />
            <span>Instant Server-Verified Activation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
