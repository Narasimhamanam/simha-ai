import { useState } from "react";
import {
  Sparkles,
  Code2,
  BookOpen,
  FileText,
  ImageIcon,
  Globe,
  Rocket,
  Shield,
  Zap,
  Check,
  ChevronRight,
  HelpCircle,
  ArrowUpRight,
} from "lucide-react";
import AstraCanvas3D from "../components/3d/AstraCanvas3D";

const CAPABILITIES = [
  {
    id: "chat",
    title: "Astra Chat",
    icon: Sparkles,
    color: "#00F0FF",
    tagline: "Natural, nuanced intelligence",
    description: "Multi-turn general conversation built for clarity, precision, and problem-solving without robotic fluff.",
  },
  {
    id: "code",
    title: "Astra Code",
    icon: Code2,
    color: "#818CF8",
    tagline: "Software architecture & refactoring",
    description: "Generate production-grade code, analyze runtime complexity, debug syntax errors, and refactor architecture.",
  },
  {
    id: "study",
    title: "Astra Study",
    icon: BookOpen,
    color: "#2DD4BF",
    tagline: "Academic tutoring & concepts",
    description: "Deep explanations of computer science, mathematics, aptitude prep, and university engineering syllabi.",
  },
  {
    id: "docs",
    title: "Astra Docs",
    icon: FileText,
    color: "#F59E0B",
    tagline: "Vector RAG PDF analysis",
    description: "Upload research papers, technical manuals, or textbooks and extract cited answers directly from your documents.",
  },
  {
    id: "vision",
    title: "Astra Vision",
    icon: ImageIcon,
    color: "#EC4899",
    tagline: "Multimodal visual reasoning",
    description: "Upload diagrams, terminal logs, or handwritten notes. Astra inspects visual features and provides actionable insights.",
  },
  {
    id: "research",
    title: "Astra Research",
    icon: Globe,
    color: "#38BDF8",
    tagline: "Structured URL intelligence",
    description: "Paste any documentation or article URL to extract core takeaways, category metadata, and structured key points.",
  },
  {
    id: "productivity",
    title: "Astra Productivity",
    icon: Rocket,
    color: "#A78BFA",
    tagline: "Executive execution & scheduling",
    description: "Draft professional emails with tailored tone and transform natural language prompts into Google Calendar events.",
  },
];

const FAQS = [
  {
    q: "What is GPT 6 Astra / Astra AI?",
    a: "Astra AI is an independent, high-performance AI workspace and productivity suite designed for students, developers, and knowledge professionals. It features multi-agent routing for code, study, document analysis, and daily workflows.",
  },
  {
    q: "Is Astra AI affiliated with or endorsed by OpenAI?",
    a: "No. Astra AI is a completely independent application. It is not affiliated with, sponsored by, or endorsed by OpenAI, Google, or Anthropic. We use licensed commercial AI infrastructure and models to deliver our unique workspace experience.",
  },
  {
    q: "How does the Astra 7-Day Pass work?",
    a: "The Astra 7-Day Pass gives you 7 continuous days of premium access for just ₹99. You receive 100 daily messages, up to 20 document uploads, and access to all specialized Astra agents. It never auto-renews without your consent.",
  },
  {
    q: "What happens after the 7 days expire?",
    a: "Your account automatically transitions back to the Free plan. We never delete your chats, documents, or profile data. You can renew your 7-Day Pass anytime with one tap.",
  },
  {
    q: "Which payment methods are supported?",
    a: "We support instant, secure payments via PhonePe Payment Gateway, including UPI (GPay, PhonePe, Paytm), credit/debit cards, and net banking.",
  },
];

