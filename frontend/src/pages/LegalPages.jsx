import { useState } from "react";
import { ArrowLeft, Shield, FileText, RefreshCw, AlertTriangle } from "lucide-react";

export default function LegalPages({ initialTab = "terms", onBack }) {
  const [tab, setTab] = useState(initialTab);

  const tabs = [
    { id: "terms", label: "Terms of Service", icon: FileText },
    { id: "privacy", label: "Privacy Policy", icon: Shield },
    { id: "refund", label: "Refund & Cancellation", icon: RefreshCw },
    { id: "disclaimer", label: "AI Usage Disclaimer", icon: AlertTriangle },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[var(--void)] text-[var(--ink-1)] px-4 sm:px-8 py-8">
      <div className="max-w-4xl mx-auto w-full">
        
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-3)] hover:text-[var(--ink-1)] mb-6 transition"
        >
          <ArrowLeft size={13} /> Return to Astra
        </button>

        {/* Tab Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-8 p-1.5 rounded-2xl bg-white/5 border border-[var(--edge-subtle)]">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-[var(--astra-cyan)] text-[#0B0F17] shadow-md shadow-[var(--astra-glow)]"
                    : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="glass-panel p-6 sm:p-10 space-y-6 text-xs text-[var(--ink-2)] leading-relaxed animate-fade-in">
          
          {tab === "terms" && (
            <div>
              <h1 className="text-xl font-extrabold text-[var(--ink-1)] mb-4">Terms of Service</h1>
              <p className="mb-3">
                Welcome to <strong>GPT 6 Astra</strong> (operated as <strong>Astra AI</strong>). By accessing or using our platform, you agree to be bound by these Terms of Service.
              </p>
              <h2 className="text-sm font-bold text-[var(--ink-1)] mt-4 mb-2">1. Permitted Use</h2>
              <p className="mb-3">
                Astra AI provides domain-assisted computing tools for study, software engineering, productivity, document analysis, and conversational interaction. You agree not to use the platform for unlawful, harmful, or abusive generation of malicious code, deceptive materials, or unauthorized scraping.
              </p>
              <h2 className="text-sm font-bold text-[var(--ink-1)] mt-4 mb-2">2. Independent Application Notice</h2>
              <p className="mb-3">
                Astra AI is an independent software service. Astra AI is not affiliated with, sponsored by, or endorsed by OpenAI, Google, Anthropic, or any other foundation model research lab. "GPT" is used solely as a descriptive reference to generative pre-trained transformer architecture.
              </p>
              <h2 className="text-sm font-bold text-[var(--ink-1)] mt-4 mb-2">3. Subscription & Passes</h2>
              <p className="mb-3">
                The Astra 7-Day Pass is provided on an as-available basis for ₹99 for a period of 7 calendar days. At the end of the pass duration, account privileges revert to the Free plan unless manually renewed by the user.
              </p>
            </div>
          )}

          {tab === "privacy" && (
            <div>
              <h1 className="text-xl font-extrabold text-[var(--ink-1)] mb-4">Privacy Policy</h1>
              <p className="mb-3">
                Your privacy and data security are central to Astra AI's architecture. This policy details our data practices:
              </p>
              <h2 className="text-sm font-bold text-[var(--ink-1)] mt-4 mb-2">1. Information We Collect</h2>
              <p className="mb-3">
                We store account email, display name, and avatar provided via Google OAuth. We store your chat history and uploaded document metadata strictly scoped to your private account.
              </p>
              <h2 className="text-sm font-bold text-[var(--ink-1)] mt-4 mb-2">2. Payment Data Security</h2>
              <p className="mb-3">
                All financial payments are handled exclusively through PhonePe Payment Gateway. Astra AI never stores, processes, or transmits sensitive payment information (such as credit/debit card numbers, CVV, or UPI PINs).
              </p>
              <h2 className="text-sm font-bold text-[var(--ink-1)] mt-4 mb-2">3. Data Isolation</h2>
              <p className="mb-3">
                Multi-tenant data isolation is enforced at the database query level. No user can access or view another user's documents, chats, or transaction logs.
              </p>
            </div>
          )}

          {tab === "refund" && (
            <div>
              <h1 className="text-xl font-extrabold text-[var(--ink-1)] mb-4">Refund & Cancellation Policy</h1>
              <p className="mb-3">
                We strive for total customer satisfaction with the Astra 7-Day Pass (₹99).
              </p>
              <h2 className="text-sm font-bold text-[var(--ink-1)] mt-4 mb-2">1. Non-Recurring Nature</h2>
              <p className="mb-3">
                The Astra 7-Day Pass is a one-time fixed purchase, not an automatic recurring charge. There are no recurring cancellation requirements because we never bill you automatically without explicit order confirmation.
              </p>
              <h2 className="text-sm font-bold text-[var(--ink-1)] mt-4 mb-2">2. Refund Eligibility</h2>
              <p className="mb-3">
                If your payment was debited via PhonePe but technical gateway errors prevented entitlement activation within 24 hours, you are entitled to an immediate resolution or a full refund upon verification by our support team.
              </p>
            </div>
          )}

          {tab === "disclaimer" && (
            <div>
              <h1 className="text-xl font-extrabold text-[var(--ink-1)] mb-4">AI Model & Usage Disclaimer</h1>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 mb-4">
                <strong>Critical Notice:</strong> Astra AI is an independent software application and is not an official OpenAI product, nor does it purport to represent OpenAI.
              </div>
              <p className="mb-3">
                1. <strong>Third-Party Model Infrastructure:</strong> Astra AI routes computational queries through licensed, commercial inference providers (such as Groq, Meta Llama, and Qwen open-weights models). We do not claim proprietary ownership over third-party models.
              </p>
              <p className="mb-3">
                2. <strong>AI Generated Content:</strong> AI responses may occasionally contain inaccuracies. Astra AI outputs should be independently validated for critical financial, legal, medical, or life-safety applications.
              </p>
              <p className="mb-3">
                3. <strong>Fair Use & Quotas:</strong> We do not promise unlimited AI queries. All access is governed by cost-control quotas to ensure equitable quality of service for all users.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
