"use client";

import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";

type SettingsProps = {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  currentName: string;
  onNameUpdated: () => void;
};

export function Settings({ open, onClose, onLogout, currentName, onNameUpdated }: SettingsProps) {
  const [name, setName] = useState(currentName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeThenLogout, setCloseThenLogout] = useState(false);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
      setIsEditingName(false);
      setClosing(false);
    }
  }, [open, currentName]);

  useEffect(() => {
    if (!open) setClosing(false);
  }, [open]);

  const handleStartEdit = () => {
    setIsEditingName(true);
    setError(null);
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名前を入力してください");
      return;
    }
    if (trimmed === currentName) {
      setIsEditingName(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authApi.updateMe({ name: trimmed });
      onNameUpdated();
      setIsEditingName(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "名前の変更に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (!closing) setClosing(true);
  };

  const handlePanelAnimationEnd = (e: React.AnimationEvent) => {
    if (e.animationName === "edit-popup-panel-exit" && closing) {
      onClose();
      setClosing(false);
      if (closeThenLogout) {
        setCloseThenLogout(false);
        onLogout();
      }
    }
  };

  if (!open && !closing) return null;

  return (
    <div
      className={`edit-popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${closing ? "edit-popup-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={requestClose}
    >
      <div
        className={`edit-popup-panel w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg sm:p-6 ${closing ? "edit-popup-closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <div className="flex items-center justify-between">
          <h2 id="settings-modal-title" className="text-lg font-bold text-text">
            設定
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-xl p-2 text-muted transition-all duration-200 ease-out hover:scale-110 hover:bg-border/50 hover:text-text active:scale-95"
            aria-label="閉じる"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label>表示名</Label>
            {isEditingName ? (
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="名前を入力"
                  maxLength={50}
                  className="min-w-0 flex-1 rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent"
                />
                <Button onClick={handleSaveName} disabled={saving} className="shrink-0">
                  {saving ? "保存中…" : "保存"}
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <span className="min-w-0 flex-1 text-sm font-medium text-text">{currentName || "—"}</span>
                <Button variant="ghost" onClick={handleStartEdit} className="shrink-0">
                  変更
                </Button>
              </div>
            )}
            {error && <p className="mt-2 text-sm text-red">{error}</p>}
          </div>

          <div className="border-t border-border pt-4">
            <Button
              variant="danger"
              onClick={() => {
                setCloseThenLogout(true);
                setClosing(true);
              }}
              className="w-full"
            >
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
