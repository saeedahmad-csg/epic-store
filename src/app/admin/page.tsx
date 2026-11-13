"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Table,
  FileText,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Upload,
  ExternalLink,
  ArrowLeft,
  Receipt,
  MessageSquare,
  Search,
  Sliders,
  Lock,
  LogOut,
  User,
  Key,
} from "lucide-react";
import confetti from "canvas-confetti";
import { RefundRequest, InteractionLog } from "@/lib/sampleData";
import { SentEmailRecord } from "@/lib/email";

export default function AdminPage() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Tab & Data states
  const [activeTab, setActiveTab] = useState<"refunds" | "interactions" | "settings">("refunds");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Store data states
  const [googleSheetsInfo, setGoogleSheetsInfo] = useState<any>(null);
  const [policyInfo, setPolicyInfo] = useState<any>(null);
  const [autoApprove, setAutoApprove] = useState(false);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [emails, setEmails] = useState<SentEmailRecord[]>([]);
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);

  // Modals & Feedback
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [uploadingPolicy, setUploadingPolicy] = useState(false);
  const [seedingSheets, setSeedingSheets] = useState(false);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [inquirySearch, setInquirySearch] = useState("");

  // Check existing session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isAuth = sessionStorage.getItem("apexstore_admin_authenticated") === "true";
      setIsAuthenticated(isAuth);
      setAuthChecking(false);
      setLastSyncedTime(new Date());

      if (isAuth) {
        loadAdminData(false);
      }
    }
  }, []);

  function getAuthHeaders(): HeadersInit {
    return {};
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setLoginError(data.error || "Invalid email or password. Please try again.");
        return;
      }

      sessionStorage.setItem("apexstore_admin_authenticated", "true");
      setIsAuthenticated(true);
      await loadAdminData(false);
    } catch (err) {
      setLoginError("An error occurred during authentication. Please retry.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleSignOut() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout request failed:", e);
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("apexstore_admin_authenticated");
      sessionStorage.removeItem("apexstore_admin_key");
    }
    setIsAuthenticated(false);
    setLoginEmail("");
    setLoginPassword("");
  }

  async function loadAdminData(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/admin", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (res.status === 401) {
        handleSignOut();
        setLoginError("Session expired or invalid key. Please log in again.");
        return;
      }

      setGoogleSheetsInfo(data.googleSheets);
      setPolicyInfo(data.policies);
      setAutoApprove(Boolean(data.settings?.autoApproveRefunds));
      setRefunds(data.refunds || []);
      setEmails(data.emails || []);
      setInteractions(data.interactions || []);
      setLastSyncedTime(new Date());
    } catch (err) {
      console.error("Failed to load admin data:", err);
      showError("Failed to synchronize with server.");
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }

  async function handleToggleAutoApprove() {
    const nextVal = !autoApprove;
    setAutoApprove(nextVal);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "toggle_auto_approve", autoApprove: nextVal }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to toggle setting");
      }
      showSuccess(`Auto-Approve: ${nextVal ? "ENABLED (Instant Approval)" : "DISABLED (Manual Review)"}`);
    } catch (err: any) {
      console.error("Failed to toggle auto approve:", err);
      showError(err.message || "Failed to toggle auto-approve.");
      setAutoApprove(!nextVal);
    }
  }

  async function handleRefundAction(refundId: string, action: "APPROVE" | "REJECT" | "RETRY_EMAIL") {
    setProcessingRefundId(refundId);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ refundId, action }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Action failed");
      }

      if (action === "APPROVE") {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
        const emailMode = data.emailDispatched?.mode;
        if (emailMode === "LIVE_SMTP") {
          showSuccess(`Refund ${refundId} approved and live email sent to customer inbox.`);
        } else if (emailMode === "SMTP_FAILED") {
          showSuccess(`Refund ${refundId} approved (SMTP delivery failed; receipt recorded in Email Viewer).`);
        } else {
          showSuccess(`Refund ${refundId} approved and receipt recorded in Dispatch Viewer.`);
        }
      } else if (action === "RETRY_EMAIL") {
        if (data.emailDispatched?.success) {
          showSuccess(`Confirmation email successfully resent for refund ${refundId}.`);
        } else {
          showError(`Email retry failed for refund ${refundId}.`);
        }
      } else {
        showSuccess(`Refund ${refundId} rejected.`);
      }

      await loadAdminData(true);
    } catch (err: any) {
      showError(err.message || `Failed to process refund.`);
    } finally {
      setProcessingRefundId(null);
    }
  }

  async function handleSeedSheets() {
    setSeedingSheets(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "seed_sheets" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to seed sheets");
      }
      showSuccess(data.message || "Sample data seeded successfully!");
      await loadAdminData(true);
    } catch (err: any) {
      showError(err.message || "Failed to seed data.");
    } finally {
      setSeedingSheets(false);
    }
  }

  async function handlePolicyUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      showError("Please select a Microsoft Word (.docx) file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("File size exceeds 5MB limit.");
      return;
    }

    setUploadingPolicy(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Upload failed");
      }

      showSuccess("Successfully updated and re-indexed policy document!");
      await loadAdminData(true);
    } catch (err: any) {
      showError(err.message || "Error uploading policy document.");
    } finally {
      setUploadingPolicy(false);
    }
  }

  function showSuccess(msg: string) {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  }

  function showError(msg: string) {
    setActionErrorMsg(msg);
    setTimeout(() => setActionErrorMsg(null), 5000);
  }

  // Loading state during initial session check
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span>Verifying access...</span>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SECURE LOGIN SCREEN (Shown if not logged in)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-8 space-y-6">
          {/* Logo & Lock Badge */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              ApexStore Admin
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Sign in with your staff credentials to manage orders, refunds, and policies.
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" data-form-type="other">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Staff Email
              </label>
              <input
                type="email"
                name="apex_staff_id"
                required
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-slate-50/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                name="apex_staff_key"
                required
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-slate-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn || !loginPassword.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.99]"
            >
              {loggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <Link
              href="/"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              &larr; Return to Customer Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED DASHBOARD VIEW
  // -------------------------------------------------------------
  const pendingRefunds = refunds.filter((r) => r.adminStatus === "PENDING");
  const approvedRefunds = refunds.filter((r) => r.adminStatus === "APPROVED");
  const totalApprovedAmount = approvedRefunds.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  const filteredInteractions = interactions.filter((int) => {
    if (!inquirySearch.trim()) return true;
    const q = inquirySearch.toLowerCase();
    return (
      int.customerEmail.toLowerCase().includes(q) ||
      int.customerQuery.toLowerCase().includes(q) ||
      int.agentResponse.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Return to Storefront"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                ApexStore Admin
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {lastSyncedTime && (
              <span className="text-slate-400 hidden md:inline text-[11px]">
                Updated {lastSyncedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}

            <button
              onClick={() => loadAdminData(false)}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              View Store &rarr;
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
              title="Sign Out of Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="bg-emerald-600 text-white text-xs py-2 px-4 text-center font-medium shadow-sm flex items-center justify-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div className="bg-rose-600 text-white text-xs py-2 px-4 text-center font-medium shadow-sm flex items-center justify-center space-x-2 animate-in fade-in">
          <XCircle className="w-4 h-4" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pending Refunds */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Pending Review</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {pendingRefunds.length}
              </div>
              <span className="text-[11px] text-amber-600 font-medium">
                {pendingRefunds.length === 0 ? "All caught up" : "Action required"}
              </span>
            </div>
          </div>

          {/* Card 2: Total Processed */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Resolved Refunds</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                ${totalApprovedAmount.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">
                {approvedRefunds.length} approved payouts
              </span>
            </div>
          </div>

          {/* Card 3: Auto-Approve Toggle */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-semibold text-slate-500 block">Auto-Approval</span>
              <div className="text-sm font-bold text-slate-900">
                {autoApprove ? "Enabled" : "Manual Review"}
              </div>
              <p className="text-[11px] text-slate-400">
                {autoApprove ? "Eligible refunds auto-pass" : "Staff approves each refund"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoApprove}
              onClick={handleToggleAutoApprove}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                autoApprove ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoApprove ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Card 4: Data Connection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
              <Table className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Database Status</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {googleSheetsInfo?.connected ? "Google Sheets Live" : "Local Database"}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>Synced & Ready</span>
              </span>
            </div>
          </div>
        </div>

        {/* Clean 3-Tab Selector */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "refunds", label: `Refund Requests (${refunds.length})`, icon: Receipt },
            { id: "interactions", label: `Customer Inquiries (${interactions.length})`, icon: MessageSquare },
            { id: "settings", label: "Settings & Documents", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: REFUND REQUESTS */}
        {activeTab === "refunds" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">Customer Refund Requests</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review and resolve refund claims submitted by customers or drafted by the AI assistant.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {pendingRefunds.length} Pending
              </span>
            </div>

            {refunds.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No refund requests logged yet. Use the customer chat or Order Tracker to submit a refund!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3">Order ID</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Reason</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {refunds.map((r) => (
                      <tr key={r.refundId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                          {r.orderId}
                          <span className="block text-[10px] text-slate-400 font-normal">{r.refundId}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="block font-medium text-slate-900">{r.customerEmail}</span>
                          <span className="text-[10px] text-slate-400">{r.createdAt?.split("T")[0]}</span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">
                          ${r.refundAmount.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 max-w-[240px]">
                          <p className="text-slate-800 font-medium truncate" title={r.reason}>
                            {r.reason}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 space-y-1">
                          <div>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                r.adminStatus === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.adminStatus === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {r.adminStatus}
                            </span>
                          </div>
                          {r.adminStatus === "APPROVED" && (
                            <div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium ${
                                  r.emailStatus === "SMTP_ACCEPTED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : r.emailStatus === "TEST_DISPATCHED"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : r.emailStatus === "FAILED"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {r.emailStatus === "SMTP_ACCEPTED"
                                  ? "Email: Sent"
                                  : r.emailStatus === "TEST_DISPATCHED"
                                  ? "Email: Dispatched"
                                  : r.emailStatus === "FAILED"
                                  ? "Email: Failed"
                                  : "Email: Pending"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                          {r.adminStatus === "PENDING" ? (
                            <>
                              <button
                                disabled={processingRefundId === r.refundId}
                                onClick={() => handleRefundAction(r.refundId, "APPROVE")}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-xs"
                              >
                                {processingRefundId === r.refundId ? "Saving..." : "Approve"}
                              </button>
                              <button
                                disabled={processingRefundId === r.refundId}
                                onClick={() => handleRefundAction(r.refundId, "REJECT")}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-medium text-xs transition-colors border border-rose-200"
                              >
                                {processingRefundId === r.refundId ? "Saving..." : "Reject"}
                              </button>
                            </>
                          ) : r.adminStatus === "APPROVED" && (r.emailStatus === "FAILED" || !r.emailStatus || r.emailStatus === "PENDING") ? (
                            <button
                              disabled={processingRefundId === r.refundId}
                              onClick={() => handleRefundAction(r.refundId, "RETRY_EMAIL")}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-800 border border-amber-300 font-medium text-xs transition-colors"
                              title="Resend customer refund receipt email"
                            >
                              {processingRefundId === r.refundId ? "Sending..." : "Retry Email"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOMER INQUIRIES */}
        {activeTab === "interactions" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">Recent Customer Conversations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time log of customer questions and the AI agent's grounded replies.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={inquirySearch}
                  onChange={(e) => setInquirySearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            {filteredInteractions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No customer interactions recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInteractions.map((int, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-800">{int.customerEmail}</span>
                      <span>{new Date(int.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-slate-800">
                      <span className="font-semibold text-indigo-700 block text-[11px] mb-0.5">Customer:</span>
                      {int.customerQuery}
                    </div>

                    <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-slate-800">
                      <span className="font-semibold text-indigo-900 block text-[11px] mb-0.5">Eren (AI Support):</span>
                      {int.agentResponse}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SETTINGS & DOCUMENTS */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Word Policy Document Manager */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Policy Document (.docx)</h3>
                    <p className="text-xs text-slate-500">Source file for AI grounding</p>
                  </div>
                </div>

                <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center space-x-1.5 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPolicy ? "Uploading..." : "Upload New .docx"}</span>
                  <input
                    type="file"
                    accept=".docx"
                    className="hidden"
                    disabled={uploadingPolicy}
                    onChange={handlePolicyUpload}
                  />
                </label>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between font-medium text-slate-800">
                  <span>File: <code>company_policies.docx</code></span>
                  <span>{policyInfo?.charCount || 3200} characters</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Last updated: {policyInfo?.lastUpdated ? new Date(policyInfo.lastUpdated).toLocaleDateString() : "Active"}
                </p>
              </div>

              <Link
                href="/#policies"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>View Customer-Facing Policies on Storefront</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>

            {/* Google Sheets Sync Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Table className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Google Sheets Database</h3>
                    <p className="text-xs text-slate-500">Inventory, orders & refund storage</p>
                  </div>
                </div>

                <button
                  onClick={handleSeedSheets}
                  disabled={seedingSheets}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {seedingSheets ? "Resetting..." : "Reset Sample Data"}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between font-medium text-slate-800">
                  <span>Status:</span>
                  <span className={googleSheetsInfo?.connected ? "text-emerald-600 font-bold" : "text-slate-700"}>
                    {googleSheetsInfo?.connected ? "Connected to Cloud Sheet" : "Using Local In-Memory Store"}
                  </span>
                </div>
                {googleSheetsInfo?.sheetTitle && (
                  <p className="text-[11px] text-slate-500">
                    Spreadsheet: "{googleSheetsInfo.sheetTitle}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}