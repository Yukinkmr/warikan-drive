import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warikan Drive — 素早く割り勘、旅終わりのドライバーさんへ",
  description:
    "ETC料金・ガソリン代・運転手傾斜をその場で計算して即集金。Google Maps連携・PayPay即時請求。",
};

export default function LpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
