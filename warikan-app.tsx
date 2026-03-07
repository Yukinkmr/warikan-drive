import { useState, createContext, useContext } from "react";

// ── Theme ─────────────────────────────────────────────────────────
const DARK = {
  bg:"#0f1117", surface:"#1a1d27", card:"#21253a", border:"#2e3350",
  accent:"#4f7dff", accentDim:"#1e2d5e", green:"#10b981", greenDim:"#0d2e23",
  red:"#ef4444", text:"#e8eaf6", muted:"#7b82a8", label:"#a0a8cc",
  inputBg:"#1a1d27", headerBg:"linear-gradient(135deg,#0d1535 0%,#1a1d27 100%)",
  statBg:"#1a1d27",
};
const LIGHT = {
  bg:"#f1f5f9", surface:"#ffffff", card:"#ffffff", border:"#e2e8f0",
  accent:"#3b6fff", accentDim:"#dbeafe", green:"#059669", greenDim:"#d1fae5",
  red:"#dc2626", text:"#0f172a", muted:"#64748b", label:"#475569",
  inputBg:"#f8fafc", headerBg:"linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)",
  statBg:"#f8fafc",
};

const ThemeCtx = createContext({ C: DARK, dark: true, toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);

// ── Mock API ──────────────────────────────────────────────────────
const MOCK_SEGMENTS = {
  "筑波大学_東京駅":  [{ id:"s1", summary:"常磐自動車道経由", distance_km:68.4, duration_min:65, toll_etc_yen:1200, toll_cash_yen:1440 }, { id:"s2", summary:"国道6号経由", distance_km:64.1, duration_min:110, toll_etc_yen:0, toll_cash_yen:0 }],
  "東京駅_箱根":      [{ id:"s3", summary:"東名高速経由", distance_km:95.2, duration_min:78, toll_etc_yen:1850, toll_cash_yen:2200 }, { id:"s4", summary:"国道1号経由", distance_km:89.4, duration_min:135, toll_etc_yen:0, toll_cash_yen:0 }],
  "東京駅_成田空港":  [{ id:"s5", summary:"東関東自動車道経由", distance_km:72.3, duration_min:60, toll_etc_yen:1320, toll_cash_yen:1560 }],
};
async function apiSearchRoute(origin, dest) {
  await new Promise(r => setTimeout(r, 800));
  const key = `${origin}_${dest}`;
  return MOCK_SEGMENTS[key] ?? [{ id:`s${Date.now()}`, summary:"一般道経由", distance_km:55.0, duration_min:90, toll_etc_yen:900, toll_cash_yen:1100 }];
}

// ── Helpers ───────────────────────────────────────────────────────
let uid = 1;
const genId = () => `id_${uid++}`;
const newRoute = () => ({ id:genId(), origin:"", destination:"", departureTime:"09:00", segments:[], selectedSegId:null, fetched:false, loading:false });
const newDay   = (date) => ({ id:genId(), date, routes:[newRoute()] });
const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

function calcSplit(allRoutes, selIds, extraCosts, { fuelEff, gasPrice, people, driverWeight, payment }) {
  let dist=0, toll=0;
  allRoutes.filter(r => selIds.includes(r.id) && r.selectedSegId).forEach(r => {
    const seg = r.segments.find(s => s.id === r.selectedSegId);
    if (!seg) return;
    dist += seg.distance_km;
    toll += payment==="ETC" ? seg.toll_etc_yen : seg.toll_cash_yen;
  });
  const fuel  = Math.round((dist / fuelEff) * gasPrice);
  const extra = extraCosts.reduce((s,c) => s + c.amount, 0);
  const total = toll + fuel + extra;
  const W     = driverWeight + (people-1);
  return { dist, toll, fuel, extra, total, driverYen: Math.round(total*driverWeight/W), passengerYen: Math.round(total/W) };
}

// ── Atoms ─────────────────────────────────────────────────────────
const glow = "0 0 0 1px #4f7dff55, 0 4px 24px #4f7dff22";

function Pill({ active, onClick, children }) {
  const { C } = useTheme();
  return <button onClick={onClick} style={{ padding:"6px 16px", borderRadius:99, border:`1px solid ${active?C.accent:C.border}`, background:active?C.accentDim:"transparent", color:active?C.accent:C.muted, fontWeight:600, fontSize:13, cursor:"pointer", transition:"all .15s" }}>{children}</button>;
}
function Label({ children }) {
  const { C } = useTheme();
  return <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:C.muted, marginBottom:5, textTransform:"uppercase" }}>{children}</div>;
}
function TInput({ placeholder, value, onChange, type="text", style={} }) {
  const { C } = useTheme();
  return <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:14, outline:"none", ...style }}
    onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />;
}
function Btn({ onClick, children, disabled, variant="primary", style={} }) {
  const { C } = useTheme();
  const bg = disabled ? C.surface : variant==="primary" ? `linear-gradient(135deg,${C.accent},#7b5dff)` : variant==="green" ? C.green : variant==="danger" ? (C === LIGHT ? "#fee2e2" : "#2d1010") : C.surface;
  const color = disabled ? C.muted : variant==="danger" ? C.red : variant==="primary"||variant==="green" ? "#fff" : C.label;
  return <button onClick={onClick} disabled={disabled} style={{ padding:"10px 16px", borderRadius:10, border:`1px solid ${disabled?C.border:variant==="danger"?C.red:variant==="ghost"?C.border:"transparent"}`, background:bg, color, fontWeight:700, fontSize:13, cursor:disabled?"default":"pointer", boxShadow:(!disabled&&variant==="primary")?glow:"none", transition:"all .15s", ...style }}>{children}</button>;
}
function Slider({ min, max, step, value, onChange }) {
  const { C } = useTheme();
  return <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} style={{ width:"100%", accentColor:C.accent }} />;
}
function Card({ children, style={} }) {
  const { C } = useTheme();
  return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14, boxShadow: C===LIGHT?"0 1px 4px rgba(0,0,0,0.07)":"none", ...style }}>{children}</div>;
}
function Stat({ label, value, accent }) {
  const { C } = useTheme();
  return <div style={{ flex:1, background:C.statBg, borderRadius:12, padding:"12px 8px", textAlign:"center", border:`1px solid ${accent?C.accent:C.border}`, boxShadow:accent?glow:"none" }}>
    <div style={{ fontSize:11, color:C.muted, marginBottom:3 }}>{label}</div>
    <div style={{ fontWeight:700, fontSize:18, color:accent?C.accent:C.text }}>¥{value.toLocaleString()}</div>
  </div>;
}

