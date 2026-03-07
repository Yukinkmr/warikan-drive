"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const GOOGLE_STATE_STORAGE_KEY = "warikan-drive-google-state";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogleCode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const authError = searchParams.get("error");
    const expectedState =
      typeof window !== "undefined"
        ? sessionStorage.getItem(GOOGLE_STATE_STORAGE_KEY)
        : null;

    if (authError) {
      setError(`Google login was cancelled: ${authError}`);
      return;
    }
    if (!code) {
      setError("Google authorization code is missing.");
      return;
    }
    if (!returnedState || !expectedState || returnedState !== expectedState) {
      setError("Google login state mismatch.");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(GOOGLE_STATE_STORAGE_KEY);
    }

    const redirectUri =
      typeof window !== "undefined" ? `${window.location.origin}/callback` : "";

    loginWithGoogleCode(code, redirectUri)
      .then(() => router.replace("/"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Google login failed.");
      });
  }, [loginWithGoogleCode, router, searchParams]);

  return (
    <div className="w-full max-w-app rounded-card border border-border bg-card p-6 text-center shadow-card md:max-w-app-md">
      {error ? (
        <>
          <p className="text-sm font-medium text-red">{error}</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
            ログイン画面へ戻る
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted">Google ログインを完了しています…</p>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4 text-text">
      <Suspense
        fallback={
          <div className="w-full max-w-app rounded-card border border-border bg-card p-6 text-center shadow-card md:max-w-app-md">
            <p className="text-sm text-muted">読み込み中…</p>
          </div>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
