import { useState, useEffect } from "react";
import {
  Users,
  CreditCard,
  TrendingUp,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  RefreshCw,
  Gift,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import API from "../services/api";

export default function AdminDashboard({ user, onBack }) {
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDays, setGrantDays] = useState(7);
  const [grantMsg, setGrantMsg] = useState("");
  const [reconcilingId, setReconcilingId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = user?.email ? { "X-User-Email": user.email } : {};
      const [mRes, uRes, tRes] = await Promise.all([
        API.get("/api/admin/metrics", { headers }),
        API.get("/api/admin/users", { headers }),
        API.get("/api/admin/transactions", { headers }),
      ]);
      setMetrics(mRes.data);
      setUsersList(uRes.data || []);
      setTransactions(tRes.data || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setError(
        err?.response?.status === 403
          ? "Access denied: This dashboard is restricted to authorized administrators."
          : "Failed to load admin metrics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleGrantPass = async (e) => {
    e.preventDefault();
    if (!grantEmail) return;
    setGrantMsg("");
    try {
      const headers = user?.email ? { "X-User-Email": user.email } : {};
      const res = await API.post(
        "/api/admin/entitlement/grant",
        { email: grantEmail, days: Number(grantDays), reason: "Admin console manual grant" },
        { headers }
      );
      setGrantMsg(`Successfully granted ${grantDays}-day pass to ${grantEmail}`);
      setGrantEmail("");
      fetchData();
    } catch (err) {
      setGrantMsg(err?.response?.data?.detail || "Manual grant failed.");
    }
  };

  const handleReconcile = async (orderId) => {
    if (!orderId) return;
    setReconcilingId(orderId);
    try {
      const headers = user?.email ? { "X-User-Email": user.email } : {};
      const res = await API.post(`/api/admin/reconcile/${encodeURIComponent(orderId)}`, {}, { headers });
      alert(`Reconciliation result for ${orderId}: ${res.data.status} — ${res.data.message}`);
      fetchData();
    } catch (err) {
      alert(`Reconciliation error: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setReconcilingId("");
    }
  };

  const filteredUsers = usersList.filter((u) =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[var(--void)] text-[var(--ink-1)] px-4 sm:px-8 py-8">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-3)] hover:text-[var(--ink-1)] mb-2 transition"
            >
              <ArrowLeft size={13} /> Return to app
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Astra SaaS Administration
            </h1>
            <p className="text-xs text-[var(--ink-3)] mt-1">
              Operational metrics, Cashfree transaction logs, and customer pass entitlements
            </p>
          </div>

          <button
            onClick={fetchData}
            className="btn-ghost self-start sm:self-auto flex items-center gap-2 text-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl text-xs bg-red-500/10 border border-red-500/25 text-red-400 flex items-center gap-3">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            <div className="glass-panel p-4">
              <div className="text-[11px] text-[var(--ink-3)] mb-1">Users</div>
              <div className="text-xl font-black">{metrics.total_users}</div>
              <div className="text-[10px] text-[var(--ink-3)] mt-0.5">{metrics.free_users} Free</div>
            </div>

            <div className="glass-panel p-4 border-emerald-500/30">
              <div className="text-[11px] text-emerald-400 mb-1">Active Passes</div>
              <div className="text-xl font-black text-emerald-400">{metrics.active_premium_users}</div>
              <div className="text-[10px] text-[var(--ink-3)] mt-0.5">7-Day Access</div>
            </div>

            <div className="glass-panel p-4">
              <div className="text-[11px] text-[var(--ink-3)] mb-1">Expired Passes</div>
              <div className="text-xl font-black text-[var(--ink-2)]">{metrics.expired_passes}</div>
              <div className="text-[10px] text-[var(--ink-3)] mt-0.5">Reverted to Free</div>
            </div>

            <div className="glass-panel p-4 border-amber-500/30">
              <div className="text-[11px] text-amber-400 mb-1">Pending Payments</div>
              <div className="text-xl font-black text-amber-400">{metrics.pending_payments || 0}</div>
              <div className="text-[10px] text-[var(--ink-3)] mt-0.5">Awaiting Gateway</div>
            </div>

            <div className="glass-panel p-4 border-emerald-500/30">
              <div className="text-[11px] text-emerald-400 mb-1">Successful Payments</div>
              <div className="text-xl font-black text-emerald-400">{metrics.successful_payments}</div>
              <div className="text-[10px] text-[var(--ink-3)] mt-0.5">Verified ₹99 Orders</div>
            </div>

            <div className="glass-panel p-4 border-red-500/30">
              <div className="text-[11px] text-red-400 mb-1">Failed Payments</div>
              <div className="text-xl font-black text-red-400">{metrics.failed_payments}</div>
              <div className="text-[10px] text-[var(--ink-3)] mt-0.5">Declined / Dropped</div>
            </div>

            <div className="glass-panel p-4 border-[var(--astra-cyan)]">
              <div className="text-[11px] text-[var(--astra-cyan)] mb-1">Total Revenue</div>
              <div className="text-xl font-black text-astra-gradient">₹{metrics.total_revenue_inr.toFixed(0)}</div>
              <div className="text-[10px] text-[var(--ink-3)] mt-0.5">Verified Net</div>
            </div>
          </div>
        )}

        {/* Quick Operations: Manual Entitlement Grant */}
        <div className="glass-panel p-6 mb-8 border-[var(--edge-subtle)]">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Gift size={16} className="text-[var(--astra-cyan)]" />
            <span>Manual Customer Entitlement Grant</span>
          </h2>
          <form onSubmit={handleGrantPass} className="flex flex-wrap items-center gap-3">
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="customer@example.com"
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-[var(--edge-subtle)] text-xs text-[var(--ink-1)] outline-none focus:border-[var(--astra-cyan)] min-w-[240px]"
              required
            />
            <select
              value={grantDays}
              onChange={(e) => setGrantDays(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--void-surface)] border border-[var(--edge-subtle)] text-xs text-[var(--ink-1)] outline-none"
            >
              <option value={7}>7 Days Pass</option>
              <option value={14}>14 Days Pass</option>
              <option value={30}>30 Days Pass</option>
            </select>
            <button
              type="submit"
              className="btn-astra !py-2 !px-4 text-xs font-semibold"
            >
              Grant Pass
            </button>
          </form>
          {grantMsg && (
            <p className="mt-2 text-xs text-[var(--astra-cyan)] font-medium">{grantMsg}</p>
          )}
        </div>

        {/* Full-width Cashfree Transactions Table */}
        <div className="glass-panel p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold">Payment Transactions (Cashfree)</h2>
              <p className="text-[11px] text-[var(--ink-3)]">
                Server-verified transactions with Cashfree Payment Links
              </p>
            </div>
            <span className="text-xs text-[var(--ink-3)] font-mono">{transactions.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--edge-subtle)] text-[var(--ink-3)] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Verified</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-xs text-[var(--ink-3)]">
                      No payment records found
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 font-semibold text-[var(--ink-1)] max-w-[180px] truncate">
                        {tx.user_email}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--ink-2)]">
                        {tx.order_id}
                      </td>
                      <td className="py-3 px-3 font-bold text-[var(--ink-1)]">
                        ₹{tx.amount_inr}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            tx.status === "SUCCESS"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : tx.status === "PENDING"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/15 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 uppercase text-[10px] font-mono text-[var(--ink-3)]">
                        {tx.provider || "cashfree"}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[var(--ink-3)]">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "-"}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[var(--ink-3)]">
                        {tx.verified_at ? new Date(tx.verified_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "-"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {tx.status === "PENDING" ? (
                          <button
                            onClick={() => handleReconcile(tx.order_id)}
                            disabled={reconcilingId === tx.order_id}
                            className="px-2 py-1 rounded bg-[var(--astra-glow)] text-[var(--astra-cyan)] border border-[var(--edge)] hover:bg-[var(--astra-cyan)] hover:text-black transition text-[10px] font-semibold inline-flex items-center gap-1"
                          >
                            <RefreshCw size={10} className={reconcilingId === tx.order_id ? "animate-spin" : ""} />
                            <span>Reconcile</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[var(--ink-3)] font-mono">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Directory */}
        <div className="glass-panel p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold">User Directory</h2>
              <p className="text-[11px] text-[var(--ink-3)]">Customer pass entitlements and plan status</p>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--ink-3)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by email..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-[var(--edge-subtle)] text-xs text-[var(--ink-1)] outline-none focus:border-[var(--astra-cyan)] w-60"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)] py-6 text-center">No users matched query</p>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-white/5 border border-[var(--edge-subtle)] text-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink-1)]">{u.email}</p>
                    <p className="text-[10px] text-[var(--ink-3)] font-mono">
                      Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Recent"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        u.is_active_pass
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/5 text-[var(--ink-3)] border border-[var(--edge-subtle)]"
                      }`}
                    >
                      {u.is_active_pass ? "Astra 7-Day Pass" : "Free"}
                    </span>
                    {u.access_expires_at && u.is_active_pass && (
                      <p className="text-[10px] text-emerald-400/80 font-mono mt-1">
                        Expires: {new Date(u.access_expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
