"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { membersApi, paymentsApi, splitsApi } from "@/lib/api";
import type { Member, Payment, Split } from "@/types";
import { formatYen } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

function formatDateTime(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isGeneratedPassengerName(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^搭乗者\d+$/.test(value.trim());
}

export function PaymentStatusView({ tripId }: { tripId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [latestSplit, setLatestSplit] = useState<Split | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const saveNameDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const passengerMembers = useMemo(
    () => members.filter((member) => member.role === "passenger"),
    [members]
  );
  const passengerPayments = useMemo(
    () => payments.filter((payment) => payment.member_role === "passenger"),
    [payments]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [memberList, split] = await Promise.all([
        membersApi.list(tripId),
        splitsApi.getLatest(tripId).catch(() => null),
      ]);
      setMembers(memberList);
      if (split) {
        setLatestSplit(split);
        const paymentList = await paymentsApi.list(split.id);
        setPayments(paymentList);
      } else {
        setLatestSplit(null);
        setPayments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setEditingNames(
      Object.fromEntries(
        passengerMembers.map((member) => [
          member.id,
          isGeneratedPassengerName(member.display_name) ? "" : member.display_name,
        ])
      )
    );
  }, [passengerMembers]);

  useEffect(() => {
    return () => {
      Object.values(saveNameDebounceRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const updatePassengerName = useCallback(
    (memberId: string, value: string) => {
      setEditingNames((prev) => ({ ...prev, [memberId]: value }));
      const existing = saveNameDebounceRef.current[memberId];
      if (existing) clearTimeout(existing);
      saveNameDebounceRef.current[memberId] = setTimeout(() => {
        const displayName = value.trim();
        if (!displayName) return;
        membersApi
          .update(tripId, memberId, { display_name: displayName })
          .then((updated) => {
            setMembers((prev) =>
              prev.map((member) => (member.id === memberId ? updated : member))
            );
            setPayments((prev) =>
              prev.map((payment) =>
                payment.member_id === memberId
                  ? { ...payment, member_name: updated.display_name }
                  : payment
              )
            );
          })
          .catch(() => {});
      }, 400);
    },
    [tripId]
  );

  const togglePayment = useCallback(
    async (payment: Payment) => {
      if (!latestSplit) return;
      const nextStatus = payment.status === "paid" ? "pending" : "paid";
      setUpdatingPaymentId(payment.id);
      try {
        const updated = await paymentsApi.update(latestSplit.id, payment.id, {
          status: nextStatus,
        });
        setPayments((prev) => prev.map((item) => (item.id === payment.id ? updated : item)));
      } catch {
        // ignore
      } finally {
        setUpdatingPaymentId(null);
      }
    },
    [latestSplit]
  );

  const rows = useMemo(
    () =>
      passengerPayments.map((payment) => {
        const member = passengerMembers.find(
          (candidate) => candidate.id === payment.member_id
        );
        return {
          payment,
          member,
        };
      }),
    [passengerMembers, passengerPayments]
  );

  const paidCount = passengerPayments.filter((payment) => payment.status === "paid").length;
  const pendingCount = passengerPayments.length - paidCount;
  const paidTotal = passengerPayments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount_yen, 0);
  const needsRecalculation =
    latestSplit !== null && passengerMembers.length > 0 && passengerPayments.length !== passengerMembers.length;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">
        読み込み中…
      </div>
    );
  }

  return (
    <>
      <Card className="mb-3">
        <Label>搭乗者管理</Label>
        <p className="mt-2 text-[13px] text-muted">
          割り勘計算の人数から、運転手を除いた搭乗者行を自動で作成します
        </p>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label>支払い状況</Label>
            <p className="mt-1 text-[13px] text-muted">
              {latestSplit
                ? `最新割り勘: ${formatDateTime(latestSplit.calculated_at)}`
                : "割り勘を計算すると、ここで支払い完了/未完了を管理できます"}
            </p>
          </div>
          {latestSplit && (
            <div className="rounded-2xl border border-border bg-surface px-3 py-2 text-right">
              <div className="text-[11px] text-muted">合計</div>
              <div className="text-sm font-bold text-text">{formatYen(latestSplit.total_yen)}</div>
            </div>
          )}
        </div>

        {!latestSplit ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            先に「割り勘計算」タブで最新の精算額を作成してください
          </div>
        ) : passengerPayments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            人数を 2 人以上にして割り勘を計算すると、ここに搭乗者行が自動作成されます
          </div>
        ) : (
          <>
            {needsRecalculation && (
              <div className="mt-4 rounded-2xl border border-accent/30 bg-accentDim px-4 py-3 text-sm text-text">
                最新割り勘と搭乗者行の数が一致していません。人数を変更した場合は再計算してください
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-green/30 bg-green/10 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-green">
                  完了
                </div>
                <div className="mt-1 text-2xl font-bold text-text">{paidCount}人</div>
                <div className="mt-1 text-xs text-muted">{formatYen(paidTotal)}</div>
              </div>
              <div className="rounded-2xl border border-red/30 bg-red/10 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-red">
                  未完了
                </div>
                <div className="mt-1 text-2xl font-bold text-text">{pendingCount}人</div>
                <div className="mt-1 text-xs text-muted">
                  {formatYen(
                    passengerPayments
                      .filter((payment) => payment.status === "pending")
                      .reduce((sum, payment) => sum + payment.amount_yen, 0)
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  対象人数
                </div>
                <div className="mt-1 text-2xl font-bold text-text">{passengerPayments.length}人</div>
                <div className="mt-1 text-xs text-muted">
                  登録同乗者 {passengerMembers.length}人
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {rows.map(({ payment, member }) => {
                const isPaid = payment.status === "paid";
                return (
                  <div
                    key={payment.id}
                    className="fade-in rounded-xl border border-border bg-card px-3 py-3 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={
                            editingNames[payment.member_id] ??
                            (isGeneratedPassengerName(member?.display_name)
                              ? ""
                              : member?.display_name ?? "")
                          }
                          onChange={(e) =>
                            updatePassengerName(payment.member_id, e.target.value)
                          }
                          placeholder="搭乗者名を入力"
                          className="w-full max-w-[180px] rounded-lg border border-border bg-inputBg px-3 py-1.5 text-sm font-semibold text-text outline-none transition placeholder:text-muted focus:border-accent"
                        />
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="text-base font-bold text-text">
                            {formatYen(payment.amount_yen)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              isPaid ? "bg-green text-white" : "bg-red text-white"
                            }`}
                          >
                            {isPaid ? "完了" : "未完了"}
                          </span>
                          <span className="text-muted">
                            {isPaid && payment.paid_at
                              ? formatDateTime(payment.paid_at)
                              : "未対応"}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant={isPaid ? "ghost" : "green"}
                        disabled={updatingPaymentId === payment.id}
                        onClick={() => togglePayment(payment)}
                        className="shrink-0 px-3 py-2 text-xs"
                      >
                        {updatingPaymentId === payment.id
                          ? "更新中…"
                          : isPaid
                            ? "未完了"
                            : "完了"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
