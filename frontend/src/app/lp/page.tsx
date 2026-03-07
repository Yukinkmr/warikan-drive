"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function LpPage() {
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!starsRef.current) return;
    for (let i = 0; i < 50; i++) {
      const s = document.createElement("div");
      s.className = "lp-star";
      const sz = Math.random() * 2 + 1;
      s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random() * 100}%;left:${Math.random() * 100}%;--d:${2 + Math.random() * 5}s;--o:${0.15 + Math.random() * 0.5};animation-delay:${Math.random() * 5}s`;
      starsRef.current.appendChild(s);
    }
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("lp-visible");
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".lp-fade-up").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="lp-page">
      <nav className="lp-nav">
        <Link href="/lp" className="lp-nav-logo">
          🚗 Warikan Drive
        </Link>
        <Link href="/" className="lp-nav-cta">
          今すぐ試す
        </Link>
      </nav>

      <section id="hero" className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-stars" ref={starsRef} />
        <div className="lp-hero-content">
          <span className="lp-tag">Hackathon Project 2026</span>
          <span className="lp-hero-car">🚗</span>
          <h1 className="lp-hero-title">Warikan Drive</h1>
          <p className="lp-hero-sub">
            素早く割り勘、<span>旅終わりのドライバーさんへ。</span>
            <br />
            ETC料金・ガソリン代・運転手傾斜を
            <br />
            その場で計算して即集金。
          </p>
          <div className="lp-hero-btns">
            <Link href="/" className="lp-btn-primary">
              今すぐ試す →
            </Link>
            <a href="#features" className="lp-btn-ghost">
              機能一覧
            </a>
          </div>
          <div className="lp-hero-badges">
            <span className="lp-hero-badge">🛣️ ETC 時間帯割引 自動計算</span>
            <span className="lp-hero-badge">📍 Google Maps 連携</span>
            <span className="lp-hero-badge">🚗 運転手傾斜割り勘</span>
            <span className="lp-hero-badge">💴 PayPay 即時請求</span>
          </div>
        </div>
      </section>

      <section id="problem" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-fade-up">
            <span className="lp-tag">Problem</span>
            <h2 className="lp-section-title">ドライブ後の3つの悩み</h2>
            <p className="lp-section-sub">
              楽しかった旅も、帰り道のお金の計算で気まずくなっていませんか？
            </p>
          </div>
          <div className="lp-problem-grid">
            <div className="lp-problem-card lp-fade-up">
              <div className="lp-problem-icon">😓</div>
              <div className="lp-problem-title">傾斜計算が面倒</div>
              <div className="lp-problem-desc">
                運転手に多く負担してほしいけど、計算が難しくて結局均等割りに。気を使って損してしまう。
              </div>
            </div>
            <div className="lp-problem-card lp-fade-up">
              <div className="lp-problem-icon">🛣️</div>
              <div className="lp-problem-title">ETC料金がわからない</div>
              <div className="lp-problem-desc">
                高速料金はあとで明細を見るまで正確にはわからない。その場でみんなに説明できない。
              </div>
            </div>
            <div className="lp-problem-card lp-fade-up">
              <div className="lp-problem-icon">💸</div>
              <div className="lp-problem-title">集金が遅れる</div>
              <div className="lp-problem-desc">
                「あとで払う」が続いて、結局運転手がずっと立て替えたまま。催促するのも気まずい。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header lp-fade-up">
            <span className="lp-tag">Features</span>
            <h2 className="lp-section-title">Warikan Drive が全部解決</h2>
            <p className="lp-section-sub">
              出発前に全員の負担金額を確定。その場で集金まで完結。
            </p>
          </div>
          <div className="lp-features-grid">
            {[
              {
                num: "01",
                icon: "🗺️",
                title: "経路 × 料金を自動取得",
                desc: "Google Maps Routes APIで複数経路を比較。ETC/現金・時間帯割引（深夜・休日）を出発時刻から自動反映。",
              },
              {
                num: "02",
                icon: "🚗",
                title: "運転手傾斜割り勘",
                desc: "スライダーで運転手の負担係数を設定。ガソリン代 + 高速代 + 追加費用をまとめて公平に計算。",
              },
              {
                num: "03",
                icon: "📅",
                title: "日別 × 複数ルート管理",
                desc: "旅行ごとに日付・ルートを管理。駐車場・レンタカー・カーシェア代も合算。複数日の旅行も対応。",
              },
              {
                num: "04",
                icon: "📱",
                title: "Google Maps ナビ連携",
                desc: "選択したルートをそのままGoogle Mapsで開いてナビ起動。アプリを切り替える手間ゼロ。",
              },
              {
                num: "05",
                icon: "💴",
                title: "PayPay 即時請求",
                desc: "計算結果から即座にPayPay請求リンクを発行。メンバー全員に一斉送信で集金を完結。",
              },
              {
                num: "06",
                icon: "🌙",
                title: "ダーク / ライトモード",
                desc: "夜のドライブでも目に優しいダークモード搭載。スマホ最適化で車内でもサクサク使える。",
              },
            ].map((f) => (
              <div key={f.num} className="lp-feature-card lp-fade-up">
                <div className="lp-feature-num">FEATURE {f.num}</div>
                <div className="lp-feature-icon">{f.icon}</div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-fade-up">
            <span className="lp-tag">How it works</span>
            <h2 className="lp-section-title">使い方は 4 ステップ</h2>
            <p className="lp-section-sub">
              難しい設定は不要。目的地を入れるだけで、あとは全自動。
            </p>
          </div>
          <div className="lp-steps lp-fade-up">
            {[
              { icon: "📍", title: "ルート入力", desc: "出発地・目的地・出発時刻を入力" },
              { icon: "🔍", title: "経路選択", desc: "複数候補から最適なルートを選ぶ" },
              { icon: "⚙️", title: "人数・設定", desc: "人数・燃費・運転手優遇率を設定" },
              { icon: "💰", title: "割り勘 完了", desc: "全員の負担金額が一発で確定" },
            ].map((s) => (
              <div key={s.title} className="lp-step">
                <div className="lp-step-circle">{s.icon}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="lp-result-demo lp-fade-up">
            <div className="lp-result-demo-title">
              計算例：東京駅 → 箱根（4人・ETC・運転手優遇70%）
            </div>
            <div className="lp-result-demo-route">🗺 東京駅 → 箱根 · 95.2 km</div>
            <div className="lp-result-stats">
              <div className="lp-result-stat">
                <div className="lp-result-stat-label">総コスト</div>
                <div className="lp-result-stat-val lp-accent">¥5,840</div>
              </div>
              <div className="lp-sep" />
              <div className="lp-result-stat">
                <div className="lp-result-stat-label">🚗 運転手</div>
                <div className="lp-result-stat-val lp-green">¥1,120</div>
              </div>
              <div className="lp-sep" />
              <div className="lp-result-stat">
                <div className="lp-result-stat-label">🧑 同乗者 × 3</div>
                <div className="lp-result-stat-val">¥1,573</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="stack" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header lp-fade-up">
            <span className="lp-tag">Tech Stack</span>
            <h2 className="lp-section-title">技術スタック</h2>
            <p className="lp-section-sub">モダンな技術で、完全無料でデプロイ。</p>
          </div>
          <div className="lp-stack-grid lp-fade-up">
            {[
              { layer: "Frontend", tech: "Next.js 14 + TypeScript", badge: "Vercel 無料" },
              { layer: "Styling", tech: "Tailwind CSS + shadcn/ui" },
              { layer: "Backend", tech: "FastAPI (Python 3.11)", badge: "Vercel 無料" },
              { layer: "Database", tech: "PostgreSQL (Supabase)", badge: "無料" },
              { layer: "外部 API", tech: "Google Maps Routes API" },
              { layer: "決済", tech: "PayPay API" },
              { layer: "環境管理", tech: "Docker / docker-compose" },
              { layer: "CI / CD", tech: "GitHub Actions" },
            ].map((r) => (
              <div key={r.layer} className="lp-stack-row">
                <div className="lp-stack-layer">{r.layer}</div>
                <div className="lp-stack-tech">{r.tech}</div>
                {r.badge && (
                  <span className="lp-stack-badge">{r.badge}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="lp-cta">
        <div className="lp-cta-bg" />
        <div className="lp-cta-content lp-fade-up">
          <span className="lp-cta-car">🚗</span>
          <h2 className="lp-cta-title">Warikan Drive</h2>
          <p className="lp-cta-sub">素早く割り勘、旅終わりのドライバーさんへ。</p>
          <div className="lp-cta-pills">
            <span className="lp-cta-pill">🛣️ ETC 時間帯割引 自動計算</span>
            <span className="lp-cta-pill">🚗 運転手傾斜割り勘</span>
            <span className="lp-cta-pill">📍 Google Maps 連携</span>
            <span className="lp-cta-pill">💴 PayPay 即時請求</span>
          </div>
          <Link href="/" className="lp-btn-primary lp-btn-cta">
            今すぐ試す →
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-logo">🚗 Warikan Drive</div>
        <div className="lp-footer-sub">Built with ❤️ for Hackathon 2026</div>
      </footer>
    </div>
  );
}
