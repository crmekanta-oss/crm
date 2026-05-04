import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { crmService } from "./services/crmService";
import { supabase } from "./lib/supabase";

/*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EKANTA CRM — v8  (Ekanta Portal Theme)
  Reskinned to match the Ekanta Operations Portal:
  · Cream / warm-ivory backgrounds
  · Cormorant Garamond for display headings
  · DM Sans for UI body text
  · DM Mono for labels, timestamps, monospace
  · Gold (#9a7a45) as the single brand accent
  · Ink (#1a1814) near-black for text
  · Warm border (#c8c2b4)
  · Status colours kept but softened to warm palette
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

// ─── DARK MODE CONTEXT ────────────────────────────────────────────────────────
const useDark = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("ek-dark") === "1"; } catch { return false; }
  });
  const toggle = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem("ek-dark", next ? "1" : "0"); } catch {}
    return next;
  });
  return { dark, toggle };
};

// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
const makeT = (dark) => ({
  // ── Surfaces ──
  bg:           dark ? "#141210" : "#f5f1eb",        // page bg
  surface:      dark ? "#1c1a17" : "#f5f1eb",        // card / panel bg
  surfaceHover: dark ? "#242018" : "#ece7de",        // hover state
  surfaceEl:    dark ? "#222018" : "#ede9e1",        // inner element bg
  sidebar:      dark ? "#161410" : "#f0ece4",        // sidebar bg

  // ── Brand (gold) ──
  brand:        "#9a7a45",
  brandHover:   "#7d6235",
  brandSubtle:  dark ? "rgba(154,122,69,0.15)" : "#f2e8d5",

  // ── Text ──
  ink:          dark ? "#f0ece5" : "#1a1814",
  inkSub:       dark ? "#a09880" : "#3d3830",
  inkMuted:     dark ? "#6a6455" : "#7a7468",
  inkInvert:    dark ? "#1a1814" : "#f5f1eb",

  // ── Borders ──
  line:         dark ? "rgba(255,255,255,0.07)" : "#e0d9ce",
  lineMid:      dark ? "rgba(255,255,255,0.11)" : "#c8c2b4",
  lineStrong:   dark ? "rgba(255,255,255,0.18)" : "#b0a898",

  // ── Shadows ──
  shadowSm:     dark ? "0 1px 2px rgba(0,0,0,0.4)"  : "0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:     dark ? "0 1px 3px rgba(0,0,0,0.5)"  : "0 1px 3px rgba(0,0,0,0.06)",
  shadowLg:     dark ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.06)",
  shadowXl:     dark ? "0 16px 48px rgba(0,0,0,0.7)": "0 16px 48px rgba(0,0,0,0.10)",

  // ── Status colours (warm-shifted) ──
  won:     { dot:"#2d6a4f", bg: dark?"rgba(45,106,79,0.15)":"#eaf4ee",  text: dark?"#6fcf97":"#1a4d38" },
  pending: { dot:"#9a7a45", bg: dark?"rgba(154,122,69,0.15)":"#f2e8d5", text: dark?"#e8c97a":"#6b5020" },
  lost:    { dot:"#8b2e2e", bg: dark?"rgba(139,46,46,0.15)":"#f5e8e8",  text: dark?"#e07878":"#6b1e1e" },
  drop:    { dot:"#7a7468", bg: dark?"rgba(122,116,104,0.1)":"#edeae5",  text: dark?"#a09880":"#5a5650" },
  new:     { dot:"#2d4d72", bg: dark?"rgba(45,77,114,0.15)":"#e8eef5",  text: dark?"#7ab0e0":"#1a2e4a" },
  high:    { dot:"#9a7a45", bg: dark?"rgba(154,122,69,0.15)":"#f2e8d5", text: dark?"#e8c97a":"#6b5020" },
  premium: { dot:"#7a3050", bg: dark?"rgba(122,48,80,0.15)":"#f5e8ef",  text: dark?"#e07aaa":"#5a1e38" },
  bulk:    { dot:"#2d6a4f", bg: dark?"rgba(45,106,79,0.15)":"#eaf4ee",  text: dark?"#6fcf97":"#1a4d38" },

  // ── Border radius ──
  r: { sm:"4px", md:"6px", lg:"8px", xl:"10px", "2xl":"12px" },
});

// ─── FONT FAMILIES ────────────────────────────────────────────────────────────
const F_BODY  = "'DM Sans', system-ui, sans-serif";
const F_MONO  = "'DM Mono', monospace";
const F_SERIF = "'Cormorant Garamond', Georgia, serif";
const F       = F_BODY; // default used throughout

// ─── FONT LOADER ──────────────────────────────────────────────────────────────
function FontLoader({ dark }) {
  useEffect(() => {
    if (!document.getElementById("ek-font")) {
      const l = document.createElement("link");
      l.id = "ek-font"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap";
      document.head.appendChild(l);
    }
    let g = document.getElementById("ek-global-style");
    if (!g) { g = document.createElement("style"); g.id = "ek-global-style"; document.head.appendChild(g); }
    g.textContent = `
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{font-size:14px}
      body{
        background:${dark ? "#141210" : "#f5f1eb"};
        color:${dark ? "#f0ece5" : "#1a1814"};
        font-family:'DM Sans',system-ui,sans-serif;
        -webkit-font-smoothing:antialiased;
        transition:background .2s,color .2s
      }
      input,select,textarea,button{font-family:'DM Sans',system-ui,sans-serif}

      /* ── Animations ── */
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}

      /* ── Scrollbar ── */
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:rgba(154,122,69,.2);border-radius:4px}

      /* ── Responsive ── */
      .ek-hide-mobile{display:inline-flex}
      .ek-show-mobile{display:none}
      .ek-shell{height:100vh;overflow:hidden}
      .ek-main-col{height:100vh;overflow:hidden}
      .ek-table-scroll{overflow-y:auto}

      @media(max-width:1100px){
        .ek-topbar-date span{display:none}
        .ek-stats-grid{grid-template-columns:repeat(4,1fr)!important}
      }
      @media(max-width:767px){
        .ek-shell{height:auto!important;overflow:visible!important}
        .ek-main-col{height:auto!important;overflow:visible!important;padding-bottom:64px!important}
        .ek-table-scroll{overflow-y:visible!important}
        .ek-sidebar{display:none!important}
        .ek-sidebar.open{display:flex!important;position:fixed!important;inset:0!important;width:240px!important;z-index:300!important}
        .ek-topbar-search{display:none!important}
        .ek-topbar-date{display:none!important}
        .ek-mobile-menu{display:flex!important}
        .ek-hide-mobile{display:none!important}
        .ek-show-mobile{display:flex!important}
        .ek-stats-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
        .ek-form-3col{grid-template-columns:1fr!important}
        .ek-form-2col{grid-template-columns:1fr!important}
        .ek-analytics-3col{grid-template-columns:1fr!important}
        .ek-analytics-2col{grid-template-columns:1fr!important}
        .ek-team-grid{grid-template-columns:1fr!important}
        .ek-analytics-pipeline{grid-template-columns:1fr!important}
        .ek-analytics-followup{grid-template-columns:1fr!important}
        .ek-login-left{display:none!important}
        .ek-filter-scroll{overflow-x:auto;flex-wrap:nowrap!important;padding-bottom:4px}
        .ek-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
        .ek-bottom-nav{display:flex!important}
        .ek-page-content{animation:fadeUp .25s ease both}
      }

      /* ── Transitions ── */
      .ek-stat-card{transition:transform .18s ease,box-shadow .18s ease}
      .ek-stat-card:hover{transform:translateY(-2px)}
      .ek-table-row{transition:background .1s ease}
      .ek-nav-btn{transition:all .15s ease}
      .ek-page-content{animation:fadeUp .2s ease both}

      /* ── Bottom nav ── */
      .ek-bottom-nav{
        display:none;position:fixed;bottom:0;left:0;right:0;
        background:${dark ? "#1c1a17" : "#f5f1eb"};
        border-top:1px solid ${dark ? "rgba(255,255,255,0.07)" : "#c8c2b4"};
        z-index:150;height:60px;align-items:center;justify-content:space-around;
        padding:0 8px;box-shadow:0 -2px 12px rgba(0,0,0,0.06)
      }
      .ek-bottom-nav-item{
        display:flex;flex-direction:column;align-items:center;gap:3px;
        padding:6px 12px;border-radius:8px;border:none;background:none;
        cursor:pointer;transition:all .15s ease;min-width:56px
      }
      .ek-bottom-nav-item.active{background:rgba(154,122,69,0.1)}
      .ek-bottom-nav-item svg{transition:transform .15s ease}
      .ek-bottom-nav-item.active svg{transform:scale(1.1)}
    `;
  }, [dark]);
  return null;
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────
const FULL   = ["CEO", "Manager"];
const VIEWER = ["Viewer"];
const can    = (u, a) => {
  if (VIEWER.includes(u?.role)) return false;
  return FULL.includes(u?.role) || a === "create" || a === "export";
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATS         = ["Dresses","Sarees","Half Sarees","Kurtis","Lehengas","Mom & Me","999 Deals","kids","Padava Sattai","Mens","Blouses","Others"];
const ENQS         = ["New Customer","Repeat Customer","Bulk Order","Custom Design","Wholesale","Others"];
const FTYPES       = ["Normal","High Value","Bulk","priority","Others"];
const ROLES        = ["CEO","Manager","CRE","Viewer"];
const STATUS       = ["Pending","Won","Lost","Drop"];
const LEAD_SOURCES = ["WhatsApp","Email","Website","Call","Abandoned Cart","Social media","Other","Owner"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const stamp = () => {
  const n = new Date();
  return n.toLocaleDateString("en-IN",{month:"short",day:"numeric",year:"numeric"})
    +" "+n.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
};
const inr  = n => n ? "₹"+Number(n).toLocaleString("en-IN") : null;
const big  = n => {
  if (!n) return "₹0";
  if (n>=1e7) return `₹${(n/1e7).toFixed(2)}Cr`;
  if (n>=1e5) return `₹${(n/1e5).toFixed(1)}L`;
  return "₹"+Number(n).toLocaleString("en-IN");
};
const greeting = (name) => {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${g}, ${name}`;
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_USERS = [
  {id:1,name:"Admin",      role:"CEO",     username:"admin",     password:"admin123"},
  {id:2,name:"Vinodhini",  role:"CRE",     username:"vinodhini", password:"pass123" },
  {id:3,name:"Arjun Kumar",role:"Manager", username:"arjun",     password:"pass123" },
];

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
function xls(data, name) {
  const e = v => String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const H = ["#","Name","Lead Source","Phone","Email","Enquiry","Type","Follow-up","Status","City/Region","Delivery Details","Payment Terms","Products","Order Number","Qty","Quote Amt","Remarks","Created","By","Assigned To"];
  const hRow = `<Row ss:StyleID="h">${H.map(h=>`<Cell><Data ss:Type="String">${e(h)}</Data></Cell>`).join("")}</Row>`;
  const rows = data.map((f,i)=>{
    const prod=(f.products||[]).map(p=>`${p.desc}(${p.category},×${p.qty},₹${p.price})`).join("|");
    return `<Row>${[[i+1,"Number"],[f.name||""],[f.leadSource||""],[f.phone||""],[f.email||""],[f.enquiryType||""],[f.funnelType||""],[f.nextFollowUp||""],[f.status],[f.cityRegion||""],[f.deliveryDetails||""],[f.paymentTerms||""],[prod],[f.orderNumber||""],[f.quoteQty||"",f.quoteQty?"Number":"String"],[f.quoteAmount||"",f.quoteAmount?"Number":"String"],[f.remarks||""],[f.createdAt],[f.createdBy],[f.assignedTo||""]].map(([v,t="String"])=>`<Cell><Data ss:Type="${t}">${e(v)}</Data></Cell>`).join("")}</Row>`;
  }).join("");
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/><Interior ss:Color="#9a7a45" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Funnels"><Table>${hRow}${rows}</Table></Worksheet></Workbook>`;
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([xml],{type:"application/vnd.ms-excel;charset=utf-8"}));
  a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [list,set] = useState([]);
  const push = useCallback((msg,type="success")=>{
    const id=Date.now()+Math.random();
    set(p=>[...p,{id,msg,type}]);
    setTimeout(()=>set(p=>p.filter(x=>x.id!==id)),3000);
  },[]);
  return {list,push};
}

