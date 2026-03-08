"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function LpPage() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("lp-visible");
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll(".lp-fade").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="lp-page">
      <header className="lp-header">
        <Link href="/lp" className="lp-logo">
          Warikan Drive
        </Link>
        <Link href="/" className="lp-header-cta">
          アプリを開く
        </Link>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-inner">
            <p className="lp-hero-lead lp-fade">
              素早く割り勘、
              <br className="lp-br-sm" />
              旅終わりのドライバーさんへ
            </p>
            <h1 className="lp-hero-title lp-fade">
              ETC・ガソリン代・運転手優遇を
              <br />
              その場で計算して、その場で集金。
            </h1>
            <p className="lp-hero-desc lp-fade">
              経路を入れるだけで高速料金を自動取得。人数と運転手の負担率を設定すれば、全員の支払い額がすぐに出ます。PayPay で請求リンクを送って集金まで完了できます。
            </p>
            <div className="lp-hero-actions lp-fade">
              <Link href="/" className="lp-btn">
                無料ではじめる
              </Link>
            </div>
            <ul className="lp-hero-tags lp-fade">
              <li>ETC 時間帯割引</li>
              <li>Google Maps 連携</li>
              <li>運転手傾斜割り勘</li>
              <li>PayPay 即時請求</li>
            </ul>
          </div>
        </section>

        <section className="lp-section lp-section--alt">
          <div className="lp-container">
            <h2 className="lp-section-title lp-fade">こんなとき、ありませんか？</h2>
            <p className="lp-section-intro lp-fade">楽しかったドライブも、帰り道のお金の話で気まずくなっていませんか。</p>
            <ul className="lp-problem-list">
              <li className="lp-problem-item">
                <span className="lp-problem-icon">😓</span>
                <div className="lp-problem-body">
                  <strong>傾斜計算が面倒</strong>
                  <p>運転手に多く負担してほしいけど、計算が難しくて結局均等割りに。気を使って損してしまう。</p>
                </div>
              </li>
              <li className="lp-problem-item">
                <span className="lp-problem-icon">🛣️</span>
                <div className="lp-problem-body">
                  <strong>ETC料金がその場でわからない</strong>
                  <p>高速料金はあとで明細を見るまで正確にはわからない。その場でみんなに説明できない。</p>
                </div>
              </li>
              <li className="lp-problem-item">
                <span className="lp-problem-icon">💸</span>
                <div className="lp-problem-body">
                  <strong>集金が遅れる</strong>
                  <p>「あとで払う」が続いて、結局運転手がずっと立て替えたまま。催促するのも気まずい。</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <h2 className="lp-section-title lp-fade">Warikan Drive でできること</h2>
            <p className="lp-section-intro lp-fade">出発前に負担額を確定して、その場で集金まで。</p>
            <ul className="lp-feature-list">
              <li className="lp-feature-item">
                <span className="lp-feature-icon">🗺️</span>
                <div className="lp-feature-body">
                  <h3>経路と料金を自動取得</h3>
                  <p>出発地・目的地・出発時刻を入れると、Google Maps で複数経路を比較。ETC/現金・時間帯割引（深夜・休日）を出発時刻から自動で反映します。</p>
                </div>
              </li>
              <li className="lp-feature-item">
                <span className="lp-feature-icon">🚗</span>
                <div className="lp-feature-body">
                  <h3>運転手傾斜割り勘</h3>
                  <p>スライダーで運転手の負担係数を設定。ガソリン代・高速代・追加費用をまとめて、公平に計算します。</p>
                </div>
              </li>
              <li className="lp-feature-item">
                <span className="lp-feature-icon">📅</span>
                <div className="lp-feature-body">
                  <h3>日別・複数ルート管理</h3>
                  <p>ドライブプランごとに日付とルートを管理。駐車場・レンタカー代も合算でき、複数日の旅行にも対応しています。</p>
                </div>
              </li>
              <li className="lp-feature-item">
                <span className="lp-feature-icon">📱</span>
                <div className="lp-feature-body">
                  <h3>Google Maps ナビ連携</h3>
                  <p>選んだルートをそのまま Google Maps で開いてナビ起動。アプリを切り替える手間がありません。</p>
                </div>
              </li>
              <li className="lp-feature-item">
                <span className="lp-feature-icon">💴</span>
                <div className="lp-feature-body">
                  <h3>PayPay で即時請求</h3>
                  <p>計算結果から PayPay の請求リンクを発行。メンバーに送って、その場で集金を終わらせられます。</p>
                </div>
              </li>
              <li className="lp-feature-item">
                <span className="lp-feature-icon">🌙</span>
                <div className="lp-feature-body">
                  <h3>ダーク / ライトモード</h3>
                  <p>夜ドライブでも目に優しいダークモード。スマホでも使いやすいように調整しています。</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="lp-section lp-section--steps">
          <div className="lp-container">
            <h2 className="lp-section-title lp-fade">使い方</h2>
            <p className="lp-section-intro lp-fade">難しい設定は不要。経路を入れたらあとは自動です。</p>
            <ol className="lp-steps">
              <li className="lp-step">ルート（出発地・目的地・出発時刻）を入力</li>
              <li className="lp-step">経路候補から使うルートを選択</li>
              <li className="lp-step">人数・燃費・運転手優遇率を設定</li>
              <li className="lp-step">割り勘を計算 → 全員の負担額が確定</li>
            </ol>
            <div className="lp-demo lp-fade">
              <p className="lp-demo-label">例：東京駅 → 箱根（4人・ETC・運転手優遇70%）</p>
              <p className="lp-demo-route">東京駅 → 箱根 · 95.2 km</p>
              <div className="lp-demo-stats">
                <span>総コスト <strong>¥5,840</strong></span>
                <span>運転手 <strong>¥1,120</strong></span>
                <span>同乗者×3 <strong>¥1,573</strong></span>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-cta">
          <div className="lp-cta-inner lp-container">
            <p className="lp-cta-lead lp-fade">ドライブのあとの「いくらだった？」を、その場で解決。</p>
            <Link href="/" className="lp-btn lp-btn--large lp-fade">
              無料ではじめる
            </Link>
            <p className="lp-cta-note lp-fade">会員登録は無料。ログインしてすぐ使えます。</p>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container">
          <p className="lp-footer-logo">Warikan Drive</p>
          <p className="lp-footer-copy">Hackathon 2026</p>
        </div>
      </footer>
    </div>
  );
}