// ── Theme Toggle Button ───────────────────────────────────────────
function ThemeToggle() {
  const { dark, toggle, C } = useTheme();
  return (
    <button onClick={toggle} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:99, padding:"5px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all .2s" }}>
      <span style={{ fontSize:14 }}>{dark ? "☀️" : "🌙"}</span>
      <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{dark ? "ライト" : "ダーク"}</span>
    </button>
  );
}

// ── SegmentSelector ───────────────────────────────────────────────
function SegmentSelector({ segments, selectedId, payment, onSelect }) {
  const { C } = useTheme();
  return (
    <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
      {segments.map(s => {
        const sel = s.id===selectedId;
        const toll = payment==="ETC" ? s.toll_etc_yen : s.toll_cash_yen;
        return (
          <div key={s.id} onClick={()=>onSelect(s.id)} style={{ background:sel?C.accentDim:C.surface, border:`1px solid ${sel?C.accent:C.border}`, borderRadius:10, padding:"10px 12px", cursor:"pointer", boxShadow:sel?glow:"none", transition:"all .15s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700, fontSize:13, color:sel?C.accent:C.text }}>{s.summary}</span>
              {sel && <span style={{ fontSize:11, color:C.accent }}>✓ 選択中</span>}
            </div>
            <div style={{ display:"flex", gap:12, marginTop:4, fontSize:12, color:C.label }}>
              <span>📍 {s.distance_km} km</span>
              <span>⏱ {s.duration_min}分</span>
              <span>🛣 {toll===0?"無料":`¥${toll.toLocaleString()}`} ({payment})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── RouteCard ─────────────────────────────────────────────────────
function RouteCard({ route, idx, payment, onUpdate, onRemove, onSearch, onSelectSeg, selected, onToggle }) {
  const { C } = useTheme();
  const [open, setOpen] = useState(false);
  const selSeg = route.segments.find(s=>s.id===route.selectedSegId);
  return (
    <div style={{ background:C.card, borderRadius:14, border:`1px solid ${selected?C.accent:C.border}`, boxShadow:selected?glow:"none", padding:14, marginBottom:10, transition:"all .2s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ background:C.accentDim, color:C.accent, borderRadius:8, padding:"2px 10px", fontWeight:700, fontSize:12 }}>ルート {idx+1}</span>
          {selSeg && <span style={{ fontSize:11, color:C.green, background:C.greenDim, borderRadius:99, padding:"2px 8px" }}>✓ {selSeg.distance_km}km · ¥{(payment==="ETC"?selSeg.toll_etc_yen:selSeg.toll_cash_yen).toLocaleString()}</span>}
        </div>
        {onRemove && <button onClick={onRemove} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:16 }}>✕</button>}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:8 }}>
        <TInput placeholder="出発地（例：筑波大学）" value={route.origin} onChange={e=>onUpdate(route.id,"origin",e.target.value)} />
        <TInput placeholder="目的地（例：東京駅）" value={route.destination} onChange={e=>onUpdate(route.id,"destination",e.target.value)} />
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:12, color:C.label, whiteSpace:"nowrap" }}>⏰ 出発時刻</span>
          <TInput type="time" value={route.departureTime} onChange={e=>onUpdate(route.id,"departureTime",e.target.value)} style={{ width:120 }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        <Btn onClick={()=>onSearch(route.id)} disabled={!route.origin||!route.destination||route.loading} variant="ghost" style={{ flex:1, fontSize:12 }}>
          {route.loading?"検索中…":route.fetched?"🔄 再検索":"🔍 経路を検索"}
        </Btn>
        {route.fetched && <Btn onClick={()=>setOpen(o=>!o)} variant="ghost" style={{ flex:1, fontSize:12 }}>{open?"▲ 閉じる":"▼ 経路を選ぶ"}</Btn>}
        {selSeg && <Btn onClick={onToggle} variant="ghost" style={{ flex:1, fontSize:12, borderColor:selected?C.accent:C.border, color:selected?C.accent:C.muted }}>{selected?"✓ 含む":"割り勘に含む"}</Btn>}
      </div>
      {open && route.fetched && <SegmentSelector segments={route.segments} selectedId={route.selectedSegId} payment={payment} onSelect={id=>{ onSelectSeg(route.id,id); setOpen(false); }} />}
      {selSeg && (
        <a href={`https://www.google.com/maps/dir/${encodeURIComponent(route.origin)}/${encodeURIComponent(route.destination)}`} target="_blank" rel="noopener noreferrer"
          style={{ display:"block", marginTop:8, textAlign:"center", fontSize:12, color:C.accent, textDecoration:"none" }}>
          🗺 Google Maps でナビ →
        </a>
      )}
    </div>
  );
}

// ── DayBlock ──────────────────────────────────────────────────────
function DayBlock({ day, payment, onUpdateRoute, onAddRoute, onRemoveRoute, onSearchRoute, onSelectSeg, selIds, onToggle, onRemoveDay }) {
  const { C } = useTheme();
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>📅</span>
          <span style={{ fontWeight:700, fontSize:15, color:C.text }}>{day.date}</span>
          <span style={{ fontSize:12, color:C.muted }}>{day.routes.length}ルート</span>
        </div>
        <button onClick={onRemoveDay} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:16 }}>🗑</button>
      </div>
      {day.routes.map((r,i)=>(
        <RouteCard key={r.id} route={r} idx={i} payment={payment}
          onUpdate={onUpdateRoute}
          onRemove={day.routes.length>1?()=>onRemoveRoute(day.id,r.id):null}
          onSearch={()=>onSearchRoute(day.id,r.id)}
          onSelectSeg={onSelectSeg} selected={selIds.includes(r.id)} onToggle={()=>onToggle(r.id)} />
      ))}
      <button onClick={()=>onAddRoute(day.id)}
        style={{ width:"100%", padding:"10px", borderRadius:10, border:`1.5px dashed ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontWeight:600, fontSize:13, transition:"all .15s" }}
        onMouseEnter={e=>{e.target.style.borderColor=C.accent;e.target.style.color=C.accent;}}
        onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color=C.muted;}}>
        ＋ ルートを追加
      </button>
    </div>
  );
}

// ── Route Tab ─────────────────────────────────────────────────────
function RouteTab({ days, setDays, payment, setPayment, selIds, setSelIds, onGoSplit }) {
  const { C } = useTheme();
  const [dateInput, setDateInput] = useState(todayStr());
  const allRoutes = days.flatMap(d=>d.routes);

  const updateRoute = (rid,k,v) => setDays(ds=>ds.map(d=>({...d,routes:d.routes.map(r=>r.id===rid?{...r,[k]:v,fetched:k==="origin"||k==="destination"?false:r.fetched}:r)})));
  const addRoute    = (did) => setDays(ds=>ds.map(d=>d.id===did?{...d,routes:[...d.routes,newRoute()]}:d));
  const removeRoute = (did,rid) => { setDays(ds=>ds.map(d=>d.id===did?{...d,routes:d.routes.filter(r=>r.id!==rid)}:d)); setSelIds(ids=>ids.filter(i=>i!==rid)); };
  const removeDay   = (did) => { const day=days.find(d=>d.id===did); if(day) setSelIds(ids=>ids.filter(i=>!day.routes.map(r=>r.id).includes(i))); setDays(ds=>ds.filter(d=>d.id!==did)); };
  const searchRoute = async (did,rid) => {
    const route = days.find(d=>d.id===did)?.routes.find(r=>r.id===rid);
    if(!route) return;
    setDays(ds=>ds.map(d=>d.id===did?{...d,routes:d.routes.map(r=>r.id===rid?{...r,loading:true}:r)}:d));
    const segs = await apiSearchRoute(route.origin, route.destination);
    setDays(ds=>ds.map(d=>d.id===did?{...d,routes:d.routes.map(r=>r.id===rid?{...r,segments:segs,selectedSegId:segs[0]?.id??null,loading:false,fetched:true}:r)}:d));
  };
  const selectSeg = (rid,sid) => setDays(ds=>ds.map(d=>({...d,routes:d.routes.map(r=>r.id===rid?{...r,selectedSegId:sid}:r)})));
  const toggleSel = (rid) => setSelIds(ids=>ids.includes(rid)?ids.filter(i=>i!==rid):[...ids,rid]);
  const selCount  = selIds.filter(id=>allRoutes.find(r=>r.id===id)?.selectedSegId).length;

  return (
    <>
      <Card style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <span style={{ fontSize:13, color:C.label, fontWeight:600 }}>高速料金</span>
        <Pill active={payment==="ETC"}  onClick={()=>setPayment("ETC")}>ETC</Pill>
        <Pill active={payment==="現金"} onClick={()=>setPayment("現金")}>現金</Pill>
      </Card>
      {days.length===0 && <div style={{ textAlign:"center", color:C.muted, padding:"40px 0" }}>下から日付を追加してください</div>}
      {days.map(d=>(
        <DayBlock key={d.id} day={d} payment={payment}
          onUpdateRoute={updateRoute} onAddRoute={addRoute} onRemoveRoute={removeRoute}
          onSearchRoute={searchRoute} onSelectSeg={selectSeg}
          selIds={selIds} onToggle={toggleSel} onRemoveDay={()=>removeDay(d.id)} />
      ))}
      <Card style={{ marginBottom:14 }}>
        <Label>日付を追加</Label>
        <div style={{ display:"flex", gap:8 }}>
          <input type="date" value={dateInput} onChange={e=>setDateInput(e.target.value)} style={{ flex:1, padding:"9px 12px", background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:14, outline:"none" }} />
          <Btn onClick={()=>setDays(ds=>[...ds,newDay(dateInput)])} variant="primary" style={{ padding:"9px 16px" }}>追加</Btn>
        </div>
      </Card>
      <Btn onClick={onGoSplit} disabled={selCount===0} variant="primary" style={{ width:"100%", padding:14, fontSize:15 }}>
        {selCount>0?`${selCount}ルートで割り勘計算 →`:"経路を選択・「割り勘に含む」を設定してください"}
      </Btn>
    </>
  );
}

// ── Split Tab ─────────────────────────────────────────────────────
function SplitTab({ days, selIds, payment, onSave }) {
  const { C } = useTheme();
  const allRoutes = days.flatMap(d=>d.routes);
  const [settings, setSettings] = useState({ fuelEff:15, gasPrice:170, people:4, driverWeight:0.7 });
  const [extraCosts, setExtraCosts] = useState([]);
  const [newCost, setNewCost] = useState({ label:"", amount:"", type:"parking" });
  const [result, setResult] = useState(null);
  const pct = Math.round(settings.driverWeight*100);
  const addCost = () => { if(!newCost.label||!newCost.amount) return; setExtraCosts(cs=>[...cs,{ id:genId(),...newCost,amount:parseInt(newCost.amount) }]); setNewCost({ label:"", amount:"", type:"parking" }); };

  return (
    <>
      <Card style={{ marginBottom:12 }}>
        <Label>計算対象ルート</Label>
        {selIds.length===0
          ? <div style={{ color:C.muted, fontSize:13 }}>ルート管理タブで選択してください</div>
          : allRoutes.filter(r=>selIds.includes(r.id)&&r.selectedSegId).map((r,i)=>{
              const seg=r.segments.find(s=>s.id===r.selectedSegId);
              return <div key={r.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                <span style={{ color:C.label }}>{i+1}. {r.origin} → {r.destination}</span>
                <span style={{ color:C.accent }}>{seg?.distance_km} km</span>
              </div>;
            })}
      </Card>
      <Card style={{ marginBottom:12 }}>
        <Label>車・燃料設定</Label>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:13, color:C.label }}>燃費</span><span style={{ fontSize:13, fontWeight:600, color:C.text }}>{settings.fuelEff} km/L</span></div>
            <Slider min={5} max={30} step={0.5} value={settings.fuelEff} onChange={e=>setSettings(s=>({...s,fuelEff:parseFloat(e.target.value)}))} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, color:C.label, whiteSpace:"nowrap" }}>ガソリン単価</span>
            <input type="number" value={settings.gasPrice} onChange={e=>setSettings(s=>({...s,gasPrice:parseInt(e.target.value)||0}))} style={{ width:80, padding:"7px 10px", background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, outline:"none" }} />
            <span style={{ fontSize:13, color:C.muted }}>円/L</span>
          </div>
          <div>
            <Label>人数（運転手含む）</Label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[2,3,4,5,6].map(n=><Pill key={n} active={settings.people===n} onClick={()=>setSettings(s=>({...s,people:n}))}>{n}人</Pill>)}
            </div>
          </div>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:13, color:C.label }}>運転手優遇</span><span style={{ fontSize:13, fontWeight:600, color:C.text }}>{pct}%</span></div>
            <Slider min={50} max={100} step={5} value={pct} onChange={e=>setSettings(s=>({...s,driverWeight:parseInt(e.target.value)/100}))} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.muted, marginTop:2 }}><span>優遇大</span><span>優遇なし</span></div>
          </div>
        </div>
      </Card>
      <Card style={{ marginBottom:12 }}>
        <Label>追加費用（レンタカー・駐車場）</Label>
        {extraCosts.map(c=>(
          <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
            <span style={{ color:C.label }}>{c.label}</span>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ color:C.text }}>¥{c.amount.toLocaleString()}</span>
              <button onClick={()=>setExtraCosts(cs=>cs.filter(x=>x.id!==c.id))} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:14 }}>✕</button>
            </div>
          </div>
        ))}
        <div style={{ display:"flex", gap:6, marginTop:10 }}>
          <TInput placeholder="名前（例：駐車場代）" value={newCost.label} onChange={e=>setNewCost(n=>({...n,label:e.target.value}))} style={{ flex:2 }} />
          <TInput placeholder="金額" value={newCost.amount} onChange={e=>setNewCost(n=>({...n,amount:e.target.value}))} style={{ flex:1 }} />
          <Btn onClick={addCost} variant="ghost" style={{ whiteSpace:"nowrap" }}>追加</Btn>
        </div>
      </Card>
      <Btn onClick={()=>setResult(calcSplit(allRoutes,selIds,extraCosts,{...settings,payment}))} disabled={selIds.length===0} variant="primary" style={{ width:"100%", padding:13, fontSize:15, marginBottom:14 }}>
        割り勘を計算する →
      </Btn>
      {result && (
        <Card style={{ border:`1px solid ${C.accent}`, boxShadow:glow }}>
          <div style={{ textAlign:"center", marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>合計コスト</div>
            <div style={{ fontSize:40, fontWeight:800, color:C.accent, letterSpacing:"-0.03em" }}>¥{result.total.toLocaleString()}</div>
            <div style={{ fontSize:12, color:C.muted }}>{result.dist.toFixed(1)} km 走行</div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginBottom:12 }}>
            {[["🛣 高速料金",result.toll,`(${payment})`],["⛽ ガソリン代",result.fuel,""],["🏨 追加費用",result.extra,""]].map(([l,v,n])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:13 }}>
                <span style={{ color:C.label }}>{l} <span style={{ fontSize:11, color:C.muted }}>{n}</span></span>
                <span style={{ color:C.text }}>¥{v.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <Stat label="🚗 運転手" value={result.driverYen} accent />
            <Stat label="🧑‍🤝‍🧑 同乗者×1" value={result.passengerYen} />
          </div>
          <Btn onClick={()=>onSave(result,extraCosts,settings,payment)} variant="green" style={{ width:"100%" }}>📋 履歴に保存</Btn>
        </Card>
      )}
    </>
  );
}

// ── History Tab ───────────────────────────────────────────────────
function HistoryTab({ history }) {
  const { C } = useTheme();
  if(history.length===0) return <div style={{ textAlign:"center", color:C.muted, marginTop:60, fontSize:14 }}>履歴はまだありません</div>;
  return history.map((h,i)=>(
    <Card key={i} style={{ marginBottom:10 }}>
      <div style={{ fontWeight:700, fontSize:13, marginBottom:2, color:C.text }}>{h.label}</div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>{h.date} · {h.settings.people}人 · {h.payment}</div>
      <div style={{ display:"flex", gap:8 }}>
        <Stat label="合計" value={h.result.total} accent />
        <Stat label="🚗 運転手" value={h.result.driverYen} />
        <Stat label="同乗者" value={h.result.passengerYen} />
      </div>
    </Card>
  ));
}

// ── App ───────────────────────────────────────────────────────────
const TABS = [{ label:"ルート管理", icon:"🗺" }, { label:"割り勘計算", icon:"💰" }, { label:"履歴", icon:"📋" }];

export default function App() {
  const [dark, setDark]     = useState(true);
  const C = dark ? DARK : LIGHT;
  const [tab, setTab]       = useState(0);
  const [days, setDays]     = useState([newDay("2026-03-04")]);
  const [payment, setPayment] = useState("ETC");
  const [selIds, setSelIds] = useState([]);
  const [history, setHistory] = useState([]);

  const allRoutes = days.flatMap(d=>d.routes);
  const saveHistory = (result, extraCosts, settings, payment) => {
    const label = allRoutes.filter(r=>selIds.includes(r.id)).map(r=>`${r.origin}→${r.destination}`).join("、");
    setHistory(h=>[{ label, result, extraCosts, settings, payment, date:new Date().toLocaleString("ja-JP") }, ...h]);
  };

  return (
    <ThemeCtx.Provider value={{ C, dark, toggle:()=>setDark(d=>!d) }}>
      <div style={{ maxWidth:440, margin:"0 auto", fontFamily:"'Inter','Helvetica Neue',sans-serif", background:C.bg, minHeight:"100vh", color:C.text, transition:"background .2s, color .2s" }}>
        {/* Header */}
        <div style={{ background:C.headerBg, padding:"18px 16px 0", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:26 }}>🚗</div>
              <div>
                <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.02em", color:"#fff" }}>割り勘ドライブ</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>経路検索 ＋ ETC対応 ＋ 傾斜計算</div>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <div style={{ display:"flex", marginTop:14 }}>
            {TABS.map((t,i)=>(
              <button key={i} onClick={()=>setTab(i)} style={{ flex:1, padding:"10px 0", border:"none", background:"transparent", color:tab===i?"#fff":"rgba(255,255,255,0.55)", fontWeight:tab===i?700:400, borderBottom:`2px solid ${tab===i?"#fff":"transparent"}`, cursor:"pointer", fontSize:13, transition:"all .15s" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:14 }}>
          {tab===0 && <RouteTab days={days} setDays={setDays} payment={payment} setPayment={setPayment} selIds={selIds} setSelIds={setSelIds} onGoSplit={()=>setTab(1)} />}
          {tab===1 && <SplitTab days={days} selIds={selIds} payment={payment} onSave={saveHistory} />}
          {tab===2 && <HistoryTab history={history} />}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
