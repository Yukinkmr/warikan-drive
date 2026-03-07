"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { daysApi, routesApi, tripsApi } from "@/lib/api";
import type { Trip } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings } from "@/components/Settings";
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
  const [editingName, setEditingName] = useState("");
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
      const day = await daysApi.create(trip.id, { date: todayStr() });
      await routesApi.create(day.id, { origin: "", destination: "" });
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
      setEditingTripId(null);
      return;
    }
    try {
      await tripsApi.update(tripId, { name });
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, name } : t))
      );
      setEditingTripId(null);
    } catch {
      // 失敗時は編集状態のまま
    }
  };

  const handleDeleteTrip = async (tripId: string, tripName: string) => {
    if (!window.confirm(`「${tripName}」を削除しますか？`)) return;
    try {
      await tripsApi.delete(tripId);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch {
      // 失敗時は何もしない
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
        <p className="text-sm text-muted">読み込み中…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg px-4 py-6 text-text">
        <div className="mx-auto w-full max-w-app md:max-w-app-md">
          <div className="mb-8 flex items-center justify-end">
            <ThemeToggle />
          </div>

          <div
            className="rounded-[28px] px-5 py-6 sm:px-6"
            style={{
              background: "var(--auth-panel-bg)",
              border: "1px solid var(--auth-panel-border)",
              boxShadow: "var(--auth-shadow)",
            }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--auth-muted)" }}>
                  Warikan Drive
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ color: "var(--auth-title)" }}>
                  ログイン / 新規登録
                </h1>
                <p className="mt-2 text-sm" style={{ color: "var(--auth-body)" }}>
                  ログインすると、自分の旅行履歴と割り勘データだけを表示します。
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: "var(--auth-icon-bg)" }}>
                🚗
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
                    fill="#EA4335"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.56 2.68-3.86 2.68-6.62Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.31-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.98 10.72A5.41 5.41 0 0 1 3.7 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.02-2.33Z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.33l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33c.7-2.12 2.68-3.7 5.02-3.7Z"
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
    <div className="min-h-screen w-full min-w-0 bg-bg text-text md:flex md:justify-center">
      <div className="mx-auto w-full min-w-0 max-w-app md:max-w-app-md lg:max-w-app-lg xl:max-w-app-xl">
        <header
          className="border-b border-white/10 px-4 pt-5 pb-5 sm:px-5 sm:pt-6 md:px-6 lg:px-8 lg:pt-7"
          style={{ background: "var(--header-bg)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                Signed in
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {user.name} の旅行一覧
              </h1>
              <p className="mt-1 text-sm text-white/70">{user.email}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="rounded-xl border border-white/15 p-2.5 text-white/80 transition-all duration-200 ease-out hover:scale-105 hover:border-white/30 hover:text-white active:scale-95"
                aria-label="設定"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <ThemeToggle />
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

        <main className="p-4 pb-8 sm:p-5 md:p-6 md:pb-10 lg:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Trips
              </p>
              <h2 className="mt-1.5 text-lg font-bold tracking-tight text-text sm:text-xl">
                Your trips
              </h2>
              <p className="mt-1 text-sm text-muted">
                この一覧と中の履歴は、現在ログイン中のユーザーだけに紐づきます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              disabled={creating}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "作成中…" : "＋ 新しい旅行"}
            </button>
          </div>

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
              読み込み中…
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center">
              <p className="text-sm text-muted">まだ旅行がありません。</p>
              <p className="mt-1 text-sm text-muted">
                「＋ 新しい旅行」から自分用の履歴を作成できます。
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  <input
                    type="text"
                    placeholder="キーワードで検索"
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-border bg-inputBg px-4 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent sm:max-w-[200px]"
                  />
                  <div className="flex items-center gap-2">
                    <label htmlFor="filter-date" className="shrink-0 text-sm text-muted">
                      作成日:
                    </label>
                    <input
                      id="filter-date"
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="rounded-2xl border border-border bg-inputBg px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent"
                    />
                  </div>
                </div>
                {(filterKeyword.trim() || filterDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterKeyword("");
                      setFilterDate("");
                    }}
                    className="shrink-0 rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-medium text-label transition hover:bg-border/50"
                  >
                    クリア
                  </button>
                )}
              </div>
              {filteredTrips.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center">
                  <p className="text-sm text-muted">条件に一致する旅行はありません。</p>
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
            <div className="space-y-3">
              {filteredTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 transition hover:border-accent/50 hover:bg-surface"
                >
                  <div className="min-w-0 flex-1">
                    {editingTripId === trip.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="truncate text-base font-semibold text-text">
                          {trip.name}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          作成日 {new Date(trip.created_at).toLocaleDateString("ja-JP")}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {editingTripId === trip.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveTripName(trip.id)}
                          className="rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTripId(null);
                            setEditingName("");
                          }}
                          className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-medium text-label transition hover:bg-border/50"
                        >
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTripId(trip.id);
                          setEditingName(trip.name);
                        }}
                        className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-medium text-label transition hover:bg-border/50"
                      >
                        名前の変更
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(trip.id, trip.name)}
                      className="rounded-2xl border border-red/30 bg-red/10 px-3 py-2 text-xs font-medium text-red transition hover:bg-red/20"
                    >
                      削除
                    </button>
                    <Link
                      href={`/trips/${trip.id}`}
                      className="rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      開く →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
