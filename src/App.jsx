import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { crmService } from "./services/crmService";
import { supabase } from "./lib/supabase";

/*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EKANTA CRM — v6
  Changes on top of v5:
  ⑧ Assign funnel to CRE (CEO/Manager only)
  ⑨ CRE restricted edit — products + quote qty/amount only
  ⑩ Compact table — 48px rows, tighter padding, zebra rows
  ⑪ Analytics uses all constants
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

// ─── MOBILE HOOK ──────────────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ─── FONT ─────────────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    if (document.getElementById("ek-font")) return;
    const l = document.createElement("link");
    l.id = "ek-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
    const g = document.createElement("style");
    g.textContent = `
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{font-size:14px}
      body{background:#F7F8FA;color:#0F0F10;font-family:'Geist',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
      input,select,textarea,button{font-family:inherit}
      @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}
      @media(max-width:767px){
        .ek-sidebar{display:none!important}
        .ek-sidebar.open{display:flex!important}
        .ek-stats-grid{grid-template-columns:repeat(2,1fr)!important}
        .ek-topbar-search{display:none!important}
        .ek-form-3col{grid-template-columns:1fr!important}
        .ek-form-2col{grid-template-columns:1fr!important}
        .ek-analytics-3col{grid-template-columns:1fr!important}
        .ek-team-grid{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(g);
  }, []);
  return null;
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:        "#F7F8FA",
  surface:   "#FFFFFF",
  surfaceHover: "#FAFAFA",
  sidebar:   "#FFFFFF",
  brand:     "#5B3BE8",
  brandHover:"#4A2CC5",
  brandSubtle:"#F0EEFF",
  ink:       "#0F0F10",
  inkSub:    "#6E6E80",
  inkMuted:  "#A1A1AA",
  inkInvert: "#FFFFFF",
  line:      "rgba(0,0,0,0.07)",
  lineMid:   "rgba(0,0,0,0.11)",
  lineStrong:"rgba(0,0,0,0.16)",
  shadowSm: "0 1px 2px rgba(0,0,0,0.05)",
  shadowMd: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  shadowLg: "0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
  shadowXl: "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
  won:     { dot:"#16A34A", bg:"#F0FDF4", text:"#15803D" },
  pending: { dot:"#D97706", bg:"#FFFBEB", text:"#B45309" },
  lost:    { dot:"#DC2626", bg:"#FEF2F2", text:"#B91C1C" },
  drop:    { dot:"#9CA3AF", bg:"#F9FAFB", text:"#6B7280" },
  new:     { dot:"#3B82F6", bg:"#EFF6FF", text:"#1D4ED8" },
  high:    { dot:"#7C3AED", bg:"#F5F3FF", text:"#5B21B6" },
  premium: { dot:"#DB2777", bg:"#FDF2F8", text:"#9D174D" },
  bulk:    { dot:"#059669", bg:"#ECFDF5", text:"#047857" },
  r: { sm:"6px", md:"8px", lg:"10px", xl:"12px", "2xl":"16px" },
  gap: 8,
};

const F = "'Geist', system-ui, -apple-system, sans-serif";

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

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_USERS = [
  {id:1,name:"Admin",      role:"CEO",     username:"admin",     password:"admin123"},
  {id:2,name:"Vinodhini",  role:"CRE",     username:"vinodhini", password:"pass123" },
  {id:3,name:"Arjun Kumar",role:"Manager", username:"arjun",     password:"pass123" },
];

const SEED_FUNNELS = [];

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
function xls(data, name) {
  const e = v => String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const H = ["#","Name","Lead Source","Phone","Email","Enquiry","Type","Follow-up","Status","City/Region","Delivery Details","Payment Terms","Products","Order Number","Qty","Quote Amt","Remarks","Created","By","Assigned To"];
  const hRow = `<Row ss:StyleID="h">${H.map(h=>`<Cell><Data ss:Type="String">${e(h)}</Data></Cell>`).join("")}</Row>`;
  const rows = data.map((f,i)=>{
    const prod=(f.products||[]).map(p=>`${p.desc}(${p.category},×${p.qty},₹${p.price})`).join("|");
    return `<Row>${[
      [i+1,"Number"],[f.name||""],[f.leadSource||""],[f.phone||""],[f.email||""],
      [f.enquiryType||""],[f.funnelType||""],[f.nextFollowUp||""],[f.status],
      [f.cityRegion||""],[f.deliveryDetails||""],[f.paymentTerms||""],[prod],
      [f.orderNumber||""],[f.quoteQty||"",f.quoteQty?"Number":"String"],
      [f.quoteAmount||"",f.quoteAmount?"Number":"String"],
      [f.remarks||""],[f.createdAt],[f.createdBy],[f.assignedTo||""]
    ].map(([v,t="String"])=>`<Cell><Data ss:Type="${t}">${e(v)}</Data></Cell>`).join("")}</Row>`;
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

function Toaster({list}) {
  const s={success:"#16A34A",error:"#DC2626",info:T.brand};
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

function StatusPill({status,sm}) {
  const map={
    Won:T.won, Pending:T.pending, Lost:T.lost, Drop:T.drop,
    "New Lead":T.new, "Qualified":T.pending, "Proposal Sent":T.high,
    "High Value":T.high, "Premium":T.premium, "Bulk":T.bulk, "Normal":T.drop, "Strategic":T.new,
    "Interested":T.won, "Order Confirmed":T.won,
    "Needs Time":T.pending, "Callback Requested":T.pending, "Rescheduled":T.pending,
    "Not Interested":T.lost, "Other":T.drop,
  };
  const c=map[status]||T.drop;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:sm?"2px 7px":"3px 8px",borderRadius:20,fontSize:sm?11:12,fontWeight:500,background:c.bg,color:c.text,fontFamily:F,whiteSpace:"nowrap",letterSpacing:"0.01em"}}>
      <Dot color={c.dot} size={5}/>{status}
    </span>
  );
}

function SourcePill({source}) {
  if (!source) return null;
  const icons = {WhatsApp:"💬", Email:"✉", Website:"🌐", Call:"📞", Owner:"👤", Other:"•"};
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"1px 7px",borderRadius:20,fontSize:10,fontWeight:500,background:"rgba(0,0,0,0.04)",color:T.inkSub,fontFamily:F,whiteSpace:"nowrap",border:`1px solid ${T.line}`}}>
      <span style={{fontSize:10,lineHeight:1}}>{icons[source]||"•"}</span>
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
};

function Avatar({name,size=32}) {
  const bg=[["#EDE9FE","#5B21B6"],["#D1FAE5","#065F46"],["#FEF3C7","#92400E"],["#FCE7F3","#9D174D"],["#DBEAFE","#1E40AF"]];
  const[bg2,tx]=bg[(name?.charCodeAt(0)||65)%bg.length];
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg2,color:tx,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.33,fontWeight:600,flexShrink:0,fontFamily:F,letterSpacing:"-0.02em"}}>{(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</div>;
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
function Btn({primary,ghost,danger,sm,icon,label,onClick,disabled,full,iconRight}) {
  const [hov,setHov]=useState(false);
  const base={
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
    padding:sm?"6px 12px":"8px 14px",
    fontSize:sm?12:13,fontWeight:500,fontFamily:F,
    borderRadius:T.r.md,border:"none",
    cursor:disabled?"not-allowed":"pointer",
    opacity:disabled?.5:1,
    transition:"background .15s,box-shadow .15s,transform .1s",
    whiteSpace:"nowrap",letterSpacing:"0.01em",
    ...(full?{width:"100%"}:{}),
  };
  const styles={
    ...(primary?{background:hov?T.brandHover:T.brand,color:"#fff",boxShadow:hov?"0 2px 8px rgba(91,59,232,.3)":T.shadowSm}:{}),
    ...(ghost?{background:hov?T.surfaceHover:T.surface,color:T.ink,border:`1px solid ${T.line}`,boxShadow:hov?T.shadowSm:"none"}:{}),
    ...(danger?{background:hov?"#FEF2F2":T.surface,color:"#B91C1C",border:`1px solid ${hov?"#FECACA":T.line}`}:{}),
    ...(!primary&&!ghost&&!danger?{background:hov?T.surfaceHover:"transparent",color:T.inkSub,border:`1px solid transparent`}:{}),
  };
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled}
      style={{...base,...styles}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onMouseDown={e=>!disabled&&(e.currentTarget.style.transform="scale(0.97)")}
      onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
      {icon&&!iconRight&&<Ic d={icon} sz={13} color={primary?"#fff":"currentColor"}/>}
      {label}
      {icon&&iconRight&&<Ic d={icon} sz={13} color={primary?"#fff":"currentColor"}/>}
    </button>
  );
}

// ─── INPUT PRIMITIVES ─────────────────────────────────────────────────────────
const inputSx = (err) => ({
  width:"100%",padding:"8px 11px",
  border:`1px solid ${err?"#FECACA":T.lineMid}`,
  borderRadius:T.r.md,fontSize:13,fontFamily:F,color:T.ink,
  background:T.surface,outline:"none",boxSizing:"border-box",
  transition:"border-color .15s,box-shadow .15s",
});

const onfocus = e => { e.target.style.borderColor=T.brand; e.target.style.boxShadow=`0 0 0 3px rgba(91,59,232,.1)`; };
const onblur  = e => { e.target.style.borderColor=T.lineMid; e.target.style.boxShadow="none"; };

const selectBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236E6E80' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 7px center`;

function FInput({label,value,onChange,placeholder,type="text",error,required,full=true,style:sx}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5,...(full?{}:{flex:1})}}>
      {label&&<label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>{label}{required&&<span style={{color:"#DC2626",marginLeft:2}}>*</span>}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{...inputSx(error),...sx}} onFocus={onfocus} onBlur={onblur}/>
      {error&&<span style={{fontSize:11,color:"#B91C1C"}}>{error}</span>}
    </div>
  );
}

function FSelect({label,value,onChange,options,placeholder,full=true,required,error}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5,...(full?{}:{flex:1})}}>
      {label&&<label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>{label}{required&&<span style={{color:"#DC2626",marginLeft:2}}>*</span>}</label>}
      <select value={value} onChange={onChange}
        style={{...inputSx(error),cursor:"pointer",appearance:"none",background:`${T.surface} ${selectBg}`}}
        onFocus={onfocus} onBlur={e=>{e.target.style.borderColor=error?"#FECACA":T.lineMid;e.target.style.boxShadow="none";}}>
        <option value="">{placeholder||"Select…"}</option>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
      {error&&<span style={{fontSize:11,color:"#B91C1C"}}>{error}</span>}
    </div>
  );
}

const SL = ({children}) => <div style={{fontSize:11,fontWeight:600,color:T.inkMuted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12,fontFamily:F}}>{children}</div>;

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({users,onLogin}) {
  const [u,su]=useState(""); const [p,sp]=useState(""); const [err,se]=useState(""); const [load,sl]=useState(false);

  const go=()=>{
    const trimmedU = u.trim().toLowerCase();
    const trimmedP = p.trim();
    if(!trimmedU||!trimmedP){se("Please fill in all fields.");return;}
    se(""); sl(true);
    setTimeout(()=>{
      const found=users.find(x=>x.username.toLowerCase()===trimmedU&&x.password===trimmedP);
      if(found) onLogin(found);
      else{se("Incorrect username or password.");sl(false);}
    },600);
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:F,padding:24}}>
      <div style={{width:"100%",maxWidth:380,animation:"fadeUp .3s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
          <div style={{width:34,height:34,background:T.brand,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={P.layers} sz={16} color="#fff" sw={2}/>
          </div>
          <span style={{fontSize:15,fontWeight:600,color:T.ink,letterSpacing:"-0.2px"}}>Ekanta Design Studio</span>
        </div>
        <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r["2xl"],padding:"32px 28px",boxShadow:T.shadowLg}}>
          <h1 style={{fontSize:20,fontWeight:700,color:T.ink,margin:"0 0 4px",letterSpacing:"-0.4px"}}>Sign in</h1>
          <p style={{fontSize:13,color:T.inkSub,margin:"0 0 24px"}}>Enter your credentials to continue</p>
          {err&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:T.r.md,padding:"10px 12px",fontSize:12,color:"#B91C1C",marginBottom:16,fontWeight:500}}>{err}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <FInput label="Username" value={u} onChange={e=>su(e.target.value)} placeholder="Enter username"/>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:T.inkSub,display:"flex",justifyContent:"space-between",marginBottom:5}}>
                Password
                <span style={{color:T.brand,cursor:"pointer",fontSize:12,fontWeight:500}} onClick={()=>se("Contact your administrator to reset your password.")}>Forgot?</span>
              </label>
              <input type="password" value={p} onChange={e=>sp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Enter password"
                style={{...inputSx()}} onFocus={onfocus} onBlur={onblur}/>
            </div>
            <button onClick={go} disabled={load}
              style={{width:"100%",padding:"10px",background:load?T.brandHover:T.brand,color:"#fff",border:"none",borderRadius:T.r.md,fontSize:14,fontWeight:600,fontFamily:F,cursor:load?"not-allowed":"pointer",transition:"background .15s",marginTop:4}}
              onMouseDown={e=>!load&&(e.currentTarget.style.transform="scale(0.99)")}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
              {load?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><svg style={{animation:"spin .7s linear infinite"}} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"/><path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Signing in…</span>:"Sign in →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({active,set,user,onLogout,open,onClose}) {
  const nav=[
    {id:"dashboard",label:"Dashboard",icon:P.dash},
    {id:"funnels",  label:"Funnels",  icon:P.list},
    {id:"analytics",label:"Analytics",icon:P.chart},
    ...(FULL.includes(user.role)?[{id:"team",label:"Team",icon:P.users}]:[]),
  ];
  return (
    <>
      {open&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:199,display:"none"}} className="mobile-overlay"/>}
      <div className={`ek-sidebar${open?" open":""}`} style={{width:200,minHeight:"100vh",background:T.sidebar,borderRight:`1px solid ${T.line}`,display:"flex",flexDirection:"column",flexShrink:0,position:"relative",zIndex:200}}>
        <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${T.line}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:28,height:28,background:T.brand,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic d={P.layers} sz={13} color="#fff" sw={2.2}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.ink,letterSpacing:"-0.2px",lineHeight:1.2}}>Ekanta</div>
              <div style={{fontSize:10,color:T.inkMuted,lineHeight:1}}>Design Studio</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:"8px 8px 0"}}>
          <div style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.08em",padding:"10px 8px 4px",textTransform:"uppercase"}}>Navigation</div>
          {nav.map(item=>{
            const a=active===item.id;
            return (
              <button key={item.id} onClick={()=>{set(item.id);onClose&&onClose();}}
                style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 8px",borderRadius:T.r.md,border:"none",background:a?"rgba(91,59,232,.06)":"transparent",color:a?T.brand:T.inkSub,fontFamily:F,fontSize:13,fontWeight:a?600:400,cursor:"pointer",marginBottom:1,transition:"all .12s",textAlign:"left",position:"relative"}}
                onMouseEnter={e=>{if(!a){e.currentTarget.style.background=T.bg;e.currentTarget.style.color=T.ink;}}}
                onMouseLeave={e=>{if(!a){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.inkSub;}}}>
                {a&&<span style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:2,height:18,background:T.brand,borderRadius:"0 2px 2px 0"}}/>}
                <Ic d={item.icon} sz={14} color={a?T.brand:T.inkSub}/>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{padding:"10px 8px 14px",borderTop:`1px solid ${T.line}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9,padding:"7px 8px",borderRadius:T.r.md}}>
            <Avatar name={user.name} size={28}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
              <div style={{fontSize:10,color:T.inkMuted}}>{user.role}</div>
            </div>
            <button onClick={onLogout} title="Sign out"
              style={{background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:3,borderRadius:5,transition:"color .15s"}}
              onMouseEnter={e=>e.currentTarget.style.color=T.ink}
              onMouseLeave={e=>e.currentTarget.style.color=T.inkMuted}>
              <Ic d={P.out} sz={13} color="currentColor"/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({title,search,setSearch,user,onAdd,onExportAll,onExportFiltered,fLen,aLen,onMenuToggle}) {
  return (
    <div style={{background:T.surface,borderBottom:`1px solid ${T.line}`,padding:"0 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <button onClick={onMenuToggle} className="ek-mobile-menu"
            style={{background:"none",border:"none",cursor:"pointer",color:T.inkSub,display:"none",padding:4,borderRadius:6}}
            onMouseEnter={e=>e.currentTarget.style.color=T.ink}
            onMouseLeave={e=>e.currentTarget.style.color=T.inkSub}>
            <Ic d={P.menu} sz={18} color="currentColor"/>
          </button>
          <h1 style={{fontSize:15,fontWeight:600,color:T.ink,letterSpacing:"-0.2px",margin:0,fontFamily:F}}>{title}</h1>
          <div className="ek-topbar-search" style={{display:"flex",alignItems:"center",gap:8,background:T.bg,border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"6px 11px",minWidth:220,maxWidth:320,flex:1}}>
            <Ic d={P.search} sz={13} color={T.inkMuted}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search funnels…"
              style={{border:"none",background:"transparent",outline:"none",fontSize:13,color:T.ink,fontFamily:F,width:"100%"}}/>
            {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:0,lineHeight:1}}><Ic d={P.close} sz={12} color="currentColor"/></button>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:12,flexWrap:"wrap"}}>
          {FULL.includes(user.role)&&(
            <><Btn ghost sm icon={P.dl} label={`Filtered (${fLen})`} onClick={onExportFiltered}/><Btn ghost sm icon={P.dl} label={`All (${aLen})`} onClick={onExportAll}/></>
          )}
          {!FULL.includes(user.role)&&can(user,"export")&&<Btn ghost sm icon={P.dl} label="Export" onClick={onExportFiltered}/>}
          {can(user,"create")&&<Btn primary sm icon={P.plus} label="Add funnel" onClick={onAdd}/>}
        </div>
      </div>
    </div>
  );
}

// ─── STATS ROW ────────────────────────────────────────────────────────────────
function Stats({funnels}) {
  const won=funnels.filter(f=>f.status==="Won");
  const pending=funnels.filter(f=>f.status==="Pending");
  const lost=funnels.filter(f=>f.status==="Lost");
  const drop=funnels.filter(f=>f.status==="Drop");
  const s={
    total:funnels.length,won:won.length,
    pending:pending.length,lost:lost.length,drop:drop.length,
    revenue:won.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0),
    pendingRevenue:pending.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0),
  };
  const wr=s.total?Math.round(s.won/s.total*100):0;
  const cards=[
    {label:"Total leads",     value:s.total,              caption:"All leads",          accent:T.inkMuted,    bg:T.surface},
    {label:"Won",             value:s.won,                caption:`${wr}% win rate`,    accent:T.won.dot,     bg:"#F0FDF4"},
    {label:"Pending",         value:s.pending,            caption:"Need follow-up",     accent:T.pending.dot, bg:"#FFFBEB"},
    {label:"Lost",            value:s.lost,               caption:"Closed lost",        accent:T.lost.dot,    bg:"#FEF2F2"},
    {label:"Drop",            value:s.drop,               caption:"Dropped leads",      accent:T.drop.dot,    bg:T.surface},
    {label:"Won Revenue",     value:big(s.revenue),       caption:"From won deals",     accent:T.won.dot,     bg:"#F0FDF4"},
    {label:"Pending Revenue", value:big(s.pendingRevenue),caption:"Potential pipeline", accent:T.pending.dot, bg:"#FFFBEB"},
  ];
  return (
    <div style={{padding:"20px 24px 0"}}>
      <div className="ek-stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10}}>
        {cards.map((c,i)=>(
          <div key={i} style={{background:c.bg,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:"14px 16px",boxShadow:T.shadowSm,animation:`fadeUp .25s ease ${i*.04}s both`}}>
            <div style={{fontSize:10,fontWeight:500,color:T.inkMuted,letterSpacing:"0.04em",marginBottom:8,fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.label}</div>
            <div style={{fontSize:20,fontWeight:700,color:T.ink,fontFamily:F,letterSpacing:"-0.5px",marginBottom:4}}>{c.value}</div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <Dot color={c.accent} size={5}/>
              <span style={{fontSize:10,color:T.inkMuted,fontFamily:F,whiteSpace:"nowrap"}}>{c.caption}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({fil,setF,reset}) {
  const sel=(val,key,opts)=>(
    <select value={val} onChange={e=>setF(key,e.target.value)}
      style={{padding:"5px 24px 5px 9px",border:`1px solid ${T.line}`,borderRadius:T.r.md,fontSize:12,fontFamily:F,color:val?T.ink:T.inkSub,background:val?`${T.brandSubtle} ${selectBg}`:`${T.surface} ${selectBg}`,cursor:"pointer",outline:"none",appearance:"none",fontWeight:val?500:400}}>
      <option value="">{key==="status"?"All status":key==="funnelType"?"All types":key==="leadSource"?"All sources":"All enquiries"}</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  const chk=(key,label)=>(
    <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:fil[key]?T.brand:T.inkSub,cursor:"pointer",fontFamily:F,fontWeight:fil[key]?500:400,userSelect:"none",transition:"color .15s"}}>
      <input type="checkbox" checked={fil[key]} onChange={e=>setF(key,e.target.checked)} style={{accentColor:T.brand,width:13,height:13}}/>
      {label}
    </label>
  );
  const any=fil.status||fil.funnelType||fil.enquiryType||fil.leadSource||fil.descFilter||fil.missed||fil.todayF||fil.upcoming;
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 24px",borderBottom:`1px solid ${T.line}`,background:T.surface,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <Ic d={P.filter} sz={12} color={T.inkMuted}/>
        <span style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Filter</span>
      </div>
      <div style={{width:1,height:14,background:T.line}}/>
      {chk("missed","Missed")} {chk("todayF","Today")} {chk("upcoming","Upcoming")}
      <div style={{width:1,height:14,background:T.line}}/>
      {sel(fil.status,"status",STATUS)}
      {sel(fil.funnelType,"funnelType",FTYPES)}
      {sel(fil.enquiryType,"enquiryType",ENQS)}
      {sel(fil.leadSource,"leadSource",LEAD_SOURCES)}
      <div style={{width:1,height:14,background:T.line}}/>
      <div style={{display:"flex",alignItems:"center",gap:7,background:T.bg,border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"4px 10px",minWidth:180}}>
        <Ic d={P.search} sz={12} color={T.inkMuted}/>
        <input value={fil.descFilter} onChange={e=>setF("descFilter",e.target.value)} placeholder="Search description…"
          style={{border:"none",background:"transparent",outline:"none",fontSize:12,color:T.ink,fontFamily:F,width:"100%"}}/>
        {fil.descFilter&&<button onClick={()=>setF("descFilter","")} style={{background:"none",border:"none",cursor:"pointer",color:T.inkMuted,display:"flex",padding:0}}><Ic d={P.close} sz={11} color="currentColor"/></button>}
      </div>
      {any&&<button onClick={reset} style={{fontSize:12,color:T.brand,background:"none",border:"none",cursor:"pointer",fontFamily:F,fontWeight:500,padding:"0 4px",textDecoration:"underline",textUnderlineOffset:2}}>Clear</button>}
    </div>
  );
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
function Table({rows,user,onView,onEdit,onCreEdit,onDelete,onLogFollowup,loading}) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);

  if(loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:72,flexDirection:"column",gap:16}}>
      <div style={{width:32,height:32,border:"3px solid rgba(91,59,232,.1)",borderTopColor:T.brand,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <div style={{fontSize:13,color:T.inkSub,fontFamily:F}}>Loading funnels...</div>
    </div>
  );

  if(!rows.length) return (
    <div style={{textAlign:"center",padding:"72px 24px",fontFamily:F}}>
      <div style={{width:48,height:48,background:T.brandSubtle,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
        <Ic d={P.list} sz={22} color={T.brand}/>
      </div>
      <p style={{fontSize:15,fontWeight:600,color:T.ink,margin:"0 0 4px"}}>No leads found</p>
      <p style={{fontSize:13,color:T.inkSub,margin:0}}>Adjust your filters or add a new lead.</p>
    </div>
  );

  const todayV=today();

  // ─── MOBILE CARD VIEW ───────────────────────────────────────────────────────
  if(isMobile) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {rows.map((f,i)=>{
          const over=f.nextFollowUp&&f.nextFollowUp<todayV&&f.status==="Pending";
          const tod=f.nextFollowUp===todayV&&f.status==="Pending";
          const showLog=(over||tod);
          const cats=[...new Set((f.products||[]).map(p=>p.category).filter(Boolean))].join(", ")||"—";
          const canCreEdit=!FULL.includes(user.role)&&(f.createdBy===user.name||f.assignedTo===user.name);
          return (
            <div key={f.id} style={{padding:"14px 16px",borderBottom:`1px solid ${T.line}`,background:i%2===0?T.surface:"#FAFBFC"}}>

              {/* Row 1: Name + Status */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                <div style={{flex:1,minWidth:0,marginRight:10}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.ink,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name||"—"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:T.inkMuted,fontFamily:F}}>{f.createdBy}</span>
                    {f.assignedTo&&<span style={{fontSize:10,fontWeight:500,background:T.brandSubtle,color:T.brand,padding:"0px 6px",borderRadius:8,fontFamily:F}}>→{f.assignedTo}</span>}
                    {f.leadSource&&<SourcePill source={f.leadSource}/>}
                  </div>
                </div>
                <StatusPill status={f.status} sm/>
              </div>

              {/* Row 2: Details grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 16px",marginBottom:10,padding:"10px 12px",background:T.bg,borderRadius:T.r.md}}>
                <div>
                  <div style={{fontSize:10,color:T.inkMuted,fontFamily:F,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>Category</div>
                  <div style={{fontSize:12,color:T.ink,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cats}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:T.inkMuted,fontFamily:F,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>Type</div>
                  <div>{f.funnelType?<StatusPill status={f.funnelType} sm/>:<span style={{fontSize:12,color:T.inkMuted}}>—</span>}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:T.inkMuted,fontFamily:F,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>Follow-up</div>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                    {over&&<Dot color={T.lost.dot} size={5}/>}
                    {tod&&<Dot color={T.pending.dot} size={5}/>}
                    <span style={{fontSize:12,color:over?"#B91C1C":tod?T.pending.text:T.ink,fontWeight:over||tod?600:400,fontFamily:F}}>{f.nextFollowUp||"—"}</span>
                    {over&&<span style={{fontSize:10,color:T.lost.text,fontWeight:600,fontFamily:F}}>Overdue</span>}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,color:T.inkMuted,fontFamily:F,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>Quote</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.brand,fontFamily:F}}>{inr(f.quoteAmount)||<span style={{color:T.inkMuted,fontWeight:400,fontSize:12}}>—</span>}</div>
                </div>
                {f.orderNumber&&(
                  <div>
                    <div style={{fontSize:10,color:T.inkMuted,fontFamily:F,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>Order No.</div>
                    <div style={{fontSize:12,color:T.inkSub,fontFamily:F}}>{f.orderNumber}</div>
                  </div>
                )}
              </div>

              {/* Row 3: Action buttons */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {showLog&&(
                  <button onClick={()=>onLogFollowup(f)}
                    style={{background:T.pending.bg,border:`1px solid ${T.pending.dot}`,borderRadius:T.r.md,padding:"7px 14px",fontSize:12,fontWeight:600,color:T.pending.text,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:5}}>
                    📋 Log
                  </button>
                )}
                <button onClick={()=>onView(f)}
                  style={{background:T.brandSubtle,border:`1px solid ${T.brand}`,borderRadius:T.r.md,padding:"7px 16px",fontSize:12,fontWeight:600,color:T.brand,cursor:"pointer",fontFamily:F}}>
                  View
                </button>
                {FULL.includes(user.role)&&(
                  <button onClick={()=>onEdit(f)}
                    style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.inkSub,fontFamily:F}}>
                    <Ic d={P.edit} sz={13} color={T.inkSub}/> Edit
                  </button>
                )}
                {canCreEdit&&(
                  <button onClick={()=>onCreEdit(f)}
                    style={{background:T.surface,border:`1px solid ${T.brand}`,borderRadius:T.r.md,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.brand,fontFamily:F}}>
                    <Ic d={P.edit} sz={13} color={T.brand}/> Edit
                  </button>
                )}
                {FULL.includes(user.role)&&(
                  <button onClick={()=>onDelete(f.id)}
                    style={{background:"#FEF2F2",border:`1px solid #FECACA`,borderRadius:T.r.md,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#B91C1C",fontFamily:F}}>
                    <Ic d={P.trash} sz={13} color="#DC2626"/> Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── DESKTOP TABLE VIEW ─────────────────────────────────────────────────────
  const TH=({ch})=><th style={{padding:"0 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`1px solid ${T.line}`,height:34,background:T.bg}}>{ch}</th>;
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F,tableLayout:"fixed"}}>
        <colgroup>
          <col style={{width:"3%"}}/><col style={{width:"18%"}}/><col style={{width:"12%"}}/>
          <col style={{width:"10%"}}/><col style={{width:"11%"}}/><col style={{width:"10%"}}/>
          <col style={{width:"11%"}}/><col style={{width:"10%"}}/><col style={{width:"15%"}}/>
        </colgroup>
        <thead>
          <tr>
            <TH ch="#"/><TH ch="Name"/><TH ch="Category"/>
            <TH ch="Type"/><TH ch="Follow-up"/><TH ch="Status"/>
            <TH ch="Order No."/><TH ch="Quote"/><TH ch=""/>
          </tr>
        </thead>
        <tbody>
          {rows.map((f,i)=>{
            const over=f.nextFollowUp&&f.nextFollowUp<todayV&&f.status==="Pending";
            const tod=f.nextFollowUp===todayV&&f.status==="Pending";
            const showLog=(over||tod);
            const cats=[...new Set((f.products||[]).map(p=>p.category).filter(Boolean))].join(", ")||"—";
            const canCreEdit=!FULL.includes(user.role)&&(f.createdBy===user.name||f.assignedTo===user.name);
            return (
              <tr key={f.id}
                style={{borderBottom:`1px solid ${T.line}`,transition:"background .1s",cursor:"default",background:i%2===0?T.surface:"#FAFBFC"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.brandSubtle}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:"#FAFBFC"}>
                <td style={{padding:"0 12px",height:48,fontSize:11,color:T.inkMuted,fontWeight:600,verticalAlign:"middle"}}>{i+1}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle",overflow:"hidden"}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name||"—"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2,flexWrap:"nowrap",overflow:"hidden"}}>
                    <span style={{fontSize:10,color:T.inkMuted,flexShrink:0}}>{f.createdBy}</span>
                    {f.assignedTo&&<span style={{fontSize:10,fontWeight:500,background:T.brandSubtle,color:T.brand,padding:"0px 5px",borderRadius:8,fontFamily:F,flexShrink:0}}>→{f.assignedTo}</span>}
                    {f.leadSource&&<SourcePill source={f.leadSource}/>}
                  </div>
                </td>
                <td style={{padding:"0 12px",fontSize:11,color:T.inkSub,verticalAlign:"middle",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cats}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}>{f.funnelType?<StatusPill status={f.funnelType} sm/>:<span style={{color:T.inkMuted,fontSize:12}}>—</span>}</td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    {over&&<Dot color={T.lost.dot} size={5}/>}
                    {tod&&<Dot color={T.pending.dot} size={5}/>}
                    <span style={{fontSize:12,color:over?"#B91C1C":tod?T.pending.text:T.inkSub,fontWeight:over||tod?600:400}}>{f.nextFollowUp||"—"}</span>
                  </div>
                  {over&&<span style={{fontSize:10,color:T.lost.text,fontWeight:500}}>Overdue</span>}
                </td>
                <td style={{padding:"0 12px",verticalAlign:"middle"}}><StatusPill status={f.status} sm/></td>
                <td style={{padding:"0 12px",fontSize:12,color:T.inkSub,verticalAlign:"middle",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.orderNumber||"—"}</td>
                <td style={{padding:"0 12px",fontSize:12,fontWeight:600,color:T.brand,verticalAlign:"middle",whiteSpace:"nowrap"}}>{inr(f.quoteAmount)||<span style={{color:T.inkMuted,fontWeight:400}}>—</span>}</td>
                <td style={{padding:"0 8px",verticalAlign:"middle"}}>
                  <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                    {showLog&&(
                      <button onClick={()=>onLogFollowup(f)}
                        style={{background:T.pending.bg,border:`1px solid ${T.pending.dot}`,borderRadius:T.r.sm,padding:"3px 8px",fontSize:11,fontWeight:600,color:T.pending.text,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap",transition:"all .12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=T.pending.dot;e.currentTarget.style.color="#fff";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=T.pending.bg;e.currentTarget.style.color=T.pending.text;}}>
                        📋 Log
                      </button>
                    )}
                    <button onClick={()=>onView(f)}
                      style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 10px",fontSize:11,fontWeight:500,color:T.inkSub,cursor:"pointer",fontFamily:F,transition:"all .12s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background=T.brandSubtle;e.currentTarget.style.color=T.brand;e.currentTarget.style.borderColor=T.brand;}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.inkSub;e.currentTarget.style.borderColor=T.line;}}>View</button>
                    {FULL.includes(user.role)&&(
                      <button onClick={()=>onEdit(f)}
                        style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 6px",cursor:"pointer",display:"flex",transition:"all .12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=T.bg;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                        <Ic d={P.edit} sz={12} color={T.inkSub}/>
                      </button>
                    )}
                    {canCreEdit&&(
                      <button onClick={()=>onCreEdit(f)} title="Edit products & quote"
                        style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 6px",cursor:"pointer",display:"flex",transition:"all .12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=T.brandSubtle;e.currentTarget.style.borderColor=T.brand;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.line;}}>
                        <Ic d={P.edit} sz={12} color={T.brand}/>
                      </button>
                    )}
                    {FULL.includes(user.role)&&(
                      <button onClick={()=>onDelete(f.id)}
                        style={{background:"transparent",border:`1px solid ${T.line}`,borderRadius:T.r.sm,padding:"3px 6px",cursor:"pointer",display:"flex",transition:"all .12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#FEF2F2";e.currentTarget.style.borderColor="#FECACA";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.line;}}>
                        <Ic d={P.trash} sz={12} color="#DC2626"/>
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

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics({funnels}) {
  const won=funnels.filter(f=>f.status==="Won");
  const totalRevenue=won.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0);
  const wr=funnels.length?Math.round(won.length/funnels.length*100):0;

  const Row=({label,val,pct,color})=>(
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:12,color:T.ink,fontFamily:F}}>{label}</span>
        <span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>{val} <span style={{color:T.inkMuted,fontWeight:400}}>({pct}%)</span></span>
      </div>
      <div style={{height:4,background:T.bg,borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:2}}/>
      </div>
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
  const typeColors=[T.brand,T.won.dot,T.pending.dot,T.premium.dot,T.new.dot];
  const enqColors=[T.new.dot,T.won.dot,T.bulk.dot,T.high.dot,T.premium.dot,T.drop.dot];

  return (
    <div style={{padding:"20px 24px",display:"grid",gap:16}}>
      <div className="ek-analytics-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        <Card title="Win rate">
          <div style={{textAlign:"center",padding:"8px 0"}}>
            <div style={{fontSize:52,fontWeight:700,color:wr>=50?T.won.dot:T.pending.dot,fontFamily:F,letterSpacing:"-2px",lineHeight:1}}>{wr}%</div>
            <div style={{fontSize:12,color:T.inkSub,marginTop:10,fontFamily:F}}>{won.length} of {funnels.length} deals won</div>
            <div style={{height:6,background:T.bg,borderRadius:3,overflow:"hidden",marginTop:16}}>
              <div style={{width:`${wr}%`,height:"100%",background:wr>=50?T.won.dot:T.pending.dot,borderRadius:3}}/>
            </div>
          </div>
        </Card>
        <Card title="Status breakdown">
          {STATUS.map(s=>{
            const n=funnels.filter(f=>f.status===s).length;
            const pct=funnels.length?Math.round(n/funnels.length*100):0;
            const c=T[s.toLowerCase()]||T.drop;
            return <Row key={s} label={s} val={n} pct={pct} color={c.dot}/>;
          })}
        </Card>
        <Card title="Revenue">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
            <span style={{fontSize:12,color:T.inkSub,fontFamily:F}}>Won Revenue</span>
            <span style={{fontSize:15,fontWeight:700,color:T.won.dot,fontFamily:F}}>{big(totalRevenue)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
            <span style={{fontSize:12,color:T.inkSub,fontFamily:F}}>Pending potential</span>
            <span style={{fontSize:15,fontWeight:700,color:T.pending.dot,fontFamily:F}}>
              {big(funnels.filter(f=>f.status==="Pending").reduce((a,f)=>a+(Number(f.quoteAmount)||0),0))}
            </span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
            <span style={{fontSize:12,color:T.inkSub,fontFamily:F}}>Avg deal size</span>
            <span style={{fontSize:15,fontWeight:700,color:T.brand,fontFamily:F}}>
              {big(funnels.length?funnels.reduce((a,f)=>a+(Number(f.quoteAmount)||0),0)/funnels.length:0)}
            </span>
          </div>
        </Card>
      </div>

      <div className="ek-analytics-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        <Card title="Leads by funnel type">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {FTYPES.map((t,i)=>{
              const n=funnels.filter(f=>f.funnelType===t).length;
              return (
                <div key={t} style={{flex:1,minWidth:60,textAlign:"center",padding:"12px 8px",background:T.bg,borderRadius:T.r.md,border:`1px solid ${T.line}`}}>
                  <div style={{fontSize:22,fontWeight:700,color:typeColors[i]||T.brand,fontFamily:F}}>{n}</div>
                  <div style={{fontSize:10,color:T.inkMuted,marginTop:4,fontFamily:F,lineHeight:1.3}}>{t}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Leads by source">
          {LEAD_SOURCES.map(s=>{
            const n=funnels.filter(f=>f.leadSource===s).length;
            if(!n) return null;
            const pct=funnels.length?Math.round(n/funnels.length*100):0;
            return <Row key={s} label={s} val={n} pct={pct} color={T.brand}/>;
          })}
          {!funnels.some(f=>f.leadSource)&&<div style={{fontSize:12,color:T.inkMuted,fontFamily:F}}>No source data yet.</div>}
        </Card>
        <Card title="Leads by enquiry type">
          {ENQS.map((e,i)=>{
            const n=funnels.filter(f=>f.enquiryType===e).length;
            if(!n) return null;
            const pct=funnels.length?Math.round(n/funnels.length*100):0;
            return <Row key={e} label={e} val={n} pct={pct} color={enqColors[i]||T.brand}/>;
          })}
          {!funnels.some(f=>f.enquiryType)&&<div style={{fontSize:12,color:T.inkMuted,fontFamily:F}}>No enquiry data yet.</div>}
        </Card>
      </div>

      <Card title="Units ordered by category">
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0 32px"}}>
          {byCat.map(({c,n})=>(
            <div key={c} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:T.ink,fontFamily:F}}>{c}</span>
                <span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>{n}</span>
              </div>
              <div style={{height:4,background:T.bg,borderRadius:2,overflow:"hidden"}}>
                <div style={{width:`${Math.round(n/maxCat*100)}%`,height:"100%",background:T.brand,borderRadius:2,opacity:.7}}/>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TEAM ─────────────────────────────────────────────────────────────────────
function Team({users,onSave}) {
  const [list,setList]=useState(users);
  const [form,setForm]=useState({name:"",username:"",password:"",role:"CRE"});
  const [err,setErr]=useState("");
  useEffect(()=>setList(users),[users]);
  const add=()=>{
    if(!form.name||!form.username||!form.password){setErr("All fields required.");return;}
    if(list.find(u=>u.username===form.username)){setErr("Username taken.");return;}
    const u=[...list,{...form,id:Date.now()}];
    setList(u);onSave(u);setForm({name:"",username:"",password:"",role:"CRE"});setErr("");
  };
  const rm=id=>{const u=list.filter(x=>x.id!==id);setList(u);onSave(u);};
  const rc={"CEO":T.high,"Manager":T.won,"CRE":T.pending};
  return (
    <div className="ek-team-grid" style={{padding:"20px 24px",display:"grid",gridTemplateColumns:"360px 1fr",gap:20}}>
      <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:22,boxShadow:T.shadowSm}}>
        <div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:3,fontFamily:F}}>Add team member</div>
        <div style={{fontSize:12,color:T.inkSub,marginBottom:18,fontFamily:F}}>Access granted immediately upon creation</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FInput label="Full name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Jane Doe"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FInput label="Username" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="janedoe"/>
            <FInput label="Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Password" type="password"/>
          </div>
          <FSelect label="Role" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} options={ROLES}/>
          {err&&<div style={{fontSize:12,color:"#B91C1C",background:"#FEF2F2",border:"1px solid #FECACA",padding:"8px 11px",borderRadius:T.r.md}}>{err}</div>}
          <Btn primary full icon={P.plus} label="Add member" onClick={add}/>
        </div>
        <div style={{marginTop:18,padding:"12px 14px",background:T.brandSubtle,borderRadius:T.r.md,fontSize:12,color:T.brand,lineHeight:1.7,fontFamily:F}}>
          <strong>CEO & Manager</strong> — full access<br/>
          <strong>CRE</strong> — create + export + limited edit
        </div>
      </div>
      <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:22,boxShadow:T.shadowSm}}>
        <div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:18,fontFamily:F}}>Team members ({list.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {list.map(u=>{
            const c=rc[u.role]||T.drop;
            return (
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:`1px solid ${T.line}`,borderRadius:T.r.md,transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
                <Avatar name={u.name} size={36}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:F}}>{u.name}</div>
                  <div style={{fontSize:11,color:T.inkMuted,fontFamily:F}}>@{u.username}</div>
                </div>
                <span style={{fontSize:11,fontWeight:500,padding:"3px 9px",borderRadius:20,background:c.bg,color:c.text,fontFamily:F}}>{u.role}</span>
                {u.id!==1&&<Btn danger sm label="Remove" onClick={()=>rm(u.id)}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── FUNNEL FORM (CEO/Manager full form) ──────────────────────────────────────
function FunnelForm({onClose,onSave,existing,user,users=[]}) {
  const blank={
    name:"",phone:"",email:"",
    enquiryType:"",funnelType:"",
    leadSource:"",cityRegion:"",
    nextFollowUp:"",
    products:[{desc:"",category:"",qty:"",price:""}],
    remarks:"",deliveryDetails:"",paymentTerms:"",
    orderNumber:"",quoteQty:"",quoteAmount:"",quoteDesc:"",
    status:"Pending",assignedTo:"",
  };
  const [form,setForm]=useState(existing?{...blank,...existing,products:existing.products?.length?existing.products:blank.products}:blank);
  const [errs,setErrs]=useState({});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const sp=(i,k,v)=>{const p=[...form.products];p[i]={...p[i],[k]:v};set("products",p);};

  const val=()=>{
    const e={};
    if(!form.name)            e.name="Required";
    if(!form.phone)           e.phone="Required";
    if(!form.enquiryType)     e.enquiryType="Required";
    if(!form.funnelType)      e.funnelType="Required";
    if(!form.leadSource)      e.leadSource="Required";
    if(!form.nextFollowUp)    e.nfu="Required";
    if(!form.remarks)         e.remarks="Required";
    if(!form.deliveryDetails) e.deliveryDetails="Required";
    if(!form.quoteDesc)       e.quoteDesc="Required";
    if(!form.quoteQty)        e.quoteQty="Required";
    if(!form.quoteAmount)     e.quoteAmount="Required";
    const hasProduct=form.products.some(p=>p.desc.trim()!=="");
    if(!hasProduct) e.products="At least one product item is required";
    if(!user?.name) e.auth="You must be logged in";
    setErrs(e);
    return !Object.keys(e).length;
  };
  const submit=()=>{if(val())onSave(form);};
  const prodTotal=(form.products||[]).reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);
  const creUsers=users.filter(u=>u.role==="CRE");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:720,maxHeight:"90vh",overflowY:"auto",boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px 16px",borderBottom:`1px solid ${T.line}`,position:"sticky",top:0,background:T.surface,zIndex:1,borderRadius:`${T.r["2xl"]} ${T.r["2xl"]} 0 0`}}>
          <div>
            <h2 style={{fontSize:16,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 2px"}}>{existing?"Edit funnel":"New funnel"}</h2>
            <p style={{margin:0,fontSize:12,color:T.inkSub,fontFamily:F}}>{existing?"Editing funnel":"Add a new sales lead"}</p>
          </div>
          <button onClick={onClose} style={{width:30,height:30,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={P.close} sz={13} color={T.inkSub}/>
          </button>
        </div>

        <div style={{padding:"22px 24px",display:"flex",flexDirection:"column",gap:20}}>
          <section>
            <SL>Contact details</SL>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="ek-form-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FInput label="Name" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Customer name" required error={errs.name}/>
                <FInput label="Phone" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+91 98765 43210" required error={errs.phone}/>
                <FInput label="Email" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="email@company.com"/>
              </div>
              <FInput label="City / Region" value={form.cityRegion} onChange={e=>set("cityRegion",e.target.value)} placeholder="e.g. Chennai, Tamil Nadu"/>
            </div>
          </section>

          <section>
            <SL>Funnel details</SL>
            <div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <FSelect label="Enquiry type" value={form.enquiryType} onChange={e=>set("enquiryType",e.target.value)} options={ENQS} required error={errs.enquiryType}/>
              <FSelect label="Funnel type"  value={form.funnelType}  onChange={e=>set("funnelType",e.target.value)}  options={FTYPES} required error={errs.funnelType}/>
            </div>
            <div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FSelect label="Lead source" required value={form.leadSource} onChange={e=>set("leadSource",e.target.value)} options={LEAD_SOURCES} placeholder="Select source…" error={errs.leadSource}/>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Next follow-up<span style={{color:"#DC2626",marginLeft:2}}>*</span></label>
                <input type="date" value={form.nextFollowUp} onChange={e=>set("nextFollowUp",e.target.value)} style={{...inputSx(errs.nfu)}} onFocus={onfocus} onBlur={onblur}/>
                {errs.nfu&&<span style={{fontSize:11,color:"#B91C1C"}}>{errs.nfu}</span>}
              </div>
            </div>
          </section>

          {/* ⑧ Assign to CRE — CEO/Manager only */}
          {FULL.includes(user?.role)&&creUsers.length>0&&(
            <section>
              <SL>Assign to</SL>
              <FSelect
                label="Assign to CRE"
                value={form.assignedTo}
                onChange={e=>set("assignedTo",e.target.value)}
                options={creUsers.map(u=>u.name)}
                placeholder="Select team member…"
              />
              {form.assignedTo&&(
                <div style={{marginTop:8,fontSize:12,color:T.inkSub,fontFamily:F,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>📋</span>
                  This funnel will appear in <strong style={{color:T.brand}}>{form.assignedTo}</strong>'s dashboard
                </div>
              )}
            </section>
          )}

          <section>
            <SL>Customer requirements</SL>
            <div style={{border:`1px solid ${errs.products?T.lost.dot:T.line}`,borderRadius:T.r.lg,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"8px 14px",background:T.bg,gap:8}}>
                {["Product / item *","Category","Qty","Unit price (₹)",""].map(h=><div key={h} style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",fontFamily:F}}>{h}</div>)}
              </div>
              {form.products.map((pr,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"9px 14px",borderTop:`1px solid ${T.line}`,gap:8,alignItems:"center"}}>
                  <input value={pr.desc} onChange={e=>sp(i,"desc",e.target.value)} placeholder="e.g. Bridal Lehenga"
                    style={{...inputSx(),padding:"6px 9px",fontSize:12}} onFocus={onfocus} onBlur={onblur}/>
                  <select value={pr.category} onChange={e=>sp(i,"category",e.target.value)}
                    style={{...inputSx(),padding:"6px 24px 6px 9px",fontSize:12,cursor:"pointer",appearance:"none",background:`${T.surface} ${selectBg}`}}
                    onFocus={onfocus} onBlur={onblur}>
                    <option value="">Category</option>{CATS.map(c=><option key={c}>{c}</option>)}
                  </select>
                  {[["qty","0"],["price","0"]].map(([k,ph])=>(
                    <input key={k} type="number" value={pr[k]} onChange={e=>sp(i,k,e.target.value)} placeholder={ph}
                      style={{...inputSx(),padding:"6px 9px",fontSize:12}} onFocus={onfocus} onBlur={onblur}/>
                  ))}
                  <button onClick={()=>set("products",form.products.filter((_,x)=>x!==i))} disabled={form.products.length===1}
                    style={{background:"none",border:"none",cursor:form.products.length===1?"not-allowed":"pointer",color:T.inkMuted,fontSize:16,opacity:form.products.length===1?.2:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              ))}
              <div style={{padding:"9px 14px",borderTop:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={()=>set("products",[...form.products,{desc:"",category:"",qty:"",price:""}])}
                  style={{background:"none",border:`1px dashed ${T.brand}`,borderRadius:T.r.sm,padding:"4px 12px",color:T.brand,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:F,display:"inline-flex",alignItems:"center",gap:5}}>
                  <Ic d={P.plus} sz={11} color={T.brand}/> Add item
                </button>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {errs.products&&<span style={{fontSize:11,color:"#B91C1C",fontWeight:500}}>{errs.products}</span>}
                  {prodTotal>0&&<span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>Total: {inr(prodTotal)}</span>}
                </div>
              </div>
            </div>
          </section>

          <section>
            <SL>Remarks <span style={{color:"#DC2626"}}>*</span></SL>
            <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)} placeholder="Additional notes…" rows={2}
              style={{...inputSx(errs.remarks),padding:"9px 11px",resize:"vertical",lineHeight:1.5}} onFocus={onfocus} onBlur={onblur}/>
            {errs.remarks&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{errs.remarks}</div>}
          </section>

          <section>
            <SL>Delivery & Payment</SL>
            <div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Delivery details <span style={{color:"#DC2626"}}>*</span></label>
                <textarea value={form.deliveryDetails} onChange={e=>set("deliveryDetails",e.target.value)} placeholder="e.g. Delivery by Apr 20, doorstep…" rows={2}
                  style={{...inputSx(errs.deliveryDetails),padding:"9px 11px",resize:"vertical",lineHeight:1.5}} onFocus={onfocus} onBlur={onblur}/>
                {errs.deliveryDetails&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{errs.deliveryDetails}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F}}>Payment terms</label>
                <textarea value={form.paymentTerms} onChange={e=>set("paymentTerms",e.target.value)} placeholder="e.g. 50% advance, balance on delivery…" rows={2}
                  style={{...inputSx(),padding:"9px 11px",resize:"vertical",lineHeight:1.5}} onFocus={onfocus} onBlur={onblur}/>
              </div>
            </div>
          </section>

          <section>
            <SL>Initial quotation</SL>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="ek-form-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FInput label="Order Number" value={form.orderNumber} onChange={e=>set("orderNumber",e.target.value)} placeholder="Enter order number"/>
                <FInput label="Quantity" type="number" value={form.quoteQty} onChange={e=>set("quoteQty",e.target.value)} placeholder="0" required error={errs.quoteQty}/>
                <FInput label="Amount (₹)" type="number" value={form.quoteAmount} onChange={e=>set("quoteAmount",e.target.value)} placeholder="0" required error={errs.quoteAmount}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:T.inkSub,marginBottom:5,display:"block",fontFamily:F}}>Description <span style={{color:"#DC2626"}}>*</span></label>
                <textarea value={form.quoteDesc} onChange={e=>set("quoteDesc",e.target.value)} placeholder="Quote notes…" rows={2}
                  style={{...inputSx(errs.quoteDesc),padding:"9px 11px",resize:"vertical",lineHeight:1.5,width:"100%",boxSizing:"border-box"}} onFocus={onfocus} onBlur={onblur}/>
                {errs.quoteDesc&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{errs.quoteDesc}</div>}
              </div>
            </div>
          </section>
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",gap:10,padding:"14px 24px 22px",borderTop:`1px solid ${T.line}`,position:"sticky",bottom:0,background:T.surface,borderRadius:`0 0 ${T.r["2xl"]} ${T.r["2xl"]}`}}>
          <Btn ghost label="Cancel" onClick={onClose}/>
          <Btn primary icon={existing?P.check:P.plus} label={existing?"Save changes":"Add funnel"} onClick={submit}/>
        </div>
      </div>
    </div>
  );
}

// ─── CRE EDIT MODAL ───────────────────────────────────────────────────────────
// ⑨ CRE can only edit: Product/item, Category, Qty, Unit price, Quote Qty, Quote Amount
function CREEditModal({funnel, onClose, onSave}) {
  const [products, setProducts] = useState(
    funnel.products?.length ? funnel.products.map(p=>({...p})) : [{desc:"",category:"",qty:"",price:""}]
  );
  const [quoteQty, setQuoteQty] = useState(String(funnel.quoteQty||""));
  const [quoteAmount, setQuoteAmount] = useState(String(funnel.quoteAmount||""));
  const [saving, setSaving] = useState(false);

  const sp=(i,k,v)=>{const p=[...products];p[i]={...p[i],[k]:v};setProducts(p);};
  const prodTotal=products.reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);

  const submit=async()=>{
    setSaving(true);
    try {
      await onSave({
        ...funnel,
        products: products.filter(p=>p.desc||p.category||p.qty||p.price),
        quoteQty:    quoteQty    ? Number(quoteQty)    : funnel.quoteQty,
        quoteAmount: quoteAmount ? Number(quoteAmount) : funnel.quoteAmount,
      });
      onClose();
    } catch(err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:680,maxHeight:"85vh",overflowY:"auto",boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px 14px",borderBottom:`1px solid ${T.line}`,position:"sticky",top:0,background:T.surface,zIndex:1,borderRadius:`${T.r["2xl"]} ${T.r["2xl"]} 0 0`}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 2px"}}>Edit Products & Quote</h2>
            <p style={{margin:0,fontSize:12,color:T.inkSub,fontFamily:F}}>{funnel.name} — update products and quote details</p>
          </div>
          <button onClick={onClose} style={{width:30,height:30,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={P.close} sz={13} color={T.inkSub}/>
          </button>
        </div>

        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:20}}>

          {/* Read-only info banner */}
          <div style={{background:T.brandSubtle,border:`1px solid rgba(91,59,232,.15)`,borderRadius:T.r.lg,padding:"12px 16px",display:"flex",gap:24,flexWrap:"wrap"}}>
            {[["Customer",funnel.name],["Phone",funnel.phone],["Status",funnel.status],["Follow-up",funnel.nextFollowUp]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:10,fontWeight:600,color:T.brand,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:F,marginBottom:2}}>{l}</div>
                <div style={{fontSize:13,fontWeight:500,color:T.ink,fontFamily:F}}>{v||"—"}</div>
              </div>
            ))}
          </div>

          {/* Products table */}
          <section>
            <SL>Customer requirements</SL>
            <div style={{border:`1px solid ${T.line}`,borderRadius:T.r.lg,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"8px 14px",background:T.bg,gap:8}}>
                {["Product / item","Category","Qty","Unit price (₹)",""].map(h=>(
                  <div key={h} style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",fontFamily:F}}>{h}</div>
                ))}
              </div>
              {products.map((pr,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2.5fr 1.4fr .8fr 1fr .35fr",padding:"9px 14px",borderTop:`1px solid ${T.line}`,gap:8,alignItems:"center"}}>
                  <input value={pr.desc} onChange={e=>sp(i,"desc",e.target.value)} placeholder="e.g. Bridal Lehenga"
                    style={{...inputSx(),padding:"6px 9px",fontSize:12}} onFocus={onfocus} onBlur={onblur}/>
                  <select value={pr.category} onChange={e=>sp(i,"category",e.target.value)}
                    style={{...inputSx(),padding:"6px 24px 6px 9px",fontSize:12,cursor:"pointer",appearance:"none",background:`${T.surface} ${selectBg}`}}
                    onFocus={onfocus} onBlur={onblur}>
                    <option value="">Category</option>
                    {CATS.map(c=><option key={c}>{c}</option>)}
                  </select>
                  {[["qty","0"],["price","0"]].map(([k,ph])=>(
                    <input key={k} type="number" value={pr[k]} onChange={e=>sp(i,k,e.target.value)} placeholder={ph}
                      style={{...inputSx(),padding:"6px 9px",fontSize:12}} onFocus={onfocus} onBlur={onblur}/>
                  ))}
                  <button onClick={()=>setProducts(products.filter((_,x)=>x!==i))} disabled={products.length===1}
                    style={{background:"none",border:"none",cursor:products.length===1?"not-allowed":"pointer",color:T.inkMuted,fontSize:16,opacity:products.length===1?.2:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              ))}
              <div style={{padding:"9px 14px",borderTop:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={()=>setProducts([...products,{desc:"",category:"",qty:"",price:""}])}
                  style={{background:"none",border:`1px dashed ${T.brand}`,borderRadius:T.r.sm,padding:"4px 12px",color:T.brand,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:F,display:"inline-flex",alignItems:"center",gap:5}}>
                  <Ic d={P.plus} sz={11} color={T.brand}/> Add item
                </button>
                {prodTotal>0&&<span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>Total: {inr(prodTotal)}</span>}
              </div>
            </div>
          </section>

          {/* Quote qty and amount */}
          <section>
            <SL>Quote details</SL>
            <div className="ek-form-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FInput label="Quantity" type="number" value={quoteQty} onChange={e=>setQuoteQty(e.target.value)} placeholder="0"/>
              <FInput label="Amount (₹)" type="number" value={quoteAmount} onChange={e=>setQuoteAmount(e.target.value)} placeholder="0"/>
            </div>
          </section>

          {/* Locked notice */}
          <div style={{background:"#F9FAFB",border:`1px solid ${T.line}`,borderRadius:T.r.md,padding:"10px 14px",fontSize:12,color:T.inkMuted,fontFamily:F,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>🔒</span>
            Other fields (contact, remarks, delivery, payment terms) can only be edited by Manager or CEO.
          </div>
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",gap:10,padding:"14px 24px 20px",borderTop:`1px solid ${T.line}`,position:"sticky",bottom:0,background:T.surface,borderRadius:`0 0 ${T.r["2xl"]} ${T.r["2xl"]}`}}>
          <Btn ghost label="Cancel" onClick={onClose}/>
          <Btn primary icon={P.check} label={saving?"Saving…":"Save changes"} onClick={submit} disabled={saving}/>
        </div>
      </div>
    </div>
  );
}

// ─── FOLLOW-UP OUTCOMES ───────────────────────────────────────────────────────
const OUTCOMES = [
  "Interested", "Needs Time", "Callback Requested",
  "Not Interested", "Rescheduled", "Order Confirmed", "Other"
];

// ─── FOLLOWUP LOG MODAL ───────────────────────────────────────────────────────
function FollowupLogModal({ funnel, user, onClose, onSave }) {
  const [form, setForm] = useState({ customerResponse: "", outcome: "", nextFollowUp: "" });
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    const e = {};
    if (!form.customerResponse.trim()) e.response = "Required";
    if (!form.outcome)                 e.outcome = "Required";
    if (!form.nextFollowUp)            e.nextFollowUp = "Required";
    setErr(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await onSave({
        loggedBy: user.name,
        followUpDate: funnel.nextFollowUp,
        customerResponse: form.customerResponse.trim(),
        outcome: form.outcome,
        nextFollowUp: form.nextFollowUp,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const outcomeColors = {
    "Interested":T.won,"Order Confirmed":T.won,
    "Needs Time":T.pending,"Callback Requested":T.pending,"Rescheduled":T.pending,
    "Not Interested":T.lost,"Other":T.drop,
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:T.r["2xl"],width:"100%",maxWidth:480,boxShadow:T.shadowXl,animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 3px"}}>Log Follow-up</h2>
            <p style={{margin:0,fontSize:12,color:T.inkSub,fontFamily:F}}>{funnel.name} · Due {funnel.nextFollowUp}</p>
          </div>
          <button onClick={onClose} style={{width:28,height:28,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={P.close} sz={12} color={T.inkSub}/>
          </button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F,display:"block",marginBottom:5}}>
              What did the customer say? <span style={{color:"#DC2626"}}>*</span>
            </label>
            <textarea value={form.customerResponse} onChange={e=>set("customerResponse",e.target.value)}
              placeholder="e.g. Customer said she'll confirm after checking with family…" rows={3}
              style={{...inputSx(err.response),padding:"9px 11px",resize:"vertical",lineHeight:1.6,width:"100%",boxSizing:"border-box"}}
              onFocus={onfocus} onBlur={onblur} autoFocus/>
            {err.response&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{err.response}</div>}
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F,display:"block",marginBottom:8}}>
              Outcome <span style={{color:"#DC2626"}}>*</span>
            </label>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {OUTCOMES.map(o=>{
                const c=outcomeColors[o]||T.drop;
                const sel=form.outcome===o;
                return (
                  <button key={o} onClick={()=>set("outcome",o)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${sel?c.dot:T.line}`,background:sel?c.bg:"transparent",color:sel?c.text:T.inkSub,fontSize:12,fontWeight:sel?600:400,cursor:"pointer",fontFamily:F,transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
                    <Dot color={sel?c.dot:T.inkMuted} size={5}/>{o}
                  </button>
                );
              })}
            </div>
            {err.outcome&&<div style={{fontSize:11,color:"#B91C1C",marginTop:6}}>{err.outcome}</div>}
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:T.inkSub,fontFamily:F,display:"block",marginBottom:5}}>
              Reschedule next follow-up to <span style={{color:"#DC2626"}}>*</span>
            </label>
            <input type="date" value={form.nextFollowUp} onChange={e=>set("nextFollowUp",e.target.value)}
              style={{...inputSx(err.nextFollowUp)}} onFocus={onfocus} onBlur={onblur} min={today()}/>
            {err.nextFollowUp&&<div style={{fontSize:11,color:"#B91C1C",marginTop:4}}>{err.nextFollowUp}</div>}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,padding:"14px 24px 20px",borderTop:`1px solid ${T.line}`}}>
          <Btn ghost label="Cancel" onClick={onClose}/>
          <Btn primary icon={P.check} label={saving?"Saving…":"Save & Reschedule"} onClick={submit} disabled={saving}/>
        </div>
      </div>
    </div>
  );
}

// ─── VIEW DRAWER ──────────────────────────────────────────────────────────────
function ViewDrawer({funnel,onClose,onEdit,onCreEdit,onStatusChange,user,comments,onAddComment,followupLogs=[],onLogFollowup}) {
  const [status,setStatus]=useState(funnel.status);
  const tot=(funnel.products||[]).reduce((a,p)=>a+(Number(p.qty)*Number(p.price)||0),0);
  const doStatus=s=>{setStatus(s);onStatusChange(funnel.id,s);};
  const [commentText,setCommentText]=useState("");
  const canComment=FULL.includes(user.role);
  const submitComment=()=>{
    if(!commentText.trim()) return;
    onAddComment(funnel.id,{text:commentText.trim(),author:user.name,role:user.role,time:stamp()});
    setCommentText("");
  };
  const Row=({l,v,mono})=>(
    <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:8,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
      <dt style={{fontSize:11,fontWeight:500,color:T.inkMuted,fontFamily:F}}>{l}</dt>
      <dd style={{fontSize:13,color:T.ink,fontFamily:mono?"'SF Mono',monospace":F,wordBreak:"break-all"}}>{v||"—"}</dd>
    </div>
  );
  const Sec=({t})=><div style={{fontSize:10,fontWeight:600,color:T.inkMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,marginTop:4,fontFamily:F}}>{t}</div>;
  const roleColor={"CEO":T.high,"Manager":T.won,"CRE":T.pending};
  const outcomeColors={"Interested":T.won,"Order Confirmed":T.won,"Needs Time":T.pending,"Callback Requested":T.pending,"Rescheduled":T.pending,"Not Interested":T.lost,"Other":T.drop};
  const canCreEdit=!FULL.includes(user.role)&&(funnel.createdBy===user.name||funnel.assignedTo===user.name);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:2000,display:"flex",justifyContent:"flex-end",backdropFilter:"blur(1px)"}} onClick={onClose}>
      <div style={{background:T.surface,width:"100%",maxWidth:540,height:"100%",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,.12)",animation:"slideRight .22s ease",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>

        <div style={{padding:"20px 22px 16px",borderBottom:`1px solid ${T.line}`,position:"sticky",top:0,background:T.surface,zIndex:1}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
            <div style={{flex:1,marginRight:12}}>
              <h2 style={{fontSize:17,fontWeight:700,color:T.ink,fontFamily:F,margin:"0 0 3px",letterSpacing:"-0.3px"}}>{funnel.name||"(No name)"}</h2>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <p style={{margin:0,fontSize:11,color:T.inkMuted,fontFamily:F}}>{funnel.createdAt} · {funnel.createdBy}</p>
                {funnel.assignedTo&&<span style={{fontSize:11,fontWeight:500,background:T.brandSubtle,color:T.brand,padding:"1px 8px",borderRadius:10,fontFamily:F}}>→ {funnel.assignedTo}</span>}
                {funnel.leadSource&&<SourcePill source={funnel.leadSource}/>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {FULL.includes(user.role)&&<Btn ghost sm icon={P.edit} label="Edit" onClick={()=>{onClose();onEdit(funnel);}}/>}
              {canCreEdit&&<Btn ghost sm icon={P.edit} label="Edit" onClick={()=>{onClose();onCreEdit(funnel);}}/>}
              <button onClick={onClose} style={{width:28,height:28,border:`1px solid ${T.line}`,borderRadius:T.r.md,background:T.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Ic d={P.close} sz={12} color={T.inkSub}/>
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {STATUS.map(s=>{
              const c=T[s.toLowerCase()]||T.drop;
              const a=status===s;
              return (
                <button key={s} onClick={()=>doStatus(s)}
                  style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${a?c.dot:T.line}`,background:a?c.bg:"transparent",color:a?c.text:T.inkSub,fontSize:12,fontWeight:a?600:400,cursor:"pointer",fontFamily:F,transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
                  <Dot color={a?c.dot:T.inkMuted} size={5}/>{s}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{padding:"18px 22px",flex:1}}>
          <Sec t="Contact"/>
          <dl>
            <Row l="Name" v={funnel.name}/>
            <Row l="Phone" v={funnel.phone}/>
            <Row l="Email" v={funnel.email}/>
            {funnel.cityRegion&&<Row l="City / Region" v={funnel.cityRegion}/>}
            {funnel.assignedTo&&<Row l="Assigned to" v={funnel.assignedTo}/>}
          </dl>
          <div style={{height:18}}/>

          <Sec t="Funnel"/>
          <dl>
            <Row l="Enquiry type"   v={funnel.enquiryType}/>
            <Row l="Funnel type"    v={funnel.funnelType}/>
            <Row l="Lead source"    v={funnel.leadSource}/>
            <Row l="Next follow-up" v={funnel.nextFollowUp}/>
          </dl>
          <div style={{height:18}}/>

          <Sec t="Products"/>
          <div style={{border:`1px solid ${T.line}`,borderRadius:T.r.lg,overflow:"hidden",marginBottom:18}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr .7fr 1fr 1fr",padding:"7px 14px",background:T.bg}}>
              {["Item","Cat.","Qty","Price","Total"].map(h=><div key={h} style={{fontSize:10,fontWeight:600,color:T.inkMuted,letterSpacing:"0.06em",fontFamily:F}}>{h}</div>)}
            </div>
            {(funnel.products||[]).map((p,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr .7fr 1fr 1fr",padding:"9px 14px",borderTop:`1px solid ${T.line}`}}>
                <span style={{fontSize:12,fontWeight:500,color:T.ink,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.desc||"—"}</span>
                <span style={{fontSize:11,color:T.inkSub,fontFamily:F}}>{p.category||"—"}</span>
                <span style={{fontSize:11,color:T.inkSub,fontFamily:F}}>{p.qty||"—"}</span>
                <span style={{fontSize:11,color:T.inkSub,fontFamily:F}}>{inr(p.price)||"—"}</span>
                <span style={{fontSize:12,fontWeight:600,color:T.brand,fontFamily:F}}>{inr(Number(p.qty)*Number(p.price))||"—"}</span>
              </div>
            ))}
            {tot>0&&<div style={{display:"flex",justifyContent:"flex-end",padding:"8px 14px",borderTop:`1px solid ${T.lineMid}`,fontSize:13,fontWeight:700,color:T.ink,fontFamily:F}}>Total: {inr(tot)}</div>}
          </div>

          {funnel.remarks&&<><Sec t="Remarks"/><div style={{background:T.bg,padding:"10px 14px",borderRadius:T.r.md,fontSize:13,color:T.ink,fontFamily:F,lineHeight:1.6,marginBottom:18}}>{funnel.remarks}</div></>}

          {(funnel.deliveryDetails||funnel.paymentTerms)&&(
            <><Sec t="Delivery & Payment"/>
            <dl>
              {funnel.deliveryDetails&&<Row l="Delivery details" v={funnel.deliveryDetails}/>}
              {funnel.paymentTerms&&<Row l="Payment terms" v={funnel.paymentTerms}/>}
            </dl>
            <div style={{height:18}}/></>
          )}

          <Sec t="Quotation"/>
          <dl>
            <Row l="Order Number" v={funnel.orderNumber} mono/>
            <Row l="Quantity"  v={funnel.quoteQty}/>
            <Row l="Amount"    v={inr(funnel.quoteAmount)}/>
            {funnel.quoteDesc&&<Row l="Description" v={funnel.quoteDesc}/>}
          </dl>

          {/* Follow-up History */}
          <div style={{height:24}}/>
          <div style={{borderTop:`2px solid ${T.line}`,paddingTop:20,marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>📅</span>
                <span style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:F}}>Follow-up History</span>
                {followupLogs.length>0&&<span style={{fontSize:11,fontWeight:500,background:T.brandSubtle,color:T.brand,padding:"1px 8px",borderRadius:10,fontFamily:F}}>{followupLogs.length}</span>}
              </div>
              <Btn primary sm label="+ Log Follow-up" onClick={onLogFollowup}/>
            </div>
            {followupLogs.length===0
              ? <div style={{textAlign:"center",padding:"16px 0",fontSize:12,color:T.inkMuted,fontFamily:F}}>No follow-ups logged yet.</div>
              : <div style={{display:"flex",flexDirection:"column",gap:0,position:"relative"}}>
                  <div style={{position:"absolute",left:11,top:12,bottom:12,width:2,background:T.line,borderRadius:2}}/>
                  {[...followupLogs].reverse().map((log,i)=>{
                    const c=outcomeColors[log.outcome]||T.drop;
                    return (
                      <div key={i} style={{display:"flex",gap:14,paddingBottom:16,position:"relative"}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:c.bg,border:`2px solid ${c.dot}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1}}>
                          <Dot color={c.dot} size={6}/>
                        </div>
                        <div style={{flex:1,background:T.bg,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:"12px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:6}}>
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <StatusPill status={log.outcome} sm/>
                              <span style={{fontSize:11,color:T.inkMuted,fontFamily:F}}>by {log.loggedBy}</span>
                            </div>
                            <span style={{fontSize:10,color:T.inkMuted,fontFamily:F,whiteSpace:"nowrap"}}>{log.loggedAt}</span>
                          </div>
                          <p style={{margin:"0 0 8px",fontSize:13,color:T.ink,fontFamily:F,lineHeight:1.6}}>{log.customerResponse}</p>
                          {log.nextFollowUp&&<div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.brand,fontFamily:F,fontWeight:500}}><span>→</span> Rescheduled to {log.nextFollowUp}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>

          {/* Audit Comments */}
          <div style={{borderTop:`2px solid ${T.line}`,paddingTop:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              <Ic d={P.msg} sz={14} color={T.brand}/>
              <span style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:F}}>Audit Comments</span>
              {comments.length>0&&<span style={{fontSize:11,fontWeight:500,background:T.brandSubtle,color:T.brand,padding:"1px 8px",borderRadius:10,fontFamily:F}}>{comments.length}</span>}
            </div>
            {canComment&&(
              <div style={{marginBottom:16}}>
                <textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Write your audit comment…" rows={3}
                  style={{...inputSx(),padding:"10px 12px",resize:"vertical",lineHeight:1.6,width:"100%",boxSizing:"border-box"}} onFocus={onfocus} onBlur={onblur}/>
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                  <Btn primary sm icon={P.check} label="Save comment" onClick={submitComment} disabled={!commentText.trim()}/>
                </div>
              </div>
            )}
            {comments.length===0
              ? <div style={{textAlign:"center",padding:"20px 0",fontSize:12,color:T.inkMuted,fontFamily:F}}>No audit comments yet.</div>
              : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[...comments].reverse().map((c,i)=>{
                    const rc=roleColor[c.role]||T.drop;
                    return (
                      <div key={i} style={{background:T.bg,border:`1px solid ${T.line}`,borderRadius:T.r.lg,padding:"12px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <Avatar name={c.author} size={24}/>
                          <div style={{flex:1}}>
                            <span style={{fontSize:12,fontWeight:600,color:T.ink,fontFamily:F}}>{c.author}</span>
                            <span style={{marginLeft:6,fontSize:10,fontWeight:500,padding:"1px 7px",borderRadius:10,background:rc.bg,color:rc.text,fontFamily:F}}>{c.role}</span>
                          </div>
                          <span style={{fontSize:10,color:T.inkMuted,fontFamily:F,whiteSpace:"nowrap"}}>{c.time}</span>
                        </div>
                        <p style={{margin:0,fontSize:13,color:T.ink,fontFamily:F,lineHeight:1.6}}>{c.text}</p>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN SHELL ───────────────────────────────────────────────────────────────
function Shell({user,users,onLogout,onUsersChange}) {
  const [funnels,setFunnels]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("dashboard");
  const [search,setSearch]=useState("");
  const [sidebarOpen,setSidebarOpen]=useState(false);

  useEffect(()=>{
    const fetchFunnels=async()=>{
      try{ const data=await crmService.getAllFunnels(); setFunnels(data); }
      catch(err){ console.error("Failed to fetch funnels:",err); }
      finally{ setLoading(false); }
    };
    fetchFunnels();
  },[]);

  useEffect(()=>{
    const channel=supabase.channel('funnels_changes')
      .on('postgres_changes',{event:'*',schema:'public',table:'funnels'},(payload)=>{
        if(payload.eventType==='INSERT'){
          const nf=crmService.mapFromDb(payload.new);
          setFunnels(prev=>prev.find(f=>f.id===nf.id)?prev:[nf,...prev]);
        } else if(payload.eventType==='UPDATE'){
          const uf=crmService.mapFromDb(payload.new);
          setFunnels(prev=>prev.map(f=>f.id===uf.id?uf:f));
        } else if(payload.eventType==='DELETE'){
          setFunnels(prev=>prev.filter(f=>f.id!==payload.old.id));
        }
      }).subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[]);

  const [funnelComments,setFunnelComments]=useState({});
  const [viewT,setViewT]=useState(null);

  useEffect(()=>{
    if(viewT&&!funnelComments[viewT.id]){
      crmService.getComments(viewT.id).then(comments=>{
        setFunnelComments(prev=>({...prev,[viewT.id]:comments}));
      }).catch(err=>console.error("Failed to fetch comments:",err));
    }
  },[viewT,funnelComments]);

  useEffect(()=>{
    const channel=supabase.channel('comments_changes')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'audit_comments'},async(payload)=>{
        const funnelId=payload.new.funnel_id;
        const newComment={text:payload.new.text,author:payload.new.author,role:payload.new.role,
          time:new Date(payload.new.created_at).toLocaleString('en-IN',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})};
        setFunnelComments(prev=>({...prev,[funnelId]:[...(prev[funnelId]||[]),newComment]}));
      }).subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[]);

  const addComment=async(funnelId,comment)=>{
    try{ await crmService.addComment(funnelId,comment); }
    catch(err){ console.error("Failed to add comment:",err); }
  };

  // Follow-up logs
  const [followupLogs,setFollowupLogs]=useState({});
  const [logModalFunnel,setLogModalFunnel]=useState(null);

  useEffect(()=>{
    if(viewT&&!followupLogs[viewT.id]){
      crmService.getFollowupLogs(viewT.id).then(logs=>{
        setFollowupLogs(prev=>({...prev,[viewT.id]:logs}));
      }).catch(err=>console.error("Failed to fetch followup logs:",err));
    }
  },[viewT]);

  const saveFollowupLog=async(log)=>{
    try{
      await crmService.addFollowupLog(logModalFunnel.id,log);
      if(log.nextFollowUp){
        await crmService.updateNextFollowup(logModalFunnel.id,log.nextFollowUp);
        setFunnels(p=>p.map(f=>f.id===logModalFunnel.id?{...f,nextFollowUp:log.nextFollowUp}:f));
      }
      const updated=await crmService.getFollowupLogs(logModalFunnel.id);
      setFollowupLogs(prev=>({...prev,[logModalFunnel.id]:updated}));
      setLogModalFunnel(null);
      push("Follow-up logged ✓");
    } catch(err){
      console.error("Failed to save followup log:",err);
      push("Error saving follow-up","error");
    }
  };

  const [fil,setFil]=useState({status:"",funnelType:"",enquiryType:"",leadSource:"",descFilter:"",missed:false,todayF:false,upcoming:false});
  const [addOpen,setAddOpen]=useState(false);
  const [editT,setEditT]=useState(null);
  const [creEditT,setCreEditT]=useState(null); // ⑨ CRE restricted edit

  const {list:toasts,push}=useToast();
  const TODAY=today();

  const sf=(k,v)=>setFil(f=>({...f,[k]:v}));
  const rf=()=>setFil({status:"",funnelType:"",enquiryType:"",leadSource:"",descFilter:"",missed:false,todayF:false,upcoming:false});

  // ⑧ scoped includes assigned funnels for CRE
  const scoped=useMemo(()=>
    FULL.includes(user.role)?funnels:funnels.filter(f=>f.createdBy===user.name||f.assignedTo===user.name),
  [funnels,user]);

  const filtered=useMemo(()=>scoped.filter(f=>{
    if(search){
      const q=search.toLowerCase();
      if(!(f.name||"").toLowerCase().includes(q)&&!(f.email||"").toLowerCase().includes(q)&&!(f.phone||"").toLowerCase().includes(q)&&!(f.orderNumber||"").toLowerCase().includes(q)) return false;
    }
    if(fil.status      && f.status     !==fil.status)      return false;
    if(fil.funnelType  && f.funnelType !==fil.funnelType)  return false;
    if(fil.enquiryType && f.enquiryType!==fil.enquiryType) return false;
    if(fil.leadSource  && f.leadSource !==fil.leadSource)  return false;
    if(fil.descFilter){
      const q=fil.descFilter.toLowerCase();
      if(!(f.remarks||"").toLowerCase().includes(q)&&!(f.quoteDesc||"").toLowerCase().includes(q)) return false;
    }
    if(fil.missed   &&(!f.nextFollowUp||f.nextFollowUp>=TODAY)) return false;
    if(fil.todayF   && f.nextFollowUp!==TODAY)                  return false;
    if(fil.upcoming && f.nextFollowUp<=TODAY)                   return false;
    return true;
  }),[scoped,search,fil,TODAY]);

  const save=async(form)=>{
    try{
      const cleanedForm={...form,products:(form.products||[]).filter(p=>p.desc||p.category||p.qty||p.price)};
      const saved=await crmService.saveFunnel(cleanedForm,user);
      if(editT){ setFunnels(p=>p.map(f=>f.id===saved.id?saved:f)); setEditT(null); push("Funnel updated"); }
      else{ setFunnels(p=>[saved,...p]); setAddOpen(false); push("Funnel added"); }
    } catch(err){ console.error("Failed to save funnel:",err); push(`Error: ${err.message||"Could not save lead"}`,"error"); }
  };

  // ⑨ CRE restricted save
  const creEditSave=async(form)=>{
    try{
      const saved=await crmService.saveFunnel(form,user);
      setFunnels(p=>p.map(f=>f.id===saved.id?saved:f));
      setCreEditT(null);
      push("Updated ✓");
    } catch(err){ console.error("Failed to save:",err); push("Error saving","error"); }
  };

  const del=async(id)=>{
    if(!window.confirm("Are you sure you want to delete this lead?")) return;
    try{ await crmService.deleteFunnel(id); setFunnels(p=>p.filter(f=>f.id!==id)); push("Deleted","info"); }
    catch(err){ console.error("Failed to delete funnel:",err); push("Error deleting funnel","error"); }
  };

  const upStatus=async(id,s)=>{
    try{ await crmService.updateStatus(id,s); setFunnels(p=>p.map(f=>f.id===id?{...f,status:s}:f)); push(`Status → ${s}`); }
    catch(err){ console.error("Failed to update status:",err); push("Error updating status","error"); }
  };

  const titles={dashboard:"Dashboard",funnels:"Funnels",analytics:"Analytics",team:"Team"};
  const showFilters=view==="dashboard"||view==="funnels";
  const showStats  =view==="dashboard";

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:F}}>
      <Sidebar active={view} set={setView} user={user} onLogout={onLogout} open={sidebarOpen} onClose={()=>setSidebarOpen(false)}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,minHeight:"100vh"}}>
        <Topbar
          title={titles[view]}
          search={search} setSearch={setSearch}
          user={user} onAdd={()=>setAddOpen(true)}
          onExportAll={()=>{xls(scoped,`Ekanta_All_${TODAY}.xls`);push(`Exported ${scoped.length} funnels`,"info");}}
          onExportFiltered={()=>{xls(filtered,`Ekanta_Filtered_${TODAY}.xls`);push(`Exported ${filtered.length} funnels`,"info");}}
          fLen={filtered.length} aLen={scoped.length}
          onMenuToggle={()=>setSidebarOpen(x=>!x)}
        />
        {showStats&&<Stats funnels={scoped}/>}
        {showFilters&&<div style={{marginTop:16}}><FilterBar fil={fil} setF={sf} reset={rf}/></div>}
        {showStats&&!showFilters&&<div style={{height:16}}/>}
        <div style={{flex:1,background:showFilters?T.surface:"transparent",borderTop:showFilters?`1px solid ${T.line}`:"none"}}>
          {(view==="dashboard"||view==="funnels")&&(
            <Table
              rows={filtered} user={user}
              onView={setViewT}
              onEdit={f=>setEditT(f)}
              onCreEdit={f=>setCreEditT(f)}
              onDelete={del}
              onLogFollowup={f=>setLogModalFunnel(f)}
              loading={loading}
            />
          )}
          {view==="analytics"&&<Analytics funnels={FULL.includes(user.role)?funnels:scoped}/>}
          {view==="team"&&FULL.includes(user.role)&&<Team users={users} onSave={onUsersChange}/>}
        </div>
      </div>

      {(addOpen||editT)&&<FunnelForm onClose={()=>{setAddOpen(false);setEditT(null);}} onSave={save} existing={editT} user={user} users={users}/>}

      {viewT&&(
        <ViewDrawer
          funnel={viewT}
          onClose={()=>setViewT(null)}
          onEdit={f=>setEditT(f)}
          onCreEdit={f=>setCreEditT(f)}
          onStatusChange={upStatus}
          user={user}
          comments={funnelComments[viewT.id]||[]}
          onAddComment={addComment}
          followupLogs={followupLogs[viewT.id]||[]}
          onLogFollowup={()=>setLogModalFunnel(viewT)}
        />
      )}

      {/* ⑨ CRE restricted edit modal */}
      {creEditT&&(
        <CREEditModal
          funnel={creEditT}
          onClose={()=>setCreEditT(null)}
          onSave={creEditSave}
        />
      )}

      {logModalFunnel&&(
        <FollowupLogModal
          funnel={logModalFunnel}
          user={user}
          onClose={()=>setLogModalFunnel(null)}
          onSave={saveFollowupLog}
        />
      )}

      <Toaster list={toasts}/>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const fetchUsers=async()=>{
      try{
        const data=await crmService.getUsers();
        setUsers(data&&data.length>0?data:SEED_USERS);
      } catch(err){ console.error("Failed to fetch users:",err); setUsers(SEED_USERS); }
      finally{ setLoading(false); }
    };
    fetchUsers();
  },[]);

  const handleUsersChange=async(newUsers)=>{
    try{
      const currentUsernames=users.map(u=>u.username);
      const newUsernames=newUsers.map(u=>u.username);
      const deletedUsernames=currentUsernames.filter(u=>!newUsernames.includes(u));
      for(const username of deletedUsernames){ await crmService.deleteUser(username); }
      await crmService.saveUsers(newUsers);
      const data=await crmService.getUsers();
      setUsers(data);
    } catch(err){ console.error("Failed to update users:",err); }
  };

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:F}}>Loading CRM...</div>;

  return (
    <>
      <FontLoader/>
      {!user
        ?<Login users={users} onLogin={setUser}/>
        :<Shell user={user} users={users} onLogout={()=>setUser(null)} onUsersChange={handleUsersChange}/>
      }
    </>
  );
}
