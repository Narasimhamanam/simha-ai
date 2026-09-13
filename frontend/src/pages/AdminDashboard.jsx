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

  const filteredUsers = usersList.filter((u) =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[var(--void)] text-[var(--ink-1)] px-4 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto w-full">
        
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
              Operational metrics, PhonePe transaction logs, and customer pass entitlements
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between text-xs text-[var(--ink-3)] mb-2">
                <span>Total Users</span>
                <Users size={16} className="text-[var(--astra-cyan)]" />
              </div>
              <div className="text-2xl font-black">{metrics.total_users}</div>
              <div className="text-[11px] text-[var(--ink-3)] mt-1">
                {metrics.free_users} Free · {metrics.active_premium_users} Premium
              </div>
            </div>

            <div className="glass-panel p-5">
              <div className="flex items-center justify-between text-xs text-[var(--ink-3)] mb-2">
                <span>Active 7-Day Passes</span>
                <UserCheck size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {metrics.active_premium_users}
              </div>
              <div className="text-[11px] text-[var(--ink-3)] mt-1">
                {metrics.expired_passes} Expired passes
              </div>
            </div>

            <div className="glass-panel p-5">
              <div className="flex items-center justify-between text-xs text-[var(--ink-3)] mb-2">
                <span>Total Revenue (INR)</span>
                <TrendingUp size={16} className="text-[var(--astra-cyan)]" />
              </div>
              <div className="text-2xl font-black text-astra-gradient">
                ₹{metrics.total_revenue_inr.toFixed(0)}
              </div>
              <div className="text-[11px] text-[var(--ink-3)] mt-1">
                {metrics.successful_payments} Successful orders
              </div>
            </div>

            <div className="glass-panel p-5">
              <div className="flex items-center justify-between text-xs text-[var(--ink-3)] mb-2">
                <span>PhonePe Success Rate</span>
                <CreditCard size={16} className="text-indigo-400" />
              </div>
              <div className="text-2xl font-black">
                {metrics.total_payments > 0
                  ? `${Math.round((metrics.successful_payments / metrics.total_payments) * 100)}%`
                  : "N/A"}
              </div>
              <div className="text-[11px] text-[var(--ink-3)] mt-1">
                {metrics.failed_payments} Failed orders
              </div>
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
            <button type="submit" className="btn-astra !py-2 text-xs font-bold">
              Grant Pass
            </button>
          </form>
          {grantMsg && (
            <p className="mt-2 text-xs text-[var(--astra-cyan)] font-medium">{grantMsg}</p>
          )}
        </div>

        {/* Two-column view: Recent Transactions & User Directory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent PhonePe Transactions */}
          <div className="glass-panel p-6">
            <h2 className="text-sm font-bold mb-4 flex items-center justify-between">
              <span>Recent Transactions (PhonePe)</span>
              <span className="text-xs text-[var(--ink-3)] font-mono">{transactions.length}</span>
            </h2>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <p className="text-xs text-[var(--ink-3)] py-4 text-center">No transaction records</p>
              ) : (
                transactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/5 border border-[var(--edge-subtle)] text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-[var(--ink-1)] truncate max-w-[200px]">
                        {tx.user_email}
                      </p>
                      <p className="text-[10px] text-[var(--ink-3)] font-mono">
                        {tx.merchant_transaction_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--ink-1)]">₹{tx.amount_inr}</p>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          tx.status === "SUCCESS"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : tx.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Directory */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">User Directory</h2>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--ink-3)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter users..."
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-[var(--edge-subtle)] text-xs text-[var(--ink-1)] outline-none w-36 sm:w-48"
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-[var(--ink-3)] py-4 text-center">No users found</p>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-white/5 border border-[var(--edge-subtle)] text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[var(--ink-1)]">{u.email}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">
                        Status: {u.subscription_status}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.is_active_pass
                            ? "bg-[var(--astra-glow)] text-[var(--astra-cyan)] border border-[var(--edge)]"
                            : "bg-white/5 text-[var(--ink-3)]"
                        }`}
                      >
                        {u.plan}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
