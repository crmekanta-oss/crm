import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { crmService } from "./services/crmService";
import { supabase } from "./lib/supabase";

/*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EKANTA CRM — v8
  New in v8:
  ⑮ Lead source pills — brand SVG icons + name
  ⑯ Login — two-column layout with CRM highlights
  ⑰ Dark mode toggle
  ⑱ Clickable user profile panel in sidebar (extensible)
  ⑲ Greeting on dashboard using logged-in user's name
  ⑳ Row click opens view drawer
  ㉑ Show/hide password on login
  ㉒ Notification bell — today's follow-ups badge
  ㉓ Sidebar collapse/expand (mini icon mode)
  ㉔ Skeleton loading cards
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

// ─── THEME TOKENS (light + dark) ─────────────────────────────────────────────
const makeT = (dark) => ({
  bg:           dark ? "#0F0F14" : "#F7F8FA",
  surface:      dark ? "#1A1A24" : "#FFFFFF",
  surfaceHover: dark ? "#22222F" : "#FAFAFA",
  surfaceEl:    dark ? "#22222F" : "#F7F8FA",
  sidebar:      dark ? "#13131C" : "#FFFFFF",
  brand:        "#5B3BE8",
  brandHover:   "#4A2CC5",
  brandSubtle:  dark ? "rgba(91,59,232,0.15)" : "#F0EEFF",
  ink:          dark ? "#F0F0F5" : "#0F0F10",
  inkSub:       dark ? "#9090A8" : "#6E6E80",
  inkMuted:     dark ? "#5A5A72" : "#A1A1AA",
  inkInvert:    "#FFFFFF",
  line:         dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  lineMid:      dark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.11)",
  lineStrong:   dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.16)",
  shadowSm:     dark ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.05)",
  shadowMd:     dark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.07)",
  shadowLg:     dark ? "0 4px 16px rgba(0,0,0,0.4)" : "0 4px 16px rgba(0,0,0,0.07)",
  shadowXl:     dark ? "0 16px 48px rgba(0,0,0,0.6)" : "0 16px 48px rgba(0,0,0,0.12)",
  won:     { dot:"#16A34A", bg: dark?"rgba(22,163,74,0.15)":"#F0FDF4", text: dark?"#4ADE80":"#15803D" },
  pending: { dot:"#D97706", bg: dark?"rgba(217,119,6,0.15)":"#FFFBEB",  text: dark?"#FCD34D":"#B45309" },
  lost:    { dot:"#DC2626", bg: dark?"rgba(220,38,38,0.15)":"#FEF2F2",  text: dark?"#F87171":"#B91C1C" },
  drop:    { dot:"#9CA3AF", bg: dark?"rgba(156,163,175,0.1)":"#F9FAFB", text: dark?"#9CA3AF":"#6B7280" },
  new:     { dot:"#3B82F6", bg: dark?"rgba(59,130,246,0.15)":"#EFF6FF", text: dark?"#60A5FA":"#1D4ED8" },
  high:    { dot:"#7C3AED", bg: dark?"rgba(124,58,237,0.15)":"#F5F3FF", text: dark?"#A78BFA":"#5B21B6" },
  premium: { dot:"#DB2777", bg: dark?"rgba(219,39,119,0.15)":"#FDF2F8", text: dark?"#F472B6":"#9D174D" },
  bulk:    { dot:"#059669", bg: dark?"rgba(5,150,105,0.15)":"#ECFDF5",  text: dark?"#34D399":"#047857" },
  r: { sm:"6px", md:"8px", lg:"10px", xl:"12px", "2xl":"16px" },
});

const F = "'Geist', system-ui, -apple-system, sans-serif";

// ─── FONT & GLOBAL STYLES ─────────────────────────────────────────────────────
function FontLoader({ dark }) {
  useEffect(() => {
    if (!document.getElementById("ek-font")) {
      const l = document.createElement("link");
      l.id = "ek-font"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
    let g = document.getElementById("ek-global-style");
    if (!g) { g = document.createElement("style"); g.id = "ek-global-style"; document.head.appendChild(g); }
    g.textContent = `
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{font-size:14px}
      body{background:${dark?"#0F0F14":"#F7F8FA"};color:${dark?"#F0F0F5":"#0F0F10"};font-family:'Geist',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;transition:background .2s,color .2s}
      input,select,textarea,button{font-family:inherit}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:rgba(128,128,128,.2);border-radius:4px}
      @media(max-width:767px){
        .ek-sidebar{display:none!important}.ek-sidebar.open{display:flex!important}
        .ek-stats-grid{grid-template-columns:repeat(2,1fr)!important}
        .ek-topbar-search{display:none!important}
        .ek-form-3col{grid-template-columns:1fr!important}
        .ek-form-2col{grid-template-columns:1fr!important}
        .ek-analytics-3col{grid-template-columns:1fr!important}
        .ek-team-grid{grid-template-columns:1fr!important}
        .ek-mobile-menu{display:flex!important}
        .ek-login-left{display:none!important}
      }
    `;
  }, [dark]);
  return null;
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────
const FULL  = ["CEO","Manager"];
const can   = (u, a) => FULL.includes(u?.role) || a === "create" || a === "export";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATS         = ["Dresses","Sarees","Half Sarees","Kurtis","Lehengas","Mom & Me","999 Deals","kids","Padava Sattai","Mens","Blouses","Others"];
const ENQS         = ["New Customer","Repeat Customer","Bulk Order","Custom Design","Wholesale","Others"];
const FTYPES       = ["Normal","High Value","Bulk","priority","Others"];
const ROLES        = ["CEO","Manager","CRE"];
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
  return `${g}, ${name} 👋`;
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
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/><Interior ss:Color="#5B3BE8" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Funnels"><Table>${hRow}${rows}</Table></Worksheet></Workbook>`;
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
  const s={success:"#16A34A",error:"#DC2626",info:"#5B3BE8"};
  return (
    <div style={{position:"fixed",bottom:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
      {list.map(t=>(
        <div key={t.id} style={{background:T.surface,border:`1px solid ${T.line}`,borderLeft:`3px solid ${s[t.type]||s.info}`,borderRadius:T.r.md,padding:"10px 16px",fontSize:13,color:T.ink,fontFamily:F,boxShadow:T.shadowLg,animation:"slideRight .2s ease",minWidth:220}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const Dot = ({color,size=6}) => <span style={{width:size,height:size,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>;

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
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:sm?"2px 7px":"3px 8px",borderRadius:20,fontSize:sm?11:12,fontWeight:500,background:c.bg,color:c.text,fontFamily:F,whiteSpace:"nowrap",letterSpacing:"0.01em"}}>
      <Dot color={c.dot} size={5}/>{status}
    </span>
  );
}

// ⑮ Brand SVG icons for lead sources
function SourceIcon({source}) {
  const icons = {
    WhatsApp: <svg width="11" height="11" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.523 5.845L.057 23.885a.5.5 0 00.613.613l6.04-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 01-5.073-1.387l-.361-.214-3.757.912.929-3.657-.236-.374A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>,
    Email: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5B3BE8" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>,
    Website: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    Call: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .9h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 15.92v1z"/></svg>,
    "Abandoned Cart": <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
    "Social media": <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>,
    Owner: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    Other: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  };
  return icons[source] || icons.Other;
}

function SourcePill({source, T}) {
  if (!source) return null;
  const colors = {
    WhatsApp:"rgba(37,211,102,0.12)", Email:"rgba(91,59,232,0.1)", Website:"rgba(59,130,246,0.1)",
    Call:"rgba(22,163,74,0.12)", "Abandoned Cart":"rgba(217,119,6,0.12)",
    "Social media":"rgba(219,39,119,0.1)", Owner:"rgba(124,58,237,0.1)", Other:"rgba(156,163,175,0.1)",
  };
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 7px",borderRadius:20,fontSize:10,fontWeight:500,background:colors[source]||"rgba(156,163,175,0.1)",color:T.inkSub,fontFamily:F,whiteSpace:"nowrap",border:`1px solid ${T.line}`}}>
      <SourceIcon source={source}/>
      {source}
    </span>
  );
}

function Ic({d,sz=16,color="currentColor",sw=1.5}) {
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{display:"block",flexShrink:0}}><path d={d} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
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

function Avatar({name,size=32}) {
  const bg=[["#EDE9FE","#5B21B6"],["#D1FAE5","#065F46"],["#FEF3C7","#92400E"],["#FCE7F3","#9D174D"],["#DBEAFE","#1E40AF"]];
  const[bg2,tx]=bg[(name?.charCodeAt(0)||65)%bg.length];
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg2,color:tx,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.33,fontWeight:600,flexShrink:0,fontFamily:F,letterSpacing:"-0.02em"}}>{(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</div>;
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
function Btn({primary,ghost,danger,sm,icon,label,onClick,disabled,full,T}) {
  const [hov,setHov]=useState(false);
  const base={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:sm?"6px 12px":"8px 14px",fontSize:sm?12:13,fontWeight:500,fontFamily:F,borderRadius:T.r.md,border:"none",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"background .15s,box-shadow .15s,transform .1s",whiteSpace:"nowrap",letterSpacing:"0.01em",...(full?{width:"100%"}:{})};
  const styles={
    ...(primary?{background:hov?"#4A2CC5":"#5B3BE8",color:"#fff",boxShadow:hov?"0 2px 8px rgba(91,59,232,.3)":T.shadowSm}:{}),
    ...(ghost?{background:hov?T.surfaceHover:T.surface,color:T.ink,border:`1px solid ${T.line}`,boxShadow:hov?T.shadowSm:"none"}:{}),
    ...(danger?{background:hov?"#FEF2F2":T.surface,color:"#B91C1C",border:`1px solid ${hov?"#FECACA":T.line}`}:{}),
    ...(!primary&&!ghost&&!danger?{background:hov?T.surfaceHover:"transparent",color:T.inkSub,border:`1px solid transparent`}:{}),
  };
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled} style={{...base,...styles}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onMouseDown={e=>!disabled&&(e.currentTarget.style.transform="scale(0.97)")}
      onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
      {icon&&<Ic d={icon} sz={13} color={primary?"#fff":"currentColor"}/>}
      {label}
    </button>
  );
}

// ─── INPUT PRIMITIVES ─────────────────────────────────────────────────────────
const inputSx = (T, err) => ({
  width:"100%",padding:"8px 11px",border:`1px solid ${err?"#FECACA":T.lineMid}`,borderRadius:T.r.md,fontSize:13,fontFamily:F,color:T.ink,background:T.surface,outline:"none",boxSizing:"border-box",transition:"border-color .15s,box-shadow .15s",
});
const mkFocus = T => e => { e.target.style.borderColor="#5B3BE8"; e.target.style.boxShadow=`0 0 0 3px rgba(91,59,232,.1)`; };
const mkBlur  = T => e => { e.target.style.borderColor=T.lineMid; e.target.style.boxShadow="none"; };
const selectBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236E6E80' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 7px center`;

function FInput({label,value,onChange,placeholder,type="text",error,required,T}) {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>{label}{required&&<span style={{color:"#DC2626",marginLeft:2}}>*</span>}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{...inputSx(T,error),borderColor:focused?"#5B3BE8":error?"#FECACA":T.lineMid,boxShadow:focused?"0 0 0 3px rgba(91,59,232,.1)":"none"}}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
      {error&&<span style={{fontSize:11,color:"#B91C1C"}}>{error}</span>}
    </div>
  );
}

function FSelect({label,value,onChange,options,placeholder,required,error,T}) {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>{label}{required&&<span style={{color:"#DC2626",marginLeft:2}}>*</span>}</label>}
      <select value={value} onChange={onChange}
        style={{...inputSx(T,error),cursor:"pointer",appearance:"none",background:`${T.surface} ${selectBg}`,borderColor:focused?"#5B3BE8":error?"#FECACA":T.lineMid,boxShadow:focused?"0 0 0 3px rgba(91,59,232,.1)":"none"}}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}>
        <option value="">{placeholder||"Select…"}</option>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
      {error&&<span style={{fontSize:11,color:"#B91C1C"}}>{error}</span>}
    </div>
  );
}

const SL = ({children,T}) => <div style={{fontSize:11,fontWeight:600,color:T.inkMuted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12,fontFamily:F}}>{children}</div>;

// ─── SKELETON LOADER ──────────────────────────────────────────────────────────
// ㉔ Skeleton loading cards
function SkeletonRow({T}) {
  const shimmerStyle = {
    background: `linear-gradient(90deg, ${T.surface} 25%, ${T.surfaceEl} 50%, ${T.surface} 75%)`,
    backgroundSize:"800px 100%",
    animation:"shimmer 1.5s infinite",
    borderRadius:4,
  };
  return (
    <tr style={{borderBottom:`1px solid ${T.line}`}}>
      {[3,18,12,10,11,10,11,10,15].map((w,i)=>(
        <td key={i} style={{padding:"14px 12px",verticalAlign:"middle"}}>
          <div style={{...shimmerStyle,height:12,width:`${w*4}px`,maxWidth:"100%"}}/>
          {i===1&&<div style={{...shimmerStyle,height:8,width:"60%",marginTop:6}}/>}
        </td>
      ))}
    </tr>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// ⑯ Two-column login with CRM highlights + ㉑ show/hide password
function Login({users,onLogin,T,dark,onToggleDark}) {
  const [u,su]=useState(""); const [p,sp]=useState(""); const [err,se]=useState(""); const [load,sl]=useState(false);
  const [showPw,setShowPw]=useState(false);

  const go=()=>{
    const trimmedU=u.trim().toLowerCase(); const trimmedP=p.trim();
    if(!trimmedU||!trimmedP){se("Please fill in all fields.");return;}
    se(""); sl(true);
    setTimeout(()=>{
      const found=users.find(x=>x.username.toLowerCase()===trimmedU&&x.password===trimmedP);
      if(found) onLogin(found);
      else{se("Incorrect username or password.");sl(false);}
    },600);
  };

  const features=[
    {icon:P.list,   title:"Pipeline Tracking",    desc:"Manage every lead from first contact to closed deal"},
    {icon:P.bell,   title:"Follow-up Reminders",  desc:"Never miss a follow-up with smart overdue alerts"},
    {icon:P.chart,  title:"Revenue Analytics",    desc:"Real-time insights on won revenue and pipeline value"},
    {icon:P.users,  title:"Team Collaboration",   desc:"Assign funnels to CREs and track team performance"},
  ];

  return (
    <div style={{minHeight:"100vh",display:"flex",background:T.bg,fontFamily:F}}>
      {/* Left panel */}
      <div className="ek-login-left" style={{width:"55%",background:"#5B3BE8",padding:"48px 56px",display:"flex",flexDirection:"column",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
        {/* decorative circles */}
        <div style={{position:"absolute",top:-80,right:-80,width:320,height:320,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{position:"absolute",bottom:-120,left:-60,width:400,height:400,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
        <div style={{position:"absolute",top:"40%",right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>

        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:48}}>
            <div style={{width:36,height:36,background:"rgba(255,255,255,0.2)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
              <Ic d={P.layers} sz={16} color="#fff" sw={2}/>
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff",letterSpacing:"-0.3px"}}>Ekanta Design Studio</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Customer Relations Management</div>
            </div>
          </div>

          <h1 style={{fontSize:36,fontWeight:700,color:"#fff",letterSpacing:"-1px",lineHeight:1.15,margin:"0 0 16px"}}>
            Your sales pipeline,<br/>beautifully managed
          </h1>
          <p style={{fontSize:14,color:"rgba(255,255,255,0.7)",lineHeight:1.7,margin:"0 0 48px",maxWidth:380}}>
            Track every lead, follow up on time, and close more deals — all in one place built for fashion businesses.
          </p>

          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            {features.map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,animation:`fadeUp .4s ease ${i*.08}s both`}}>
                <div style={{width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,backdropFilter:"blur(4px)"}}>
                  <Ic d={f.icon} sz={15} color="#fff" sw={1.8}/>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:3}}>{f.title}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.5}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:16,paddingTop:32,borderTop:"1px solid rgba(255,255,255,0.12)"}}>
          {[["9+","Active Users"],["100%","Uptime"],["Real-time","Sync"]].map(([v,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>{v}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 48px",position:"relative"}}>
        {/* dark mode toggle on login */}
        <button onClick={onToggleDark} style={{position:"absolute",top:24,right:24,width:36,height:36,borderRadius:T.r.lg,background:T.surface,border:`1px solid ${T.line}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:T.shadowSm}} title={dark?"Light mode":"Dark mode"}>
          <Ic d={dark?P.sun:P.moon} sz={15} color={T.inkSub}/>
        </button>

        <div style={{width:"100%",maxWidth:360,animation:"fadeUp .35s ease"}}>
          <div style={{marginBottom:32}}>
            <h2 style={{fontSize:24,fontWeight:700,color:T.ink,margin:"0 0 6px",letterSpacing:"-0.5px"}}>Welcome back</h2>
            <p style={{fontSize:13,color:T.inkSub,margin:0}}>Sign in to your Ekanta CRM account</p>
          </div>

          {err&&<div style={{background:T.lost.bg,border:`1px solid ${T.lost.dot}44`,borderRadius:T.r.md,padding:"10px 12px",fontSize:12,color:T.lost.text,marginBottom:16,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
            <span>⚠️</span>{err}
          </div>}

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:T.inkSub,display:"block",marginBottom:5}}>Username</label>
              <input value={u} onChange={e=>su(e.target.value)} placeholder="Enter your username"
                style={{...inputSx(T),width:"100%"}} onFocus={mkFocus(T)()} onBlur={mkBlur(T)()}
                onKeyDown={e=>e.key==="Enter"&&go()}/>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:T.inkSub,display:"flex",justifyContent:"space-between",marginBottom:5}}>
                Password
                <span style={{color:"#5B3BE8",cursor:"pointer",fontSize:12}} onClick={()=>se("Contact your administrator.")}>Forgot?</span>
              </label>
              <div style={{position:"relative"}}>
                <input type={showPw?"text":"password"} value={p} onChange={e=>sp(e.target.value)}
                  placeholder="Enter your password" onKeyDown={e=>e.key==="Enter"&&go()}
                  style={{...inputSx(T),width:"100%",paddingRight:40}}
                  onFocus={mkFocus(T)()} onBlur={mkBlur(T)()}/>
                <button onClick={()=>setShowPw(x=>!x)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:2}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {showPw
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <button onClick={go} disabled={load}
              style={{width:"100%",padding:"11px",background:load?"#4A2CC5":"#5B3BE8",color:"#fff",border:"none",borderRadius:T.r.md,fontSize:14,fontWeight:600,fontFamily:F,cursor:load?"not-allowed":"pointer",transition:"background .15s",marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
              onMouseEnter={e=>{if(!load)e.currentTarget.style.background="#4A2CC5";}}
              onMouseLeave={e=>{if(!load)e.currentTarget.style.background="#5B3BE8";}}>
              {load?<><svg style={{animation:"spin .7s linear infinite"}} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"/><path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Signing in…</>:"Sign in →"}
            </button>
          </div>

          <p style={{fontSize:11,color:T.inkMuted,textAlign:"center",marginTop:24,lineHeight:1.6}}>
            Secure access · Data encrypted · Chennai, India
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
// ㉓ Collapsible sidebar + ⑱ Profile panel
function Sidebar({active,set,user,onLogout,open,onClose,T,dark,onToggleDark,collapsed,onToggleCollapse}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(()=>{
    const handler = e => { if(profileRef.current&&!profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[]);

  const nav=[
    {id:"dashboard",label:"Dashboard",icon:P.dash},
    {id:"funnels",  label:"Funnels",  icon:P.list},
    {id:"analytics",label:"Analytics",icon:P.chart},
    ...(FULL.includes(user.role)?[{id:"team",label:"Team",icon:P.users}]:[]),
  ];

  const w = collapsed ? 56 : 200;

  return (
    <>
      {open&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:199}}/>}
      <div className={`ek-sidebar${open?" open":""}`}
        style={{width:w,minHeight:"100vh",background:T.sidebar,borderRight:`1px solid ${T.line}`,display:"flex",flexDirection:"column",flexShrink:0,position:"relative",zIndex:200,transition:"width .2s ease",overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:collapsed?"14px 0":"18px 16px 14px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between"}}>
          {!collapsed&&(
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:28,height:28,background:"#5B3BE8",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Ic d={P.layers} sz={13} color="#fff" sw={2.2}/>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:T.ink,letterSpacing:"-0.2px",lineHeight:1.2}}>Ekanta</div>
                <div style={{fontSize:10,color:T.inkMuted,lineHeight:1}}>Design Studio</div>
              </div>
            </div>
          )}
          {collapsed&&<div style={{width:28,height:28,background:"#5B3BE8",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={P.layers} sz={13} color="#fff" sw={2.2}/></div>}
          {!collapsed&&(
            <button onClick={onToggleCollapse} style={{background:"none",border:`1px solid ${T.line}`,cursor:"pointer",color:T.inkSub,display:"flex",padding:4,borderRadius:6,marginLeft:"auto"}} title="Collapse sidebar">
              <Ic d={P.chevL} sz={12} color="currentColor"/>
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed&&(
          <button onClick={onToggleCollapse} style={{margin:"8px auto",background:"none",border:`1px solid ${T.line}`,cursor:"pointer",color:T.inkSub,display:"flex",padding:4,borderRadius:6}} title="Expand sidebar">
            <Ic d={P.chevR} sz={12} color="currentColor"/>
          </button>
        )}

        {/* Nav */}
        <nav style={{flex:1,padding:`8px ${collapsed?4:8}px 0`}}>
          {!collapsed&&<div style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.08em",padding:"10px 8px 4px",textTransform:"uppercase"}}>Navigation</div>}
          {nav.map(item=>{
            const a=active===item.id;
            return (
              <div key={item.id} style={{position:"relative"}}>
                <button onClick={()=>{set(item.id);onClose&&onClose();}}
                  title={collapsed?item.label:undefined}
                  style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:collapsed?"10px 0":"7px 8px",borderRadius:T.r.md,border:"none",background:a?"rgba(91,59,232,.08)":"transparent",color:a?"#5B3BE8":T.inkSub,fontFamily:F,fontSize:13,fontWeight:a?600:400,cursor:"pointer",marginBottom:1,transition:"all .12s",textAlign:"left",justifyContent:collapsed?"center":"flex-start"}}
                  onMouseEnter={e=>{if(!a){e.currentTarget.style.background=T.surfaceEl;e.currentTarget.style.color=T.ink;}}}
                  onMouseLeave={e=>{if(!a){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.inkSub;}}}>
                  {a&&!collapsed&&<span style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:2,height:18,background:"#5B3BE8",borderRadius:"0 2px 2px 0"}}/>}
                  <Ic d={item.icon} sz={14} color={a?"#5B3BE8":T.inkSub}/>
                  {!collapsed&&item.label}
                </button>
              </div>
            );
          })}
        </nav>

        {/* ⑱ User profile area — clickable, opens panel */}
        <div ref={profileRef} style={{padding:`10px ${collapsed?4:8}px 14px`,borderTop:`1px solid ${T.line}`,position:"relative"}}>
          {/* Profile popup panel */}
          {profileOpen&&(
            <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:collapsed?56:8,right:8,background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r.lg,boxShadow:T.shadowXl,overflow:"hidden",zIndex:300,animation:"fadeUp .15s ease",minWidth:collapsed?200:undefined}}>
              {/* User info header */}
              <div style={{padding:"14px 16px",background:T.brandSubtle,borderBottom:`1px solid ${T.line}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar name={user.name} size={36}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:F}}>{user.name}</div>
                    <div style={{fontSize:11,color:T.inkSub,fontFamily:F}}>@{user.username} · {user.role}</div>
                  </div>
                </div>
              </div>

              {/* ─── EXTENSIBLE SECTION — add items here in future ─── */}
              <div style={{padding:"6px 0"}}>
                {/* Dark mode toggle */}
                <button onClick={onToggleDark}
                  style={{width:"100%",padding:"9px 16px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:F,fontSize:13,color:T.ink,transition:"background .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceEl}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:28,height:28,borderRadius:7,background:T.surfaceEl,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Ic d={dark?P.sun:P.moon} sz={13} color={T.inkSub}/>
                    </div>
                    <span>{dark?"Light Mode":"Dark Mode"}</span>
                  </div>
                  {/* toggle pill */}
                  <div style={{width:36,height:20,borderRadius:10,background:dark?"#5B3BE8":T.line,position:"relative",transition:"background .2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:2,left:dark?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                  </div>
                </button>

                {/* Sign out */}
                <button onClick={onLogout}
                  style={{width:"100%",padding:"9px 16px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontFamily:F,fontSize:13,color:"#DC2626",transition:"background .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#FEF2F2"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <div style={{width:28,height:28,borderRadius:7,background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Ic d={P.out} sz={13} color="#DC2626"/>
                  </div>
                  Sign out
                </button>
              </div>
            </div>
          )}

          {/* Profile trigger */}
          <button onClick={()=>setProfileOpen(x=>!x)}
            style={{display:"flex",alignItems:"center",gap:collapsed?0:9,width:"100%",padding:collapsed?"8px 0":"7px 8px",borderRadius:T.r.md,background:profileOpen?T.surfaceEl:"transparent",border:"none",cursor:"pointer",transition:"background .12s",justifyContent:collapsed?"center":"flex-start"}}
            onMouseEnter={e=>e.currentTarget.style.background=T.surfaceEl}
            onMouseLeave={e=>{if(!profileOpen)e.currentTarget.style.background="transparent";}}>
            <Avatar name={user.name} size={28}/>
            {!collapsed&&(
              <div style={{flex:1,minWidth:0,textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:600,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
                <div style={{fontSize:10,color:T.inkMuted}}>{user.role}</div>
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
// ㉒ Notification bell for today's follow-ups
function Topbar({title,search,setSearch,user,onAdd,onExportAll,onExportFiltered,fLen,aLen,onMenuToggle,T,todayCount}) {
  const [bellHov,setBellHov]=useState(false);
  return (
    <div style={{background:T.surface,borderBottom:`1px solid ${T.line}`,padding:"0 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <button onClick={onMenuToggle} className="ek-mobile-menu"
            style={{background:"none",border:"none",cursor:"pointer",color:T.inkSub,display:"none",padding:4,borderRadius:6}}>
            <Ic d={P.menu} sz={18} color="currentColor"/>
          </button>
          <h1 style={{fontSize:15,fontWeight:600,color:T.ink,letterSpacing:"-0.2px",margin:0,fontFamily:F}}>{title}</h1>
          <div className="ek-topbar-search" style={{display:"flex",alignItems:"center",gap:8,background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"6px 11px",minWidth:220,maxWidth:320,flex:1}}>
            <Ic d={P.search} sz={13} color={T.inkMuted}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search funnels…"
              style={{border:"none",background:"transparent",outline:"none",fontSize:13,color:T.ink,fontFamily:F,width:"100%"}}/>
            {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:0}}><Ic d={P.close} sz={12} color="currentColor"/></button>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:12}}>
          {/* Bell */}
          <div style={{position:"relative"}}>
            <button onMouseEnter={()=>setBellHov(true)} onMouseLeave={()=>setBellHov(false)}
              style={{width:34,height:34,borderRadius:T.r.md,background:bellHov?T.surfaceEl:"transparent",border:`1px solid ${bellHov?T.line:"transparent"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}}
              title={todayCount?`${todayCount} follow-up${todayCount>1?"s":""} due today`:undefined}>
              <Ic d={P.bell} sz={15} color={todayCount>0?"#D97706":T.inkSub}/>
            </button>
            {todayCount>0&&(
              <div style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"#D97706",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,border:`2px solid ${T.surface}`}}>
                {todayCount>9?"9+":todayCount}
              </div>
            )}
          </div>
          {FULL.includes(user.role)&&(
            <><Btn ghost sm icon={P.dl} label={`Filtered (${fLen})`} onClick={onExportFiltered} T={T}/><Btn ghost sm icon={P.dl} label={`All (${aLen})`} onClick={onExportAll} T={T}/></>
          )}
          {!FULL.includes(user.role)&&can(user,"export")&&<Btn ghost sm icon={P.dl} label="Export" onClick={onExportFiltered} T={T}/>}
          {can(user,"create")&&<Btn primary sm icon={P.plus} label="Add funnel" onClick={onAdd} T={T}/>}
        </div>
      </div>
    </div>
  );
}

// ─── STATS ROW ────────────────────────────────────────────────────────────────
function Stats({funnels, activeStatFilter, onStatClick, T}) {
  const won=funnels.filter(f=>f.status==="Won");
  const pending=funnels.filter(f=>f.status==="Pending");
  const lost=funnels.filter(f=>f.status==="Lost");
  const drop=funnels.filter(f=>f.status==="Drop");
  const s={total:funnels.length,won:won.length,pending:pending.length,lost:lost.length,drop:drop.length,revenue:won.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0),pendingRevenue:pending.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0)};
  const wr=s.total?Math.round(s.won/s.total*100):0;
  const cards=[
    {label:"Total leads",     value:s.total,              caption:"All leads",          accent:T.inkMuted,    bg:T.surface,   filterKey:null},
    {label:"Won",             value:s.won,                caption:`${wr}% win rate`,    accent:T.won.dot,     bg:T.won.bg,    filterKey:"Won"},
    {label:"Pending",         value:s.pending,            caption:"Need follow-up",     accent:T.pending.dot, bg:T.pending.bg,filterKey:"Pending"},
    {label:"Lost",            value:s.lost,               caption:"Closed lost",        accent:T.lost.dot,    bg:T.lost.bg,   filterKey:"Lost"},
    {label:"Drop",            value:s.drop,               caption:"Dropped leads",      accent:T.drop.dot,    bg:T.surface,   filterKey:"Drop"},
    {label:"Won Revenue",     value:big(s.revenue),       caption:"From won deals",     accent:T.won.dot,     bg:T.won.bg,    filterKey:"Won"},
    {label:"Pending Revenue", value:big(s.pendingRevenue),caption:"Potential pipeline", accent:T.pending.dot, bg:T.pending.bg,filterKey:"Pending"},
  ];
  return (
    <div style={{padding:"20px 24px 0"}}>
      <div className="ek-stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10}}>
        {cards.map((c,i)=>{
          const isActive=activeStatFilter===c.filterKey&&c.filterKey!==null;
          return (
            <div key={i} onClick={()=>onStatClick(c.filterKey)}
              style={{background:c.bg,border:`1.5px solid ${isActive?c.accent:T.line}`,borderRadius:T.r.lg,padding:"14px 16px",boxShadow:isActive?`0 0 0 3px ${c.accent}22`:T.shadowSm,animation:`fadeUp .25s ease ${i*.04}s both`,cursor:c.filterKey?"pointer":"default",transition:"all .15s",transform:isActive?"translateY(-1px)":"none",position:"relative"}}
              onMouseEnter={e=>{if(c.filterKey){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 0 0 3px ${c.accent}33`;}}}
              onMouseLeave={e=>{if(c.filterKey&&!isActive){e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}}>
              {isActive&&<div style={{position:"absolute",top:8,right:8,width:6,height:6,borderRadius:"50%",background:c.accent}}/>}
              <div style={{fontSize:10,fontWeight:500,color:T.inkMuted,letterSpacing:"0.04em",marginBottom:8,fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:isActive?c.accent:T.ink,fontFamily:F,letterSpacing:"-0.5px",marginBottom:4}}>{c.value}</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}><Dot color={c.accent} size={5}/><span style={{fontSize:10,color:T.inkMuted,fontFamily:F,whiteSpace:"nowrap"}}>{isActive?"Filtered ✓":c.caption}</span></div>
            </div>
          );
        })}
      </div>
      {activeStatFilter&&(
        <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:T.inkSub,fontFamily:F}}>Showing <strong style={{color:T.ink}}>{activeStatFilter}</strong> funnels</span>
          <button onClick={()=>onStatClick(null)} style={{fontSize:12,color:"#5B3BE8",background:"none",border:"none",cursor:"pointer",fontFamily:F,fontWeight:500,textDecoration:"underline",padding:0}}>Clear</button>
        </div>
      )}
    </div>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({fil,setF,reset,users=[],user,T}) {
  const sel=(val,key,opts,ph)=>(
    <select value={val} onChange={e=>setF(key,e.target.value)}
      style={{padding:"5px 24px 5px 9px",border:`1px solid ${T.line}`,borderRadius:T.r.md,fontSize:12,fontFamily:F,color:val?T.ink:T.inkSub,background:val?`${T.brandSubtle} ${selectBg}`:`${T.surface} ${selectBg}`,cursor:"pointer",outline:"none",appearance:"none",fontWeight:val?500:400}}>
      <option value="">{ph}</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  const chk=(key,label)=>(
    <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:fil[key]?"#5B3BE8":T.inkSub,cursor:"pointer",fontFamily:F,fontWeight:fil[key]?500:400,userSelect:"none"}}>
      <input type="checkbox" checked={fil[key]} onChange={e=>setF(key,e.target.checked)} style={{accentColor:"#5B3BE8",width:13,height:13}}/>
      {label}
    </label>
  );
  const any=fil.status||fil.funnelType||fil.enquiryType||fil.leadSource||fil.descFilter||fil.missed||fil.todayF||fil.upcoming;
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 24px",borderBottom:`1px solid ${T.line}`,background:T.surface,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}><Ic d={P.filter} sz={12} color={T.inkMuted}/><span style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Filter</span></div>
      <div style={{width:1,height:14,background:T.line}}/>
      {chk("missed","Missed")} {chk("todayF","Today")} {chk("upcoming","Upcoming")}
      <div style={{width:1,height:14,background:T.line}}/>
      {sel(fil.status,"status",STATUS,"All status")}
      {sel(fil.funnelType,"funnelType",FTYPES,"All types")}
      {sel(fil.enquiryType,"enquiryType",ENQS,"All enquiries")}
      {sel(fil.leadSource,"leadSource",LEAD_SOURCES,"All sources")}
      {FULL.includes(user?.role)&&users.filter(u=>u.role==="CRE").length>0&&(
        <select value={fil.cre||""} onChange={e=>setF("cre",e.target.value)}
          style={{padding:"5px 24px 5px 9px",border:`1px solid ${T.line}`,borderRadius:T.r.md,fontSize:12,fontFamily:F,color:fil.cre?T.ink:T.inkSub,background:fil.cre?`${T.brandSubtle} ${selectBg}`:`${T.surface} ${selectBg}`,cursor:"pointer",outline:"none",appearance:"none",fontWeight:fil.cre?500:400}}>
          <option value="">All CRE</option>
          {users.filter(u=>u.role==="CRE").map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
        </select>
      )}
      <div style={{width:1,height:14,background:T.line}}/>
      <div style={{display:"flex",alignItems:"center",gap:7,background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"4px 10px",minWidth:180}}>
        <Ic d={P.search} sz={12} color={T.inkMuted}/>
        <input value={fil.descFilter} onChange={e=>setF("descFilter",e.target.value)} placeholder="Search description…"
          style={{border:"none",background:"transparent",outline:"none",fontSize:12,color:T.ink,fontFamily:F,width:"100%"}}/>
        {fil.descFilter&&<button onClick={()=>setF("descFilter","")} style={{background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:0}}><Ic d={P.close} sz={11} color="currentColor"/></button>}
      </div>
      {any&&<button onClick={reset} style={{fontSize:12,color:"#5B3BE8",background:"none",border:"none",cursor:"pointer",fontFamily:F,fontWeight:500,padding:"0 4px",textDecoration:"underline",textUnderlineOffset:2}}>Clear</button>}
    </div>
  );
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
// ⑳ Row click opens view drawer
function Table({rows,user,onView,onEdit,onCreEdit,onDelete,onLogFollowup,loading,T}) {
  const [isMobile,setIsMobile]=useState(typeof window!=="undefined"?window.innerWidth<768:false);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  if(loading) return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F,tableLayout:"fixed"}}>
        <colgroup><col style={{width:"3%"}}/><col style={{width:"18%"}}/><col style={{width:"12%"}}/><col style={{width:"10%"}}/><col style={{width:"11%"}}/><col style={{width:"10%"}}/><col style={{width:"11%"}}/><col style={{width:"10%"}}/><col style={{width:"15%"}}/></colgroup>
        <tbody>{[...Array(6)].map((_,i)=><SkeletonRow key={i} T={T}/>)}</tbody>
      </table>
    </div>
  );

  if(!rows.length) return (
    <div style={{textAlign:"center",padding:"72px 24px",fontFamily:F}}>
      <div style={{width:48,height:48,background:T.brandSubtle,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Ic d={P.list} sz={22} color="#5B3BE8"/></div>
      <p style={{fontSize:15,fontWeight:600,color:T.ink,margin:"0 0 4px"}}>No leads found</p>
      <p style={{fontSize:13,color:T.inkSub,margin:0}}>Adjust your filters or add a new lead.</p>
    </div>
  );

  const todayV=today();

  if(isMobile) return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {rows.map((f,i)=>{
        const over=f.nextFollowUp&&f.nextFollowUp<todayV&&f.status==="Pending";
        const tod=f.nextFollowUp===todayV&&f.status==="Pending";
        const showLog=(over||tod)&&f.status!=="Won";
        const cats=[...new Set((f.products||[]).map(p=>p.category).filter(Boolean))].join(", ")||"—";
        const canCreEdit=!FULL.includes(user.role)&&(f.createdBy===user.name||f.assignedTo===user.name);
        return (
          <div key={f.id} onClick={()=>onView(f)} style={{padding:"14px 16px",borderBottom:`1px solid ${T.line}`,background:i%2===0?T.surface:T.surfaceEl,cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background=T.brandSubtle}
            onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:T.surfaceEl}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
              <div style={{flex:1,minWidth:0,marginRight:10}}>
                <div style={{fontSize:14,fontWeight:700,color:T.ink,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name||"—"}</div>
                <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:T.inkMuted,fontFamily:F}}>{f.createdBy}</span>
                  {f.assignedTo&&<span style={{fontSize:10,fontWeight:500,background:T.brandSubtle,color:"#5B3BE8",padding:"0px 6px",borderRadius:8,fontFamily:F}}>→{f.assignedTo}</span>}
                  {f.leadSource&&<SourcePill source={f.leadSource} T={T}/>}
                </div>
              </div>
              <StatusPill status={f.status} sm T={T}/>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}} onClick={e=>e.stopPropagation()}>
              {showLog&&<button onClick={()=>onLogFollowup(f)} style={{background:T.pending.bg,border:`1px solid ${T.pending.dot}`,borderRadius:T.r.md,padding:"7px 14px",fontSize:12,fontWeight:600,color:T.pending.text,cursor:"pointer",fontFamily:F}}>📋 Log</button>}
              {FULL.includes(user.role)&&<button onClick={()=>onEdit(f)} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.inkSub,fontFamily:F}}><Ic d={P.edit} sz={13} color={T.inkSub}/> Edit</button>}
              {canCreEdit&&<button onClick={()=>onCreEdit(f)} style={{background:T.surface,border:`1px solid #5B3BE8`,borderRadius:T.r.md,padding:"7px 12px",cursor:"pointer",fontSize:12,color:"#5B3BE8",fontFamily:F}}>Edit</button>}
              {FULL.includes(user.role)&&<button onClick={()=>onDelete(f.id)} style={{background:"#FEF2F2",border:`1px solid #FECACA`,borderRadius:T.r.md,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#B91C1C",fontFamily:F}}><Ic d={P.trash} sz={13} color="#DC2626"/> Delete</button>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const TH=({ch})=><th style={{padding:"0 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`1px solid ${T.line}`,height:34,background:T.surfaceEl}}>{ch}</th>;
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F,tableLayout:"fixed"}}>
        <colgroup><col style={{width:"3%"}}/><col style={{width:"18%"}}/><col style={{width:"12%"}}/><col style={{width:"10%"}}/><col style={{width:"11%"}}/><col style={{width:"10%"}}/><col style={{width:"11%"}}/><col style={{width:"10%"}}/><col style={{width:"15%"}}/></colgroup>
        <thead><tr><TH ch="#"/><TH ch="Name"/><TH ch="Category"/><TH ch="Type"/><TH ch="Follow-up"/><TH ch="Status"/><TH ch="Order No."/><TH ch="Quote"/><TH ch=""/></tr></thead>
        <tbody>
          {rows.map((f,i)=>{
            const over=f.nextFollowUp&&f.nextFollowUp<todayV&&f.status==="Pending";
            const tod=f.nextFollowUp===todayV&&f.status==="Pending";
            const showLog=(over||tod)&&f.status!=="Won";
            const cats=[...new Set((f.products||[]).map(p=>p.category).filter(Boolean))].join(", ")||"—";
            const canCreEdit=!FULL.includes(user.role)&&(f.createdBy===user.name||f.assignedTo===user.name);
            return (
              // ⑳ entire row is clickable
              <tr key={f.id} onClick={()=>onView(f)}
                style={{borderBottom:`1px solid ${T.line}`,transition:"background .1s",cursor:"pointer",background:i%2===0?T.surface:T.surfaceEl}}
                onMouseEnter={e=>e.currentTarget.style.background=T.brandSubtle}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:T.surfaceEl}>
                <td style={{padding:"0 12px",height:48,fontSize:11,color:T.inkMuted,fontWeight:600,verticalAlign:"middle"}}>{i+1}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle",overflow:"hidden"}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name||"—"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2,flexWrap:"nowrap",overflow:"hidden"}}>
                    <span style={{fontSize:10,color:T.inkMuted,flexShrink:0}}>{f.createdBy}</span>
                    {f.assignedTo&&<span style={{fontSize:10,fontWeight:500,background:T.brandSubtle,color:"#5B3BE8",padding:"0px 5px",borderRadius:8,fontFamily:F,flexShrink:0}}>→{f.assignedTo}</span>}
                    {f.leadSource&&<SourcePill source={f.leadSource} T={T}/>}
                  </div>
                </td>
                <td style={{padding:"0 12px",fontSize:11,color:T.inkSub,verticalAlign:"middle",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cats}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}>{f.funnelType?<StatusPill status={f.funnelType} sm T={T}/>:<span style={{color:T.inkMuted,fontSize:12}}>—</span>}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}>
                  {f.status==="Won"?<span style={{fontSize:12,color:T.inkMuted}}>—</span>:<>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {over&&<Dot color={T.lost.dot} size={5}/>}{tod&&<Dot color={T.pending.dot} size={5}/>}
                      <span style={{fontSize:12,color:over?"#B91C1C":tod?T.pending.text:T.inkSub,fontWeight:over||tod?600:400}}>{f.nextFollowUp||"—"}</span>
                    </div>
                    {over&&<span style={{fontSize:10,color:T.lost.text,fontWeight:500}}>Overdue</span>}
                  </>}
                </td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}><StatusPill status={f.status} sm T={T}/></td>
                <td style={{padding:"0 12px",fontSize:12,color:T.inkSub,verticalAlign:"middle",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.orderNumber||"—"}</td>
                <td style={{padding:"0 12px",fontSize:12,fontWeight:600,color:"#5B3BE8",verticalAlign:"middle",whiteSpace:"nowrap"}}>{inr(f.quoteAmount)||<span style={{color:T.inkMuted,fontWeight:400}}>—</span>}</td>
                <td style={{padding:"0 8px",verticalAlign:"middle"}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                    {showLog&&<button onClick={()=>onLogFollowup(f)} style={{background:T.pending.bg,border:`1px solid ${T.pending.dot}`,borderRadius:T.r.sm,padding:"3px 8px",fontSize:11,fontWeight:600,color:T.pending.text,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}} onMouseEnter={e=>{e.currentTarget.style.background=T.pending.dot;e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background=T.pending.bg;e.currentTarget.style.color=T.pending.text;}}>📋 Log</button>}
                    <button onClick={()=>onView(f)} style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 10px",fontSize:11,fontWeight:500,color:T.inkSub,cursor:"pointer",fontFamily:F}} onMouseEnter={e=>{e.currentTarget.style.background=T.brandSubtle;e.currentTarget.style.color="#5B3BE8";e.currentTarget.style.borderColor="#5B3BE8";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.inkSub;e.currentTarget.style.borderColor=T.line;}}>View</button>
                    {FULL.includes(user.role)&&<button onClick={()=>onEdit(f)} style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 6px",cursor:"pointer",display:"flex"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceEl} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Ic d={P.edit} sz={12} color={T.inkSub}/></button>}
                    {canCreEdit&&<button onClick={()=>onCreEdit(f)} style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 6px",cursor:"pointer",display:"flex"}} onMouseEnter={e=>{e.currentTarget.style.background=T.brandSubtle;e.currentTarget.style.borderColor="#5B3BE8";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.line;}}><Ic d={P.edit} sz={12} color="#5B3BE8"/></button>}
                    {FULL.includes(user.role)&&<button onClick={()=>onDelete(f.id)} style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 6px",cursor:"pointer",display:"flex"}} onMouseEnter={e=>{e.currentTarget.style.background="#FEF2F2";e.currentTarget.style.borderColor="#FECACA";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.line;}}><Ic d={P.trash} sz={12} color="#DC2626"/></button>}
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

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics({funnels,T}) {
  const won=funnels.filter(f=>f.status==="Won");
  const totalRevenue=won.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0);
  const wr=funnels.length?Math.round(won.length/funnels.length*100):0;
  const Row=({label,val,pct,color})=>(
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:T.ink,fontFamily:F}}>{label}</span><span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>{val} <span style={{color:T.inkMuted,fontWeight:400}}>({pct}%)</span></span></div>
      <div style={{height:4,background:T.surfaceEl,borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:2}}/></div>
    </div>
  );
  const Card=({title,children})=>(
    <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:"20px 22px",boxShadow:T.shadowSm}}>
      <div style={{fontSize:11,fontWeight:600,color:T.inkMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:18,fontFamily:F}}>{title}</div>
      {children}
    </div>
  );
  const byCat=CATS.map(c=>({c,n:(funnels.flatMap(f=>f.products||[])).filter(p=>p.category===c).reduce((a,p)=>a+(Number(p.qty)||0),0)})).sort((a,b)=>b.n-a.n);
  const maxCat=Math.max(...byCat.map(x=>x.n),1);
  const typeColors=["#5B3BE8",T.won.dot,T.pending.dot,T.premium.dot,T.new.dot];
  const enqColors=[T.new.dot,T.won.dot,T.bulk.dot,T.high.dot,T.premium.dot,T.drop.dot];
  return (
    <div style={{padding:"20px 24px",display:"grid",gap:16}}>
      <div className="ek-analytics-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        <Card title="Win rate"><div style={{textAlign:"center",padding:"8px 0"}}><div style={{fontSize:52,fontWeight:700,color:wr>=50?T.won.dot:T.pending.dot,fontFamily:F,letterSpacing:"-2px",lineHeight:1}}>{wr}%</div><div style={{fontSize:12,color:T.inkSub,marginTop:10,fontFamily:F}}>{won.length} of {funnels.length} deals won</div><div style={{height:6,background:T.surfaceEl,borderRadius:3,overflow:"hidden",marginTop:16}}><div style={{width:`${wr}%`,height:"100%",background:wr>=50?T.won.dot:T.pending.dot,borderRadius:3}}/></div></div></Card>
        <Card title="Status breakdown">{STATUS.map(s=>{const n=funnels.filter(f=>f.status===s).length;const pct=funnels.length?Math.round(n/funnels.length*100):0;const c=T[s.toLowerCase()]||T.drop;return <Row key={s} label={s} val={n} pct={pct} color={c.dot}/>;})}</Card>
        <Card title="Revenue">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}><span style={{fontSize:12,color:T.inkSub,fontFamily:F}}>Won Revenue</span><span style={{fontSize:15,fontWeight:700,color:T.won.dot,fontFamily:F}}>{big(totalRevenue)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}><span style={{fontSize:12,color:T.inkSub,fontFamily:F}}>Pending potential</span><span style={{fontSize:15,fontWeight:700,color:T.pending.dot,fontFamily:F}}>{big(funnels.filter(f=>f.status==="Pending").reduce((a,f)=>a+(Number(f.quoteAmount)||0),0))}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}><span style={{fontSize:12,color:T.inkSub,fontFamily:F}}>Avg deal size</span><span style={{fontSize:15,fontWeight:700,color:"#5B3BE8",fontFamily:F}}>{big(funnels.length?funnels.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0)/funnels.length:0)}</span></div>
        </Card>
      </div>
      <div className="ek-analytics-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        <Card title="Leads by funnel type"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{FTYPES.map((t,i)=>{const n=funnels.filter(f=>f.funnelType===t).length;return(<div key={t} style={{flex:1,minWidth:60,textAlign:"center",padding:"12px 8px",background:T.surfaceEl,borderRadius:T.r.md,border:`1px solid ${T.line}`}}><div style={{fontSize:22,fontWeight:700,color:typeColors[i]||"#5B3BE8",fontFamily:F}}>{n}</div><div style={{fontSize:10,color:T.inkMuted,marginTop:4,fontFamily:F,lineHeight:1.3}}>{t}</div></div>);})}</div></Card>
        <Card title="Leads by source">{LEAD_SOURCES.map(s=>{const n=funnels.filter(f=>f.leadSource===s).length;if(!n)return null;const pct=funnels.length?Math.round(n/funnels.length*100):0;return<Row key={s} label={s} val={n} pct={pct} color="#5B3BE8"/>;})}{!funnels.some(f=>f.leadSource)&&<div style={{fontSize:12,color:T.inkMuted,fontFamily:F}}>No source data yet.</div>}</Card>
        <Card title="Leads by enquiry type">{ENQS.map((e,i)=>{const n=funnels.filter(f=>f.enquiryType===e).length;if(!n)return null;const pct=funnels.length?Math.round(n/funnels.length*100):0;return<Row key={e} label={e} val={n} pct={pct} color={enqColors[i]||"#5B3BE8"}/>;})}{!funnels.some(f=>f.enquiryType)&&<div style={{fontSize:12,color:T.inkMuted,fontFamily:F}}>No enquiry data yet.</div>}</Card>
      </div>
      <Card title="Units ordered by category"><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0 32px"}}>{byCat.map(({c,n})=>(<div key={c} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:T.ink,fontFamily:F}}>{c}</span><span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>{n}</span></div><div style={{height:4,background:T.surfaceEl,borderRadius:2,overflow:"hidden"}}><div style={{width:`${Math.round(n/maxCat*100)}%`,height:"100%",background:"#5B3BE8",borderRadius:2,opacity:.7}}/></div></div>))}</div></Card>
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
    <div className="ek-team-grid" style={{padding:"20px 24px",display:"grid",gridTemplateColumns:"360px 1fr",gap:20}}>
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
  const blank={name:"",phone:"",email:"",enquiryType:"",funnelType:"",leadSource:"",cityRegion:"",nextFollowUp:"",products:[{desc:"",category:"",qty:"",price:""}],remarks:"",deliveryDetails:"",paymentTerms:"",orderNumber:"",quoteQty:"",quoteAmount:"",quoteDesc:"",status:"Pending",assignedTo:""};
  const [form,setForm]=useState(existing?{...blank,...existing,products:existing.products?.length?existing.products:blank.products}:blank);
  const [errs,setErrs]=useState({});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const sp=(i,k,v)=>{const p=[...form.products];p[i]={...p[i],[k]:v};set("products",p);};
  const isWon=form.status==="Won";
  const inpSx=(err)=>({...inputSx(T,err)});
  const fo=mkFocus(T)(); const bl=mkBlur(T)();

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
  const submit=()=>{if(val())onSave(form);};
  const prodTotal=(form.products||[]).reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);
  const creUsers=users.filter(u=>u.role==="CRE");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:720,maxHeight:"90vh",overflowY:"auto",boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px 16px",borderBottom:`1px solid ${T.line}`,position:"sticky",top:0,background:T.surface,zIndex:1,borderRadius:`${T.r["2xl"]} ${T.r["2xl"]} 0 0`}}>
          <div><h2 style={{fontSize:16,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 2px"}}>{existing?"Edit funnel":"New funnel"}</h2><p style={{margin:0,fontSize:12,color:T.inkSub,fontFamily:F}}>{existing?"Editing funnel":"Add a new sales lead"}</p></div>
          <button onClick={onClose} style={{width:30,height:30,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.surfaceEl,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={P.close} sz={13} color={T.inkSub}/></button>
        </div>
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
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,padding:"14px 24px 22px",borderTop:`1px solid ${T.line}`,position:"sticky",bottom:0,background:T.surface,borderRadius:`0 0 ${T.r["2xl"]} ${T.r["2xl"]}`}}>
          <Btn ghost label="Cancel" onClick={onClose} T={T}/><Btn primary icon={existing?P.check:P.plus} label={existing?"Save changes":"Add funnel"} onClick={submit} T={T}/>
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
  const [saving,setSaving]=useState(false);
  const sp=(i,k,v)=>{const p=[...products];p[i]={...p[i],[k]:v};setProducts(p);};
  const prodTotal=products.reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);
  const fo=mkFocus(T)(); const bl=mkBlur(T)();
  const submit=async()=>{setSaving(true);try{await onSave({...funnel,products:products.filter(p=>p.desc||p.category||p.qty||p.price),quoteQty:quoteQty?Number(quoteQty):funnel.quoteQty,quoteAmount:quoteAmount?Number(quoteAmount):funnel.quoteAmount});onClose();}catch(err){console.error(err);}finally{setSaving(false);}};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:680,maxHeight:"85vh",overflowY:"auto",boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px 14px",borderBottom:`1px solid ${T.line}`,position:"sticky",top:0,background:T.surface,zIndex:1,borderRadius:`${T.r["2xl"]} ${T.r["2xl"]} 0 0`}}>
          <div><h2 style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 2px"}}>Edit Products & Quote</h2><p style={{margin:0,fontSize:12,color:T.inkSub,fontFamily:F}}>{funnel.name} — update products and quote details</p></div>
          <button onClick={onClose} style={{width:30,height:30,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.surfaceEl,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={P.close} sz={13} color={T.inkSub}/></button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:20}}>
          <div style={{background:T.brandSubtle,border:`1px solid rgba(91,59,232,.15)`,borderRadius:T.r.lg,padding:"12px 16px",display:"flex",gap:24,flexWrap:"wrap"}}>
            {[["Customer",funnel.name],["Phone",funnel.phone],["Status",funnel.status],["Follow-up",funnel.nextFollowUp]].map(([l,v])=>(<div key={l}><div style={{fontSize:10,fontWeight:600,color:"#5B3BE8",letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:F,marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:500,color:T.ink,fontFamily:F}}>{v||"—"}</div></div>))}
          </div>
          <section>
            <SL T={T}>Customer requirements</SL>
            <div style={{border:`1px solid ${T.line}`,borderRadius:T.r.lg,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"8px 14px",background:T.surfaceEl,gap:8}}>{["Product / item","Category","Qty","Unit price (₹)",""].map(h=><div key={h} style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",fontFamily:F}}>{h}</div>)}</div>
              {products.map((pr,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"9px 14px",borderTop:`1px solid ${T.line}`,gap:8,alignItems:"center"}}><input value={pr.desc} onChange={e=>sp(i,"desc",e.target.value)} placeholder="e.g. Bridal Lehenga" style={{...inputSx(T),padding:"6px 9px",fontSize:12}} onFocus={fo} onBlur={bl}/><select value={pr.category} onChange={e=>sp(i,"category",e.target.value)} style={{...inputSx(T),padding:"6px 24px 6px 9px",fontSize:12,cursor:"pointer",appearance:"none",background:`${T.surface} ${selectBg}`}} onFocus={fo} onBlur={bl}><option value="">Category</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>{[["qty","0"],["price","0"]].map(([k,ph])=>(<input key={k} type="number" value={pr[k]} onChange={e=>sp(i,k,e.target.value)} placeholder={ph} style={{...inputSx(T),padding:"6px 9px",fontSize:12}} onFocus={fo} onBlur={bl}/>))}<button onClick={()=>setProducts(products.filter((_,x)=>x!==i))} disabled={products.length===1} style={{background:"none",border:"none",cursor:products.length===1?"not-allowed":"pointer",color:T.inkMuted,fontSize:16,opacity:products.length===1?.2:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>))}
              <div style={{padding:"9px 14px",borderTop:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><button onClick={()=>setProducts([...products,{desc:"",category:"",qty:"",price:""}])} style={{background:"none",border:`1px dashed #5B3BE8`,borderRadius:T.r.sm,padding:"4px 12px",color:"#5B3BE8",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:F,display:"inline-flex",alignItems:"center",gap:5}}><Ic d={P.plus} sz={11} color="#5B3BE8"/> Add item</button>{prodTotal>0&&<span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>Total: {inr(prodTotal)}</span>}</div>
            </div>
          </section>
          <section><SL T={T}>Quote details</SL><div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><FInput label="Quantity" type="number" value={quoteQty} onChange={e=>setQuoteQty(e.target.value)} placeholder="0" T={T}/><FInput label="Amount (₹)" type="number" value={quoteAmount} onChange={e=>setQuoteAmount(e.target.value)} placeholder="0" T={T}/></div></section>
          <div style={{background:T.surfaceEl,border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"10px 14px",fontSize:12,color:T.inkMuted,fontFamily:F,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>🔒</span>Other fields can only be edited by Manager or CEO.</div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,padding:"14px 24px 20px",borderTop:`1px solid ${T.line}`,position:"sticky",bottom:0,background:T.surface,borderRadius:`0 0 ${T.r["2xl"]} ${T.r["2xl"]}`}}><Btn ghost label="Cancel" onClick={onClose} T={T}/><Btn primary icon={P.check} label={saving?"Saving…":"Save changes"} onClick={submit} disabled={saving} T={T}/></div>
      </div>
    </div>
  );
}

// ─── FOLLOW-UP OUTCOMES ───────────────────────────────────────────────────────
const OUTCOMES=["Interested","Needs Time","Callback Requested","Not Interested","Rescheduled","Order Confirmed","Other"];

function FollowupLogModal({funnel,user,onClose,onSave,T}) {
  const [form,setForm]=useState({customerResponse:"",outcome:"",nextFollowUp:""});
  const [err,setErr]=useState({}); const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const fo=mkFocus(T)(); const bl=mkBlur(T)();
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
function ViewDrawer({funnel,onClose,onEdit,onCreEdit,onStatusChange,user,comments,onAddComment,followupLogs=[],onLogFollowup,T}) {
  const [status,setStatus]=useState(funnel.status);
  const tot=(funnel.products||[]).reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);
  const doStatus=s=>{setStatus(s);onStatusChange(funnel.id,s);};
  const [commentText,setCommentText]=useState("");
  const canComment=FULL.includes(user.role);
  const fo=mkFocus(T)(); const bl=mkBlur(T)();
  const submitComment=()=>{if(!commentText.trim())return;onAddComment(funnel.id,{text:commentText.trim(),author:user.name,role:user.role,time:stamp()});setCommentText("");};
  const Row=({l,v,mono})=>(<div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:8,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}><dt style={{fontSize:11,fontWeight:500,color:T.inkMuted,fontFamily:F}}>{l}</dt><dd style={{fontSize:13,color:T.ink,fontFamily:mono?"'SF Mono',monospace":F,wordBreak:"break-all"}}>{v||"—"}</dd></div>);
  const Sec=({t})=><div style={{fontSize:10,fontWeight:600,color:T.inkMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,marginTop:4,fontFamily:F}}>{t}</div>;
  const roleColor={"CEO":T.high,"Manager":T.won,"CRE":T.pending};
  const outcomeColors={"Interested":T.won,"Order Confirmed":T.won,"Needs Time":T.pending,"Callback Requested":T.pending,"Rescheduled":T.pending,"Not Interested":T.lost,"Other":T.drop};
  const canCreEdit=!FULL.includes(user.role)&&(funnel.createdBy===user.name||funnel.assignedTo===user.name);
  const isWon=status==="Won";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:2000,display:"flex",justifyContent:"flex-end",backdropFilter:"blur(1px)"}} onClick={onClose}>
      <div style={{background:T.surface,width:"100%",maxWidth:540,height:"100%",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,.15)",animation:"slideRight .22s ease",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
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
              {FULL.includes(user.role)&&<Btn ghost sm icon={P.edit} label="Edit" onClick={()=>{onClose();onEdit(funnel);}} T={T}/>}
              {canCreEdit&&<Btn ghost sm icon={P.edit} label="Edit" onClick={()=>{onClose();onCreEdit(funnel);}} T={T}/>}
              <button onClick={onClose} style={{width:28,height:28,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.surfaceEl,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={P.close} sz={12} color={T.inkSub}/></button>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {STATUS.map(s=>{const c=T[s.toLowerCase()]||T.drop;const a=status===s;return(<button key={s} onClick={()=>doStatus(s)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${a?c.dot:T.line}`,background:a?c.bg:"transparent",color:a?c.text:T.inkSub,fontSize:12,fontWeight:a?600:400,cursor:"pointer",fontFamily:F,transition:"all .15s",display:"flex",alignItems:"center",gap:5}}><Dot color={a?c.dot:T.inkMuted} size={5}/>{s}</button>);})}
          </div>
        </div>
        <div style={{padding:"18px 22px",flex:1}}>
          <Sec t="Contact"/>
          <dl><Row l="Name" v={funnel.name}/><Row l="Phone" v={funnel.phone}/><Row l="Email" v={funnel.email}/>{funnel.cityRegion&&<Row l="City / Region" v={funnel.cityRegion}/>}{funnel.assignedTo&&<Row l="Assigned to" v={funnel.assignedTo}/>}</dl>
          <div style={{height:18}}/>
          <Sec t="Funnel"/>
          <dl><Row l="Enquiry type" v={funnel.enquiryType}/><Row l="Funnel type" v={funnel.funnelType}/><Row l="Lead source" v={funnel.leadSource}/>{!isWon&&<Row l="Next follow-up" v={funnel.nextFollowUp}/>}{isWon&&(<div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:8,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}><dt style={{fontSize:11,fontWeight:500,color:T.inkMuted,fontFamily:F}}>Follow-up</dt><dd><span style={{fontSize:12,color:T.won.text,fontWeight:500,display:"flex",alignItems:"center",gap:5}}><Dot color={T.won.dot} size={5}/>Deal closed — no follow-up needed</span></dd></div>)}</dl>
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

          {/* Follow-up History */}
          <div style={{height:24}}/>
          <div style={{borderTop:`2px solid ${T.line}`,paddingTop:20,marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>📅</span><span style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:F}}>Follow-up History</span>{followupLogs.length>0&&<span style={{fontSize:11,fontWeight:500,background:T.brandSubtle,color:"#5B3BE8",padding:"1px 8px",borderRadius:10,fontFamily:F}}>{followupLogs.length}</span>}</div>
              {!isWon&&<Btn primary sm label="+ Log Follow-up" onClick={onLogFollowup} T={T}/>}
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
  const [logModalFunnel,setLogModalFunnel]=useState(null);

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

  const [fil,setFil]=useState({status:"",funnelType:"",enquiryType:"",leadSource:"",descFilter:"",cre:"",missed:false,todayF:false,upcoming:false});
  const [addOpen,setAddOpen]=useState(false);
  const [editT,setEditT]=useState(null);
  const [creEditT,setCreEditT]=useState(null);
  const {list:toasts,push}=useToast();
  const TODAY=today();

  const sf=(k,v)=>setFil(f=>({...f,[k]:v}));
  const rf=()=>{setFil({status:"",funnelType:"",enquiryType:"",leadSource:"",descFilter:"",cre:"",missed:false,todayF:false,upcoming:false});setStatFilter(null);};
  const handleStatClick=(filterKey)=>{setStatFilter(prev=>prev===filterKey?null:filterKey);setFil(f=>({...f,status:""}));};

  const scoped=useMemo(()=>FULL.includes(user.role)?funnels:funnels.filter(f=>f.createdBy===user.name||f.assignedTo===user.name),[funnels,user]);

  // ㉒ today's follow-ups count for bell
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
    if(fil.missed&&(!f.nextFollowUp||f.nextFollowUp>=TODAY))return false;
    if(fil.todayF&&f.nextFollowUp!==TODAY)return false;
    if(fil.upcoming&&f.nextFollowUp<=TODAY)return false;
    return true;
  }),[scoped,search,fil,statFilter,TODAY]);

  const save=async(form)=>{try{const cleanedForm={...form,products:(form.products||[]).filter(p=>p.desc||p.category||p.qty||p.price)};const saved=await crmService.saveFunnel(cleanedForm,user);if(editT){setFunnels(p=>p.map(f=>f.id===saved.id?saved:f));setEditT(null);push("Funnel updated");}else{setFunnels(p=>[saved,...p]);setAddOpen(false);push("Funnel added");}}catch(err){console.error(err);push(`Error: ${err.message||"Could not save lead"}`,"error");}};
  const creEditSave=async(form)=>{try{const saved=await crmService.saveFunnel(form,user);setFunnels(p=>p.map(f=>f.id===saved.id?saved:f));setCreEditT(null);push("Updated ✓");}catch(err){console.error(err);push("Error saving","error");}};
  const del=async(id)=>{if(!window.confirm("Are you sure you want to delete this lead?"))return;try{await crmService.deleteFunnel(id);setFunnels(p=>p.filter(f=>f.id!==id));push("Deleted","info");}catch(err){console.error(err);push("Error deleting funnel","error");}};
  const upStatus=async(id,s)=>{try{await crmService.updateStatus(id,s);setFunnels(p=>p.map(f=>f.id===id?{...f,status:s}:f));push(`Status → ${s}`);}catch(err){console.error(err);push("Error updating status","error");}};

  const titles={dashboard:"Dashboard",funnels:"Funnels",analytics:"Analytics",team:"Team"};
  const showFilters=view==="dashboard"||view==="funnels";
  const showStats=view==="dashboard";

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:F}}>
      <Sidebar active={view} set={v=>{setView(v);setStatFilter(null);}} user={user} onLogout={onLogout} open={sidebarOpen} onClose={()=>setSidebarOpen(false)} T={T} dark={dark} onToggleDark={onToggleDark} collapsed={sidebarCollapsed} onToggleCollapse={()=>setSidebarCollapsed(x=>!x)}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,minHeight:"100vh"}}>
        <Topbar title={titles[view]} search={search} setSearch={setSearch} user={user} onAdd={()=>setAddOpen(true)}
          onExportAll={()=>{xls(scoped,`Ekanta_All_${TODAY}.xls`);push(`Exported ${scoped.length} funnels`,"info");}}
          onExportFiltered={()=>{xls(filtered,`Ekanta_Filtered_${TODAY}.xls`);push(`Exported ${filtered.length} funnels`,"info");}}
          fLen={filtered.length} aLen={scoped.length} onMenuToggle={()=>setSidebarOpen(x=>!x)} T={T} todayCount={todayCount}/>

        {/* ⑲ Greeting on dashboard */}
        {showStats&&(
          <div style={{padding:"20px 24px 0"}}>
            <div style={{marginBottom:4}}>
              <h2 style={{fontSize:22,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 4px",letterSpacing:"-0.4px"}}>{greeting(user.name)}</h2>
              <p style={{fontSize:13,color:T.inkSub,margin:0,fontFamily:F}}>
                {todayCount>0
                  ? `You have ${todayCount} follow-up${todayCount>1?"s":""} due today.`
                  : "Here's your sales overview for today."}
              </p>
            </div>
          </div>
        )}

        {showStats&&<Stats funnels={scoped} activeStatFilter={statFilter} onStatClick={handleStatClick} T={T}/>}
        {showFilters&&<div style={{marginTop:16}}><FilterBar fil={fil} setF={sf} reset={rf} users={users} user={user} T={T}/></div>}

        <div style={{flex:1,background:showFilters?T.surface:"transparent",borderTop:showFilters?`1px solid ${T.line}`:"none"}}>
          {(view==="dashboard"||view==="funnels")&&<Table rows={filtered} user={user} onView={setViewT} onEdit={f=>setEditT(f)} onCreEdit={f=>setCreEditT(f)} onDelete={del} onLogFollowup={f=>setLogModalFunnel(f)} loading={loading} T={T}/>}
          {view==="analytics"&&<Analytics funnels={FULL.includes(user.role)?funnels:scoped} T={T}/>}
          {view==="team"&&FULL.includes(user.role)&&<Team users={users} onSave={onUsersChange} T={T}/>}
        </div>
      </div>

      {(addOpen||editT)&&<FunnelForm onClose={()=>{setAddOpen(false);setEditT(null);}} onSave={save} existing={editT} user={user} users={users} T={T}/>}
      {viewT&&<ViewDrawer funnel={viewT} onClose={()=>setViewT(null)} onEdit={f=>setEditT(f)} onCreEdit={f=>setCreEditT(f)} onStatusChange={upStatus} user={user} comments={funnelComments[viewT.id]||[]} onAddComment={addComment} followupLogs={followupLogs[viewT.id]||[]} onLogFollowup={()=>setLogModalFunnel(viewT)} T={T}/>}
      {creEditT&&<CREEditModal funnel={creEditT} onClose={()=>setCreEditT(null)} onSave={creEditSave} T={T}/>}
      {logModalFunnel&&<FollowupLogModal funnel={logModalFunnel} user={user} onClose={()=>setLogModalFunnel(null)} onSave={saveFollowupLog} T={T}/>}
      <Toaster list={toasts} T={T}/>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);
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

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:F,color:T.ink}}>Loading CRM...</div>;

  return (
    <>
      <FontLoader dark={dark}/>
      {!user
        ?<Login users={users} onLogin={setUser} T={T} dark={dark} onToggleDark={onToggleDark}/>
        :<Shell user={user} users={users} onLogout={()=>setUser(null)} onUsersChange={handleUsersChange} T={T} dark={dark} onToggleDark={onToggleDark}/>
      }
    </>
  );
}
