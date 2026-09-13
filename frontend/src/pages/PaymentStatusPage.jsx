import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw, ShieldCheck, Clock } from "lucide-react";
import API from "../services/api";

export default function PaymentStatusPage({ onReturnToWorkspace, onRetryPayment }) {
  const [status, setStatus] = useState("PENDING"); // PENDING | SUCCESS | FAILED
  const [message, setMessage] = useState("We're verifying your payment with Cashfree...");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Extract order or link identifier from URL query parameters
  const queryParams = new URLSearchParams(window.location.search);
  const orderId = queryParams.get("order_id") || queryParams.get("link_id") || "";

  useEffect(() => {
    let timer;
    let pollCount = 0;
    const maxPolls = 8; // 8 polls at 3s intervals = 24 seconds

    const checkVerification = async () => {
      if (!orderId) {
        setStatus("FAILED");
        setMessage("No transaction or order identifier was provided in the return URL.");
        setLoading(false);
        return;
      }

      try {
        const response = await API.get(`/api/payments/status/${encodeURIComponent(orderId)}`);
        const data = response.data;

        if (data.status === "SUCCESS") {
          setStatus("SUCCESS");
          setMessage(data.message || "Your Astra 7-Day Pass is active.");
          if (data.access_expires_at) {
            const dt = new Date(data.access_expires_at);
            setExpiryDate(
              dt.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            );
          }
          setLoading(false);
        } else if (data.status === "PENDING" && pollCount < maxPolls) {
          pollCount++;
          setMessage(`Awaiting confirmation from Cashfree (attempt ${pollCount}/${maxPolls})...`);
          timer = setTimeout(checkVerification, 3000);
        } else if (data.status === "PENDING") {
          setStatus("PENDING");
          setMessage("We're verifying your payment... Confirmation may take a few moments. Your pass will activate automatically.");
          setLoading(false);
        } else {
          setStatus("FAILED");
          setMessage(data.message || "Payment was not completed.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Payment status verification error:", err);
        if (pollCount < maxPolls) {
          pollCount++;
          timer = setTimeout(checkVerification, 3000);
        } else {
          setStatus("FAILED");
          setMessage("Could not confirm transaction status. If your account was debited, your pass will activate upon gateway confirmation.");
          setLoading(false);
        }
      }
    };

    checkVerification();

    return () => clearTimeout(timer);
  }, [orderId]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] p-6 text-center bg-[var(--void)] text-[var(--ink-1)]">
      <div className="glass-panel p-8 max-w-md w-full animate-fade-in shadow-2xl">
        
        {/* PENDING STATE */}
        {status === "PENDING" && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[var(--astra-glow)] border border-[var(--edge)] flex items-center justify-center mx-auto mb-5 text-[var(--astra-cyan)]">
              <Loader2 size={26} className="animate-spin" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">We're verifying your payment...</h2>
            <p className="text-xs text-[var(--ink-3)] mb-6 leading-relaxed">
              {message}
            </p>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-6">
              <div className="h-full bg-[var(--astra-cyan)] w-2/3 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--ink-3)] mb-4">
              <ShieldCheck size={13} className="text-[var(--astra-cyan)]" />
              <span>Server-side verification with Cashfree</span>
            </div>
            {!loading && (
              <button
                onClick={() => window.location.reload()}
                className="btn-ghost w-full !py-2 text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw size={13} />
                <span>Refresh Status</span>
              </button>
            )}
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === "SUCCESS" && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-1 text-[var(--ink-1)]">
              Payment Successful 🎉
            </h2>
            <p className="text-xs font-semibold text-[var(--astra-cyan)] mb-4">
              Your Astra 7-Day Pass is active.
            </p>
            
            {expiryDate && (
              <div className="p-3.5 rounded-xl bg-white/5 border border-[var(--edge-subtle)] text-xs text-[var(--ink-2)] mb-6">
                <span className="text-[11px] text-[var(--ink-3)] block mb-1 uppercase tracking-wider font-semibold">Valid until</span>
                <span className="font-mono font-bold text-[var(--ink-1)] text-sm">{expiryDate}</span>
              </div>
            )}

            <button
              onClick={onReturnToWorkspace}
              className="btn-astra w-full flex items-center justify-center gap-2 !py-3 text-xs font-bold"
            >
              <span>Start Using Astra</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* FAILED STATE */}
        {status === "FAILED" && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5 text-red-400">
              <XCircle size={30} />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2 text-[var(--ink-1)]">
              Payment was not completed.
            </h2>
            <p className="text-xs text-[var(--ink-3)] mb-6 leading-relaxed">
              {message}
            </p>

            <div className="space-y-2">
              <button
                onClick={onRetryPayment}
                className="btn-astra w-full flex items-center justify-center gap-2 !py-2.5 text-xs font-bold"
              >
                <RefreshCw size={13} />
                <span>Try Again</span>
              </button>
              <button
                onClick={onReturnToWorkspace}
                className="btn-ghost w-full !py-2 text-xs"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
