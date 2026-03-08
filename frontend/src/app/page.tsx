"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tripsApi } from "@/lib/api";
import type { Trip } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings } from "@/components/Settings";
import { LoadingMessage } from "@/components/ui/LoadingMessage";
import { useAuth } from "@/contexts/AuthContext";

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_STATE_STORAGE_KEY = "warikan-drive-google-state";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultNewTripName() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}_ドライブ`;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, login, register, logout, refreshUser } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [popupClosing, setPopupClosing] = useState(false);
  const [popupSaving, setPopupSaving] = useState(false);
  const [renamingTripId, setRenamingTripId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmingTripId, setDeleteConfirmingTripId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoadingTrips(false);
      return;
    }

    setLoadingTrips(true);
    tripsApi
      .list()
      .then((r) => setTrips(r.trips))
      .catch(() => setTrips([]))
      .finally(() => setLoadingTrips(false));
  }, [user]);

  const handleAuthSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setAuthError("メールアドレスを入力してください。");
      return;
    }
    if (!password) {
      setAuthError("パスワードを入力してください。");
      return;
    }
    if (mode === "register") {
      if (!name.trim()) {
        setAuthError("ユーザー名を入力してください。");
        return;
      }
      if (!PASSWORD_RULE.test(password)) {
        setAuthError("パスワードは8文字以上、英字と数字を両方含めてください。");
        return;
      }
    }

    try {
      if (mode === "login") {
        await login(normalizedEmail, password);
      } else {
        await register(name.trim(), normalizedEmail, password);
      }
      setPassword("");
      setAuthError(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "認証に失敗しました。");
    }
  };

  const doCreateTrip = async (name: string) => {
    setCreating(true);
    setCreateError(null);
    try {
      const trip = await tripsApi.create({
        name,
        payment_method: "ETC",
        fuel_efficiency: 15,
        gas_price: 170,
        driver_weight: 0.5,
      });
      setShowCreateModal(false);
      setNewTripName("");
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "作成に失敗しました。");
    } finally {
      setCreating(false);
    }
  };

  const startGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID || typeof window === "undefined") {
      setAuthError("Googleログインが設定されていません。");
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem(GOOGLE_STATE_STORAGE_KEY, state);
    const redirectUri = `${window.location.origin}/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleOpenCreateModal = () => {
    setCreateError(null);
    setNewTripName("");
    setShowCreateModal(true);
  };

  const handleCreateSubmit = () => {
    const name = newTripName.trim();
    doCreateTrip(name ? name : defaultNewTripName());
  };

  const handleSaveTripName = async (tripId: string) => {
    const name = editingName.trim();
    if (!name) {
      setRenamingTripId(null);
      return;
    }
    setPopupSaving(true);
    try {
      await tripsApi.update(tripId, { name });
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, name } : t))
      );
      setRenamingTripId(null);
      setPopupSaving(false);
      setPopupClosing(true);
    } catch {
      setPopupSaving(false);
    }
  };

  const handleConfirmDeleteTrip = async (tripId: string) => {
    setDeletingTripId(tripId);
    try {
      await tripsApi.delete(tripId);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      setDeleteConfirmingTripId(null);
      if (editingTripId === tripId) setPopupClosing(true);
    } catch {
      // 失敗時は何もしない
    } finally {
      setDeletingTripId(null);
    }
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const kw = filterKeyword.trim().toLowerCase();
      if (kw && !trip.name.toLowerCase().includes(kw)) return false;
      if (filterDate) {
        const tripDate = new Date(trip.created_at).toISOString().slice(0, 10);
        if (tripDate !== filterDate) return false;
      }
      return true;
    });
  }, [trips, filterKeyword, filterDate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4 text-text">
        <LoadingMessage />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-screen min-h-screen bg-bg px-4 py-6 text-text">
        <div className="mx-auto w-full max-w-app md:max-w-app-md">
          <div className="mb-8 flex items-center justify-end">
            <div className="flex items-center scale-75 origin-center sm:scale-90">
              <ThemeToggle />
            </div>
          </div>

          <div
            className="rounded-[28px] border border-border bg-card px-5 py-6 shadow-card sm:px-6"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <Link
                  href="/lp"
                  className="block text-xs font-semibold uppercase tracking-[0.2em] transition hover:opacity-80"
                  style={{ color: "var(--auth-muted)" }}
                >
                  Warikan Drive
                </Link>
                <p className="mt-1 text-sm" style={{ color: "var(--auth-body)" }}>
                  素早く割り勘、旅終わりのドライバーさんへ
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ color: "var(--auth-title)" }}>
                  ログイン / 新規登録
                </h1>
              </div>
            </div>

            <div className="mb-5 flex rounded-2xl p-1" style={{ border: "1px solid var(--auth-tab-border)", background: "var(--auth-tab-bg)" }}>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setAuthError(null);
                }}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                style={mode === "login" ? {
                  background: "var(--auth-tab-active-bg)",
                  color: "var(--auth-tab-active-text)",
                } : {
                  color: "var(--auth-tab-inactive-text)",
                }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setAuthError(null);
                }}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                style={mode === "register" ? {
                  background: "var(--auth-tab-active-bg)",
                  color: "var(--auth-tab-active-text)",
                } : {
                  color: "var(--auth-tab-inactive-text)",
                }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === "register" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--auth-label)" }}>
                    Username
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                    style={{
                      border: "1px solid var(--auth-input-border)",
                      background: "var(--auth-input-bg)",
                      color: "var(--auth-input-text)",
                    }}
                    placeholder="your name"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--auth-label)" }}>
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    border: "1px solid var(--auth-input-border)",
                    background: "var(--auth-input-bg)",
                    color: "var(--auth-input-text)",
                  }}
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--auth-label)" }}>
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    border: "1px solid var(--auth-input-border)",
                    background: "var(--auth-input-bg)",
                    color: "var(--auth-input-text)",
                  }}
                  placeholder="8+ chars, letters and numbers"
                />
              </label>

              {mode === "register" && (
                <p className="text-xs" style={{ color: "var(--auth-muted)" }}>
                  パスワードは8文字以上で、英字と数字を両方含めてください。
                </p>
              )}

              {authError && (
                <p className="rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl px-4 py-3 text-sm font-bold transition hover:opacity-90"
                style={{
                  background: "var(--auth-submit-bg)",
                  color: "var(--auth-submit-text)",
                }}
              >
                {mode === "login" ? "ログイン" : "アカウント作成"}
              </button>

              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-border/70" />
                <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--auth-muted)" }}>
                  or
                </span>
                <div className="h-px flex-1 bg-border/70" />
              </div>

              <button
                type="button"
                onClick={startGoogleLogin}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{
                  borderColor: "var(--auth-input-border)",
                  background: "var(--auth-input-bg)",
                  color: "var(--auth-input-text)",
                }}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                >
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0795-1.7968 2.7182v2.2586h2.9086c1.7018-1.5668 2.6846-3.8727 2.6846-6.6177Z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1773l-2.9086-2.2586c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.0364-3.7105H.96v2.3318C2.4409 16.0186 5.4818 18 9 18Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.9636 10.7127A5.4118 5.4118 0 0 1 3.6818 9c0-.5945.1023-1.1727.2818-1.7127V4.9555H.96A8.9962 8.9962 0 0 0 0 9c0 1.4495.3477 2.8227.96 4.0445l3.0036-2.3318Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3455l2.5813-2.5814C13.4632.8918 11.4268 0 9 0 5.4818 0 2.4409 1.9814.96 4.9555l3.0036 2.3318C4.6718 5.1627 6.6559 3.5795 9 3.5795Z"
                  />
                </svg>
                Google で続行
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full min-w-0 flex-col bg-bg text-text md:flex md:justify-center">
      <div className="mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col max-w-app md:max-w-app-md lg:max-w-app-lg xl:max-w-app-xl">
        <header
          className="shrink-0 border-b border-muted px-4 pt-5 pb-5 sm:px-5 sm:pt-6 md:px-6 lg:px-8 lg:pt-7"
        //   style={{ background: "var(--header-bg)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-text sm:text-xl">
                <span className="whitespace-nowrap">{user.name}</span>
                {" "}
                <span className="whitespace-nowrap">のプラン一覧</span>
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-5 sm:gap-6">
              <div className="flex items-center scale-75 origin-center sm:scale-90">
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="rounded-lg border border-muted p-1.5 text-text/80 transition-all duration-200 ease-out hover:scale-105 hover:border-muted hover:text-text active:scale-95 sm:rounded-xl sm:p-2"
                aria-label="設定"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            {isSettingsOpen && (
              <Settings
                open={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onLogout={() => {
                  setIsSettingsOpen(false);
                  logout();
                }}
                currentName={user.name}
                onNameUpdated={refreshUser}
              />
            )}
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 pb-8 sm:p-5 md:p-6 md:pb-10 lg:p-8">
          {showCreateModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-trip-modal-title"
              onClick={() => !creating && setShowCreateModal(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3
                  id="create-trip-modal-title"
                  className="text-sm font-semibold text-label"
                >
                  旅程の名前
                </h3>
                <input
                  type="text"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  placeholder={defaultNewTripName()}
                  className="mt-3 w-full rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent"
                  autoFocus
                />
                <div className="mt-4 flex justify-end gap-2">
                  {newTripName.trim() ? (
                    <button
                      type="button"
                      onClick={handleCreateSubmit}
                      disabled={creating}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {creating && (
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                      )}
                      {creating ? "作成中…" : "完了"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => doCreateTrip(defaultNewTripName())}
                      disabled={creating}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-label transition hover:bg-border/50 disabled:opacity-70"
                    >
                      {creating && (
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-label/50 border-t-label" aria-hidden />
                      )}
                      {creating ? "作成中…" : "スキップ"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {createError && (
            <p className="mb-4 rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
              {createError}
            </p>
          )}

          {loadingTrips ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              <LoadingMessage className="text-sm" />
            </div>
          ) : trips.length === 0 ? (
            <>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                disabled={creating}
                className="mb-4 shrink-0 whitespace-nowrap rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "作成中…" : "＋ 新しいドライブプラン"}
              </button>
              <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center">
                <p className="text-sm text-muted">まだプランがありません。</p>
                <p className="mt-1 text-sm text-muted">
                  「新しいドライブプラン」から自分用の履歴を作成できます。
                </p>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-4 shrink-0 flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2 sm:p-3">
                <input
                  type="text"
                  placeholder="キーワードで検索"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  className="min-w-[11rem] flex-1 rounded-xl border border-border bg-inputBg px-3 py-1.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent sm:max-w-[200px]"
                />
                <div className="flex shrink-0 items-center gap-2">
                  <label htmlFor="filter-date" className="shrink-0 text-xs text-muted sm:text-sm">
                    作成日:
                  </label>
                  <input
                    id="filter-date"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="rounded-xl border border-border bg-inputBg px-3 py-1.5 text-sm text-text outline-none transition focus:border-accent"
                  />
                </div>
                {(filterKeyword.trim() || filterDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterKeyword("");
                      setFilterDate("");
                    }}
                    className="shrink-0 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-label transition hover:bg-border/50"
                  >
                    クリア
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                disabled={creating}
                className="mb-4 shrink-0 whitespace-nowrap rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "作成中…" : "＋ 新しいドライブプラン"}
              </button>
              <div className="min-h-0 flex-1">
              {filteredTrips.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center">
                  <p className="text-sm text-muted">条件に一致するプランはありません。</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterKeyword("");
                      setFilterDate("");
                    }}
                    className="mt-2 text-sm font-medium text-accent hover:underline"
                  >
                    絞り込みを解除
                  </button>
                </div>
              ) : (
            <div className="h-full min-h-0 rounded-2xl border border-border bg-card p-2 sm:p-3 overflow-y-auto overflow-x-hidden">
              <div className="space-y-2">
              {filteredTrips.map((trip) => {
                const paymentSummary =
                  trip.paid_count != null && trip.pending_count != null
                    ? { paidCount: trip.paid_count, pendingCount: trip.pending_count }
                    : null;
                return (
                  <div
                    key={trip.id}
                    className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2 transition hover:border-accent/50 hover:bg-surface"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                      {trip.name}
                    </p>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                        <p className="shrink-0 text-xs text-muted">
                          {new Date(trip.created_at).toLocaleDateString("ja-JP")}
                        </p>
                        {paymentSummary && (
                          <div className="flex min-w-0 flex-wrap items-center gap-1">
                            <span className="rounded-full border border-border bg-red/10 px-2 py-0.5 text-[11px] font-semibold text-red">
                              未払い {paymentSummary.pendingCount}人
                            </span>
                            <span className="rounded-full border border-border bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">
                              支払い済み {paymentSummary.paidCount}人
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingTripId(trip.id)}
                          className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-label transition hover:bg-border/50 sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-xs"
                        >
                          編集
                        </button>
                        <Link
                          href={`/trips/${trip.id}`}
                          className="rounded-lg bg-accent px-2 py-1 text-[11px] font-semibold text-white transition hover:opacity-90 sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-xs"
                        >
                          開く →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
              )}
              </div>
            </div>
          )}

          {(editingTripId || popupClosing) && (() => {
            const tripId = editingTripId ?? "";
            const tripToEdit = trips.find((t) => t.id === tripId);
            // 削除完了後は tripToEdit が無いが、閉じアニメーションのためポップアップは残す
            if (!tripToEdit && !popupClosing) return null;
            const isRenaming = renamingTripId === tripId;
            const closePopup = () => {
              if (!popupClosing) setPopupClosing(true);
            };
            const handlePopupAnimationEnd = (e: React.AnimationEvent) => {
              if (e.animationName === "edit-popup-panel-exit" && popupClosing) {
                setEditingTripId(null);
                setPopupClosing(false);
                setPopupSaving(false);
                setRenamingTripId(null);
                setEditingName("");
                setDeleteConfirmingTripId(null);
                setDeletingTripId(null);
              }
            };
            // 削除完了後は閉じアニメーションのみ表示（中身は不要）
            if (popupClosing && !tripToEdit) {
              return (
                <div
                  className="edit-popup-overlay edit-popup-closing fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-label="閉じる"
                >
                  <div
                    className="edit-popup-panel edit-popup-closing w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg"
                    onAnimationEnd={handlePopupAnimationEnd}
                  />
                </div>
              );
            }
            if (!tripToEdit) return null;
            return (
              <div
                className={`edit-popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${popupClosing ? "edit-popup-closing" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={isRenaming ? "rename-trip-modal-title" : "edit-trip-modal-title"}
                onClick={closePopup}
              >
                <div
                  className={`edit-popup-panel w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg ${popupClosing ? "edit-popup-closing" : ""}`}
                  onClick={(e) => e.stopPropagation()}
                  onAnimationEnd={handlePopupAnimationEnd}
                >
                  {isRenaming ? (
                    <>
                      <h3
                        id="rename-trip-modal-title"
                        className="text-sm font-semibold text-label"
                      >
                        名前を変更
                      </h3>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="mt-3 w-full rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
                        placeholder="プランの名前"
                        autoFocus
                      />
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveTripName(tripId)}
                          disabled={popupSaving}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {popupSaving && (
                            <span
                              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
                              aria-hidden
                            />
                          )}
                          {popupSaving ? "保存中…" : "保存"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingTripId(null);
                            setEditingName("");
                          }}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:bg-border/50"
                        >
                          キャンセル
                        </button>
                      </div>
                    </>
                  ) : deletingTripId === tripId ? (
                    <div className="flex flex-col items-center gap-4 py-2">
                      <span
                        className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
                        aria-hidden
                      />
                      <p className="text-sm font-medium text-label">削除中…</p>
                    </div>
                  ) : deleteConfirmingTripId === tripId ? (
                    <>
                      <h3
                        id="edit-trip-modal-title"
                        className="text-sm font-semibold text-label"
                      >
                        本当に削除しますか？
                      </h3>
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmDeleteTrip(tripId)}
                          disabled={deletingTripId === tripId}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-red px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          はい
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmingTripId(null)}
                          disabled={deletingTripId === tripId}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:bg-border/50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          いいえ
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3
                        id="edit-trip-modal-title"
                        className="text-sm font-semibold text-label"
                      >
                        {tripToEdit.name}
                      </h3>
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingTripId(editingTripId);
                            setEditingName(tripToEdit.name);
                          }}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-label transition hover:bg-border/50"
                        >
                          名前を変更
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmingTripId(tripId)}
                          className="rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm font-medium text-red transition hover:bg-red/20"
                        >
                          削除
                        </button>
                        <button
                          type="button"
                          onClick={closePopup}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:bg-border/50"
                        >
                          キャンセル
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