function Toaster({list,T}) {
  const s={success:T.won.dot, error:T.lost.dot, info:T.brand};
  return (
    <div style={{position:"fixed",bottom:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
      {list.map(t=>(
        <div key={t.id} style={{
          background:T.surface,
          border:`1px solid ${T.line}`,
          borderLeft:`3px solid ${s[t.type]||s.info}`,
          borderRadius:T.r.md,
          padding:"10px 16px",
          fontSize:12,
          color:T.ink,
          fontFamily:F_MONO,
          letterSpacing:"0.04em",
          boxShadow:T.shadowLg,
          animation:"slideRight .2s ease",
          minWidth:220,
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const Dot = ({color,size=6}) => (
  <span style={{width:size,height:size,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>
);

function StatusPill({status,sm,T}) {
  const map={
    Won:T.won, Pending:T.pending, Lost:T.lost, Drop:T.drop,
    "New Lead":T.new,"Qualified":T.pending,"Proposal Sent":T.high,
    "High Value":T.high,"Premium":T.premium,"Bulk":T.bulk,"Normal":T.drop,"Strategic":T.new,
    "Interested":T.won,"Order Confirmed":T.won,
    "Needs Time":T.pending,"Callback Requested":T.pending,"Rescheduled":T.pending,
    "Not Interested":T.lost,"Other":T.drop,
  };
  const c=map[status]||T.drop;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:5,
      padding:sm?"2px 8px":"3px 9px",
      borderRadius:2,
      fontSize:sm?10:11,
      fontWeight:500,
      fontFamily:F_MONO,
      letterSpacing:"0.08em",
      textTransform:"uppercase",
      background:c.bg,
      color:c.text,
      border:`1px solid ${c.dot}33`,
      whiteSpace:"nowrap",
    }}>
      <Dot color={c.dot} size={4}/>{status}
    </span>
  );
}

// ── Lead source icons (unchanged) ──
function SourceIcon({source}) {
  const icons = {
    WhatsApp: <svg width="11" height="11" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.523 5.845L.057 23.885a.5.5 0 00.613.613l6.04-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 01-5.073-1.387l-.361-.214-3.757.912.929-3.657-.236-.374A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>,
    Email: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a7a45" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>,
    Website: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2d4d72" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    Call: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .9h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 15.92v1z"/></svg>,
    "Abandoned Cart": <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a7a45" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
    "Social media": <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7a3050" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>,
    Owner: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a7a45" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    Other: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7a7468" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  };
  return icons[source] || icons.Other;
}

function SourcePill({source, T}) {
  if (!source) return null;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      padding:"2px 7px",borderRadius:2,
      fontSize:10,fontWeight:400,fontFamily:F_MONO,
      letterSpacing:"0.06em",
      background:T.surfaceEl,
      color:T.inkMuted,
      border:`1px solid ${T.line}`,
      whiteSpace:"nowrap",
    }}>
      <SourceIcon source={source}/>{source}
    </span>
  );
}

function Ic({d,sz=16,color="currentColor",sw=1.5}) {
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{display:"block",flexShrink:0}}>
      <path d={d} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const P={
  dash:   "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z",
  list:   "M3 6h18M3 10h18M3 14h11M3 18h7",
  users:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm12 10v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75",
  chart:  "M3 3v18h18M7 16l4-4 4 4 5-5",
  plus:   "M12 5v14M5 12h14",
  dl:     "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  search: "M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z",
  close:  "M18 6L6 18M6 6l12 12",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:  "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  out:    "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  check:  "M20 6L9 17l-5-5",
  menu:   "M3 6h18M3 12h18M3 18h18",
  msg:    "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  bell:   "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  moon:   "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  sun:    "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 100 14A7 7 0 0012 5z",
  user:   "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  chevL:  "M15 18l-6-6 6-6",
  chevR:  "M9 18l6-6-6-6",
  key:    "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  tag:    "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
};

// ── Avatar with warm palette ──
function Avatar({name,size=32}) {
  const palettes=[
    ["#f2e8d5","#6b5020"],["#eaf4ee","#1a4d38"],
    ["#f5e8e8","#6b1e1e"],["#e8eef5","#1a2e4a"],
    ["#edeae5","#3d3830"],
  ];
  const [bg,tx]=palettes[(name?.charCodeAt(0)||65)%palettes.length];
  return (
    <div style={{
      width:size,height:size,borderRadius:"50%",
      background:bg,color:tx,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*.32,fontWeight:500,flexShrink:0,
      fontFamily:F_SERIF,letterSpacing:"0.02em",
      border:`1px solid ${tx}22`,
    }}>
      {(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
    </div>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
function Btn({primary,ghost,danger,sm,icon,label,onClick,disabled,full,T}) {
  const [hov,setHov]=useState(false);
  const base={
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
    padding:sm?"5px 12px":"7px 14px",
    fontSize:sm?11:12,
    fontWeight:500,
    fontFamily:F_MONO,
    letterSpacing:"0.08em",
    textTransform:"uppercase",
    borderRadius:T.r.sm,
    border:"none",
    cursor:disabled?"not-allowed":"pointer",
    opacity:disabled?.5:1,
    transition:"background .15s,box-shadow .15s",
    whiteSpace:"nowrap",
    ...(full?{width:"100%"}:{}),
  };
  const styles={
    ...(primary?{
      background:hov?T.brandHover:T.brand,
      color:T.inkInvert,
      boxShadow:hov?`0 2px 8px ${T.brand}44`:T.shadowSm,
    }:{}),
    ...(ghost?{
      background:hov?T.surfaceEl:T.surface,
      color:T.inkSub,
      border:`1px solid ${T.lineMid}`,
      boxShadow:hov?T.shadowSm:"none",
    }:{}),
    ...(danger?{
      background:hov?T.lost.bg:T.surface,
      color:T.lost.text,
      border:`1px solid ${hov?T.lost.dot:T.line}`,
    }:{}),
    ...(!primary&&!ghost&&!danger?{
      background:hov?T.surfaceEl:"transparent",
      color:T.inkSub,
      border:`1px solid transparent`,
    }:{}),
  };
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled}
      style={{...base,...styles}}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      onMouseDown={e=>!disabled&&(e.currentTarget.style.transform="scale(0.97)")}
      onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
      {icon&&<Ic d={icon} sz={12} color={primary?T.inkInvert:"currentColor"}/>}
      {label}
    </button>
  );
}

// ─── INPUT PRIMITIVES ─────────────────────────────────────────────────────────
const inputSx = (T, err) => ({
  width:"100%",
  padding:"8px 11px",
  border:`1px solid ${err?T.lost.dot:T.lineMid}`,
  borderRadius:T.r.sm,
  fontSize:13,
  fontFamily:F_BODY,
  color:T.ink,
  background:T.surface,
  outline:"none",
  boxSizing:"border-box",
  transition:"border-color .15s,box-shadow .15s",
});
const mkFocus = T => e => {
  e.target.style.borderColor = T.brand;
  e.target.style.boxShadow   = `0 0 0 3px ${T.brand}22`;
};
const mkBlur = T => e => {
  e.target.style.borderColor = T.lineMid;
  e.target.style.boxShadow   = "none";
};
const selectBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%237a7468' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 7px center`;

function FInput({label,value,onChange,placeholder,type="text",error,required,T}) {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&(
        <label style={{fontSize:10,fontWeight:500,color:T.inkMuted,fontFamily:F_MONO,letterSpacing:"0.1em",textTransform:"uppercase"}}>
          {label}{required&&<span style={{color:T.lost.dot,marginLeft:2}}>*</span>}
        </label>
      )}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{...inputSx(T,error),borderColor:focused?T.brand:error?T.lost.dot:T.lineMid,boxShadow:focused?`0 0 0 3px ${T.brand}22`:"none"}}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
      {error&&<span style={{fontSize:11,color:T.lost.text,fontFamily:F_MONO}}>{error}</span>}
    </div>
  );
}

function FSelect({label,value,onChange,options,placeholder,required,error,T}) {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&(
        <label style={{fontSize:10,fontWeight:500,color:T.inkMuted,fontFamily:F_MONO,letterSpacing:"0.1em",textTransform:"uppercase"}}>
          {label}{required&&<span style={{color:T.lost.dot,marginLeft:2}}>*</span>}
        </label>
      )}
      <select value={value} onChange={onChange}
        style={{...inputSx(T,error),cursor:"pointer",appearance:"none",background:`${T.surface} ${selectBg}`,borderColor:focused?T.brand:error?T.lost.dot:T.lineMid,boxShadow:focused?`0 0 0 3px ${T.brand}22`:"none"}}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}>
        <option value="">{placeholder||"Select…"}</option>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
      {error&&<span style={{fontSize:11,color:T.lost.text,fontFamily:F_MONO}}>{error}</span>}
    </div>
  );
}

// Section label — monospace uppercase
const SL = ({children,T}) => (
  <div style={{
    fontSize:10,fontWeight:500,color:T.inkMuted,
    letterSpacing:"0.12em",textTransform:"uppercase",
    marginBottom:12,fontFamily:F_MONO,
    display:"flex",alignItems:"center",gap:12,
  }}>
    {children}
    <div style={{flex:1,height:1,background:T.line}}/>
  </div>
);

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function SkeletonRow({T}) {
  const shimmerStyle = {
    background:`linear-gradient(90deg,${T.surface} 25%,${T.surfaceEl} 50%,${T.surface} 75%)`,
    backgroundSize:"800px 100%",
    animation:"shimmer 1.5s infinite",
    borderRadius:2,
  };
  return (
    <tr style={{borderBottom:`1px solid ${T.line}`}}>
      {[3,18,12,10,11,10,11,10,15].map((w,i)=>(
        <td key={i} style={{padding:"14px 12px",verticalAlign:"middle"}}>
          <div style={{...shimmerStyle,height:11,width:`${w*4}px`,maxWidth:"100%"}}/>
          {i===1&&<div style={{...shimmerStyle,height:8,width:"60%",marginTop:6}}/>}
        </td>
      ))}
    </tr>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({users,onLogin,T,dark,onToggleDark}) {
  const [u,su]=useState(""); const [p,sp]=useState(""); const [err,se]=useState(""); const [load,sl]=useState(false);
  const [showPw,setShowPw]=useState(false);

  const go=()=>{
    const trimU=u.trim().toLowerCase(); const trimP=p.trim();
    if(!trimU||!trimP){se("Please fill in all fields.");return;}
    se(""); sl(true);
    setTimeout(()=>{
      const found=users.find(x=>x.username.toLowerCase()===trimU&&x.password===trimP);
      if(found) onLogin(found);
      else{se("Incorrect username or password.");sl(false);}
    },600);
  };

  const features=[
    {icon:P.list,  title:"Pipeline Tracking",   desc:"Manage every lead from first contact to closed deal"},
    {icon:P.bell,  title:"Follow-up Reminders", desc:"Never miss a follow-up with smart overdue alerts"},
    {icon:P.chart, title:"Revenue Analytics",   desc:"Real-time insights on won revenue and pipeline value"},
    {icon:P.users, title:"Team Collaboration",  desc:"Assign funnels to CREs and track team performance"},
  ];

  return (
    <div style={{minHeight:"100vh",display:"flex",background:T.bg,fontFamily:F_BODY}}>

      {/* ── Left panel — warm dark ink ── */}
      <div className="ek-login-left" style={{
        width:"52%",
        background:"#1a1814",
        padding:"52px 60px",
        display:"flex",flexDirection:"column",justifyContent:"space-between",
        position:"relative",overflow:"hidden",
      }}>
        {/* decorative lines */}
        <div style={{position:"absolute",top:0,right:0,width:1,height:"100%",background:"rgba(154,122,69,0.2)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:"rgba(154,122,69,0.1)"}}/>

        <div style={{position:"relative",zIndex:1}}>
          {/* Brand */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:56}}>
            <img src="/logo.png" alt="Ekanta" style={{height:40,objectFit:"contain"}}/>
            <div>
              <div style={{fontSize:13,fontWeight:500,letterSpacing:"0.14em",textTransform:"uppercase",color:"#f0ece5"}}>Ekanta Design Studio</div>
              <div style={{fontFamily:F_MONO,fontSize:10,letterSpacing:"0.16em",textTransform:"uppercase",color:"#7a7468",marginTop:2}}>Customer Relations</div>
            </div>
          </div>

          {/* Hero title */}
          <h1 style={{
            fontFamily:F_SERIF,
            fontSize:42,fontWeight:300,
            color:"#f0ece5",
            lineHeight:1.1,letterSpacing:"-0.5px",
            margin:"0 0 16px",
          }}>
            Your sales pipeline,<br/>
            <em style={{fontStyle:"italic",color:"#9a7a45"}}>beautifully managed.</em>
          </h1>
          <p style={{fontSize:13,color:"#7a7468",lineHeight:1.75,margin:"0 0 52px",maxWidth:380,fontWeight:300}}>
            Track every lead, follow up on time, and close more deals — all in one place built for fashion businesses.
          </p>

          {/* Feature list */}
          <div style={{display:"flex",flexDirection:"column",gap:22}}>
            {features.map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,animation:`fadeUp .4s ease ${i*.08}s both`}}>
                <div style={{width:32,height:32,border:"1px solid rgba(154,122,69,0.4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Ic d={f.icon} sz={13} color="#9a7a45"/>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:"#f0ece5",marginBottom:3,fontFamily:F_BODY}}>{f.title}</div>
                  <div style={{fontSize:12,color:"#7a7468",lineHeight:1.6,fontWeight:300}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat strip */}
        <div style={{
          position:"relative",zIndex:1,
          display:"flex",alignItems:"center",gap:24,
          paddingTop:28,
          borderTop:"1px solid rgba(154,122,69,0.2)",
        }}>
          {[["9+","Active Users"],["100%","Uptime"],["Real-time","Sync"]].map(([v,l])=>(
            <div key={l}>
              <div style={{fontFamily:F_SERIF,fontSize:22,fontWeight:300,color:"#9a7a45"}}>{v}</div>
              <div style={{fontFamily:F_MONO,fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#5a5650",marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — cream ── */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 20px",position:"relative",background:T.bg}}>
        {/* dark mode toggle */}
        <button onClick={onToggleDark} style={{
          position:"absolute",top:24,right:24,
          width:34,height:34,
          border:`1px solid ${T.lineMid}`,
          borderRadius:T.r.sm,
          background:T.surface,
          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:T.shadowSm,
        }} title={dark?"Light mode":"Dark mode"}>
          <Ic d={dark?P.sun:P.moon} sz={14} color={T.inkMuted}/>
        </button>

        <div style={{width:"100%",maxWidth:340,animation:"fadeUp .35s ease"}}>
          {/* Heading */}
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:F_MONO,fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:T.brand,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
              Operations Portal
              <span style={{display:"inline-block",width:24,height:1,background:T.brand,opacity:0.6}}/>
            </div>
            <h2 style={{fontFamily:F_SERIF,fontSize:30,fontWeight:300,color:T.ink,margin:"0 0 6px",letterSpacing:"-0.3px"}}>Welcome back</h2>
            <p style={{fontSize:12,color:T.inkMuted,margin:0,fontWeight:300}}>Sign in to your Ekanta CRM account</p>
          </div>

          {/* Error */}
          {err&&(
            <div style={{background:T.lost.bg,border:`1px solid ${T.lost.dot}44`,borderRadius:T.r.sm,padding:"9px 12px",fontSize:11,fontFamily:F_MONO,color:T.lost.text,marginBottom:16,letterSpacing:"0.04em"}}>
              ⚠ {err}
            </div>
          )}

          {/* Form */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <FInput label="Username" value={u} onChange={e=>su(e.target.value)} placeholder="Enter your username" T={T}/>

            <div>
              <label style={{fontSize:10,fontWeight:500,color:T.inkMuted,fontFamily:F_MONO,letterSpacing:"0.1em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",marginBottom:4}}>
                Password
                <span style={{color:T.brand,cursor:"pointer",textTransform:"none",letterSpacing:"normal",fontFamily:F_BODY}} onClick={()=>se("Contact your administrator.")}>Forgot?</span>
              </label>
              <div style={{position:"relative"}}>
                <input
                  type={showPw?"text":"password"} value={p}
                  onChange={e=>sp(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={e=>e.key==="Enter"&&go()}
                  style={{...inputSx(T),width:"100%",paddingRight:40}}
                  onFocus={mkFocus(T)} onBlur={mkBlur(T)}
                />
                <button onClick={()=>setShowPw(x=>!x)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:2}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {showPw
                      ?<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      :<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <button onClick={go} disabled={load}
              style={{
                width:"100%",padding:"10px",
                background:load?T.brandHover:T.brand,
                color:T.inkInvert,
                border:"none",borderRadius:T.r.sm,
                fontSize:11,fontWeight:500,fontFamily:F_MONO,
                letterSpacing:"0.14em",textTransform:"uppercase",
                cursor:load?"not-allowed":"pointer",
                transition:"background .15s",
                marginTop:4,
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              }}
              onMouseEnter={e=>{if(!load)e.currentTarget.style.background=T.brandHover;}}
              onMouseLeave={e=>{if(!load)e.currentTarget.style.background=T.brand;}}>
              {load
                ?<><svg style={{animation:"spin .7s linear infinite"}} width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"/><path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Signing in…</>
                :"Sign in →"
              }
            </button>
          </div>

          <p style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted,textAlign:"center",marginTop:24,lineHeight:1.8,letterSpacing:"0.06em"}}>
            SECURE ACCESS · DATA ENCRYPTED · CHENNAI
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({active,set,user,onLogout,open,onClose,T,dark,onToggleDark,collapsed,onToggleCollapse}) {
  const [profileOpen,setProfileOpen]=useState(false);
  const profileRef=useRef(null);

  useEffect(()=>{
    const h=e=>{if(profileRef.current&&!profileRef.current.contains(e.target))setProfileOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const nav=[
    {id:"dashboard",label:"Dashboard",icon:P.dash},
    {id:"funnels",  label:"Funnels",  icon:P.list},
    {id:"analytics",label:"Analytics",icon:P.chart},
    ...(FULL.includes(user.role)?[{id:"team",label:"Team",icon:P.users}]:[]),
  ];

  const w=collapsed?52:200;

  return (
    <>
      {open&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:199}}/>}
      <div className={`ek-sidebar${open?" open":""}`}
        style={{
          width:w,height:"100vh",
          background:T.sidebar,
          borderRight:`1px solid ${T.lineMid}`,
          display:"flex",flexDirection:"column",
          flexShrink:0,position:"relative",zIndex:200,
          transition:"width .25s cubic-bezier(0.4,0,0.2,1)",
          overflow:"hidden",
          boxShadow:T.shadowSm,
        }}>

        {/* Header */}
        <div style={{
          padding:collapsed?"14px 0":"18px 16px 14px",
          borderBottom:`1px solid ${T.line}`,
          display:"flex",alignItems:"center",
          justifyContent:collapsed?"center":"space-between",
        }}>
          {!collapsed&&(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <img src="/logo.png" alt="Ekanta" style={{height:32,width:"auto",objectFit:"contain",flexShrink:0}}/>
              <div>
                <div style={{fontSize:11,fontWeight:500,letterSpacing:"0.12em",textTransform:"uppercase",color:T.ink}}>Ekanta</div>
                <div style={{fontFamily:F_MONO,fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkMuted}}>CRM</div>
              </div>
            </div>
          )}
          {collapsed&&<img src="/logo.png" alt="Ekanta" style={{height:28,width:"auto",objectFit:"contain"}}/>}
          {!collapsed&&(
            <button onClick={onToggleCollapse} style={{background:"none",border:`1px solid ${T.line}`,cursor:"pointer",color:T.inkMuted,display:"flex",padding:4,borderRadius:T.r.sm}}>
              <Ic d={P.chevL} sz={11} color="currentColor"/>
            </button>
          )}
        </div>

        {collapsed&&(
          <button onClick={onToggleCollapse} style={{margin:"8px auto",background:"none",border:`1px solid ${T.line}`,cursor:"pointer",color:T.inkMuted,display:"flex",padding:4,borderRadius:T.r.sm}}>
            <Ic d={P.chevR} sz={11} color="currentColor"/>
          </button>
        )}

        {/* Nav */}
        <nav style={{flex:1,padding:`8px ${collapsed?4:8}px 0`}}>
          {!collapsed&&(
            <div style={{fontFamily:F_MONO,fontSize:9,fontWeight:400,color:T.inkMuted,letterSpacing:"0.14em",padding:"10px 8px 4px",textTransform:"uppercase"}}>Navigation</div>
          )}
          {nav.map(item=>{
            const a=active===item.id;
            return (
              <div key={item.id} style={{position:"relative"}}>
                <button
                  onClick={()=>{set(item.id);onClose&&onClose();}}
                  title={collapsed?item.label:undefined}
                  style={{
                    display:"flex",alignItems:"center",gap:8,width:"100%",
                    padding:collapsed?"10px 0":"6px 8px",
                    borderRadius:T.r.sm,border:"none",
                    background:a?T.brandSubtle:"transparent",
                    color:a?T.brand:T.inkSub,
                    fontFamily:F_MONO,fontSize:11,fontWeight:a?500:400,
                    letterSpacing:"0.08em",textTransform:"uppercase",
                    cursor:"pointer",marginBottom:1,
                    transition:"all .12s",textAlign:"left",
                    justifyContent:collapsed?"center":"flex-start",
                  }}
                  onMouseEnter={e=>{if(!a){e.currentTarget.style.background=T.surfaceEl;e.currentTarget.style.color=T.ink;}}}
                  onMouseLeave={e=>{if(!a){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.inkSub;}}}>
                  {a&&!collapsed&&<span style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:2,height:16,background:T.brand,borderRadius:"0 1px 1px 0"}}/>}
                  <Ic d={item.icon} sz={13} color={a?T.brand:T.inkMuted}/>
                  {!collapsed&&item.label}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Profile */}
        <div ref={profileRef} style={{padding:`10px ${collapsed?4:8}px 14px`,borderTop:`1px solid ${T.line}`,position:"relative"}}>
          {profileOpen&&(
            <div style={{
              position:"absolute",bottom:"calc(100% + 8px)",
              left:collapsed?52:8,right:8,
              background:T.surface,
              border:`1px solid ${T.lineMid}`,
              borderRadius:T.r.md,
              boxShadow:T.shadowXl,
              overflow:"hidden",zIndex:300,
              animation:"fadeUp .15s ease",minWidth:200,
            }}>
              <div style={{padding:"14px 16px",background:T.brandSubtle,borderBottom:`1px solid ${T.line}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar name={user.name} size={34}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:T.ink,fontFamily:F_BODY}}>{user.name}</div>
                    <div style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted,marginTop:2,letterSpacing:"0.06em"}}>@{user.username} · {user.role}</div>
                  </div>
                </div>
              </div>
              <div style={{padding:"4px 0"}}>
                <button onClick={onToggleDark}
                  style={{width:"100%",padding:"9px 16px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:F_BODY,fontSize:13,color:T.ink,transition:"background .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceEl}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:26,height:26,border:`1px solid ${T.line}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Ic d={dark?P.sun:P.moon} sz={12} color={T.inkMuted}/>
                    </div>
                    <span style={{fontSize:12}}>{dark?"Light Mode":"Dark Mode"}</span>
                  </div>
                  <div style={{width:34,height:18,borderRadius:9,background:dark?T.brand:T.line,position:"relative",transition:"background .2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:2,left:dark?18:2,width:14,height:14,borderRadius:"50%",background:dark?T.inkInvert:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                  </div>
                </button>
                <button onClick={onLogout}
                  style={{width:"100%",padding:"9px 16px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontFamily:F_BODY,fontSize:12,color:T.lost.text,transition:"background .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.lost.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <div style={{width:26,height:26,border:`1px solid ${T.lost.dot}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Ic d={P.out} sz={12} color={T.lost.dot}/>
                  </div>
                  Sign out
                </button>
              </div>
            </div>
          )}

          <button
            onClick={()=>setProfileOpen(x=>!x)}
            style={{display:"flex",alignItems:"center",gap:collapsed?0:9,width:"100%",padding:collapsed?"8px 0":"6px 8px",borderRadius:T.r.sm,background:profileOpen?T.brandSubtle:"transparent",border:"none",cursor:"pointer",transition:"background .12s",justifyContent:collapsed?"center":"flex-start"}}
            onMouseEnter={e=>e.currentTarget.style.background=T.surfaceEl}
            onMouseLeave={e=>{if(!profileOpen)e.currentTarget.style.background="transparent";}}>
            <Avatar name={user.name} size={26}/>
            {!collapsed&&(
              <div style={{flex:1,minWidth:0,textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:500,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
                <div style={{fontFamily:F_MONO,fontSize:9,color:T.inkMuted,letterSpacing:"0.06em",textTransform:"uppercase"}}>{user.role}</div>
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({title,search,setSearch,user,onAdd,onExportAll,onExportFiltered,fLen,aLen,onMenuToggle,T,todayCount,dateFilter,setDateFilter,dateType,setDateType,todayFunnels=[]}) {
  const [bellOpen,setBellOpen]=useState(false);
  const bellRef=useRef(null);

  useEffect(()=>{
    const h=e=>{if(bellRef.current&&!bellRef.current.contains(e.target))setBellOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  return (
    <div style={{background:T.surface,borderBottom:`1px solid ${T.lineMid}`,padding:"0 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:54,gap:8}}>

        {/* Left */}
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
          <button onClick={onMenuToggle} className="ek-mobile-menu"
            style={{background:"none",border:"none",cursor:"pointer",color:T.inkSub,display:"none",padding:4,borderRadius:4}}>
            <Ic d={P.menu} sz={17} color="currentColor"/>
          </button>
          <h1 style={{
            fontFamily:F_SERIF,
            fontSize:22,fontWeight:300,
            color:T.ink,
            letterSpacing:"-0.3px",
            margin:0,
            whiteSpace:"nowrap",
          }}>{title}</h1>
          <div className="ek-topbar-search" style={{
            display:"flex",alignItems:"center",gap:8,
            background:T.surfaceEl,
            border:`1px solid ${T.line}`,
            borderRadius:T.r.sm,
            padding:"5px 10px",
            minWidth:160,maxWidth:240,flex:1,
          }}>
            <Ic d={P.search} sz={12} color={T.inkMuted}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search funnels…"
              style={{border:"none",background:"transparent",outline:"none",fontSize:12,color:T.ink,fontFamily:F_BODY,width:"100%"}}/>
            {search&&(
              <button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:0}}>
                <Ic d={P.close} sz={11} color="currentColor"/>
              </button>
            )}
          </div>
        </div>

        {/* Date type toggle */}
        <div className="ek-topbar-date" style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <div style={{display:"flex",background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.sm,overflow:"hidden",flexShrink:0}}>
            {[["followup","Follow-up"],["created","Created"]].map(([val,label])=>(
              <button key={val} onClick={()=>setDateType(val)}
                style={{
                  padding:"4px 10px",fontSize:10,fontWeight:500,fontFamily:F_MONO,
                  letterSpacing:"0.08em",textTransform:"uppercase",
                  border:"none",cursor:"pointer",
                  background:dateType===val?T.brand:"transparent",
                  color:dateType===val?T.inkInvert:T.inkMuted,
                  transition:"all .15s",whiteSpace:"nowrap",
                }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,background:dateFilter?T.brandSubtle:T.surface,border:`1px solid ${dateFilter?T.brand:T.line}`,borderRadius:T.r.sm,padding:"3px 8px",transition:"all .15s"}}>
            <Ic d={P.bell} sz={11} color={dateFilter?T.brand:T.inkMuted}/>
            <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}
              style={{border:"none",background:"transparent",outline:"none",fontSize:11,fontFamily:F_MONO,color:dateFilter?T.brand:T.ink,cursor:"pointer",fontWeight:dateFilter?500:400,width:110}}/>
            {dateFilter&&(
              <button onClick={()=>setDateFilter("")} style={{background:"none",border:"none",cursor:"pointer",color:T.brand,display:"flex",padding:0,marginLeft:2}}>
                <Ic d={P.close} sz={10} color="currentColor"/>
              </button>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>

          {/* Bell */}
          <div ref={bellRef} style={{position:"relative"}}>
            <button onClick={()=>setBellOpen(x=>!x)}
              style={{width:32,height:32,borderRadius:T.r.sm,background:bellOpen?T.surfaceEl:"transparent",border:`1px solid ${bellOpen?T.lineMid:"transparent"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}}>
              <Ic d={P.bell} sz={14} color={todayCount>0?T.pending.dot:T.inkMuted}/>
            </button>
            {todayFunnels.length>0&&(
              <div style={{position:"absolute",top:2,right:2,width:14,height:14,borderRadius:"50%",background:T.pending.dot,color:T.inkInvert,fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F_MONO,border:`2px solid ${T.surface}`,pointerEvents:"none"}}>
                {todayFunnels.length>9?"9+":todayFunnels.length}
              </div>
            )}
            {bellOpen&&(
              <div style={{position:"fixed",top:62,right:8,width:"min(300px,calc(100vw - 16px))",background:T.surface,border:`1px solid ${T.lineMid}`,borderRadius:T.r.md,boxShadow:T.shadowXl,zIndex:999,animation:"fadeUp .15s ease",overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Ic d={P.bell} sz={12} color={T.pending.dot}/>
                    <span style={{fontFamily:F_SERIF,fontSize:15,fontWeight:400,color:T.ink}}>Pending Follow-ups</span>
                  </div>
                  {todayCount>0&&<span style={{fontFamily:F_MONO,fontSize:10,fontWeight:500,background:T.pending.bg,color:T.pending.text,padding:"2px 8px",borderRadius:2,letterSpacing:"0.06em"}}>{todayCount}</span>}
                </div>
                <div style={{maxHeight:320,overflowY:"auto"}}>
                  {todayFunnels.length===0?(
                    <div style={{padding:"28px 16px",textAlign:"center"}}>
                      <div style={{fontFamily:F_SERIF,fontSize:20,fontWeight:300,color:T.ink,marginBottom:4}}>All clear</div>
                      <div style={{fontSize:12,color:T.inkMuted,fontFamily:F_BODY}}>No follow-ups due today.</div>
                    </div>
                  ):todayFunnels.map((f,i)=>(
                    <div key={f.id} style={{padding:"11px 16px",borderBottom:i<todayFunnels.length-1?`1px solid ${T.line}`:"none",display:"flex",alignItems:"center",gap:10,transition:"background .1s",cursor:"default"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceEl}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <Avatar name={f.name} size={30}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:500,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                          {f.phone&&<span style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted}}>{f.phone}</span>}
                        </div>
                      </div>
                      <div style={{flexShrink:0,textAlign:"right"}}>
                        <div style={{fontFamily:F_MONO,fontSize:10,fontWeight:500,color:f.nextFollowUp<today()?T.lost.text:T.pending.text}}>
                          {f.nextFollowUp<today()?"Overdue":"Today"}
                        </div>
                        {f.quoteAmount&&<div style={{fontFamily:F_MONO,fontSize:11,fontWeight:600,color:T.brand}}>₹{Number(f.quoteAmount).toLocaleString("en-IN")}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {todayFunnels.length>0&&(
                  <div style={{padding:"8px 16px",borderTop:`1px solid ${T.line}`,background:T.surfaceEl,textAlign:"center"}}>
                    <span style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted,letterSpacing:"0.06em"}}>{todayFunnels.length} PENDING FOLLOW-UP{todayFunnels.length>1?"S":""}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Exports */}
          {FULL.includes(user.role)&&(
            <>
              <span className="ek-hide-mobile"><Btn ghost sm icon={P.dl} label={`Filtered (${fLen})`} onClick={onExportFiltered} T={T}/></span>
              <span className="ek-hide-mobile"><Btn ghost sm icon={P.dl} label={`All (${aLen})`} onClick={onExportAll} T={T}/></span>
            </>
          )}

          {/* Add */}
          {can(user,"create")&&(
            <>
              <span className="ek-hide-mobile"><Btn primary sm icon={P.plus} label="Add funnel" onClick={onAdd} T={T}/></span>
              <span className="ek-show-mobile">
                <button onClick={onAdd} style={{width:32,height:32,borderRadius:T.r.sm,background:T.brand,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic d={P.plus} sz={14} color={T.inkInvert} sw={2}/>
                </button>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STATS ROW ────────────────────────────────────────────────────────────────
function Stats({funnels,activeStatFilter,onStatClick,T}) {
  const won=funnels.filter(f=>f.status==="Won");
  const pending=funnels.filter(f=>f.status==="Pending");
  const lost=funnels.filter(f=>f.status==="Lost");
  const drop=funnels.filter(f=>f.status==="Drop");
  const s={
    total:funnels.length,won:won.length,pending:pending.length,
    lost:lost.length,drop:drop.length,
    revenue:won.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0),
    pendingRevenue:pending.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0),
  };
  const wr=s.total?Math.round(s.won/s.total*100):0;
  const cards=[
    {label:"Total leads",    value:s.total,              caption:"All leads",         accent:T.inkMuted,    bg:T.surface,        filterKey:null},
    {label:"Won",            value:s.won,                caption:`${wr}% win rate`,   accent:T.won.dot,     bg:T.won.bg,         filterKey:"Won"},
    {label:"Pending",        value:s.pending,            caption:"Need follow-up",    accent:T.pending.dot, bg:T.pending.bg,     filterKey:"Pending"},
    {label:"Lost",           value:s.lost,               caption:"Closed lost",       accent:T.lost.dot,    bg:T.lost.bg,        filterKey:"Lost"},
    {label:"Drop",           value:s.drop,               caption:"Dropped",           accent:T.drop.dot,    bg:T.surface,        filterKey:"Drop"},
    {label:"Won Revenue",    value:big(s.revenue),       caption:"From won deals",    accent:T.won.dot,     bg:T.won.bg,         filterKey:"Won"},
    {label:"Pipeline",       value:big(s.pendingRevenue),caption:"Potential value",   accent:T.pending.dot, bg:T.pending.bg,     filterKey:"Pending"},
  ];
  return (
    <div style={{padding:"16px 24px 0"}}>
      <div className="ek-stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,overflowX:"auto"}}>
        {cards.map((c,i)=>{
          const isActive=activeStatFilter===c.filterKey&&c.filterKey!==null;
          return (
            <div key={i} onClick={()=>onStatClick(c.filterKey)} className="ek-stat-card"
              style={{
                background:c.bg,
                border:`1px solid ${isActive?c.accent:T.line}`,
                borderLeft:`3px solid ${c.accent}`,
                borderRadius:T.r.sm,
                padding:"12px 10px",
                boxShadow:isActive?`0 0 0 2px ${c.accent}22`:T.shadowSm,
                animation:`fadeUp .25s ease ${i*.04}s both`,
                cursor:c.filterKey?"pointer":"default",
                transition:"all .15s",
                position:"relative",
              }}>
              {isActive&&<div style={{position:"absolute",top:6,right:6,width:5,height:5,borderRadius:"50%",background:c.accent}}/>}
              <div style={{fontFamily:F_MONO,fontSize:9,fontWeight:400,color:T.inkMuted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.label}</div>
              <div style={{fontFamily:F_SERIF,fontSize:24,fontWeight:300,color:isActive?c.accent:T.ink,marginBottom:4,letterSpacing:"-0.3px"}}>{c.value}</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <Dot color={c.accent} size={4}/>
                <span style={{fontFamily:F_MONO,fontSize:9,color:T.inkMuted,whiteSpace:"nowrap",letterSpacing:"0.04em"}}>{isActive?"Filtered":c.caption}</span>
              </div>
            </div>
          );
        })}
      </div>
      {activeStatFilter&&(
        <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:F_MONO,fontSize:11,color:T.inkMuted,letterSpacing:"0.06em"}}>Showing <strong style={{color:T.ink}}>{activeStatFilter}</strong> funnels</span>
          <button onClick={()=>onStatClick(null)} style={{fontFamily:F_MONO,fontSize:11,color:T.brand,background:"none",border:"none",cursor:"pointer",fontWeight:500,textDecoration:"underline",padding:0,letterSpacing:"0.04em"}}>Clear</button>
        </div>
      )}
    </div>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({fil,setF,reset,users=[],user,T,funnels=[]}) {
  const [showMore,setShowMore]=useState(false);

  const sel=(val,key,opts,ph)=>(
    <select value={val} onChange={e=>setF(key,e.target.value)}
      style={{padding:"4px 22px 4px 9px",border:`1px solid ${val?T.brand:T.line}`,borderRadius:T.r.sm,fontSize:11,fontFamily:F_MONO,letterSpacing:"0.06em",color:val?T.ink:T.inkMuted,background:val?`${T.brandSubtle} ${selectBg}`:`${T.surface} ${selectBg}`,cursor:"pointer",outline:"none",appearance:"none",fontWeight:val?500:400,textTransform:"uppercase"}}>
      <option value="">{ph}</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  const chk=(key,label)=>(
    <label style={{display:"flex",alignItems:"center",gap:5,fontFamily:F_MONO,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",color:fil[key]?T.brand:T.inkMuted,cursor:"pointer",fontWeight:fil[key]?500:400,userSelect:"none"}}>
      <input type="checkbox" checked={fil[key]} onChange={e=>setF(key,e.target.checked)} style={{accentColor:T.brand,width:12,height:12}}/>
      {label}
    </label>
  );
  const dateInp=(key,ph)=>(
    <input type="date" value={fil[key]} onChange={e=>setF(key,e.target.value)}
      style={{padding:"4px 8px",border:`1px solid ${fil[key]?T.brand:T.line}`,borderRadius:T.r.sm,fontSize:11,fontFamily:F_MONO,color:fil[key]?T.ink:T.inkMuted,background:fil[key]?T.brandSubtle:T.surface,outline:"none",cursor:"pointer",width:120}}
      title={ph}/>
  );
  const numInp=(key,ph)=>(
    <input type="number" value={fil[key]} onChange={e=>setF(key,e.target.value)} placeholder={ph}
      style={{padding:"4px 8px",border:`1px solid ${fil[key]?T.brand:T.line}`,borderRadius:T.r.sm,fontSize:11,fontFamily:F_MONO,color:T.ink,background:fil[key]?T.brandSubtle:T.surface,outline:"none",width:80}}/>
  );

  const cities=[...new Set(funnels.map(f=>f.cityRegion).filter(Boolean))].sort();
  const assignees=[...new Set(funnels.map(f=>f.assignedTo).filter(Boolean))].sort();
  const anyExtra=fil.assignedTo||fil.city||fil.category||fil.dateFrom||fil.dateTo||fil.followFrom||fil.followTo||fil.minAmt||fil.maxAmt||fil.hasOrder||fil.hasQuote||fil.overdue||fil.wonMonth;
  const anyBasic=fil.status||fil.funnelType||fil.enquiryType||fil.leadSource||fil.descFilter||fil.missed||fil.todayF||fil.upcoming||fil.cre;
  const any=anyBasic||anyExtra;

  const Div=()=><div style={{width:1,height:12,background:T.line,flexShrink:0}}/>;
  const Label=({t})=><span style={{fontFamily:F_MONO,fontSize:9,fontWeight:400,color:T.inkMuted,letterSpacing:"0.12em",textTransform:"uppercase",flexShrink:0}}>{t}</span>;

  return (
    <div style={{borderBottom:`1px solid ${T.line}`,background:T.surface}}>
      <div className="ek-filter-scroll" style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <Ic d={P.filter} sz={11} color={T.inkMuted}/>
          <span style={{fontFamily:F_MONO,fontSize:9,color:T.inkMuted,letterSpacing:"0.12em",textTransform:"uppercase"}}>Filter</span>
        </div>
        <Div/>
        {chk("missed","Missed")}
        {chk("todayF","Today")}
        {chk("upcoming","Upcoming")}
        {chk("overdue","Overdue")}
        {chk("wonMonth","Won this month")}
        <Div/>
        {sel(fil.status,"status",STATUS,"Status")}
        {sel(fil.funnelType,"funnelType",FTYPES,"Type")}
        {sel(fil.enquiryType,"enquiryType",ENQS,"Enquiry")}
        {sel(fil.leadSource,"leadSource",LEAD_SOURCES,"Source")}
        {FULL.includes(user?.role)&&users.filter(u=>u.role==="CRE").length>0&&(
          <select value={fil.cre||""} onChange={e=>setF("cre",e.target.value)}
            style={{padding:"4px 22px 4px 9px",border:`1px solid ${fil.cre?T.brand:T.line}`,borderRadius:T.r.sm,fontSize:11,fontFamily:F_MONO,letterSpacing:"0.06em",textTransform:"uppercase",color:fil.cre?T.ink:T.inkMuted,background:fil.cre?`${T.brandSubtle} ${selectBg}`:`${T.surface} ${selectBg}`,cursor:"pointer",outline:"none",appearance:"none",fontWeight:fil.cre?500:400}}>
            <option value="">CRE</option>
            {users.filter(u=>u.role==="CRE").map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
          </select>
        )}
        <Div/>
        <div style={{display:"flex",alignItems:"center",gap:6,background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 9px",minWidth:140,flex:1,maxWidth:200}}>
          <Ic d={P.search} sz={11} color={T.inkMuted}/>
          <input value={fil.descFilter} onChange={e=>setF("descFilter",e.target.value)} placeholder="Search description…"
            style={{border:"none",background:"transparent",outline:"none",fontSize:11,fontFamily:F_BODY,color:T.ink,width:"100%"}}/>
          {fil.descFilter&&<button onClick={()=>setF("descFilter","")} style={{background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:0}}><Ic d={P.close} sz={10} color="currentColor"/></button>}
        </div>
        <button onClick={()=>setShowMore(x=>!x)}
          style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:T.r.sm,border:`1px solid ${showMore||anyExtra?T.brand:T.line}`,background:showMore||anyExtra?T.brandSubtle:"transparent",color:showMore||anyExtra?T.brand:T.inkMuted,fontFamily:F_MONO,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:500,cursor:"pointer",flexShrink:0,transition:"all .15s"}}>
          <Ic d={P.filter} sz={10} color={showMore||anyExtra?T.brand:T.inkMuted}/>
          More {anyExtra&&<span style={{background:T.brand,color:T.inkInvert,borderRadius:2,fontSize:9,fontWeight:700,padding:"0 4px",marginLeft:2}}>●</span>}
        </button>
        {any&&<button onClick={reset} style={{fontFamily:F_MONO,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",color:T.brand,background:"none",border:"none",cursor:"pointer",fontWeight:500,padding:"0 4px",textDecoration:"underline",flexShrink:0}}>Clear all</button>}
      </div>

      {showMore&&(
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 16px 10px",flexWrap:"wrap",borderTop:`1px solid ${T.line}`,background:T.surfaceEl,overflowX:"auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Label t="Assigned"/>
            <select value={fil.assignedTo} onChange={e=>setF("assignedTo",e.target.value)}
              style={{padding:"4px 22px 4px 9px",border:`1px solid ${fil.assignedTo?T.brand:T.line}`,borderRadius:T.r.sm,fontSize:11,fontFamily:F_MONO,textTransform:"uppercase",letterSpacing:"0.06em",color:fil.assignedTo?T.ink:T.inkMuted,background:fil.assignedTo?`${T.brandSubtle} ${selectBg}`:`${T.surface} ${selectBg}`,cursor:"pointer",outline:"none",appearance:"none"}}>
              <option value="">Anyone</option>
              {assignees.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
          <Div/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Label t="City"/>
            {cities.length>0?(
              <select value={fil.city} onChange={e=>setF("city",e.target.value)}
                style={{padding:"4px 22px 4px 9px",border:`1px solid ${fil.city?T.brand:T.line}`,borderRadius:T.r.sm,fontSize:11,fontFamily:F_MONO,textTransform:"uppercase",letterSpacing:"0.06em",color:fil.city?T.ink:T.inkMuted,background:fil.city?`${T.brandSubtle} ${selectBg}`:`${T.surface} ${selectBg}`,cursor:"pointer",outline:"none",appearance:"none"}}>
                <option value="">All cities</option>
                {cities.map(c=><option key={c}>{c}</option>)}
              </select>
            ):(
              <input value={fil.city} onChange={e=>setF("city",e.target.value)} placeholder="City…"
                style={{padding:"4px 8px",border:`1px solid ${fil.city?T.brand:T.line}`,borderRadius:T.r.sm,fontSize:11,fontFamily:F_MONO,color:T.ink,background:fil.city?T.brandSubtle:T.surface,outline:"none",width:110}}/>
            )}
          </div>
          <Div/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Label t="Category"/>
            {sel(fil.category,"category",CATS,"All categories")}
          </div>
          <Div/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Label t="Created"/>
            {dateInp("dateFrom","From")}
            <span style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted}}>→</span>
            {dateInp("dateTo","To")}
          </div>
          <Div/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Label t="Follow-up"/>
            {dateInp("followFrom","From")}
            <span style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted}}>→</span>
            {dateInp("followTo","To")}
          </div>
          <Div/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Label t="Quote ₹"/>
            {numInp("minAmt","Min")}
            <span style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted}}>→</span>
            {numInp("maxAmt","Max")}
          </div>
          <Div/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Label t="Order"/>
            <select value={fil.hasOrder} onChange={e=>setF("hasOrder",e.target.value)}
              style={{padding:"4px 22px 4px 9px",border:`1px solid ${fil.hasOrder?T.brand:T.line}`,borderRadius:T.r.sm,fontSize:11,fontFamily:F_MONO,color:fil.hasOrder?T.ink:T.inkMuted,background:fil.hasOrder?`${T.brandSubtle} ${selectBg}`:`${T.surface} ${selectBg}`,cursor:"pointer",outline:"none",appearance:"none"}}>
              <option value="">Any</option>
              <option value="yes">Has order</option>
              <option value="no">No order</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
function Table({rows,user,onView,onEdit,onCreEdit,onDelete,onLogFollowup,onAddProof,loading,T,selectedIds=new Set(),toggleSelect,toggleSelectAll}) {
  const [isMobile,setIsMobile]=useState(typeof window!=="undefined"?window.innerWidth<768:false);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  if(loading) return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F_BODY,tableLayout:"fixed"}}>
        <tbody>{[...Array(6)].map((_,i)=><SkeletonRow key={i} T={T}/>)}</tbody>
      </table>
    </div>
  );

  if(!rows.length) return (
    <div style={{textAlign:"center",padding:"64px 24px",fontFamily:F_BODY}}>
      <div style={{fontFamily:F_SERIF,fontSize:32,fontWeight:300,color:T.inkMuted,marginBottom:8}}>No leads found</div>
      <p style={{fontSize:13,color:T.inkMuted,margin:0,fontWeight:300}}>Adjust your filters or add a new lead.</p>
    </div>
  );

  const todayV=today();

  if(isMobile) return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {rows.map((f,i)=>{
        const over=f.nextFollowUp&&f.nextFollowUp<todayV&&f.status==="Pending";
        const tod=f.nextFollowUp===todayV&&f.status==="Pending";
        const isViewer=VIEWER.includes(user.role);
        const showLog=(over||tod)&&f.status!=="Won"&&!isViewer;
        const canCreEdit=!FULL.includes(user.role)&&!isViewer&&(f.createdBy===user.name||f.assignedTo===user.name);
        return (
          <div key={f.id}
            style={{padding:"12px 14px",borderBottom:`1px solid ${T.line}`,background:i%2===0?T.surface:T.surfaceEl,cursor:"pointer",transition:"background .15s"}}
            onClick={()=>onView(f)}
            onMouseEnter={e=>e.currentTarget.style.background=T.brandSubtle}
            onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:T.surfaceEl}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
              <div onClick={e=>e.stopPropagation()} style={{paddingTop:2,marginRight:8}}>
                <input type="checkbox" checked={selectedIds.has(f.id)} onChange={()=>toggleSelect(f.id)} style={{accentColor:T.brand,width:13,height:13,cursor:"pointer"}}/>
              </div>
              <div style={{flex:1,minWidth:0,marginRight:10}}>
                <div style={{fontSize:14,fontWeight:500,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name||"—"}</div>
                <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3,flexWrap:"wrap"}}>
                  <span style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted}}>{f.createdBy}</span>
                  {f.assignedTo&&<span style={{fontFamily:F_MONO,fontSize:9,background:T.brandSubtle,color:T.brand,padding:"0px 6px",borderRadius:2}}>→{f.assignedTo}</span>}
                  {f.leadSource&&<SourcePill source={f.leadSource} T={T}/>}
                </div>
              </div>
              <StatusPill status={f.status} sm T={T}/>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}} onClick={e=>e.stopPropagation()}>
              {showLog&&<button onClick={()=>onLogFollowup(f)} style={{background:T.pending.bg,border:`1px solid ${T.pending.dot}44`,borderRadius:T.r.sm,padding:"5px 12px",fontSize:10,fontWeight:500,fontFamily:F_MONO,letterSpacing:"0.06em",textTransform:"uppercase",color:T.pending.text,cursor:"pointer"}}>Log follow-up</button>}
              {FULL.includes(user.role)&&<button onClick={()=>onEdit(f)} style={{background:T.surface,border:`1px solid ${T.lineMid}`,borderRadius:T.r.sm,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10,fontFamily:F_MONO,letterSpacing:"0.06em",color:T.inkSub}}><Ic d={P.edit} sz={11} color={T.inkSub}/> Edit</button>}
              {canCreEdit&&<button onClick={()=>onCreEdit(f)} style={{background:T.surface,border:`1px solid ${T.brand}`,borderRadius:T.r.sm,padding:"5px 10px",cursor:"pointer",fontSize:10,fontFamily:F_MONO,letterSpacing:"0.06em",color:T.brand}}>Edit</button>}
              {FULL.includes(user.role)&&<button onClick={()=>onDelete(f.id)} style={{background:T.lost.bg,border:`1px solid ${T.lost.dot}44`,borderRadius:T.r.sm,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10,fontFamily:F_MONO,letterSpacing:"0.06em",color:T.lost.text}}><Ic d={P.trash} sz={11} color={T.lost.dot}/> Del</button>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const TH=({ch})=>(
    <th style={{
      padding:"0 12px",textAlign:"left",
      fontFamily:F_MONO,fontSize:9,fontWeight:400,color:T.inkMuted,
      letterSpacing:"0.1em",textTransform:"uppercase",
      whiteSpace:"nowrap",borderBottom:`1px solid ${T.lineMid}`,
      height:32,background:T.surfaceEl,
    }}>{ch}</th>
  );

  return (
    <div className="ek-table-wrap" style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F_BODY,tableLayout:"fixed"}}>
        <colgroup>
          <col style={{width:"3%"}}/><col style={{width:"3%"}}/><col style={{width:"17%"}}/>
          <col style={{width:"11%"}}/><col style={{width:"10%"}}/><col style={{width:"11%"}}/>
          <col style={{width:"10%"}}/><col style={{width:"10%"}}/><col style={{width:"10%"}}/>
          <col style={{width:"15%"}}/>
        </colgroup>
        <thead><tr>
          <th style={{padding:"0 12px",height:32,background:T.surfaceEl,borderBottom:`1px solid ${T.lineMid}`}}>
            <input type="checkbox" checked={rows.length>0&&selectedIds.size===rows.length} onChange={toggleSelectAll} style={{accentColor:T.brand,width:13,height:13,cursor:"pointer"}}/>
          </th>
          <TH ch="#"/><TH ch="Name"/><TH ch="Category"/><TH ch="Type"/>
          <TH ch="Follow-up"/><TH ch="Status"/><TH ch="Order No."/><TH ch="Quote"/><TH ch=""/>
        </tr></thead>
        <tbody>
          {rows.map((f,i)=>{
            const over=f.nextFollowUp&&f.nextFollowUp<todayV&&f.status==="Pending";
            const tod=f.nextFollowUp===todayV&&f.status==="Pending";
            const isViewer=VIEWER.includes(user.role);
            const showLog=(over||tod)&&f.status!=="Won"&&!isViewer;
            const cats=[...new Set((f.products||[]).map(p=>p.category).filter(Boolean))].join(", ")||"—";
            const canCreEdit=!FULL.includes(user.role)&&!isViewer&&(f.createdBy===user.name||f.assignedTo===user.name);
            return (
              <tr key={f.id} onClick={()=>onView(f)}
                style={{borderBottom:`1px solid ${T.line}`,transition:"background .1s",cursor:"pointer",background:i%2===0?T.surface:T.surfaceEl}}
                onMouseEnter={e=>e.currentTarget.style.background=T.brandSubtle}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:T.surfaceEl}>
                <td style={{padding:"0 12px",height:46,verticalAlign:"middle"}} onClick={e=>e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(f.id)} onChange={()=>toggleSelect(f.id)} style={{accentColor:T.brand,width:13,height:13,cursor:"pointer"}}/>
                </td>
                <td style={{padding:"0 12px",fontFamily:F_MONO,fontSize:10,color:T.inkMuted,verticalAlign:"middle"}}>{i+1}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle",overflow:"hidden"}}>
                  <div style={{fontSize:13,fontWeight:500,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name||"—"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2,flexWrap:"nowrap",overflow:"hidden"}}>
                    <span style={{fontFamily:F_MONO,fontSize:9,color:T.inkMuted,flexShrink:0,letterSpacing:"0.04em"}}>{f.createdBy}</span>
                    {f.assignedTo&&<span style={{fontFamily:F_MONO,fontSize:9,background:T.brandSubtle,color:T.brand,padding:"0 5px",borderRadius:2,flexShrink:0}}>→{f.assignedTo}</span>}
                    {f.leadSource&&<SourcePill source={f.leadSource} T={T}/>}
                  </div>
                </td>
                <td style={{padding:"0 12px",fontFamily:F_MONO,fontSize:10,color:T.inkSub,verticalAlign:"middle",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"0.04em"}}>{cats}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}>{f.funnelType?<StatusPill status={f.funnelType} sm T={T}/>:<span style={{color:T.inkMuted,fontFamily:F_MONO,fontSize:10}}>—</span>}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}>
                  {f.status!=="Pending"?<span style={{fontFamily:F_MONO,fontSize:10,color:T.inkMuted}}>—</span>:<>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {over&&<Dot color={T.lost.dot} size={4}/>}{tod&&<Dot color={T.pending.dot} size={4}/>}
                      <span style={{fontFamily:F_MONO,fontSize:11,color:over?T.lost.text:tod?T.pending.text:T.inkSub,fontWeight:over||tod?500:400}}>{f.nextFollowUp||"—"}</span>
                    </div>
                    {over&&<span style={{fontFamily:F_MONO,fontSize:9,color:T.lost.text,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase"}}>Overdue</span>}
                  </>}
                </td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}>
                  <StatusPill status={f.status} sm T={T}/>
                  {(f.status==="Lost"||f.status==="Drop")&&f.lostDropReason&&(
                    <div style={{fontFamily:F_MONO,fontSize:9,color:f.status==="Lost"?T.lost.text:T.drop.text,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{f.lostDropReason}</div>
                  )}
                </td>
                <td style={{padding:"0 12px",fontFamily:F_MONO,fontSize:10,color:T.inkSub,verticalAlign:"middle",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.orderNumber||"—"}</td>
                <td style={{padding:"0 12px",fontFamily:F_MONO,fontSize:11,fontWeight:500,color:T.brand,verticalAlign:"middle",whiteSpace:"nowrap"}}>{inr(f.quoteAmount)||<span style={{color:T.inkMuted,fontWeight:400}}>—</span>}</td>
                <td style={{padding:"0 8px",verticalAlign:"middle"}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:3,justifyContent:"flex-end"}}>
                    {showLog&&(
                      <button onClick={()=>onLogFollowup(f)} style={{background:T.pending.bg,border:`1px solid ${T.pending.dot}44`,borderRadius:T.r.sm,padding:"2px 7px",fontFamily:F_MONO,fontSize:9,fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase",color:T.pending.text,cursor:"pointer",whiteSpace:"nowrap"}}>Log</button>
                    )}
                    <button onClick={()=>onView(f)} style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"2px 8px",fontFamily:F_MONO,fontSize:9,letterSpacing:"0.06em",textTransform:"uppercase",color:T.inkSub,cursor:"pointer"}}
                      onMouseEnter={e=>{e.currentTarget.style.background=T.brandSubtle;e.currentTarget.style.color=T.brand;e.currentTarget.style.borderColor=T.brand;}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.inkSub;e.currentTarget.style.borderColor=T.line;}}>View</button>
                    {FULL.includes(user.role)&&(
                      <button onClick={()=>onEdit(f)} style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"2px 5px",cursor:"pointer",display:"flex"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceEl}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <Ic d={P.edit} sz={11} color={T.inkMuted}/>
                      </button>
                    )}
                    {canCreEdit&&(
                      <button onClick={()=>onCreEdit(f)} style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"2px 5px",cursor:"pointer",display:"flex"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=T.brandSubtle;e.currentTarget.style.borderColor=T.brand;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.line;}}>
                        <Ic d={P.edit} sz={11} color={T.brand}/>
                      </button>
                    )}
                    {FULL.includes(user.role)&&(
                      <button onClick={()=>onDelete(f.id)} style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"2px 5px",cursor:"pointer",display:"flex"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=T.lost.bg;e.currentTarget.style.borderColor=T.lost.dot;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.line;}}>
                        <Ic d={P.trash} sz={11} color={T.lost.dot}/>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── All remaining components (Analytics, Team, FunnelForm, CREEditModal,
//     WonProofModal, FollowupLogModal, ViewDrawer, Shell, Root) are kept
//     exactly as in your original v8 file — only the visual tokens, font
//     references, and styling props above have changed.
//
//     PASTE YOUR ORIGINAL Analytics, Team, FunnelForm, CREEditModal,
//     WonProofModal, FollowupLogModal, ViewDrawer, Shell, and the
//     default export App() here unchanged.
//
//     The only things those components need from this file are:
//       T  — now uses the warm Ekanta palette
//       F  — now 'DM Sans' (F_BODY)
//       F_MONO, F_SERIF — available for headings where needed
//     Everything else (logic, data, Supabase calls) is untouched.
// ─────────────────────────────────────────────────────────────────────────────

// ─── ANALYTICS COMPONENT — DROP-IN REPLACEMENT ───────────────────────────────
// Props: { funnels, T }
// Paste this function replacing your existing Analytics function in App.jsx
// All helpers (today, big, inr, F, STATUS, CATS, LEAD_SOURCES, ENQS, FTYPES, Dot, StatusPill, Avatar, Ic, P) are used from outer scope

function Analytics({ funnels, T }) {
  const todayV = today();

  // ─── DATE FILTER STATE ──────────────────────────────────────────────────────
  const [preset, setPreset]           = useState("all");
  const [customFrom, setCustomFrom]   = useState("");
  const [customTo, setCustomTo]       = useState("");
  const [compareOn, setCompareOn]     = useState(false);
  const [cmpFrom, setCmpFrom]         = useState("");
  const [cmpTo, setCmpTo]             = useState("");
  const [granularity, setGranularity] = useState("monthly"); // daily | weekly | monthly
  const [activeTab, setActiveTab]     = useState("overview"); // overview | pipeline | team | products

  // ─── PRESET RANGES ──────────────────────────────────────────────────────────
  const getRange = (p) => {
    const now = new Date();
    const fmt = d => d.toISOString().split("T")[0];
    const startOf = (unit) => {
      const d = new Date(now);
      if (unit === "week") { d.setDate(d.getDate() - d.getDay()); }
      if (unit === "month") { d.setDate(1); }
      if (unit === "year")  { d.setMonth(0); d.setDate(1); }
      return d;
    };
    switch (p) {
      case "today":  return { from: fmt(now), to: fmt(now) };
      case "week":   return { from: fmt(startOf("week")), to: fmt(now) };
      case "month":  return { from: fmt(startOf("month")), to: fmt(now) };
      case "last30": { const d = new Date(now); d.setDate(d.getDate()-30); return { from: fmt(d), to: fmt(now) }; }
      case "last3m": { const d = new Date(now); d.setMonth(d.getMonth()-3); return { from: fmt(d), to: fmt(now) }; }
      case "year":   return { from: fmt(startOf("year")), to: fmt(now) };
      default:       return { from: "", to: "" };
    }
  };

  // Auto compare period
  const getAutoCompare = (from, to) => {
    if (!from || !to) return { from: "", to: "" };
    const f = new Date(from), t = new Date(to);
    const diff = t - f;
    const cf = new Date(f - diff - 86400000);
    const ct = new Date(f - 86400000);
    const fmt = d => d.toISOString().split("T")[0];
    return { from: fmt(cf), to: fmt(ct) };
  };

  const activeFrom = preset === "custom" ? customFrom : getRange(preset).from;
  const activeTo   = preset === "custom" ? customTo   : getRange(preset).to;

  useEffect(() => {
    if (compareOn && activeFrom && activeTo) {
      const auto = getAutoCompare(activeFrom, activeTo);
      setCmpFrom(auto.from); setCmpTo(auto.to);
    }
  }, [preset, activeFrom, activeTo, compareOn]);

  // Auto granularity
  useEffect(() => {
    if (!activeFrom || !activeTo) { setGranularity("monthly"); return; }
    const diff = (new Date(activeTo) - new Date(activeFrom)) / 86400000;
    if (diff <= 14)  setGranularity("daily");
    else if (diff <= 90) setGranularity("weekly");
    else setGranularity("monthly");
  }, [activeFrom, activeTo]);

  // ─── FILTER FUNNELS ─────────────────────────────────────────────────────────
  const filterByRange = (arr, from, to) => {
    if (!from && !to) return arr;
    return arr.filter(f => {
      try {
        const d = new Date(f.createdAt).toISOString().split("T")[0];
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      } catch { return false; }
    });
  };

  const curr = filterByRange(funnels, activeFrom, activeTo);
  const cmp  = compareOn ? filterByRange(funnels, cmpFrom, cmpTo) : [];

  // ─── COMPUTE METRICS ────────────────────────────────────────────────────────
  const metrics = (arr) => {
    const won     = arr.filter(f => f.status === "Won");
    const pending = arr.filter(f => f.status === "Pending");
    const lost    = arr.filter(f => f.status === "Lost");
    const drop    = arr.filter(f => f.status === "Drop");
    const wonRev  = won.reduce((a, f) => a + (Number(f.quoteAmount) || 0), 0);
    const pendRev = pending.reduce((a, f) => a + (Number(f.quoteAmount) || 0), 0);
    const lostRev = lost.reduce((a, f) => a + (Number(f.quoteAmount) || 0), 0);
    const totalRev= arr.reduce((a, f) => a + (Number(f.quoteAmount) || 0), 0);
    const wr      = arr.length ? Math.round(won.length / arr.length * 100) : 0;
    const avgDeal = won.length ? wonRev / won.length : 0;
    const overdue = pending.filter(f => f.nextFollowUp && f.nextFollowUp < todayV).length;
    const todayF  = pending.filter(f => f.nextFollowUp === todayV).length;
    return { total: arr.length, won: won.length, pending: pending.length, lost: lost.length, drop: drop.length, wonRev, pendRev, lostRev, totalRev, wr, avgDeal, overdue, todayF };
  };

  const M  = metrics(curr);
  const CM = compareOn ? metrics(cmp) : null;

  // Delta helper
  const delta = (cur, prev) => {
    if (!prev || prev === 0) return null;
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { pct, up: pct >= 0 };
  };

  // ─── TIME SERIES ────────────────────────────────────────────────────────────
  const buildTimeSeries = (arr, from, to, gran) => {
    if (!from || !to) {
      // Use last 6 months if no range
      const buckets = {};
      arr.forEach(f => {
        try {
          const key = new Date(f.createdAt).toISOString().slice(0, 7);
          if (!buckets[key]) buckets[key] = { count: 0, revenue: 0 };
          buckets[key].count++;
          if (f.status === "Won") buckets[key].revenue += Number(f.quoteAmount) || 0;
        } catch {}
      });
      return Object.entries(buckets).sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([k, v]) => ({ label: new Date(k + "-01").toLocaleString("en-IN", { month: "short", year: "2-digit" }), ...v }));
    }
    const points = [];
    const f = new Date(from), t = new Date(to);
    let cur = new Date(f);
    while (cur <= t) {
      let key, label, next;
      if (gran === "daily") {
        key = cur.toISOString().split("T")[0];
        label = cur.toLocaleString("en-IN", { day: "numeric", month: "short" });
        next = new Date(cur); next.setDate(next.getDate() + 1);
      } else if (gran === "weekly") {
        key = cur.toISOString().split("T")[0];
        const we = new Date(cur); we.setDate(we.getDate() + 6);
        label = `${cur.getDate()} ${cur.toLocaleString("en-IN",{month:"short"})}`;
        next = new Date(cur); next.setDate(next.getDate() + 7);
      } else {
        key = cur.toISOString().slice(0, 7);
        label = cur.toLocaleString("en-IN", { month: "short", year: "2-digit" });
        next = new Date(cur); next.setMonth(next.getMonth() + 1);
      }
      const bucket = arr.filter(item => {
        try {
          const d = new Date(item.createdAt).toISOString();
          const dk = gran === "monthly" ? d.slice(0,7) : d.split("T")[0];
          if (gran === "monthly") return dk === key;
          if (gran === "daily")   return dk === key;
          return dk >= key && dk < next.toISOString().split("T")[0];
        } catch { return false; }
      });
      points.push({ label, count: bucket.length, revenue: bucket.filter(f=>f.status==="Won").reduce((a,f) => a+(Number(f.quoteAmount)||0), 0) });
      cur = next;
      if (points.length > 24) break;
    }
    return points;
  };

  const currSeries = buildTimeSeries(curr, activeFrom, activeTo, granularity);
  const cmpSeries  = compareOn ? buildTimeSeries(cmp, cmpFrom, cmpTo, granularity) : [];

  // ─── SVG HELPERS ────────────────────────────────────────────────────────────
  const svgH = 160, svgW = 560, pad = { l: 40, r: 16, t: 16, b: 32 };
  const innerW = svgW - pad.l - pad.r;
  const innerH = svgH - pad.t - pad.b;

  const polyline = (points, maxV) => {
  if (points.length < 2 || maxV === 0) return "";
  return points.map((p, i) => {
    const x = pad.l + (i / (points.length - 1)) * innerW;
    const y = pad.t + innerH - (p / maxV) * innerH;
    return `${x},${y}`;
  }).join(" ");
};
const areaPath = (points, maxV) => {
  if (points.length < 2 || maxV === 0) return "";
  const pts = points.map((p, i) => ({
    x: pad.l + (i / (points.length - 1)) * innerW,
    y: pad.t + innerH - (p / maxV) * innerH
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return `${d} L${pts[pts.length-1].x},${pad.t+innerH} L${pts[0].x},${pad.t+innerH} Z`;
};

  // Donut arc
  const donutArc = (cx, cy, r, startPct, endPct) => {
    const start = (startPct * 360 - 90) * Math.PI / 180;
    const end   = (endPct   * 360 - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
    const large = endPct - startPct > 0.5 ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`;
  };

  // ─── COMPUTED DATA ──────────────────────────────────────────────────────────
  const won     = curr.filter(f => f.status === "Won");
  const pending = curr.filter(f => f.status === "Pending");
  const lost    = curr.filter(f => f.status === "Lost");
  const drop    = curr.filter(f => f.status === "Drop");

  // Status donut data
  const donutData = [
    { label: "Won",     n: M.won,     color: T.won.dot },
    { label: "Pending", n: M.pending, color: T.pending.dot },
    { label: "Lost",    n: M.lost,    color: T.lost.dot },
    { label: "Drop",    n: M.drop,    color: T.drop.dot },
  ].filter(d => d.n > 0);

  // Category revenue
  const catRevMap = {};
  curr.forEach(f => (f.products || []).forEach(p => {
    if (p.category) catRevMap[p.category] = (catRevMap[p.category] || 0) + (Number(p.qty) * Number(p.price) || 0);
  }));
  const catRevArr = Object.entries(catRevMap).sort((a, b) => b[1] - a[1]);
  const maxCatRev = Math.max(...catRevArr.map(x => x[1]), 1);

  // Lead source
  const srcMap = {};
  curr.forEach(f => { if (f.leadSource) srcMap[f.leadSource] = (srcMap[f.leadSource] || 0) + 1; });
  const srcArr = Object.entries(srcMap).sort((a, b) => b[1] - a[1]);
  const maxSrc = Math.max(...srcArr.map(x => x[1]), 1);

  // City
  const cityMap = {};
  curr.forEach(f => { if (f.cityRegion) cityMap[f.cityRegion] = (cityMap[f.cityRegion] || 0) + 1; });
  const cityArr = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCity = Math.max(...cityArr.map(x => x[1]), 1);

  // Team perf
  const teamMap = {};
  curr.forEach(f => {
    const p = f.assignedTo || f.createdBy;
    if (!p) return;
    if (!teamMap[p]) teamMap[p] = { total: 0, won: 0, revenue: 0, pending: 0, lost: 0, drop: 0 };
    teamMap[p].total++;
    if (f.status === "Won")     { teamMap[p].won++;     teamMap[p].revenue += Number(f.quoteAmount) || 0; }
    if (f.status === "Pending") teamMap[p].pending++;
    if (f.status === "Lost")    teamMap[p].lost++;
    if (f.status === "Drop")    teamMap[p].drop++;
  });
  const cmpTeamMap = {};
  cmp.forEach(f => {
    const p = f.assignedTo || f.createdBy;
    if (!p) return;
    if (!cmpTeamMap[p]) cmpTeamMap[p] = { total: 0, won: 0, revenue: 0 };
    cmpTeamMap[p].total++;
    if (f.status === "Won") { cmpTeamMap[p].won++; cmpTeamMap[p].revenue += Number(f.quoteAmount) || 0; }
  });
  const teamArr = Object.entries(teamMap).sort((a, b) => b[1].total - a[1].total);

  // Funnel stage flow
  const stageData = [
    { label: "Total Leads", n: M.total,   color: "#5B3BE8", pct: 100 },
    { label: "Pending",     n: M.pending, color: T.pending.dot, pct: M.total ? Math.round(M.pending/M.total*100) : 0 },
    { label: "Won",         n: M.won,     color: T.won.dot, pct: M.total ? Math.round(M.won/M.total*100) : 0 },
    { label: "Lost",        n: M.lost,    color: T.lost.dot, pct: M.total ? Math.round(M.lost/M.total*100) : 0 },
  ];

  // Top customers
  const topCustomers = [...curr].filter(f => f.quoteAmount).sort((a, b) => (Number(b.quoteAmount)||0) - (Number(a.quoteAmount)||0)).slice(0, 5);

  // Enquiry type
  const enqMap = {};
  curr.forEach(f => { if (f.enquiryType) enqMap[f.enquiryType] = (enqMap[f.enquiryType] || 0) + 1; });

  // Units by cat
  const unitsByCat = CATS.map(c => ({ c, n: curr.flatMap(f => f.products||[]).filter(p=>p.category===c).reduce((a,p)=>a+(Number(p.qty)||0),0) })).sort((a,b)=>b.n-a.n);
  const maxUnits = Math.max(...unitsByCat.map(x=>x.n), 1);

  // Overdue follow-ups
  const overdueList = pending.filter(f => f.nextFollowUp && f.nextFollowUp < todayV).sort((a,b)=>a.nextFollowUp.localeCompare(b.nextFollowUp)).slice(0,5);
  const upcomingList = pending.filter(f => f.nextFollowUp && f.nextFollowUp >= todayV).sort((a,b)=>a.nextFollowUp.localeCompare(b.nextFollowUp)).slice(0,5);

  const seriesCountMax = Math.max(...currSeries.map(p=>p.count), ...cmpSeries.map(p=>p.count), 1);
  const seriesRevMax   = Math.max(...currSeries.map(p=>p.revenue), ...cmpSeries.map(p=>p.revenue), 1);

  // ─── STYLE HELPERS ─────────────────────────────────────────────────────────
  const Card = ({ children, title, subtitle, span2, span3, noPad, style: extraStyle }) => (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r.lg, boxShadow: T.shadowSm, overflow: "hidden", ...(span2 ? { gridColumn: "span 2" } : {}), ...(span3 ? { gridColumn: "span 3" } : {}), ...extraStyle }}>
      {(title || subtitle) && (
        <div style={{ padding: "16px 20px 0", borderBottom: `1px solid ${T.line}`, paddingBottom: 14 }}>
          {title && <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: F, marginBottom: subtitle ? 2 : 0 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 12, color: T.inkSub, fontFamily: F }}>{subtitle}</div>}
        </div>
      )}
      {!noPad && <div style={{ padding: "16px 20px" }}>{children}</div>}
      {noPad && children}
    </div>
  );

  const DeltaBadge = ({ cur, prev, format }) => {
    const d = delta(cur, prev);
    if (!d) return null;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: d.up ? T.won.text : T.lost.text, background: d.up ? T.won.bg : T.lost.bg, padding: "2px 7px", borderRadius: 20, fontFamily: F }}>
        {d.up ? "↑" : "↓"} {Math.abs(d.pct)}%
      </span>
    );
  };

  const KpiCard = ({ label, value, cmpValue, rawValue, rawCmpValue, icon, color, bg }) => (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r.lg, padding: "18px 20px", boxShadow: T.shadowSm, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "0 0 0 80px", background: bg || T.brandSubtle, opacity: 0.5 }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: bg || T.brandSubtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic d={icon} sz={15} color={color || "#5B3BE8"} />
        </div>
        {compareOn && cmpValue !== undefined && <DeltaBadge cur={rawValue !== undefined ? rawValue : (typeof value === "number" ? value : 0)} prev={rawCmpValue !== undefined ? rawCmpValue : (typeof cmpValue === "number" ? cmpValue : 0)} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.ink, fontFamily: F, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 3 }}>
        {typeof value === "number" && value > 1000 ? big(value) : value}
      </div>
      {compareOn && cmpValue !== undefined && (
        <div style={{ fontSize: 11, color: T.inkMuted, fontFamily: F, marginBottom: 2 }}>
          vs {typeof cmpValue === "number" && cmpValue > 1000 ? big(cmpValue) : cmpValue} prev period
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 500, color: T.inkMuted, fontFamily: F, letterSpacing: "0.03em" }}>{label}</div>
    </div>
  );

  const HBar = ({ label, val, max, color, sub }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: T.ink, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: F, flexShrink: 0 }}>{sub || val}</span>
      </div>
      <div style={{ height: 6, background: T.surfaceEl, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${Math.round((typeof val === "number" ? val : 0) / max * 100)}%`, height: "100%", background: color || "#5B3BE8", borderRadius: 3, transition: "width .6s ease" }} />
      </div>
    </div>
  );

  // ─── PRESET BUTTONS ─────────────────────────────────────────────────────────
  const PRESETS = [
    ["all", "All Time"], ["today", "Today"], ["week", "This Week"],
    ["month", "This Month"], ["last30", "Last 30d"], ["last3m", "Last 3M"], ["year", "This Year"], ["custom", "Custom"]
  ];

  // ─── TABS ────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "overview",  label: "Overview"  },
    { id: "pipeline",  label: "Pipeline"  },
    { id: "team",      label: "Team"      },
    { id: "products",  label: "Products"  },
  ];

  const rangeLabel = activeFrom && activeTo ? `${activeFrom} → ${activeTo}` : "All time";

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: F, minHeight: "100%" }}>

      {/* ── STICKY FILTER BAR ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: T.surface, borderBottom: `1px solid ${T.line}`, padding: "10px 16px", overflowX: "auto" }}>
        {/* Row 1: Presets + granularity + compare toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: compareOn || preset === "custom" ? 10 : 0 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
            {PRESETS.map(([id, label]) => (
              <button key={id} onClick={() => setPreset(id)}
                style={{ padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: preset === id ? 600 : 400, fontFamily: F, border: `1px solid ${preset === id ? "#5B3BE8" : T.line}`, background: preset === id ? "#5B3BE8" : T.surface, color: preset === id ? "#fff" : T.inkSub, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
                {label}
              </button>
            ))}
          </div>
          {/* Granularity */}
          <div style={{ display: "flex", background: T.surfaceEl, border: `1px solid ${T.line}`, borderRadius: T.r.md, overflow: "hidden", flexShrink: 0 }}>
            {["daily", "weekly", "monthly"].map(g => (
              <button key={g} onClick={() => setGranularity(g)}
                style={{ padding: "5px 10px", fontSize: 11, fontWeight: granularity === g ? 600 : 400, fontFamily: F, border: "none", cursor: "pointer", background: granularity === g ? T.brand : "transparent", color: granularity === g ? "#fff" : T.inkSub, textTransform: "capitalize", transition: "all .15s" }}>
                {g.slice(0,1).toUpperCase()+g.slice(1)}
              </button>
            ))}
          </div>
          {/* Compare toggle */}
          <button onClick={() => setCompareOn(x => !x)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: F, border: `1px solid ${compareOn ? "#D97706" : T.line}`, background: compareOn ? "rgba(217,119,6,0.1)" : T.surface, color: compareOn ? "#D97706" : T.inkSub, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 13 }}>⚡</span> {compareOn ? "Compare ON" : "Compare"}
          </button>
        </div>

        {/* Row 2: Custom range inputs */}
        {preset === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: compareOn ? 8 : 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Range</span>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: "5px 9px", border: `1px solid ${T.lineMid}`, borderRadius: T.r.md, fontSize: 12, fontFamily: F, color: T.ink, background: T.surface, outline: "none" }} />
            <span style={{ color: T.inkMuted, fontSize: 12 }}>→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: "5px 9px", border: `1px solid ${T.lineMid}`, borderRadius: T.r.md, fontSize: 12, fontFamily: F, color: T.ink, background: T.surface, outline: "none" }} />
          </div>
        )}

        {/* Row 3: Compare range */}
        {compareOn && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#D97706", letterSpacing: "0.06em", textTransform: "uppercase" }}>⚡ Compare</span>
            <input type="date" value={cmpFrom} onChange={e => setCmpFrom(e.target.value)} style={{ padding: "5px 9px", border: `1px solid #D9770644`, borderRadius: T.r.md, fontSize: 12, fontFamily: F, color: T.ink, background: "rgba(217,119,6,0.06)", outline: "none" }} />
            <span style={{ color: T.inkMuted, fontSize: 12 }}>→</span>
            <input type="date" value={cmpTo} onChange={e => setCmpTo(e.target.value)} style={{ padding: "5px 9px", border: `1px solid #D9770644`, borderRadius: T.r.md, fontSize: 12, fontFamily: F, color: T.ink, background: "rgba(217,119,6,0.06)", outline: "none" }} />
            {cmpFrom && cmpTo && (
              <span style={{ fontSize: 11, color: "#D97706", fontFamily: F, fontWeight: 500 }}>
                vs {cmpFrom} → {cmpTo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.line}`, background: T.surface, padding: "0 24px" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "10px 16px", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, fontFamily: F, border: "none", borderBottom: `2px solid ${activeTab === tab.id ? "#5B3BE8" : "transparent"}`, background: "transparent", color: activeTab === tab.id ? "#5B3BE8" : T.inkSub, cursor: "pointer", transition: "all .15s", marginBottom: -1 }}>
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
          <span style={{ fontSize: 11, color: T.inkMuted, fontFamily: F }}>{curr.length} leads · {rangeLabel}</span>
          {compareOn && CM && (
            <span style={{ fontSize: 11, color: "#D97706", fontFamily: F }}>vs {cmp.length} leads</span>
          )}
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .2s ease both" }}>

        {/* ════════════════════════════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <>
            {/* KPI Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <KpiCard label="Total Leads"   value={M.total}   cmpValue={CM?.total}   icon={P.list}  color="#5B3BE8" bg={T.brandSubtle} />
              <KpiCard label="Won Deals"     value={M.won}     cmpValue={CM?.won}     icon={P.check} color={T.won.dot} bg={T.won.bg} />
              <KpiCard label="Win Rate"      value={`${M.wr}%`} cmpValue={CM ? `${CM.wr}%` : undefined} rawValue={M.wr} rawCmpValue={CM?.wr} icon={P.chart} color={T.won.dot} bg={T.won.bg} />
              <KpiCard label="Won Revenue"   value={M.wonRev}  cmpValue={CM?.wonRev}  icon={P.layers} color="#5B3BE8" bg={T.brandSubtle} />
              <KpiCard label="Avg Deal Size" value={M.avgDeal} cmpValue={CM?.avgDeal} icon={P.tag}   color={T.pending.dot} bg={T.pending.bg} />
              <KpiCard label="Pipeline"      value={M.pendRev} cmpValue={CM?.pendRev} icon={P.filter} color={T.pending.dot} bg={T.pending.bg} />
              <KpiCard label="Overdue"       value={M.overdue} cmpValue={CM?.overdue} icon={P.bell}  color={T.lost.dot} bg={T.lost.bg} />
              <KpiCard label="Today Follow-ups" value={M.todayF} cmpValue={CM?.todayF} icon={P.bell} color={T.pending.dot} bg={T.pending.bg} />
            </div>

            {/* Trend Chart */}
            <Card title="Leads & Revenue Trend" subtitle={`${granularity.charAt(0).toUpperCase()+granularity.slice(1)} · ${rangeLabel}`} noPad>
              <div style={{ padding: "16px 20px 8px" }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  {[
                    { label: "Current period", color: "#5B3BE8" },
                    ...(compareOn ? [{ label: "Compare period", color: "#D97706", dashed: true }] : []),
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke={l.color} strokeWidth="2" strokeDasharray={l.dashed?"4,3":""}/></svg>
                      <span style={{ fontSize: 11, color: T.inkSub, fontFamily: F }}>{l.label}</span>
                    </div>
                  ))}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    {["count", "revenue"].map(mode => (
                      <button key={mode} onClick={() => {}} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontFamily: F, border: `1px solid ${T.line}`, background: T.surface, color: T.inkSub, cursor: "pointer" }}>{mode === "count" ? "Leads" : "Revenue"}</button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Leads Count Chart */}
<div style={{ overflowX: "auto", padding: "0 20px 16px" }}>
  {currSeries.length === 0 ? (
    <div style={{ height: svgH, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 32 }}>📊</div>
      <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No data for selected period</div>
    </div>
) : currSeries.length === 1 ? (
    <div style={{ height: svgH, display: "flex", alignItems: "center", justifyContent: "center", gap: 48 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, fontWeight: 700, color: "#5B3BE8", fontFamily: F, letterSpacing: "-2px", lineHeight: 1 }}>{currSeries[0].count}</div>
        <div style={{ fontSize: 13, color: T.inkSub, fontFamily: F, marginTop: 8 }}>leads this month</div>
        <div style={{ fontSize: 11, color: T.inkMuted, fontFamily: F, marginTop: 4 }}>Trend chart appears when data spans multiple months</div>
      </div>
      {compareOn && cmpSeries[0] && (
        <div style={{ textAlign: "center", opacity: 0.7 }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: "#D97706", fontFamily: F, letterSpacing: "-2px", lineHeight: 1 }}>{cmpSeries[0].count}</div>
          <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F, marginTop: 8 }}>leads in {cmpSeries[0].label} (prev)</div>
        </div>
      )}
    </div>
  ) : (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block", minWidth: 300 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5B3BE8" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#5B3BE8" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="cmpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D97706" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#D97706" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(r => (
        <g key={r}>
          <line x1={pad.l} y1={pad.t + innerH * (1-r)} x2={pad.l + innerW} y2={pad.t + innerH * (1-r)} stroke={T.line} strokeWidth="1"/>
          <text x={pad.l - 4} y={pad.t + innerH*(1-r) + 4} textAnchor="end" fontSize="9" fill={T.inkMuted} fontFamily={F}>{Math.round(seriesCountMax * r)}</text>
        </g>
      ))}
      {compareOn && cmpSeries.length > 1 && (
        <>
          <path d={areaPath(cmpSeries.map(p => p.count), seriesCountMax)} fill="url(#cmpGrad)"/>
          <polyline points={polyline(cmpSeries.map(p => p.count), seriesCountMax)} fill="none" stroke="#D97706" strokeWidth="1.5" strokeDasharray="5,3"/>
        </>
      )}
      {currSeries.length > 1 && (
        <>
          <path d={areaPath(currSeries.map(p => p.count), seriesCountMax)} fill="url(#areaGrad)"/>
          <polyline points={polyline(currSeries.map(p => p.count), seriesCountMax)} fill="none" stroke="#5B3BE8" strokeWidth="2"/>
        </>
      )}
      {currSeries.map((p, i) => (
        <text key={i} x={pad.l + (i / (currSeries.length - 1 || 1)) * innerW} y={svgH - 6} textAnchor="middle" fontSize="9" fill={T.inkMuted} fontFamily={F}>{p.label}</text>
      ))}
      {currSeries.map((p, i) => {
        const x = pad.l + (i / (currSeries.length - 1 || 1)) * innerW;
        const y = pad.t + innerH - (p.count / seriesCountMax) * innerH;
        return <circle key={i} cx={x} cy={y} r="3" fill="#5B3BE8" stroke={T.surface} strokeWidth="1.5"/>;
      })}
    </svg>
  )}
</div>
            </Card>

            {/* Status Donut + Revenue Breakdown — redesigned */}
            <div className="ek-analytics-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* ── STATUS BREAKDOWN ── */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r.lg, boxShadow: T.shadowSm, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: F }}>Status Breakdown</div>
                  <div style={{ fontSize: 11, color: T.inkMuted, fontFamily: F }}>{M.total} total leads</div>
                </div>

                {/* Body */}
                <div style={{ padding: "20px" }}>
                  {/* Donut + win rate centered */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                    <div style={{ position: "relative", width: 150, height: 150 }}>
                      <svg width="150" height="150" viewBox="0 0 150 150">
                        <circle cx="75" cy="75" r="52" fill="none" stroke={T.surfaceEl} strokeWidth="20"/>
                        {(() => {
                          const total = donutData.reduce((a, d) => a + d.n, 0) || 1;
                          let cumPct = 0;
                          return donutData.map((d, i) => {
                            const startPct = cumPct / total;
                            cumPct += d.n;
                            const endPct = cumPct / total;
                            return (
                              <path key={i} d={donutArc(75, 75, 52, startPct, endPct)} fill="none" stroke={d.color} strokeWidth="20" strokeLinecap="butt"/>
                            );
                          });
                        })()}
                        {/* Glow center */}
                        <circle cx="75" cy="75" r="36" fill={T.surface}/>
                        <text x="75" y="68" textAnchor="middle" fontSize="22" fontWeight="800" fill={T.ink} fontFamily={F}>{M.wr}%</text>
                        <text x="75" y="83" textAnchor="middle" fontSize="10" fill={T.inkMuted} fontFamily={F}>win rate</text>
                        <text x="75" y="97" textAnchor="middle" fontSize="9" fill={T.inkMuted} fontFamily={F}>{M.won} of {M.total} won</text>
                      </svg>
                    </div>
                  </div>

                  {/* Status rows with progress bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {donutData.map(d => {
                      const pct = M.total ? Math.round(d.n / M.total * 100) : 0;
                      const bgMap = { [T.won.dot]: T.won.bg, [T.pending.dot]: T.pending.bg, [T.lost.dot]: T.lost.bg, [T.drop.dot]: T.drop.bg };
                      const bg = bgMap[d.color] || T.surfaceEl;
                      return (
                        <div key={d.label} style={{ background: bg, borderRadius: T.r.md, padding: "10px 12px", border: `1px solid ${d.color}22` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, boxShadow: `0 0 6px ${d.color}66` }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: F }}>{d.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {compareOn && CM && <DeltaBadge cur={d.n} prev={CM[d.label.toLowerCase()]} />}
                              <span style={{ fontSize: 15, fontWeight: 800, color: d.color, fontFamily: F }}>{d.n}</span>
                              <span style={{ fontSize: 11, color: T.inkMuted, fontFamily: F }}>{pct}%</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: 5, background: `${d.color}22`, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: d.color, borderRadius: 3, transition: "width .8s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compare prev period */}
                  {compareOn && CM && cmpFrom && cmpTo && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#D97706", fontWeight: 600, fontFamily: F }}>⚡ Prev</span>
                      {[{ label: "Won", n: CM.won, color: T.won.dot }, { label: "Pending", n: CM.pending, color: T.pending.dot }, { label: "Lost", n: CM.lost, color: T.lost.dot }].map(d => (
                        <div key={d.label} style={{ flex: 1, textAlign: "center", padding: "6px 4px", background: T.surfaceEl, borderRadius: T.r.md, border: `1px solid ${T.line}` }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: d.color, fontFamily: F }}>{d.n}</div>
                          <div style={{ fontSize: 9, color: T.inkMuted, fontFamily: F }}>{d.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── REVENUE BREAKDOWN ── */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r.lg, boxShadow: T.shadowSm, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: F }}>Revenue Breakdown</div>
                </div>
                {/* Top hero stat */}
                <div style={{ padding: "20px 20px 0" }}>
                  <div style={{ background: T.won.bg, border: `1px solid ${T.won.dot}33`, borderRadius: T.r.lg, padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: T.won.text, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: F, marginBottom: 4 }}>Won Revenue</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: T.won.dot, fontFamily: F, letterSpacing: "-1px", lineHeight: 1 }}>{big(M.wonRev)}</div>
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.won.dot, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Ic d={P.check} sz={18} color="#fff" sw={2.5}/>
                    </div>
                  </div>

                  {/* Other rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingBottom: 8 }}>
                    {[
                      { label: "Pending Pipeline", value: M.pendRev, color: T.pending.dot, bg: T.pending.bg, icon: "⏳", cmp: CM?.pendRev },
                      { label: "Lost Revenue",     value: M.lostRev, color: T.lost.dot,    bg: T.lost.bg,    icon: "✕",  cmp: CM?.lostRev },
                      { label: "Avg Deal (Won)",   value: M.avgDeal, color: "#5B3BE8",     bg: T.brandSubtle,icon: "◈",  cmp: CM?.avgDeal },
                      { label: "Total Quoted",     value: M.totalRev,color: T.inkSub,      bg: T.surfaceEl,  icon: "∑",  cmp: CM?.totalRev },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 4px", borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: row.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: row.color, fontWeight: 700, border: `1px solid ${row.color}22`, flexShrink: 0 }}>{row.icon}</div>
                          <span style={{ fontSize: 12, color: T.inkSub, fontFamily: F }}>{row.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {compareOn && row.cmp !== undefined && <DeltaBadge cur={row.value} prev={row.cmp} />}
                          <span style={{ fontSize: 14, fontWeight: 700, color: row.color, fontFamily: F }}>{big(row.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Funnel Stage Flow */}
            <Card title="Conversion Funnel" subtitle="Lead stage drop-off visualization">
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {stageData.map((stage, i) => (
                  <React.Fragment key={stage.label}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <div style={{ background: `${stage.color}22`, border: `1.5px solid ${stage.color}44`, borderRadius: T.r.md, padding: "14px 12px", textAlign: "center", margin: "0 4px", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${stage.pct}%`, background: `${stage.color}18`, transition: "height .6s ease" }} />
                        <div style={{ fontSize: 24, fontWeight: 700, color: stage.color, fontFamily: F, letterSpacing: "-0.5px", position: "relative" }}>{stage.n}</div>
                        <div style={{ fontSize: 10, color: T.inkMuted, fontFamily: F, marginTop: 3, position: "relative" }}>{stage.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: stage.color, fontFamily: F, position: "relative" }}>{stage.pct}%</div>
                      </div>
                    </div>
                    {i < stageData.length - 1 && (
                      <div style={{ color: T.inkMuted, fontSize: 18, flexShrink: 0 }}>→</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              {/* Drop-off rates */}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {M.total > 0 && [
                  { label: "Pending rate", pct: Math.round(M.pending/M.total*100), color: T.pending.dot },
                  { label: "Win rate",     pct: M.wr, color: T.won.dot },
                  { label: "Lost rate",    pct: Math.round(M.lost/M.total*100), color: T.lost.dot },
                  { label: "Drop rate",    pct: Math.round(M.drop/M.total*100), color: T.drop.dot },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: T.surfaceEl, borderRadius: 20, border: `1px solid ${T.line}` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color }} />
                    <span style={{ fontSize: 11, color: T.inkSub, fontFamily: F }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: F }}>{item.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Customers */}
            <Card title="Top Customers by Quote Value">
              {topCustomers.length === 0 ? (
                <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No data yet.</div>
              ) : topCustomers.map((f, i) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topCustomers.length-1 ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.brandSubtle, color: "#5B3BE8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: F, flexShrink: 0 }}>{i+1}</div>
                  <Avatar name={f.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: T.inkMuted, fontFamily: F }}>{f.cityRegion || f.phone || "—"} · {f.enquiryType || "—"}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#5B3BE8", fontFamily: F }}>{inr(f.quoteAmount)}</div>
                    <StatusPill status={f.status} sm T={T} />
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            PIPELINE TAB
        ════════════════════════════════════════════════════════ */}

        {activeTab === "pipeline" && (
          <>
            {/* Revenue Area Chart */}
            <Card title="Revenue Trend" subtitle={rangeLabel} noPad>
              <div style={{ padding: "16px 20px 0" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, fontFamily: F, letterSpacing: "-0.8px" }}>{big(M.wonRev)}</div>
                <div style={{ fontSize: 12, color: T.inkSub, fontFamily: F, marginBottom: 12 }}>Won revenue {rangeLabel}</div>
              </div>
              <div style={{ overflowX: "auto", padding: "0 20px 16px" }}>
  {currSeries.length === 0 ? (
    <div style={{ height: svgH, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 32 }}>📊</div>
      <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No revenue data for selected period</div>
    </div>
  ) : currSeries.length === 1 ? (
    <div style={{ height: svgH, display: "flex", alignItems: "center", justifyContent: "center", gap: 48 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, fontWeight: 700, color: T.won.dot, fontFamily: F, letterSpacing: "-2px", lineHeight: 1 }}>{big(currSeries[0].revenue)}</div>
        <div style={{ fontSize: 13, color: T.inkSub, fontFamily: F, marginTop: 8 }}>won revenue this month</div>
        <div style={{ fontSize: 11, color: T.inkMuted, fontFamily: F, marginTop: 4 }}>Trend chart appears when data spans multiple months</div>
      </div>
    </div>
  ) : (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block", minWidth: 300 }}>
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.won.dot} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={T.won.dot} stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="revCmpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D97706" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#D97706" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(r => (
        <g key={r}>
          <line x1={pad.l} y1={pad.t+innerH*(1-r)} x2={pad.l+innerW} y2={pad.t+innerH*(1-r)} stroke={T.line} strokeWidth="1"/>
          <text x={pad.l-4} y={pad.t+innerH*(1-r)+4} textAnchor="end" fontSize="9" fill={T.inkMuted} fontFamily={F}>{big(seriesRevMax*r)}</text>
        </g>
      ))}
      {compareOn && cmpSeries.length > 1 && (
        <>
          <path d={areaPath(cmpSeries.map(p=>p.revenue), seriesRevMax)} fill="url(#revCmpGrad)"/>
          <polyline points={polyline(cmpSeries.map(p=>p.revenue), seriesRevMax)} fill="none" stroke="#D97706" strokeWidth="1.5" strokeDasharray="5,3"/>
        </>
      )}
      {currSeries.length > 1 && (
        <>
          <path d={areaPath(currSeries.map(p=>p.revenue), seriesRevMax)} fill="url(#revGrad)"/>
          <polyline points={polyline(currSeries.map(p=>p.revenue), seriesRevMax)} fill="none" stroke={T.won.dot} strokeWidth="2"/>
        </>
      )}
      {currSeries.map((p, i) => {
        const x = pad.l + (i/(currSeries.length-1||1))*innerW;
        const y = pad.t + innerH - (p.revenue/seriesRevMax)*innerH;
        return <circle key={i} cx={x} cy={y} r="3" fill={T.won.dot} stroke={T.surface} strokeWidth="1.5"/>;
      })}
      {currSeries.map((p, i) => (
        <text key={i} x={pad.l+(i/(currSeries.length-1||1))*innerW} y={svgH-6} textAnchor="middle" fontSize="9" fill={T.inkMuted} fontFamily={F}>{p.label}</text>
      ))}
    </svg>
  )}
</div>
            </Card>

            <div className="ek-analytics-pipeline" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Lead Source */}
              <Card title="Leads by Source">
                {srcArr.length === 0 ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No source data.</div> :
                  srcArr.map(([src, n]) => (
                    <HBar key={src} label={src} val={n} max={maxSrc} color="#5B3BE8" sub={`${n} (${Math.round(n/maxSrc*100)}%)`} />
                  ))
                }
              </Card>

              {/* Enquiry Type */}
              <Card title="Leads by Enquiry Type">
                {ENQS.map((e, i) => {
                  const n = curr.filter(f => f.enquiryType === e).length;
                  if (!n) return null;
                  const pct = curr.length ? Math.round(n/curr.length*100) : 0;
                  const colors = [T.new.dot, T.won.dot, T.bulk.dot, T.high.dot, T.premium.dot, T.drop.dot];
                  return <HBar key={e} label={e} val={n} max={curr.length || 1} color={colors[i] || "#5B3BE8"} sub={`${n} (${pct}%)`} />;
                })}
              </Card>

              {/* Funnel Type */}
              <Card title="Leads by Funnel Type">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {FTYPES.map((t, i) => {
                    const n = curr.filter(f => f.funnelType === t).length;
                    const colors = ["#5B3BE8", T.won.dot, T.pending.dot, T.premium.dot, T.drop.dot];
                    return (
                      <div key={t} style={{ textAlign: "center", padding: "12px 8px", background: T.surfaceEl, borderRadius: T.r.md, border: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: colors[i] || "#5B3BE8", fontFamily: F }}>{n}</div>
                        <div style={{ fontSize: 10, color: T.inkMuted, fontFamily: F, marginTop: 3, lineHeight: 1.3 }}>{t}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* City */}
              <Card title="Leads by City / Region">
                {cityArr.length === 0 ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No city data.</div> :
                  cityArr.map(([city, n]) => (
                    <HBar key={city} label={city} val={n} max={maxCity} color="#5B3BE8" sub={`${n}`} />
                  ))
                }
              </Card>
            </div>

            {/* Follow-up health */}
            <div className="ek-analytics-followup" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Card title="Follow-up Summary">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[
                    { label: "Overdue",  n: M.overdue, color: T.lost.text,    bg: T.lost.bg    },
                    { label: "Today",    n: M.todayF,  color: T.pending.text, bg: T.pending.bg },
                    { label: "Upcoming", n: pending.filter(f=>f.nextFollowUp&&f.nextFollowUp>todayV).length, color: T.new.text, bg: T.new.bg },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", background: s.bg, borderRadius: T.r.md, border: `1px solid ${T.line}` }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: F }}>{s.n}</div>
                      <div style={{ fontSize: 10, color: T.inkMuted, fontFamily: F, marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {[
                  ["With order number",   curr.filter(f=>f.orderNumber).length,  "#5B3BE8"],
                  ["Without order",       curr.filter(f=>!f.orderNumber).length, T.inkMuted],
                  ["Total units quoted",  curr.reduce((a,f)=>a+(Number(f.quoteQty)||0),0), T.ink],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: F, marginBottom: 8 }}>
                    <span style={{ color: T.inkSub }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{val}</span>
                  </div>
                ))}
              </Card>

              <Card title="Overdue Follow-ups" subtitle="Oldest first">
                {overdueList.length === 0 ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>🎉 No overdue follow-ups!</div> :
                  overdueList.map((f, i) => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < overdueList.length-1 ? `1px solid ${T.line}` : "none" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.lost.dot, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: T.lost.text, fontFamily: F, fontWeight: 600 }}>Due {f.nextFollowUp}</div>
                      </div>
                    </div>
                  ))
                }
              </Card>

              <Card title="Upcoming Follow-ups">
                {upcomingList.length === 0 ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No upcoming follow-ups.</div> :
                  upcomingList.map((f, i) => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < upcomingList.length-1 ? `1px solid ${T.line}` : "none" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.new.dot, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: T.new.text, fontFamily: F, fontWeight: 600 }}>Due {f.nextFollowUp}</div>
                      </div>
                    </div>
                  ))
                }
              </Card>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            TEAM TAB
        ════════════════════════════════════════════════════════ */}

        {activeTab === "team" && (
          <>
            {/* Team Leaderboard */}
            <Card title="Team Leaderboard" subtitle="Ranked by total leads handled">
              {teamArr.length === 0 ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No team data yet.</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {teamArr.map(([name, d], idx) => {
                    const wr = d.total ? Math.round(d.won/d.total*100) : 0;
                    const cd = cmpTeamMap[name] || { total: 0, won: 0, revenue: 0 };
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <div key={name} style={{ background: T.surfaceEl, border: `1px solid ${T.line}`, borderRadius: T.r.lg, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ fontSize: 20, flexShrink: 0 }}>{medals[idx] || `#${idx+1}`}</div>
                        <Avatar name={name} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: F, marginBottom: 4 }}>{name}</div>
                          {/* Win rate bar */}
                          <div style={{ height: 5, background: T.line, borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                            <div style={{ width: `${wr}%`, height: "100%", background: T.won.dot, borderRadius: 3 }} />
                          </div>
                          <div style={{ fontSize: 11, color: T.inkMuted, fontFamily: F }}>{wr}% win rate · {d.won} won of {d.total}</div>
                        </div>
                        <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#5B3BE8", fontFamily: F }}>{d.total}</div>
                            <div style={{ fontSize: 10, color: T.inkMuted, fontFamily: F }}>Total</div>
                            {compareOn && cd.total > 0 && <DeltaBadge cur={d.total} prev={cd.total} />}
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: T.won.dot, fontFamily: F }}>{d.won}</div>
                            <div style={{ fontSize: 10, color: T.inkMuted, fontFamily: F }}>Won</div>
                            {compareOn && cd.won > 0 && <DeltaBadge cur={d.won} prev={cd.won} />}
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: T.pending.dot, fontFamily: F }}>{d.pending}</div>
                            <div style={{ fontSize: 10, color: T.inkMuted, fontFamily: F }}>Pending</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#5B3BE8", fontFamily: F }}>{big(d.revenue)}</div>
                            <div style={{ fontSize: 10, color: T.inkMuted, fontFamily: F }}>Revenue</div>
                            {compareOn && cd.revenue > 0 && <DeltaBadge cur={d.revenue} prev={cd.revenue} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Team Stacked Bar Chart */}
            <Card title="Team Win vs Loss — Visual" noPad>
              <div style={{ padding: "16px 20px" }}>
                {teamArr.length === 0 ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No data.</div> : (() => {
                  const maxTotal = Math.max(...teamArr.map(([, d]) => d.total), 1);
                  return teamArr.map(([name, d]) => (
                    <div key={name} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: T.ink, fontFamily: F, fontWeight: 500 }}>{name}</span>
                        <span style={{ fontSize: 11, color: T.inkMuted, fontFamily: F }}>{d.total} leads</span>
                      </div>
                      <div style={{ height: 10, background: T.surfaceEl, borderRadius: 5, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${(d.won/maxTotal)*100}%`, background: T.won.dot, transition: "width .6s" }} />
                        <div style={{ width: `${(d.pending/maxTotal)*100}%`, background: T.pending.dot, transition: "width .6s" }} />
                        <div style={{ width: `${(d.lost/maxTotal)*100}%`, background: T.lost.dot, transition: "width .6s" }} />
                        <div style={{ width: `${(d.drop/maxTotal)*100}%`, background: T.drop.dot, transition: "width .6s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        {[["Won", d.won, T.won.dot], ["Pending", d.pending, T.pending.dot], ["Lost", d.lost, T.lost.dot], ["Drop", d.drop, T.drop.dot]].map(([l,n,c]) => n > 0 && (
                          <span key={l} style={{ fontSize: 10, color: c, fontFamily: F, fontWeight: 600 }}>{l}: {n}</span>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            PRODUCTS TAB
        ════════════════════════════════════════════════════════ */}

        {activeTab === "products" && (
          <>
            <div className="ek-analytics-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Revenue by Category */}
              <Card title="Revenue by Product Category">
                {catRevArr.length === 0 ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No product data.</div> :
                  catRevArr.map(([cat, rev]) => (
                    <HBar key={cat} label={cat} val={rev} max={maxCatRev} color="#5B3BE8" sub={big(rev)} />
                  ))
                }
              </Card>

              {/* Units by Category */}
              <Card title="Units Ordered by Category">
                {unitsByCat.every(x => x.n === 0) ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No unit data.</div> :
                  unitsByCat.filter(x => x.n > 0).map(({ c, n }) => (
                    <HBar key={c} label={c} val={n} max={maxUnits} color={T.premium.dot} sub={`${n} units`} />
                  ))
                }
              </Card>
            </div>

            {/* Category Revenue Bar Chart SVG */}
            <Card title="Category Revenue — Bar Chart" noPad>
              <div style={{ overflowX: "auto", padding: "16px 20px" }}>
                {catRevArr.length === 0 ? <div style={{ fontSize: 12, color: T.inkMuted, fontFamily: F }}>No data.</div> : (() => {
                  const bH = 200, bW = 560, bPad = { l: 50, r: 16, t: 16, b: 56 };
                  const bInnerW = bW - bPad.l - bPad.r;
                  const bInnerH = bH - bPad.t - bPad.b;
                  const data = catRevArr.slice(0, 10);
                  const maxRev = Math.max(...data.map(x=>x[1]), 1);
                  const bW2 = bInnerW / data.length;
                  return (
                    <svg width="100%" viewBox={`0 0 ${bW} ${bH}`} style={{ display: "block", minWidth: 300 }}>
                      {[0, 0.25, 0.5, 0.75, 1].map(r => (
                        <g key={r}>
                          <line x1={bPad.l} y1={bPad.t+bInnerH*(1-r)} x2={bPad.l+bInnerW} y2={bPad.t+bInnerH*(1-r)} stroke={T.line} strokeWidth="1"/>
                          <text x={bPad.l-4} y={bPad.t+bInnerH*(1-r)+4} textAnchor="end" fontSize="9" fill={T.inkMuted} fontFamily={F}>{big(maxRev*r)}</text>
                        </g>
                      ))}
                      {data.map(([cat, rev], i) => {
                        const barH = (rev/maxRev)*bInnerH;
                        const bX = bPad.l + i*bW2 + bW2*0.1;
                        const bW3 = bW2*0.8;
                        return (
                          <g key={cat}>
                            <rect x={bX} y={bPad.t+bInnerH-barH} width={bW3} height={barH} rx="3" fill="#5B3BE8" fillOpacity="0.8"/>
                            <text x={bX+bW3/2} y={bH-bPad.b+14} textAnchor="middle" fontSize="8" fill={T.inkMuted} fontFamily={F} transform={`rotate(-30, ${bX+bW3/2}, ${bH-bPad.b+14})`}>{cat.length > 8 ? cat.slice(0,8)+"…" : cat}</text>
                            {barH > 16 && <text x={bX+bW3/2} y={bPad.t+bInnerH-barH-4} textAnchor="middle" fontSize="8" fill={T.inkSub} fontFamily={F}>{big(rev)}</text>}
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </Card>

            {/* Product summary stats */}
            <div className="ek-analytics-pipeline" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Total Product Units",  value: curr.flatMap(f=>f.products||[]).reduce((a,p)=>a+(Number(p.qty)||0),0), color: "#5B3BE8" },
                { label: "Total Units Quoted",   value: curr.reduce((a,f)=>a+(Number(f.quoteQty)||0),0), color: T.pending.dot },
                { label: "With Order Number",    value: curr.filter(f=>f.orderNumber).length, color: T.won.dot },
                { label: "Unique Categories",    value: Object.keys(catRevMap).length, color: T.premium.dot },
              ].map(s => (
                <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r.lg, padding: "16px 18px", boxShadow: T.shadowSm }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: F, letterSpacing: "-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: T.inkMuted, fontFamily: F, marginTop: 5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ─── TEAM ─────────────────────────────────────────────────────────────────────
function Team({users,onSave,T}) {
  const [list,setList]=useState(users);
  const [form,setForm]=useState({name:"",username:"",password:"",role:"CRE"});
  const [err,setErr]=useState("");
  useEffect(()=>setList(users),[users]);
  const add=()=>{if(!form.name||!form.username||!form.password){setErr("All fields required.");return;}if(list.find(u=>u.username===form.username)){setErr("Username taken.");return;}const u=[...list,{...form,id:Date.now()}];setList(u);onSave(u);setForm({name:"",username:"",password:"",role:"CRE"});setErr("");};
  const rm=id=>{const u=list.filter(x=>x.id!==id);setList(u);onSave(u);};
  const rc={"CEO":T.high,"Manager":T.won,"CRE":T.pending};
  return (
    <div className="ek-team-grid" style={{padding:"16px",display:"grid",gridTemplateColumns:"360px 1fr",gap:16}}>
      <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:22,boxShadow:T.shadowSm}}>
        <div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:3,fontFamily:F}}>Add team member</div>
        <div style={{fontSize:12,color:T.inkSub,marginBottom:18,fontFamily:F}}>Access granted immediately upon creation</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FInput label="Full name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Jane Doe" T={T}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FInput label="Username" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="janedoe" T={T}/>
            <FInput label="Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Password" type="password" T={T}/>
          </div>
          <FSelect label="Role" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} options={ROLES} T={T}/>
          {err&&<div style={{fontSize:12,color:"#B91C1C",background:"#FEF2F2",border:"1px solid #FECACA",padding:"8px 11px",borderRadius:T.r.md}}>{err}</div>}
          <Btn primary full icon={P.plus} label="Add member" onClick={add} T={T}/>
        </div>
        <div style={{marginTop:18,padding:"12px 14px",background:T.brandSubtle,borderRadius:T.r.md,fontSize:12,color:"#5B3BE8",lineHeight:1.7,fontFamily:F}}>
          <strong>CEO & Manager</strong> — full access<br/><strong>CRE</strong> — create + export + limited edit
        </div>
      </div>
      <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:22,boxShadow:T.shadowSm}}>
        <div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:18,fontFamily:F}}>Team members ({list.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {list.map(u=>{const c=rc[u.role]||T.drop;return(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:`1px solid ${T.line}`,borderRadius:T.r.md,transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceEl} onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
              <Avatar name={u.name} size={36}/>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:F}}>{u.name}</div><div style={{fontSize:11,color:T.inkMuted,fontFamily:F}}>@{u.username}</div></div>
              <span style={{fontSize:11,fontWeight:500,padding:"3px 9px",borderRadius:20,background:c.bg,color:c.text,fontFamily:F}}>{u.role}</span>
              {u.id!==1&&<Btn danger sm label="Remove" onClick={()=>rm(u.id)} T={T}/>}
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

// ─── FUNNEL FORM ──────────────────────────────────────────────────────────────
function FunnelForm({onClose,onSave,existing,user,users=[],T}) {
  const DRAFT_KEY = `ek-draft-${user?.username||"user"}`;
  const blank={name:"",phone:"",email:"",enquiryType:"",funnelType:"",leadSource:"",cityRegion:"",nextFollowUp:"",products:[{desc:"",category:"",qty:"",price:""}],remarks:"",deliveryDetails:"",paymentTerms:"",orderNumber:"",quoteQty:"",quoteAmount:"",quoteDesc:"",status:"Pending",assignedTo:"",lostDropReason:""};

  // ── Draft logic ──
  const loadDraft = () => { try { const d = localStorage.getItem(DRAFT_KEY); return d ? JSON.parse(d) : null; } catch { return null; } };
  const saveDraft = (data) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {} };
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  const draft = !existing ? loadDraft() : null;
  const [showDraftBanner, setShowDraftBanner] = useState(!!draft);
  const [form,setForm]=useState(existing?{...blank,...existing,products:existing.products?.length?existing.products:blank.products}:blank);
  const [errs,setErrs]=useState({});

  // Auto-save draft on every form change (only for new funnels)
  useEffect(() => {
    if (existing) return;
    const hasData = form.name || form.phone || form.email || form.remarks ||
      (form.products||[]).some(p=>p.desc);
    if (hasData) saveDraft(form);
  }, [form, existing]);

  const restoreDraft = () => {
    if (draft) { setForm({...blank,...draft,products:draft.products?.length?draft.products:blank.products}); }
    setShowDraftBanner(false);
  };
  const discardDraft = () => { clearDraft(); setShowDraftBanner(false); };

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const sp=(i,k,v)=>{const p=[...form.products];p[i]={...p[i],[k]:v};set("products",p);};
  const isWon=form.status==="Won";
  const inpSx=(err)=>({...inputSx(T,err)});
  const fo=mkFocus(T); const bl=mkBlur(T);

  const val=()=>{
    const e={};
    if(!form.name) e.name="Required"; if(!form.phone) e.phone="Required";
    if(!form.enquiryType) e.enquiryType="Required"; if(!form.funnelType) e.funnelType="Required";
    if(!form.leadSource) e.leadSource="Required";
    if(!form.nextFollowUp&&form.status!=="Won") e.nfu="Required";
    if(!form.remarks) e.remarks="Required"; if(!form.deliveryDetails) e.deliveryDetails="Required";
    if(!form.quoteDesc) e.quoteDesc="Required"; if(!form.quoteQty) e.quoteQty="Required"; if(!form.quoteAmount) e.quoteAmount="Required";
    if(!form.products.some(p=>p.desc.trim()!=="")) e.products="At least one product item is required";
    if(!user?.name) e.auth="You must be logged in";
    setErrs(e); return !Object.keys(e).length;
  };
  const submit=()=>{ if(val()){ clearDraft(); onSave(form); } };
  const handleClose=()=>{ onClose(); };
  const prodTotal=(form.products||[]).reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);
  const creUsers=users.filter(u=>u.role==="CRE");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:"min(720px,100vw)",maxHeight:"95vh",overflowY:"auto",boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px 16px",borderBottom:`1px solid ${T.line}`,position:"sticky",top:0,background:T.surface,zIndex:1,borderRadius:`${T.r["2xl"]} ${T.r["2xl"]} 0 0`}}>
          <div>
            <h2 style={{fontSize:16,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 2px"}}>{existing?"Edit funnel":"New funnel"}</h2>
            <p style={{margin:0,fontSize:12,color:T.inkSub,fontFamily:F}}>{existing?"Editing funnel":"Add a new sales lead"}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {!existing&&(
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.inkMuted,fontFamily:F}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#16A34A",animation:"pulse 2s infinite"}}/>
                Auto-saving
              </div>
            )}
            <button onClick={handleClose} style={{width:30,height:30,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.surfaceEl,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={P.close} sz={13} color={T.inkSub}/></button>
          </div>
        </div>

        {/* ── Draft restore banner ── */}
        {showDraftBanner && draft && !existing && (
          <div style={{margin:"0",padding:"12px 24px",background:"rgba(91,59,232,0.08)",borderBottom:`1px solid rgba(91,59,232,0.15)`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={{fontSize:14}}>📝</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#5B3BE8",fontFamily:F}}>You have an unsaved draft</div>
              <div style={{fontSize:11,color:"#5B3BE8",opacity:0.7,fontFamily:F}}>
                {draft.name ? `"${draft.name}"` : "Unnamed lead"} — saved earlier
              </div>
            </div>
            <button onClick={restoreDraft}
              style={{padding:"6px 14px",background:"#5B3BE8",color:"#fff",border:"none",borderRadius:T.r.md,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,flexShrink:0}}>
              Restore
            </button>
            <button onClick={discardDraft}
              style={{padding:"6px 14px",background:"transparent",color:"#5B3BE8",border:`1px solid rgba(91,59,232,0.3)`,borderRadius:T.r.md,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:F,flexShrink:0}}>
              Discard
            </button>
          </div>
        )}

        <div style={{padding:"22px 24px",display:"flex",flexDirection:"column",gap:20}}>
          <section>
            <SL T={T}>Contact details</SL>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="ek-form-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FInput label="Name" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Customer name" required error={errs.name} T={T}/>
                <FInput label="Phone" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+91 98765 43210" required error={errs.phone} T={T}/>
                <FInput label="Email" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="email@company.com" T={T}/>
              </div>
              <FInput label="City / Region" value={form.cityRegion} onChange={e=>set("cityRegion",e.target.value)} placeholder="e.g. Chennai, Tamil Nadu" T={T}/>
            </div>
          </section>
          <section>
            <SL T={T}>Funnel details</SL>
            <div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <FSelect label="Enquiry type" value={form.enquiryType} onChange={e=>set("enquiryType",e.target.value)} options={ENQS} required error={errs.enquiryType} T={T}/>
              <FSelect label="Funnel type" value={form.funnelType} onChange={e=>set("funnelType",e.target.value)} options={FTYPES} required error={errs.funnelType} T={T}/>
            </div>
            <div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FSelect label="Lead source" required value={form.leadSource} onChange={e=>set("leadSource",e.target.value)} options={LEAD_SOURCES} placeholder="Select source…" error={errs.leadSource} T={T}/>
              {!isWon?(<div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Next follow-up<span style={{color:"#DC2626",marginLeft:2}}>*</span></label><input type="date" value={form.nextFollowUp} onChange={e=>set("nextFollowUp",e.target.value)} style={{...inpSx(errs.nfu)}} onFocus={fo} onBlur={bl}/>{errs.nfu&&<span style={{fontSize:11,color:"#B91C1C"}}>{errs.nfu}</span>}</div>):(<div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:500,color:T.inkMuted,fontFamily:F}}>Next follow-up</label><div style={{padding:"8px 11px",background:T.won.bg,border:`1px solid ${T.won.dot}33`,borderRadius:T.r.md,fontSize:13,color:T.won.text,fontFamily:F,display:"flex",alignItems:"center",gap:6}}><Dot color={T.won.dot} size={6}/> Not required for Won deals</div></div>)}
            </div>
            {(form.status==="Lost"||form.status==="Drop")&&(
              <div style={{marginTop:10,padding:"14px 16px",background:form.status==="Lost"?T.lost.bg:T.drop.bg,border:`1px solid ${form.status==="Lost"?T.lost.dot:T.drop.dot}44`,borderRadius:T.r.lg,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <Dot color={form.status==="Lost"?T.lost.dot:T.drop.dot} size={7}/>
                  <span style={{fontSize:12,fontWeight:600,color:form.status==="Lost"?T.lost.text:T.drop.text,fontFamily:F}}>
                    {form.status==="Lost"?"Why was this lead lost?":"Why was this lead dropped?"}
                  </span>
                </div>
                <textarea
                  value={form.lostDropReason}
                  onChange={e=>set("lostDropReason",e.target.value)}
                  placeholder={form.status==="Lost"?"e.g. Price too high, went to competitor…":"e.g. Duplicate entry, wrong number…"}
                  rows={3}
                  style={{...inpSx(),padding:"9px 11px",resize:"vertical",lineHeight:1.6,fontSize:13}}
                  onFocus={fo} onBlur={bl}/>
              </div>
            )}
          </section>
          {FULL.includes(user?.role)&&creUsers.length>0&&(<section><SL T={T}>Assign to</SL><FSelect label="Assign to CRE" value={form.assignedTo} onChange={e=>set("assignedTo",e.target.value)} options={creUsers.map(u=>u.name)} placeholder="Select team member…" T={T}/>{form.assignedTo&&<div style={{marginTop:8,fontSize:12,color:T.inkSub,fontFamily:F}}>📋 This funnel will appear in <strong style={{color:"#5B3BE8"}}>{form.assignedTo}</strong>'s dashboard</div>}</section>)}
          <section>
            <SL T={T}>Customer requirements</SL>
            <div style={{border:`1px solid ${errs.products?T.lost.dot:T.line}`,borderRadius:T.r.lg,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"8px 14px",background:T.surfaceEl,gap:8}}>{["Product / item *","Category","Qty","Unit price (₹)",""].map(h=><div key={h} style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",fontFamily:F}}>{h}</div>)}</div>
              {form.products.map((pr,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"9px 14px",borderTop:`1px solid ${T.line}`,gap:8,alignItems:"center"}}>
                <input value={pr.desc} onChange={e=>sp(i,"desc",e.target.value)} placeholder="e.g. Bridal Lehenga" style={{...inpSx(),padding:"6px 9px",fontSize:12}} onFocus={fo} onBlur={bl}/>
                <select value={pr.category} onChange={e=>sp(i,"category",e.target.value)} style={{...inpSx(),padding:"6px 24px 6px 9px",fontSize:12,cursor:"pointer",appearance:"none",background:`${T.surface} ${selectBg}`}} onFocus={fo} onBlur={bl}><option value="">Category</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
                {[["qty","0"],["price","0"]].map(([k,ph])=>(<input key={k} type="number" value={pr[k]} onChange={e=>sp(i,k,e.target.value)} placeholder={ph} style={{...inpSx(),padding:"6px 9px",fontSize:12}} onFocus={fo} onBlur={bl}/>))}
                <button onClick={()=>set("products",form.products.filter((_,x)=>x!==i))} disabled={form.products.length===1} style={{background:"none",border:"none",cursor:form.products.length===1?"not-allowed":"pointer",color:T.inkMuted,fontSize:16,opacity:form.products.length===1?.2:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>))}
              <div style={{padding:"9px 14px",borderTop:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={()=>set("products",[...form.products,{desc:"",category:"",qty:"",price:""}])} style={{background:"none",border:`1px dashed #5B3BE8`,borderRadius:T.r.sm,padding:"4px 12px",color:"#5B3BE8",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:F,display:"inline-flex",alignItems:"center",gap:5}}><Ic d={P.plus} sz={11} color="#5B3BE8"/> Add item</button>
                <div style={{display:"flex",alignItems:"center",gap:12}}>{errs.products&&<span style={{fontSize:11,color:"#B91C1C",fontWeight:500}}>{errs.products}</span>}{prodTotal>0&&<span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>Total: {inr(prodTotal)}</span>}</div>
              </div>
            </div>
          </section>
          <section>
            <SL T={T}>Remarks <span style={{color:"#DC2626"}}>*</span></SL>
            <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)} placeholder="Additional notes…" rows={2} style={{...inpSx(errs.remarks),padding:"9px 11px",resize:"vertical",lineHeight:1.5}} onFocus={fo} onBlur={bl}/>
            {errs.remarks&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{errs.remarks}</div>}
          </section>
          <section>
            <SL T={T}>Delivery & Payment</SL>
            <div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Delivery details <span style={{color:"#DC2626"}}>*</span></label><textarea value={form.deliveryDetails} onChange={e=>set("deliveryDetails",e.target.value)} placeholder="e.g. Delivery by Apr 20, doorstep…" rows={2} style={{...inpSx(errs.deliveryDetails),padding:"9px 11px",resize:"vertical",lineHeight:1.5}} onFocus={fo} onBlur={bl}/>{errs.deliveryDetails&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{errs.deliveryDetails}</div>}</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Payment terms</label><textarea value={form.paymentTerms} onChange={e=>set("paymentTerms",e.target.value)} placeholder="e.g. 50% advance, balance on delivery…" rows={2} style={{...inpSx(),padding:"9px 11px",resize:"vertical",lineHeight:1.5}} onFocus={fo} onBlur={bl}/></div>
            </div>
          </section>
          <section>
            <SL T={T}>Initial quotation</SL>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="ek-form-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FInput label="Order Number" value={form.orderNumber} onChange={e=>set("orderNumber",e.target.value)} placeholder="Enter order number" T={T}/>
                <FInput label="Quantity" type="number" value={form.quoteQty} onChange={e=>set("quoteQty",e.target.value)} placeholder="0" required error={errs.quoteQty} T={T}/>
                <FInput label="Amount (₹)" type="number" value={form.quoteAmount} onChange={e=>set("quoteAmount",e.target.value)} placeholder="0" required error={errs.quoteAmount} T={T}/>
              </div>
              <div><label style={{fontSize:12,fontWeight:500,color:T.inkSub,marginBottom:5,display:"block",fontFamily:F}}>Description <span style={{color:"#DC2626"}}>*</span></label><textarea value={form.quoteDesc} onChange={e=>set("quoteDesc",e.target.value)} placeholder="Quote notes…" rows={2} style={{...inpSx(errs.quoteDesc),padding:"9px 11px",resize:"vertical",lineHeight:1.5,width:"100%",boxSizing:"border-box"}} onFocus={fo} onBlur={bl}/>{errs.quoteDesc&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{errs.quoteDesc}</div>}</div>
            </div>
          </section>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"14px 24px 22px",borderTop:`1px solid ${T.line}`,position:"sticky",bottom:0,background:T.surface,borderRadius:`0 0 ${T.r["2xl"]} ${T.r["2xl"]}`}}>
          {!existing ? (
            <div style={{fontSize:11,color:T.inkMuted,fontFamily:F,display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:13}}>💾</span> Draft auto-saved
            </div>
          ) : <div/>}
          <div style={{display:"flex",gap:10}}>
            <Btn ghost label="Cancel" onClick={handleClose} T={T}/>
            <Btn primary icon={existing?P.check:P.plus} label={existing?"Save changes":"Add funnel"} onClick={submit} T={T}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CRE EDIT MODAL ───────────────────────────────────────────────────────────
function CREEditModal({funnel,onClose,onSave,T}) {
  const [products,setProducts]=useState(funnel.products?.length?funnel.products.map(p=>({...p})):[{desc:"",category:"",qty:"",price:""}]);
  const [quoteQty,setQuoteQty]=useState(String(funnel.quoteQty||""));
  const [quoteAmount,setQuoteAmount]=useState(String(funnel.quoteAmount||""));
  const [quoteDesc,setQuoteDesc]=useState(String(funnel.quoteDesc||""));
  const [orderNumber,setOrderNumber]=useState(String(funnel.orderNumber||""));
  const [remarks,setRemarks]=useState(String(funnel.remarks||""));
  const [saving,setSaving]=useState(false);
  const sp=(i,k,v)=>{const p=[...products];p[i]={...p[i],[k]:v};setProducts(p);};
  const prodTotal=products.reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);
  const fo=mkFocus(T); const bl=mkBlur(T);
  const submit=async()=>{
    setSaving(true);
    try{
      await onSave({
        ...funnel,
        products:products.filter(p=>p.desc||p.category||p.qty||p.price),
        quoteQty:quoteQty?Number(quoteQty):funnel.quoteQty,
        quoteAmount:quoteAmount?Number(quoteAmount):funnel.quoteAmount,
        quoteDesc:quoteDesc.trim(),
orderNumber:orderNumber.trim(),
remarks:remarks.trim(),
      });
      onClose();
    }catch(err){console.error(err);}finally{setSaving(false);}
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px 14px",borderBottom:`1px solid ${T.line}`,position:"sticky",top:0,background:T.surface,zIndex:1,borderRadius:`${T.r["2xl"]} ${T.r["2xl"]} 0 0`}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 2px"}}>Edit Products & Quote</h2>
            <p style={{margin:0,fontSize:12,color:T.inkSub,fontFamily:F}}>{funnel.name} — update products, quote and order details</p>
          </div>
          <button onClick={onClose} style={{width:30,height:30,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.surfaceEl,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={P.close} sz={13} color={T.inkSub}/>
          </button>
        </div>

        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:20}}>

          {/* ── Customer info strip ── */}
          <div style={{background:T.brandSubtle,border:`1px solid rgba(91,59,232,.15)`,borderRadius:T.r.lg,padding:"12px 16px",display:"flex",gap:24,flexWrap:"wrap"}}>
            {[["Customer",funnel.name],["Phone",funnel.phone],["Status",funnel.status],["Follow-up",funnel.nextFollowUp]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:10,fontWeight:600,color:"#5B3BE8",letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:F,marginBottom:2}}>{l}</div>
                <div style={{fontSize:13,fontWeight:500,color:T.ink,fontFamily:F}}>{v||"—"}</div>
              </div>
            ))}
          </div>

          {/* ── Products table ── */}
          <section>
            <SL T={T}>Customer requirements</SL>
            <div style={{border:`1px solid ${T.line}`,borderRadius:T.r.lg,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"8px 14px",background:T.surfaceEl,gap:8}}>
                {["Product / item","Category","Qty","Unit price (₹)",""].map(h=>(
                  <div key={h} style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",fontFamily:F}}>{h}</div>
                ))}
              </div>
              {products.map((pr,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"9px 14px",borderTop:`1px solid ${T.line}`,gap:8,alignItems:"center"}}>
                  <input value={pr.desc} onChange={e=>sp(i,"desc",e.target.value)} placeholder="e.g. Bridal Lehenga" style={{...inputSx(T),padding:"6px 9px",fontSize:12}} onFocus={fo} onBlur={bl}/>
                  <select value={pr.category} onChange={e=>sp(i,"category",e.target.value)} style={{...inputSx(T),padding:"6px 24px 6px 9px",fontSize:12,cursor:"pointer",appearance:"none",background:`${T.surface} ${selectBg}`}} onFocus={fo} onBlur={bl}>
                    <option value="">Category</option>
                    {CATS.map(c=><option key={c}>{c}</option>)}
                  </select>
                  {[["qty","0"],["price","0"]].map(([k,ph])=>(
                    <input key={k} type="number" value={pr[k]} onChange={e=>sp(i,k,e.target.value)} placeholder={ph} style={{...inputSx(T),padding:"6px 9px",fontSize:12}} onFocus={fo} onBlur={bl}/>
                  ))}
                  <button onClick={()=>setProducts(products.filter((_,x)=>x!==i))} disabled={products.length===1}
                    style={{background:"none",border:"none",cursor:products.length===1?"not-allowed":"pointer",color:T.inkMuted,fontSize:16,opacity:products.length===1?.2:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              ))}
              <div style={{padding:"9px 14px",borderTop:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={()=>setProducts([...products,{desc:"",category:"",qty:"",price:""}])}
                  style={{background:"none",border:`1px dashed #5B3BE8`,borderRadius:T.r.sm,padding:"4px 12px",color:"#5B3BE8",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:F,display:"inline-flex",alignItems:"center",gap:5}}>
                  <Ic d={P.plus} sz={11} color="#5B3BE8"/> Add item
                </button>
                {prodTotal>0&&<span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>Total: {inr(prodTotal)}</span>}
              </div>
            </div>
          </section>

          {/* ── Quote details ── */}
          <section>
            <SL T={T}>Quote details</SL>
            <div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <FInput label="Quantity" type="number" value={quoteQty} onChange={e=>setQuoteQty(e.target.value)} placeholder="0" T={T}/>
              <FInput label="Amount (₹)" type="number" value={quoteAmount} onChange={e=>setQuoteAmount(e.target.value)} placeholder="0" T={T}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Description</label>
              <textarea value={quoteDesc} onChange={e=>setQuoteDesc(e.target.value)}
                placeholder="Quote notes, special instructions…" rows={2}
                style={{...inputSx(T),padding:"9px 11px",resize:"vertical",lineHeight:1.5}}
                onFocus={fo} onBlur={bl}/>
            </div>
          </section>

          {/* ── Order Number ── */}
          <section>
            <SL T={T}>Order details</SL>
            <FInput
              label="Order Number"
              value={orderNumber}
              onChange={e=>setOrderNumber(e.target.value)}
              placeholder="Enter order number"
              T={T}
            />
          </section>

          {/* ── Remarks ── */}
          <section>
            <SL T={T}>Remarks</SL>
            <textarea value={remarks} onChange={e=>setRemarks(e.target.value)}
              placeholder="Additional notes, customer feedback, follow-up context…" rows={3}
              style={{...inputSx(T),padding:"9px 11px",resize:"vertical",lineHeight:1.6,width:"100%",boxSizing:"border-box"}}
              onFocus={fo} onBlur={bl}/>
          </section>

          {/* ── Lock notice ── */}
          <div style={{background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"10px 14px",fontSize:12,color:T.inkMuted,fontFamily:F,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>🔒</span>
            Contact info, funnel type, lead source, delivery details and payment terms can only be edited by Manager or CEO.
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,padding:"14px 24px 20px",borderTop:`1px solid ${T.line}`,position:"sticky",bottom:0,background:T.surface,borderRadius:`0 0 ${T.r["2xl"]} ${T.r["2xl"]}`}}>
          <Btn ghost label="Cancel" onClick={onClose} T={T}/>
          <Btn primary icon={P.check} label={saving?"Saving…":"Save changes"} onClick={submit} disabled={saving} T={T}/>
        </div>

      </div>
    </div>
  );
}

// ─── FOLLOW-UP OUTCOMES ───────────────────────────────────────────────────────
const OUTCOMES=["Interested","Needs Time","Callback Requested","Not Interested","Rescheduled","Order Confirmed","Other"];

// ─── WON PROOF MODAL ─────────────────────────────────────────────────────────
function WonProofModal({funnel,onClose,onSave,T}) {
  const [url, setUrl] = useState(funnel.wonProofUrl || "");
  const [preview, setPreview] = useState(!!funnel.wonProofUrl);
  const [saving, setSaving] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const fo = mkFocus(T); const bl = mkBlur(T);

  const handleUrlChange = (v) => {
    setUrl(v);
    setPreview(false);
    setImgErr(false);
  };

  const previewUrl = () => {
    if (!url.trim()) return;
    setPreview(true);
    setImgErr(false);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(url.trim());
      onClose();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const clear = async () => {
    setSaving(true);
    try { await onSave(""); onClose(); }
    catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:480,boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:T.won.bg,border:`2px solid ${T.won.dot}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🏆</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:T.ink,fontFamily:F}}>Won Proof</div>
              <div style={{fontSize:11,color:T.inkSub,fontFamily:F}}>{funnel.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{width:28,height:28,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.surfaceEl,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={P.close} sz={12} color={T.inkSub}/>
          </button>
        </div>

        <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontSize:12,color:T.inkSub,fontFamily:F,lineHeight:1.6,background:T.won.bg,padding:"10px 14px",borderRadius:T.r.md,border:`1px solid ${T.won.dot}33`}}>
            📌 Paste the image URL below — payment screenshot, order confirmation, WhatsApp screenshot link, Google Drive link, etc.
          </div>

          {/* URL Input */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Image URL</label>
            <div style={{display:"flex",gap:8}}>
              <input
                value={url}
                onChange={e=>handleUrlChange(e.target.value)}
                placeholder="https://drive.google.com/... or any image link"
                style={{...inputSx(T),flex:1}}
                onFocus={fo} onBlur={bl}
                onKeyDown={e=>e.key==="Enter"&&previewUrl()}
              />
              <button onClick={previewUrl}
                style={{padding:"8px 14px",background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.md,fontSize:12,fontWeight:500,color:T.inkSub,cursor:"pointer",fontFamily:F,flexShrink:0,whiteSpace:"nowrap"}}>
                Preview
              </button>
            </div>
          </div>

          {/* Image preview */}
          {preview && url && (
            <div style={{border:`1px solid ${T.line}`,borderRadius:T.r.lg,overflow:"hidden",background:T.surfaceEl}}>
              {imgErr ? (
                <div style={{padding:"24px",textAlign:"center",color:T.lost.text,fontSize:12,fontFamily:F}}>
                  ⚠️ Could not load image. Check the URL and make sure it's publicly accessible.
                </div>
              ) : (
                <img
                  src={url}
                  alt="Proof"
                  onError={()=>setImgErr(true)}
                  style={{width:"100%",maxHeight:260,objectFit:"contain",display:"block",background:"#000"}}
                />
              )}
            </div>
          )}

          {/* Current proof notice */}
          {funnel.wonProofUrl && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:T.won.bg,borderRadius:T.r.md,border:`1px solid ${T.won.dot}33`}}>
              <span style={{fontSize:12,color:T.won.text,fontFamily:F,fontWeight:500}}>✅ Proof already saved</span>
              <button onClick={clear} disabled={saving}
                style={{fontSize:11,color:T.lost.text,background:"none",border:"none",cursor:"pointer",fontFamily:F,textDecoration:"underline"}}>
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 22px 18px",borderTop:`1px solid ${T.line}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <Btn ghost label="Cancel" onClick={onClose} T={T}/>
          <Btn primary icon={P.check} label={saving?"Saving…":"Save Proof"} onClick={submit} disabled={saving||!url.trim()} T={T}/>
        </div>
      </div>
    </div>
  );
}

function FollowupLogModal({funnel,user,onClose,onSave,T}) {
  const [form,setForm]=useState({customerResponse:"",outcome:"",nextFollowUp:""});
  const [err,setErr]=useState({}); const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const fo=mkFocus(T); const bl=mkBlur(T);
  const submit=async()=>{const e={};if(!form.customerResponse.trim())e.response="Required";if(!form.outcome)e.outcome="Required";if(!form.nextFollowUp)e.nextFollowUp="Required";setErr(e);if(Object.keys(e).length)return;setSaving(true);try{await onSave({loggedBy:user.name,followUpDate:funnel.nextFollowUp,customerResponse:form.customerResponse.trim(),outcome:form.outcome,nextFollowUp:form.nextFollowUp});onClose();}catch(err){console.error(err);}finally{setSaving(false);}};
  const oc={"Interested":T.won,"Order Confirmed":T.won,"Needs Time":T.pending,"Callback Requested":T.pending,"Rescheduled":T.pending,"Not Interested":T.lost,"Other":T.drop};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:480,boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><h2 style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 3px"}}>Log Follow-up</h2><p style={{margin:0,fontSize:12,color:T.inkSub,fontFamily:F}}>{funnel.name} · Due {funnel.nextFollowUp}</p></div>
          <button onClick={onClose} style={{width:28,height:28,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.surfaceEl,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={P.close} sz={12} color={T.inkSub}/></button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          <div><label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F,display:"block",marginBottom:5}}>What did the customer say? <span style={{color:"#DC2626"}}>*</span></label><textarea value={form.customerResponse} onChange={e=>set("customerResponse",e.target.value)} placeholder="e.g. Customer said she'll confirm after checking with family…" rows={3} style={{...inputSx(T,err.response),padding:"9px 11px",resize:"vertical",lineHeight:1.6,width:"100%",boxSizing:"border-box"}} onFocus={fo} onBlur={bl} autoFocus/>{err.response&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{err.response}</div>}</div>
          <div><label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F,display:"block",marginBottom:8}}>Outcome <span style={{color:"#DC2626"}}>*</span></label><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{OUTCOMES.map(o=>{const c=oc[o]||T.drop;const sel=form.outcome===o;return(<button key={o} onClick={()=>set("outcome",o)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${sel?c.dot:T.line}`,background:sel?c.bg:"transparent",color:sel?c.text:T.inkSub,fontSize:12,fontWeight:sel?600:400,cursor:"pointer",fontFamily:F,transition:"all .15s",display:"flex",alignItems:"center",gap:5}}><Dot color={sel?c.dot:T.inkMuted} size={5}/>{o}</button>);})}</div>{err.outcome&&<div style={{fontSize:11,color:"#B91C1C",marginTop:6}}>{err.outcome}</div>}</div>
          <div><label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F,display:"block",marginBottom:5}}>Reschedule next follow-up to <span style={{color:"#DC2626"}}>*</span></label><input type="date" value={form.nextFollowUp} onChange={e=>set("nextFollowUp",e.target.value)} style={{...inputSx(T,err.nextFollowUp)}} onFocus={fo} onBlur={bl} min={today()}/>{err.nextFollowUp&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{err.nextFollowUp}</div>}</div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,padding:"14px 24px 20px",borderTop:`1px solid ${T.line}`}}><Btn ghost label="Cancel" onClick={onClose} T={T}/><Btn primary icon={P.check} label={saving?"Saving…":"Save & Reschedule"} onClick={submit} disabled={saving} T={T}/></div>
      </div>
    </div>
  );
}

// ─── VIEW DRAWER ──────────────────────────────────────────────────────────────
function ViewDrawer({funnel,onClose,onEdit,onCreEdit,onStatusChange,user,comments,onAddComment,followupLogs=[],onLogFollowup,onAddProof,T}) {
const [status,setStatus]=useState(funnel.status);
const [showReasonPicker,setShowReasonPicker]=useState(false);
const [pendingStatus,setPendingStatus]=useState("");
const [reason,setReason]=useState(funnel.lostDropReason||"");
  const tot=(funnel.products||[]).reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);
  const doStatus=s=>{
  if((s==="Lost"||s==="Drop")&&s!==status){setPendingStatus(s);setShowReasonPicker(true);}
  else{setStatus(s);onStatusChange(funnel.id,s);}
};
const confirmStatus=()=>{
  setStatus(pendingStatus);
  onStatusChange(funnel.id,pendingStatus,reason);
  setShowReasonPicker(false);
};
  const [commentText,setCommentText]=useState("");
  const isViewer=VIEWER.includes(user.role);
  const canComment=FULL.includes(user.role)&&!isViewer;
  const fo=mkFocus(T); const bl=mkBlur(T);
  const submitComment=()=>{if(!commentText.trim())return;onAddComment(funnel.id,{text:commentText.trim(),author:user.name,role:user.role,time:stamp()});setCommentText("");};
  const Row=({l,v,mono})=>(<div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:8,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}><dt style={{fontSize:11,fontWeight:500,color:T.inkMuted,fontFamily:F}}>{l}</dt><dd style={{fontSize:13,color:T.ink,fontFamily:mono?"'SF Mono',monospace":F,wordBreak:"break-all"}}>{v||"—"}</dd></div>);
  const Sec=({t})=><div style={{fontSize:10,fontWeight:700,color:T.inkMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,marginTop:8,fontFamily:F,display:"flex",alignItems:"center",gap:8}}><span>{t}</span><div style={{flex:1,height:1,background:`linear-gradient(to right, ${T.line}, transparent)`}}/></div>;
  const roleColor={"CEO":T.high,"Manager":T.won,"CRE":T.pending};
  const outcomeColors={"Interested":T.won,"Order Confirmed":T.won,"Needs Time":T.pending,"Callback Requested":T.pending,"Rescheduled":T.pending,"Not Interested":T.lost,"Other":T.drop};
  const canCreEdit=!FULL.includes(user.role)&&!isViewer&&(funnel.createdBy===user.name||funnel.assignedTo===user.name);
  const isWon=status==="Won";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:2000,display:"flex",justifyContent:"flex-end",backdropFilter:"blur(1px)"}} onClick={onClose}>
      <div style={{background:T.surface,width:"100%",maxWidth:"min(540px, 100vw)",height:"100%",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,.15)",animation:"slideRight .22s ease",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 22px 16px",borderBottom:`1px solid ${T.line}`,position:"sticky",top:0,background:T.surface,zIndex:1}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
            <div style={{flex:1,marginRight:12}}>
              <h2 style={{fontSize:17,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 3px",letterSpacing:"-0.3px"}}>{funnel.name||"(No name)"}</h2>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <p style={{margin:0,fontSize:11,color:T.inkMuted,fontFamily:F}}>{funnel.createdAt} · {funnel.createdBy}</p>
                {funnel.assignedTo&&<span style={{fontSize:11,fontWeight:500,background:T.brandSubtle,color:"#5B3BE8",padding:"1px 8px",borderRadius:10,fontFamily:F}}>→ {funnel.assignedTo}</span>}
                {funnel.leadSource&&<SourcePill source={funnel.leadSource} T={T}/>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {FULL.includes(user.role)&&!isViewer&&<Btn ghost sm icon={P.edit} label="Edit" onClick={()=>{onClose();onEdit(funnel);}} T={T}/>}
              {canCreEdit&&!isViewer&&<Btn ghost sm icon={P.edit} label="Edit" onClick={()=>{onClose();onCreEdit(funnel);}} T={T}/>}
              <button onClick={onClose} style={{width:28,height:28,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.surfaceEl,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={P.close} sz={12} color={T.inkSub}/></button>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {STATUS.map(s=>{const c=T[s.toLowerCase()]||T.drop;const a=status===s;return(<button key={s} onClick={()=>isViewer?null:doStatus(s)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${a?c.dot:T.line}`,background:a?c.bg:"transparent",color:a?c.text:T.inkSub,fontSize:12,fontWeight:a?600:400,cursor:isViewer?"default":"pointer",fontFamily:F,transition:"all .15s",display:"flex",alignItems:"center",gap:5,opacity:isViewer&&!a?0.5:1}}><Dot color={a?c.dot:T.inkMuted} size={5}/>{s}</button>);})}
            {isViewer&&<span style={{fontSize:11,color:T.inkMuted,fontFamily:F,display:"flex",alignItems:"center",gap:4,padding:"0 4px"}}>🔒 View only</span>}
          </div>
        </div>
        <div style={{padding:"18px 22px",flex:1}}>
          <Sec t="Contact"/>
          <dl><Row l="Name" v={funnel.name}/><Row l="Phone" v={funnel.phone}/><Row l="Email" v={funnel.email}/>{funnel.cityRegion&&<Row l="City / Region" v={funnel.cityRegion}/>}{funnel.assignedTo&&<Row l="Assigned to" v={funnel.assignedTo}/>}</dl>
          <div style={{height:18}}/>
          <Sec t="Funnel"/>
          <dl><Row l="Enquiry type" v={funnel.enquiryType}/><Row l="Funnel type" v={funnel.funnelType}/><Row l="Lead source" v={funnel.leadSource}/>{!isWon&&<Row l="Next follow-up" v={funnel.nextFollowUp}/>}{(funnel.status==="Lost"||funnel.status==="Drop")&&funnel.lostDropReason&&<Row l={funnel.status==="Lost"?"Lost reason":"Drop reason"} v={funnel.lostDropReason}/>}{isWon&&(<div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:8,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}><dt style={{fontSize:11,fontWeight:500,color:T.inkMuted,fontFamily:F}}>Follow-up</dt><dd><span style={{fontSize:12,color:T.won.text,fontWeight:500,display:"flex",alignItems:"center",gap:5}}><Dot color={T.won.dot} size={5}/>Deal closed — no follow-up needed</span></dd></div>)}</dl>
          <div style={{height:18}}/>
          <Sec t="Products"/>
          <div style={{border:`1px solid ${T.line}`,borderRadius:T.r.lg,overflow:"hidden",marginBottom:18}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr .7fr 1fr 1fr",padding:"7px 14px",background:T.surfaceEl}}>{["Item","Cat.","Qty","Price","Total"].map(h=><div key={h} style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",fontFamily:F}}>{h}</div>)}</div>
            {(funnel.products||[]).map((p,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr .7fr 1fr 1fr",padding:"9px 14px",borderTop:`1px solid ${T.line}`}}><span style={{fontSize:12,fontWeight:500,color:T.ink,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.desc||"—"}</span><span style={{fontSize:11,color:T.inkSub,fontFamily:F}}>{p.category||"—"}</span><span style={{fontSize:11,color:T.inkSub,fontFamily:F}}>{p.qty||"—"}</span><span style={{fontSize:11,color:T.inkSub,fontFamily:F}}>{inr(p.price)||"—"}</span><span style={{fontSize:12,fontWeight:600,color:"#5B3BE8",fontFamily:F}}>{inr(Number(p.qty)*Number(p.price))||"—"}</span></div>))}
            {tot>0&&<div style={{display:"flex",justifyContent:"flex-end",padding:"8px 14px",borderTop:`1px solid ${T.lineMid}`,fontSize:13,fontWeight:700,color:T.ink,fontFamily:F}}>Total: {inr(tot)}</div>}
          </div>
          {funnel.remarks&&<><Sec t="Remarks"/><div style={{background:T.surfaceEl,padding:"10px 14px",borderRadius:T.r.md,fontSize:13,color:T.ink,fontFamily:F,lineHeight:1.6,marginBottom:18}}>{funnel.remarks}</div></>}
          {(funnel.deliveryDetails||funnel.paymentTerms)&&(<><Sec t="Delivery & Payment"/><dl>{funnel.deliveryDetails&&<Row l="Delivery details" v={funnel.deliveryDetails}/>}{funnel.paymentTerms&&<Row l="Payment terms" v={funnel.paymentTerms}/>}</dl><div style={{height:18}}/></>)}
          <Sec t="Quotation"/>
          <dl><Row l="Order Number" v={funnel.orderNumber} mono/><Row l="Quantity" v={funnel.quoteQty}/><Row l="Amount" v={inr(funnel.quoteAmount)}/>{funnel.quoteDesc&&<Row l="Description" v={funnel.quoteDesc}/>}</dl>

          {/* Won Proof */}
          {funnel.wonProofUrl && (
            <div style={{marginTop:16,marginBottom:8}}>
              <Sec t="Won Proof"/>
              <div style={{border:`1px solid ${T.won.dot}44`,borderRadius:T.r.lg,overflow:"hidden",background:T.won.bg}}>
                <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.won.dot}22`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>🏆</span>
                    <span style={{fontSize:12,fontWeight:600,color:T.won.text,fontFamily:F}}>Payment / Order Proof</span>
                  </div>
                  <a href={funnel.wonProofUrl} target="_blank" rel="noreferrer"
                    style={{fontSize:11,color:"#5B3BE8",fontFamily:F,textDecoration:"none",fontWeight:500,display:"flex",alignItems:"center",gap:4}}>
                    Open ↗
                  </a>
                </div>
                <div style={{padding:8,background:"#000",textAlign:"center"}}>
                  <img src={funnel.wonProofUrl} alt="Won proof"
                    style={{maxWidth:"100%",maxHeight:220,objectFit:"contain",display:"block",margin:"0 auto",borderRadius:4}}
                    onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}
                  />
                  <div style={{display:"none",padding:"16px",color:"#fff",fontSize:12,fontFamily:F}}>
                    ⚠️ Could not load image — <a href={funnel.wonProofUrl} target="_blank" rel="noreferrer" style={{color:"#60A5FA"}}>open link directly</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Follow-up History */}
          <div style={{height:24}}/>
          <div style={{borderTop:`2px solid ${T.line}`,paddingTop:20,marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>📅</span><span style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:F}}>Follow-up History</span>{followupLogs.length>0&&<span style={{fontSize:11,fontWeight:500,background:T.brandSubtle,color:"#5B3BE8",padding:"1px 8px",borderRadius:10,fontFamily:F}}>{followupLogs.length}</span>}</div>
              {!isWon&&!isViewer&&<Btn primary sm label="+ Log Follow-up" onClick={onLogFollowup} T={T}/>}
              {isWon&&!isViewer&&<button onClick={()=>onAddProof&&onAddProof(funnel)}
                style={{padding:"5px 12px",borderRadius:T.r.md,border:`1px solid ${funnel.wonProofUrl?T.won.dot:T.line}`,background:funnel.wonProofUrl?T.won.bg:"transparent",color:funnel.wonProofUrl?T.won.text:T.inkSub,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:5}}>
                {funnel.wonProofUrl?"🏆 Update Proof":"🏆 Add Proof"}
              </button>}
              {isWon&&<span style={{fontSize:11,color:T.won.text,fontWeight:500,background:T.won.bg,padding:"4px 10px",borderRadius:20,border:`1px solid ${T.won.dot}44`,display:"flex",alignItems:"center",gap:5}}><Dot color={T.won.dot} size={5}/> Deal Won ✓</span>}
            </div>
            {followupLogs.length===0?<div style={{textAlign:"center",padding:"16px 0",fontSize:12,color:T.inkMuted,fontFamily:F}}>No follow-ups logged yet.</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:0,position:"relative"}}>
                <div style={{position:"absolute",left:11,top:12,bottom:12,width:2,background:T.line,borderRadius:2}}/>
                {[...followupLogs].reverse().map((log,i)=>{const c=outcomeColors[log.outcome]||T.drop;return(<div key={i} style={{display:"flex",gap:14,paddingBottom:16,position:"relative"}}><div style={{width:24,height:24,borderRadius:"50%",background:c.bg,border:`2px solid ${c.dot}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1}}><Dot color={c.dot} size={6}/></div><div style={{flex:1,background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:6}}><div style={{display:"flex",alignItems:"center",gap:7}}><StatusPill status={log.outcome} sm T={T}/><span style={{fontSize:11,color:T.inkMuted,fontFamily:F}}>by {log.loggedBy}</span></div><span style={{fontSize:10,color:T.inkMuted,fontFamily:F,whiteSpace:"nowrap"}}>{log.loggedAt}</span></div><p style={{margin:"0 0 8px",fontSize:13,color:T.ink,fontFamily:F,lineHeight:1.6}}>{log.customerResponse}</p>{log.nextFollowUp&&<div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#5B3BE8",fontFamily:F,fontWeight:500}}><span>→</span> Rescheduled to {log.nextFollowUp}</div>}</div></div>);})}
              </div>
            )}
          </div>

          {/* Audit Comments */}
          <div style={{borderTop:`2px solid ${T.line}`,paddingTop:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><Ic d={P.msg} sz={14} color="#5B3BE8"/><span style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:F}}>Audit Comments</span>{comments.length>0&&<span style={{fontSize:11,fontWeight:500,background:T.brandSubtle,color:"#5B3BE8",padding:"1px 8px",borderRadius:10,fontFamily:F}}>{comments.length}</span>}</div>
            {canComment&&(<div style={{marginBottom:16}}><textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Write your audit comment…" rows={3} style={{...inputSx(T),padding:"10px 12px",resize:"vertical",lineHeight:1.6,width:"100%",boxSizing:"border-box"}} onFocus={fo} onBlur={bl}/><div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><Btn primary sm icon={P.check} label="Save comment" onClick={submitComment} disabled={!commentText.trim()} T={T}/></div></div>)}
            {comments.length===0?<div style={{textAlign:"center",padding:"20px 0",fontSize:12,color:T.inkMuted,fontFamily:F}}>No audit comments yet.</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[...comments].reverse().map((c,i)=>{const rc=roleColor[c.role]||T.drop;return(<div key={i} style={{background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Avatar name={c.author} size={24}/><div style={{flex:1}}><span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>{c.author}</span><span style={{marginLeft:6,fontSize:10,fontWeight:500,padding:"1px 7px",borderRadius:10,background:rc.bg,color:rc.text,fontFamily:F}}>{c.role}</span></div><span style={{fontSize:10,color:T.inkMuted,fontFamily:F,whiteSpace:"nowrap"}}>{c.time}</span></div><p style={{margin:0,fontSize:13,color:T.ink,fontFamily:F,lineHeight:1.6}}>{c.text}</p></div>);})}
              </div>
            )}
          </div>
        </div>
      </div>
      {showReasonPicker&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowReasonPicker(false)}>
          <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:440,boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:10}}>
              <Dot color={pendingStatus==="Lost"?T.lost.dot:T.drop.dot} size={8}/>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:T.ink,fontFamily:F}}>{pendingStatus==="Lost"?"Why was this lead lost?":"Why was this lead dropped?"}</div>
                <div style={{fontSize:11,color:T.inkSub,fontFamily:F,marginTop:2}}>This will be saved with the lead record</div>
              </div>
            </div>
            <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:8}}>
              <textarea
                value={reason}
                onChange={e=>setReason(e.target.value)}
                placeholder={pendingStatus==="Lost"?"e.g. Price too high, went to competitor…":"e.g. Duplicate entry, wrong number…"}
                rows={3}
                autoFocus
                style={{...inputSx(T),padding:"9px 11px",resize:"vertical",fontSize:13,lineHeight:1.6}}
                onFocus={mkFocus(T)} onBlur={mkBlur(T)}/>
            </div>
            <div style={{padding:"12px 22px 18px",borderTop:`1px solid ${T.line}`,display:"flex",justifyContent:"flex-end",gap:8}}>
              <Btn ghost label="Cancel" onClick={()=>setShowReasonPicker(false)} T={T}/>
              <Btn primary label={`Mark as ${pendingStatus}`} onClick={confirmStatus} T={T}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN SHELL ───────────────────────────────────────────────────────────────
function Shell({user,users,onLogout,onUsersChange,T,dark,onToggleDark}) {
  const [funnels,setFunnels]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("dashboard");
  const [search,setSearch]=useState("");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [statFilter,setStatFilter]=useState(null);
  // ── Date filter ──────────────────────────────────
  const [dateFilter, setDateFilter] = useState("");
  const [dateType, setDateType]     = useState("followup");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(()=>{
    const fetch=async()=>{try{const data=await crmService.getAllFunnels();setFunnels(data);}catch(err){console.error(err);}finally{setLoading(false);}};
    fetch();
  },[]);

  useEffect(()=>{
    const channel=supabase.channel('funnels_changes').on('postgres_changes',{event:'*',schema:'public',table:'funnels'},(payload)=>{
      if(payload.eventType==='INSERT'){const nf=crmService.mapFromDb(payload.new);setFunnels(prev=>prev.find(f=>f.id===nf.id)?prev:[nf,...prev]);}
      else if(payload.eventType==='UPDATE'){const uf=crmService.mapFromDb(payload.new);setFunnels(prev=>prev.map(f=>f.id===uf.id?uf:f));}
      else if(payload.eventType==='DELETE'){setFunnels(prev=>prev.filter(f=>f.id!==payload.old.id));}
    }).subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[]);

  const [funnelComments,setFunnelComments]=useState({});
  const [viewT,setViewT]=useState(null);

  useEffect(()=>{if(viewT&&!funnelComments[viewT.id]){crmService.getComments(viewT.id).then(comments=>{setFunnelComments(prev=>({...prev,[viewT.id]:comments}));}).catch(console.error);}},[viewT,funnelComments]);

  useEffect(()=>{
    const channel=supabase.channel('comments_changes').on('postgres_changes',{event:'INSERT',schema:'public',table:'audit_comments'},async(payload)=>{
      const funnelId=payload.new.funnel_id;
      const newComment={text:payload.new.text,author:payload.new.author,role:payload.new.role,time:new Date(payload.new.created_at).toLocaleString('en-IN',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})};
      setFunnelComments(prev=>({...prev,[funnelId]:[...(prev[funnelId]||[]),newComment]}));
    }).subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[]);

  const addComment=async(funnelId,comment)=>{try{await crmService.addComment(funnelId,comment);}catch(err){console.error(err);}};
  const [followupLogs,setFollowupLogs]=useState({});
  const isViewerUser=VIEWER.includes(user.role);
  const [logModalFunnel,setLogModalFunnel]=useState(null);
  const [proofModalFunnel,setProofModalFunnel]=useState(null);

  useEffect(()=>{if(viewT&&!followupLogs[viewT.id]){crmService.getFollowupLogs(viewT.id).then(logs=>{setFollowupLogs(prev=>({...prev,[viewT.id]:logs}));}).catch(console.error);}},[viewT]);

  const saveFollowupLog=async(log)=>{
    try{
      await crmService.addFollowupLog(logModalFunnel.id,log);
      if(log.nextFollowUp){await crmService.updateNextFollowup(logModalFunnel.id,log.nextFollowUp);setFunnels(p=>p.map(f=>f.id===logModalFunnel.id?{...f,nextFollowUp:log.nextFollowUp}:f));}
      const updated=await crmService.getFollowupLogs(logModalFunnel.id);
      setFollowupLogs(prev=>({...prev,[logModalFunnel.id]:updated}));
      setLogModalFunnel(null); push("Follow-up logged ✓");
    }catch(err){console.error(err);push("Error saving follow-up","error");}
  };

  const saveProof=async(url)=>{
    try{
      await crmService.updateWonProof(proofModalFunnel.id, url);
      setFunnels(p=>p.map(f=>f.id===proofModalFunnel.id?{...f,wonProofUrl:url}:f));
      if(viewT&&viewT.id===proofModalFunnel.id) setViewT(v=>({...v,wonProofUrl:url}));
      push(url?"Proof saved ✓":"Proof removed","success");
    }catch(e){console.error(e);push("Error saving proof","error");}
  };

  const [fil,setFil]=useState({status:"",funnelType:"",enquiryType:"",leadSource:"",descFilter:"",cre:"",missed:false,todayF:false,upcoming:false,assignedTo:"",city:"",category:"",dateFrom:"",dateTo:"",followFrom:"",followTo:"",minAmt:"",maxAmt:"",hasOrder:"",hasQuote:"",overdue:false,wonMonth:false});
  const [addOpen,setAddOpen]=useState(false);
  const [editT,setEditT]=useState(null);
  const [creEditT,setCreEditT]=useState(null);
  const {list:toasts,push}=useToast();
  const TODAY=today();

  const sf=(k,v)=>setFil(f=>({...f,[k]:v}));
  const rf=()=>{setFil({status:"",funnelType:"",enquiryType:"",leadSource:"",descFilter:"",cre:"",missed:false,todayF:false,upcoming:false,assignedTo:"",city:"",category:"",dateFrom:"",dateTo:"",followFrom:"",followTo:"",minAmt:"",maxAmt:"",hasOrder:"",hasQuote:"",overdue:false,wonMonth:false});setStatFilter(null);};
  const handleStatClick=(filterKey)=>{setStatFilter(prev=>prev===filterKey?null:filterKey);setFil(f=>({...f,status:""}));};

  const scoped=useMemo(()=>(FULL.includes(user.role)||VIEWER.includes(user.role))?funnels:funnels.filter(f=>f.createdBy===user.name||f.assignedTo===user.name),[funnels,user]);

  // ㉒ today's follow-ups list + count for bell
  const todayFunnels=useMemo(()=>scoped
    .filter(f=>f.nextFollowUp&&f.status==="Pending")
    .sort((a,b)=>a.nextFollowUp.localeCompare(b.nextFollowUp)),[scoped,TODAY]);
  const todayCount=useMemo(()=>scoped.filter(f=>f.nextFollowUp===TODAY&&f.status==="Pending").length,[scoped,TODAY]);

  const filtered=useMemo(()=>scoped.filter(f=>{
    if(statFilter&&f.status!==statFilter)return false;
    if(search){const q=search.toLowerCase();if(!(f.name||"").toLowerCase().includes(q)&&!(f.email||"").toLowerCase().includes(q)&&!(f.phone||"").toLowerCase().includes(q)&&!(f.orderNumber||"").toLowerCase().includes(q))return false;}
    if(!statFilter&&fil.status&&f.status!==fil.status)return false;
    if(fil.funnelType&&f.funnelType!==fil.funnelType)return false;
    if(fil.enquiryType&&f.enquiryType!==fil.enquiryType)return false;
    if(fil.leadSource&&f.leadSource!==fil.leadSource)return false;
    if(fil.descFilter){const q=fil.descFilter.toLowerCase();if(!(f.remarks||"").toLowerCase().includes(q)&&!(f.quoteDesc||"").toLowerCase().includes(q))return false;}
    if(fil.cre&&f.createdBy!==fil.cre&&f.assignedTo!==fil.cre)return false;
    if(fil.missed&&(!f.nextFollowUp||f.nextFollowUp>=TODAY||f.status!=="Pending"))return false;
    if(fil.todayF&&f.nextFollowUp!==TODAY)return false;
    if(fil.upcoming&&f.nextFollowUp<=TODAY)return false;
    // New filters
    if(fil.assignedTo&&f.assignedTo!==fil.assignedTo)return false;
    if(fil.city){const q=fil.city.toLowerCase();if(!(f.cityRegion||"").toLowerCase().includes(q))return false;}
    if(fil.category){const hascat=(f.products||[]).some(p=>p.category===fil.category);if(!hascat)return false;}
    if(fil.dateFrom){try{const d=new Date(f.createdAt).toISOString().split("T")[0];if(d<fil.dateFrom)return false;}catch{return false;}}
    if(fil.dateTo){try{const d=new Date(f.createdAt).toISOString().split("T")[0];if(d>fil.dateTo)return false;}catch{return false;}}
    if(fil.followFrom&&f.nextFollowUp&&f.nextFollowUp<fil.followFrom)return false;
    if(fil.followTo&&f.nextFollowUp&&f.nextFollowUp>fil.followTo)return false;
    if(fil.minAmt&&(Number(f.quoteAmount)||0)<Number(fil.minAmt))return false;
    if(fil.maxAmt&&(Number(f.quoteAmount)||0)>Number(fil.maxAmt))return false;
    if(fil.hasOrder==="yes"&&!f.orderNumber)return false;
    if(fil.hasOrder==="no"&&f.orderNumber)return false;
    if(fil.hasQuote==="yes"&&!f.quoteAmount)return false;
    if(fil.hasQuote==="no"&&f.quoteAmount)return false;
    if(fil.overdue&&!(f.nextFollowUp&&f.nextFollowUp<TODAY&&f.status==="Pending"))return false;
    if(fil.wonMonth){const m=new Date().toISOString().slice(0,7);try{if(f.status!=="Won"||new Date(f.createdAt).toISOString().slice(0,7)!==m)return false;}catch{return false;}}
    if (monthFilter) {
  try {
    const d = new Date(f.createdAt);
    if (isNaN(d) || d.toISOString().slice(0, 7) !== monthFilter) return false;
  } catch { return false; }
}
if (dateFilter) {
  if (dateType === "followup") {
    if (f.nextFollowUp !== dateFilter) return false;
  } else {
    // created date filter
    try {
      const d = new Date(f.createdAt);
      if (isNaN(d) || d.toISOString().split("T")[0] !== dateFilter) return false;
    } catch { return false; }
  }
}
return true;
  }),[scoped,search,fil,statFilter,TODAY,dateFilter,dateType,monthFilter]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(f => f.id)));
  const selectedFunnels = filtered.filter(f => selectedIds.has(f.id));

  const save=async(form)=>{try{const cleanedForm={...form,products:(form.products||[]).filter(p=>p.desc||p.category||p.qty||p.price)};const saved=await crmService.saveFunnel(cleanedForm,user);if(editT){setFunnels(p=>p.map(f=>f.id===saved.id?saved:f));setEditT(null);push("Funnel updated");}else{setFunnels(p=>[saved,...p]);setAddOpen(false);push("Funnel added");}}catch(err){console.error(err);push(`Error: ${err.message||"Could not save lead"}`,"error");}};
  const creEditSave=async(form)=>{try{const saved=await crmService.saveFunnel(form,user);setFunnels(p=>p.map(f=>f.id===saved.id?saved:f));setCreEditT(null);push("Updated ✓");}catch(err){console.error(err);push("Error saving","error");}};
  const del=async(id)=>{if(!window.confirm("Are you sure you want to delete this lead?"))return;try{await crmService.deleteFunnel(id);setFunnels(p=>p.filter(f=>f.id!==id));push("Deleted","info");}catch(err){console.error(err);push("Error deleting funnel","error");}};
  const upStatus=async(id,s,reason="")=>{try{await crmService.updateStatus(id,s,reason);setFunnels(p=>p.map(f=>f.id===id?{...f,status:s,lostDropReason:reason}:f));push(`Status → ${s}`);}catch(err){console.error(err);push("Error updating status","error");}};

  const titles={dashboard:"Dashboard",funnels:"Funnels",analytics:"Analytics",team:"Team"};
  const showFilters=view==="dashboard"||view==="funnels";
  const showStats=view==="dashboard";

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:T.bg,fontFamily:F}} className="ek-shell">
      <Sidebar active={view} set={v=>{setView(v);setStatFilter(null);}} user={user} onLogout={onLogout} open={sidebarOpen} onClose={()=>setSidebarOpen(false)} T={T} dark={dark} onToggleDark={onToggleDark} collapsed={sidebarCollapsed} onToggleCollapse={()=>setSidebarCollapsed(x=>!x)}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,height:"100vh",overflow:"hidden"}} className="ek-main-col">
{selectedIds.size > 0 && (
  <div style={{background: T.brandSubtle, borderBottom: `1px solid rgba(91,59,232,.2)`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 12}}>
    <span style={{fontSize: 13, fontWeight: 600, color: "#5B3BE8", fontFamily: F}}>{selectedIds.size} selected</span>
    <Btn primary sm icon={P.dl} label={`Export selected (${selectedIds.size})`} onClick={() => { xls(selectedFunnels, `Ekanta_Selected_${TODAY}.xls`); push(`Exported ${selectedIds.size} funnels`, "info"); }} T={T}/>
    <Btn ghost sm label="Clear" onClick={() => setSelectedIds(new Set())} T={T}/>
  </div>
)}
<Topbar title={titles[view]} search={search} setSearch={setSearch} user={user} onAdd={()=>setAddOpen(true)}
  onExportAll={()=>{xls(scoped,`Ekanta_All_${TODAY}.xls`);push(`Exported ${scoped.length} funnels`,"info");}}
  onExportFiltered={()=>{xls(filtered,`Ekanta_Filtered_${TODAY}.xls`);push(`Exported ${filtered.length} funnels`,"info");}}
  fLen={filtered.length} aLen={scoped.length} onMenuToggle={()=>setSidebarOpen(x=>!x)} T={T} todayCount={todayCount}
  dateFilter={dateFilter} setDateFilter={setDateFilter} dateType={dateType} setDateType={setDateType} todayFunnels={todayFunnels}/>

        {/* ⑲ Greeting on dashboard */}
        {showStats&&(
          <div style={{padding:"16px 16px 0"}}>
            <div style={{marginBottom:4}}>
              <h2 style={{fontSize:24,fontWeight:800,color:T.ink,fontFamily:F,margin:"0 0 6px",letterSpacing:"-0.6px",lineHeight:1.2}}>{greeting(user.name)}</h2>
              <p style={{fontSize:13,color:T.inkSub,margin:0,fontFamily:F}}>
                {todayCount>0
                  ? `You have ${todayCount} follow-up${todayCount>1?"s":""} due today.`
                  : "Here's your sales overview for today."}
              </p>
            </div>
          </div>
        )}

        {showStats&&(
  <div style={{padding:"12px 24px 0"}}>
    <div style={{display:"flex",alignItems:"center",gap:6,overflowX:"auto",flexWrap:"nowrap",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
      <span style={{fontSize:11,fontWeight:600,color:T.inkMuted,fontFamily:F,letterSpacing:"0.06em",textTransform:"uppercase",marginRight:4,flexShrink:0}}>Month</span>
      {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m,i)=>{
        const year = new Date().getFullYear();
        const val = `${year}-${m}`;
        const label = new Date(year,i,1).toLocaleString("en-IN",{month:"short"});
        const count = scoped.filter(f=>{
          try { return new Date(f.createdAt).toISOString().slice(0,7)===val; } catch { return false; }
        }).length;
        const isActive = monthFilter === val;
        return (
          <button key={m} onClick={()=>setMonthFilter(isActive?"":val)}
            style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${isActive?"#5B3BE8":T.line}`,background:isActive?"#5B3BE8":T.surface,color:isActive?"#fff":count>0?T.ink:T.inkMuted,fontSize:12,fontWeight:isActive?600:400,fontFamily:F,cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",gap:5,opacity:count===0?0.4:1}}>
            {label}
            {count>0&&<span style={{fontSize:10,fontWeight:600,background:isActive?"rgba(255,255,255,0.2)":T.brandSubtle,color:isActive?"#fff":"#5B3BE8",padding:"0px 5px",borderRadius:8,fontFamily:F}}>{count}</span>}
          </button>
        );
      })}
      {monthFilter&&(
        <button onClick={()=>setMonthFilter("")} style={{fontSize:12,color:"#5B3BE8",background:"none",border:"none",cursor:"pointer",fontFamily:F,fontWeight:500,textDecoration:"underline",padding:"0 4px"}}>Clear</button>
      )}
    </div>
  </div>
)}
{showStats&&<Stats funnels={monthFilter?scoped.filter(f=>{try{return new Date(f.createdAt).toISOString().slice(0,7)===monthFilter;}catch{return false;}}):scoped} activeStatFilter={statFilter} onStatClick={handleStatClick} T={T}/>}
        {showFilters&&<div style={{marginTop:16}}><FilterBar fil={fil} setF={sf} reset={rf} users={users} user={user} T={T} funnels={scoped}/></div>}

        <div style={{flex:1,background:showFilters?T.surface:"transparent",borderTop:showFilters?`1px solid ${T.line}`:"none"}} className="ek-table-scroll ek-page-content">
          {(view==="dashboard"||view==="funnels")&&<Table rows={filtered} user={user} onView={setViewT} onEdit={f=>setEditT(f)} onCreEdit={f=>setCreEditT(f)} onDelete={del} onLogFollowup={f=>setLogModalFunnel(f)} onAddProof={f=>setProofModalFunnel(f)} loading={loading} T={T} selectedIds={selectedIds} toggleSelect={toggleSelect} toggleSelectAll={toggleSelectAll}/>}
          {view==="analytics"&&<Analytics funnels={FULL.includes(user.role)?funnels:scoped} T={T}/>}
          {view==="team"&&FULL.includes(user.role)&&<Team users={users} onSave={onUsersChange} T={T}/>}
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="ek-bottom-nav" style={{background:T.surface,borderTop:`1px solid ${T.line}`}}>
        {[
          {id:"dashboard",label:"Home",icon:P.dash},
          {id:"funnels",label:"Funnels",icon:P.list},
          {id:"analytics",label:"Analytics",icon:P.chart},
          ...(FULL.includes(user.role)?[{id:"team",label:"Team",icon:P.users}]:[]),
        ].map(item=>{
          const a=view===item.id;
          return (
            <button key={item.id} onClick={()=>{setView(item.id);setStatFilter(null);}}
              className={`ek-bottom-nav-item${a?" active":""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d={item.icon} stroke={a?"#5B3BE8":T.inkMuted} strokeWidth={a?"2":"1.5"} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{fontSize:10,fontWeight:a?700:400,color:a?"#5B3BE8":T.inkMuted,fontFamily:F,letterSpacing:"0.01em"}}>{item.label}</span>
            </button>
          );
        })}
        {can(user,"create")&&(
          <button onClick={()=>setAddOpen(true)}
            className="ek-bottom-nav-item"
            style={{background:"#5B3BE8",borderRadius:14,width:44,height:44,minWidth:"unset",padding:0,boxShadow:"0 4px 14px rgba(91,59,232,0.4)"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d={P.plus} stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </nav>

      {(addOpen||editT)&&<FunnelForm onClose={()=>{setAddOpen(false);setEditT(null);}} onSave={save} existing={editT} user={user} users={users} T={T}/>}
      {viewT&&<ViewDrawer funnel={viewT} onClose={()=>setViewT(null)} onEdit={f=>setEditT(f)} onCreEdit={f=>setCreEditT(f)} onStatusChange={upStatus} user={user} comments={funnelComments[viewT.id]||[]} onAddComment={addComment} followupLogs={followupLogs[viewT.id]||[]} onLogFollowup={()=>setLogModalFunnel(viewT)} onAddProof={f=>{setProofModalFunnel(f);}} T={T}/>}
      {creEditT&&<CREEditModal funnel={creEditT} onClose={()=>setCreEditT(null)} onSave={creEditSave} T={T}/>}
      {logModalFunnel&&!isViewerUser&&<FollowupLogModal funnel={logModalFunnel} user={user} onClose={()=>setLogModalFunnel(null)} onSave={saveFollowupLog} T={T}/>
      }{proofModalFunnel&&<WonProofModal funnel={proofModalFunnel} onClose={()=>setProofModalFunnel(null)} onSave={saveProof} T={T}/>}
      <Toaster list={toasts} T={T}/>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(()=>{
    try{const s=localStorage.getItem("ek-user");return s?JSON.parse(s):null;}catch{return null;}
  });
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const {dark,toggle:onToggleDark}=useDark();
  const T=makeT(dark);

  useEffect(()=>{
    const fetchUsers=async()=>{try{const data=await crmService.getUsers();setUsers(data&&data.length>0?data:SEED_USERS);}catch(err){console.error(err);setUsers(SEED_USERS);}finally{setLoading(false);}};
    fetchUsers();
  },[]);

  const handleUsersChange=async(newUsers)=>{
    try{
      const currentUsernames=users.map(u=>u.username);
      const deletedUsernames=currentUsernames.filter(u=>!newUsers.map(u=>u.username).includes(u));
      for(const username of deletedUsernames){await crmService.deleteUser(username);}
      await crmService.saveUsers(newUsers);
      const data=await crmService.getUsers();setUsers(data);
    }catch(err){console.error(err);}
  };

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:F,gap:24}}>
      <div style={{position:"relative",width:72,height:72}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid rgba(91,59,232,0.15)"}}/>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:"#5B3BE8",animation:"spin .8s linear infinite"}}/>
        <div style={{position:"absolute",inset:8,borderRadius:"50%",background:"#5B3BE8",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <img src="/logo.png" alt="Ekanta" style={{width:32,height:32,borderRadius:6,objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:700,color:T.ink,letterSpacing:"-0.3px",marginBottom:6}}>Ekanta CRM</div>
        <div style={{fontSize:13,color:T.inkMuted,animation:"pulse 1.5s ease infinite"}}>Loading your workspace…</div>
      </div>
    </div>
  );

  return (
    <>
      <FontLoader dark={dark}/>
      {!user
        ?<Login users={users} onLogin={u=>{localStorage.setItem("ek-user",JSON.stringify(u));setUser(u);}} T={T} dark={dark} onToggleDark={onToggleDark}/>
        :<Shell user={user} users={users} onLogout={()=>{localStorage.removeItem("ek-user");setUser(null);}} onUsersChange={handleUsersChange} T={T} dark={dark} onToggleDark={onToggleDark}/>
      }
    </>
  );
}