export default function LandingPage({ onStartFree, onGetPass, onOpenLegal }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--void)] text-[var(--ink-1)] selection:bg-[rgba(0,240,255,0.2)] selection:text-[var(--astra-cyan)] overflow-x-hidden">
      
      {/* ── TOP NAVIGATION ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--edge-subtle)] bg-[var(--void)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--astra-cyan)] to-[var(--royal-violet)] flex items-center justify-center shadow-lg shadow-[var(--astra-glow)]">
              <Sparkles size={16} className="text-[#0B0F17]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-sm text-[var(--ink-1)]">
                Astra <span className="text-[var(--astra-cyan)]">AI</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[var(--ink-3)] font-semibold -mt-0.5">
                GPT 6 Astra
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGetPass}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[var(--ink-2)] hover:text-[var(--ink-1)] transition"
            >
              Pricing (₹99)
            </button>
            <button
              onClick={onStartFree}
              className="btn-astra !py-2 !px-4 text-xs font-bold"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-12 pb-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--edge)] bg-[var(--glass)] text-xs font-medium text-[var(--astra-cyan)] mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--astra-cyan)] animate-pulse" />
            <span>Independent AI Workspace — Multi-Agent Suite</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] mb-6 max-w-3xl">
            Astra AI <br />
            <span className="text-astra-gradient">Your intelligent AI workspace.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[var(--ink-2)] max-w-2xl leading-relaxed mb-8">
            Chat, code, study, analyze documents, understand images, and get more done with Astra.
            High-speed multi-agent intelligence engineered for modern productivity.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center mb-10">
            <button
              onClick={onStartFree}
              className="btn-astra w-full sm:w-auto px-7 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--astra-glow)]"
            >
              <span>Start Free</span>
              <ChevronRight size={15} />
            </button>
            <button
              onClick={onGetPass}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[var(--edge)] bg-[var(--glass)] hover:border-[var(--edge-hover)] text-xs font-semibold text-[var(--ink-1)] flex items-center justify-center gap-2 transition"
            >
              <Zap size={14} className="text-[var(--astra-cyan)]" />
              <span>Get 7-Day Pass — ₹99</span>
            </button>
          </div>

          {/* 3D Visual Constellation */}
          <div className="w-full max-w-xl h-64 sm:h-72 my-2">
            <AstraCanvas3D mode="login" />
          </div>

          {/* Transparency Disclaimer Pill */}
          <div className="mt-4 p-3 rounded-xl border border-[var(--edge-subtle)] bg-[rgba(255,255,255,0.02)] max-w-xl text-[11px] text-[var(--ink-3)] leading-relaxed">
            <strong className="text-[var(--ink-2)]">Legal Notice:</strong> Astra AI is an independent AI application and is not affiliated with or endorsed by OpenAI, Google, or Anthropic.
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES GRID ── */}
      <section className="py-20 px-6 border-t border-[var(--edge-subtle)] bg-[var(--void-surface)]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
              One Workspace. Seven Specialized Agents.
            </h2>
            <p className="text-xs sm:text-sm text-[var(--ink-3)]">
              No generic responses. Every query is dynamically routed to the domain-optimized Astra agent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.id}
                  className="float-card p-6 flex flex-col justify-between"
                >
                  <div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{
                        background: `${cap.color}15`,
                        border: `1px solid ${cap.color}35`,
                      }}
                    >
                      <Icon size={20} style={{ color: cap.color }} />
                    </div>
                    <h3 className="text-base font-bold text-[var(--ink-1)] mb-1">
                      {cap.title}
                    </h3>
                    <p className="text-xs font-semibold mb-3" style={{ color: cap.color }}>
                      {cap.tagline}
                    </p>
                    <p className="text-xs text-[var(--ink-3)] leading-relaxed">
                      {cap.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--edge-subtle)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--ink-3)]">Included in Astra</span>
                    <button
                      onClick={onStartFree}
                      className="text-xs font-bold text-[var(--astra-cyan)] hover:underline inline-flex items-center gap-1"
                    >
                      Try agent <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section className="py-20 px-6 border-t border-[var(--edge-subtle)]" id="pricing">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Simple, Transparent, Honest Pricing
          </h2>
          <p className="text-xs sm:text-sm text-[var(--ink-3)] mb-12 max-w-lg mx-auto">
            No recurring hidden subscriptions. No inflated fake prices. Just pure, powerful AI.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Free Plan */}
            <div className="glass-panel p-8 flex flex-col justify-between border-[var(--edge-subtle)]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--ink-1)]">Astra Free</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--edge-subtle)] text-[var(--ink-3)]">
                    Default
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black">₹0</span>
                  <span className="text-xs text-[var(--ink-3)]">/ forever</span>
                </div>
                <ul className="space-y-3 text-xs text-[var(--ink-2)] mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span>10 daily AI messages</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span>2 PDF document uploads per day</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span>Astra Chat, Code & Study access</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span>Persistent chat history</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={onStartFree}
                className="btn-ghost w-full !py-2.5 text-xs font-bold"
              >
                Use Free Version
              </button>
            </div>

            {/* Astra 7-Day Pass */}
            <div className="glass-panel p-8 flex flex-col justify-between border-[var(--astra-cyan)] relative shadow-xl shadow-[var(--astra-glow)]">
              <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--astra-cyan)] to-[var(--royal-violet)] text-[10px] font-black text-[#0B0F17] uppercase tracking-wider">
                Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--ink-1)]">Astra 7-Day Pass</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--astra-glow)] text-[var(--astra-cyan)] font-bold">
                    7 Days Access
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-astra-gradient">₹99</span>
                  <span className="text-xs text-[var(--ink-3)]">/ one-time</span>
                </div>
                <ul className="space-y-3 text-xs text-[var(--ink-2)] mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span className="font-semibold text-[var(--ink-1)]">100 daily AI messages</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span>20 PDF uploads with deep vector RAG</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span>Astra Vision (Image OCR & analysis)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span>Astra Research & Executive Productivity</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--astra-cyan)] shrink-0" />
                    <span>Priority model throughput</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onGetPass}
                className="btn-astra w-full !py-3 text-xs font-bold"
              >
                Get 7-Day Pass — ₹99
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQS ── */}
      <section className="py-20 px-6 border-t border-[var(--edge-subtle)] bg-[var(--void-surface)]/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-[var(--ink-3)]">Everything you need to know about Astra AI</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="glass-panel p-4 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{faq.q}</span>
                  <span className="text-[var(--astra-cyan)] text-sm">{openFaq === i ? "−" : "+"}</span>
                </div>
                {openFaq === i && (
                  <p className="mt-3 text-xs text-[var(--ink-3)] leading-relaxed border-t border-[var(--edge-subtle)] pt-3">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER & LEGAL DISCLAIMER ── */}
      <footer className="mt-auto py-12 px-6 border-t border-[var(--edge-subtle)] bg-[var(--void)] text-xs text-[var(--ink-3)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--astra-cyan)] to-[var(--royal-violet)] flex items-center justify-center">
              <Sparkles size={12} className="text-[#0B0F17]" />
            </div>
            <span className="font-bold text-[var(--ink-2)]">GPT 6 Astra (Astra AI)</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <button onClick={() => onOpenLegal("terms")} className="hover:text-[var(--ink-1)] transition">Terms of Service</button>
            <button onClick={() => onOpenLegal("privacy")} className="hover:text-[var(--ink-1)] transition">Privacy Policy</button>
            <button onClick={() => onOpenLegal("refund")} className="hover:text-[var(--ink-1)] transition">Refund Policy</button>
            <button onClick={() => onOpenLegal("disclaimer")} className="hover:text-[var(--ink-1)] transition">AI Disclaimer</button>
          </div>

          <p className="text-[11px]">
            © {new Date().getFullYear()} Astra AI. All rights reserved.
          </p>
        </div>

        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-[var(--edge-subtle)] text-[10px] text-center text-[var(--ink-3)] leading-relaxed">
          <strong>Mandatory Disclaimer:</strong> Astra AI is an independent AI software application. It is not affiliated with, authorized by, endorsed by, or in any way officially connected with OpenAI, Google, Anthropic, or any of their subsidiaries or affiliates. "GPT" is a general acronym for Generative Pre-trained Transformer.
        </div>
      </footer>
    </div>
  );
}
