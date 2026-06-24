import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════════════════
const APP_VERSION = "2.0";
const STORAGE_KEY = "cove_pms_v1";

const DEFAULT_ROOMS = [
  { id:1, name:"101", type:"Double",  price:70,  floor:1, beds:2, notes:"" },
  { id:2, name:"102", type:"Twin",    price:65,  floor:1, beds:2, notes:"" },
  { id:3, name:"103", type:"Single",  price:50,  floor:1, beds:1, notes:"" },
  { id:4, name:"201", type:"Double",  price:75,  floor:2, beds:2, notes:"" },
  { id:5, name:"202", type:"Suite",   price:120, floor:2, beds:2, notes:"Sea view" },
  { id:6, name:"203", type:"Double",  price:75,  floor:2, beds:2, notes:"" },
  { id:7, name:"301", type:"Twin",    price:65,  floor:3, beds:2, notes:"" },
  { id:8, name:"302", type:"Double",  price:70,  floor:3, beds:2, notes:"" },
];
const ROOM_TYPES = ["Single","Double","Twin","Triple","Suite","Studio","Apartment","Villa"];
let ROOMS = DEFAULT_ROOMS; // updated at runtime by App state

// Role definitions
const ROLES = {
  admin:     { label:"Admin",       color:"#2d6b7a", can:["all"] },
  frontdesk: { label:"Front Desk",  color:"#1a4a5a", can:["view","checkin","checkout","notes"] },
  cleaner:   { label:"Cleaner",     color:"#059669", can:["view","clean"] },
};

const ROLE_CAN = (role, action) => {
  if (!ROLES[role]) return false;
  if (ROLES[role].can.includes("all")) return true;
  return ROLES[role].can.includes(action);
};

// Default users (password is plain text here for demo — in production use hashed)
const DEFAULT_USERS = [
  { id:"u1", name:"Admin",      username:"admin",    password:"admin123",   role:"admin",     avatar:"A", active:true },
  { id:"u2", name:"Maria F.",   username:"maria",    password:"maria123",   role:"frontdesk", avatar:"M", active:true },
  { id:"u3", name:"Kostas C.",  username:"kostas",   password:"kostas123",  role:"cleaner",   avatar:"K", active:true },
];

const STATUS_COLORS = {
  confirmed:"#1a4a5a", checkedin:"#059669", checkedout:"#6b7280",
  cancelled:"#dc2626", pending:"#d97706",
};
const STATUS_LABELS = {
  confirmed:"Confirmed", checkedin:"In House", checkedout:"Checked Out",
  cancelled:"Cancelled", pending:"Pending",
};

// ═══════════════════════════════════════════════════════════════
// DATE UTILS
// ═══════════════════════════════════════════════════════════════
const toStr = d => { const x = typeof d==="string"?new Date(d+"T12:00:00"):d; return x.toISOString().split("T")[0]; };
const NOW = toStr(new Date());
const addD = (s,n) => { const d=new Date(s+"T12:00:00"); d.setDate(d.getDate()+n); return toStr(d); };
const diffD = (a,b) => Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000);
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONFULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY3 = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const dispDate = s => { if(!s) return ""; const d=new Date(s+"T12:00:00"); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const dispShort = s => { if(!s) return ""; const d=new Date(s+"T12:00:00"); return `${d.getDate()}/${d.getMonth()+1}`; };
const nowDate = new Date(NOW+"T12:00:00");

// ═══════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════
const SAMPLE_BOOKINGS = [
  {id:"b1",roomId:1,guest:"Papadopoulos, Maria",phone:"+30 697 111 2233",email:"maria@email.com",checkin:addD(NOW,-2),checkout:addD(NOW,2),status:"checkedin",notes:"Extra pillow",source:"direct",adults:2,children:0},
  {id:"b2",roomId:2,guest:"Müller, Klaus",phone:"+49 160 555 6677",email:"k.muller@mail.de",checkin:addD(NOW,-1),checkout:NOW,status:"checkedin",notes:"",source:"booking.com",adults:1,children:0},
  {id:"b3",roomId:4,guest:"Smith, James & Sarah",phone:"+44 7700 900123",email:"js@mail.co.uk",checkin:NOW,checkout:addD(NOW,3),status:"confirmed",notes:"Anniversary – add flowers",source:"airbnb",adults:2,children:0},
  {id:"b4",roomId:5,guest:"Oikonomou, Yiannis",phone:"+30 694 333 4455",email:"yoik@mail.com",checkin:addD(NOW,1),checkout:addD(NOW,4),status:"confirmed",notes:"Late arrival after 23:00",source:"direct",adults:2,children:1},
  {id:"b5",roomId:7,guest:"Rossi, Anna",phone:"+39 333 777 8899",email:"rossi@libero.it",checkin:addD(NOW,-3),checkout:addD(NOW,-1),status:"checkedout",notes:"",source:"expedia",adults:1,children:0},
  {id:"b6",roomId:3,guest:"Alexandrou, Nikos",phone:"+30 698 222 3344",email:"",checkin:addD(NOW,2),checkout:addD(NOW,5),status:"confirmed",notes:"Ground floor preferred",source:"phone",adults:2,children:2},
  {id:"b7",roomId:6,guest:"Dubois, Claire",phone:"+33 6 12 34 56 78",email:"c.dubois@fr.com",checkin:addD(NOW,-1),checkout:addD(NOW,2),status:"checkedin",notes:"Vegetarian meals",source:"booking.com",adults:2,children:0},
  {id:"b8",roomId:8,guest:"Tanaka, Hiroshi",phone:"+81 90 1234 5678",email:"h.tanaka@jp.com",checkin:addD(NOW,3),checkout:addD(NOW,6),status:"confirmed",notes:"",source:"expedia",adults:1,children:0},
];
const SAMPLE_TASKS = [
  {id:"t1",text:"Fix AC in room 202",priority:"high",due:NOW,done:false,assignedTo:"",createdBy:"u1"},
  {id:"t2",text:"Order extra towels",priority:"normal",due:addD(NOW,1),done:false,assignedTo:"u3",createdBy:"u1"},
  {id:"t3",text:"Call pool maintenance",priority:"low",due:addD(NOW,2),done:true,assignedTo:"",createdBy:"u2"},
  {id:"t4",text:"Flowers for room 201 – Anniversary",priority:"high",due:NOW,done:false,assignedTo:"u2",createdBy:"u1"},
];

// ═══════════════════════════════════════════════════════════════
// DATABASE (persistent storage with localStorage fallback)
// ═══════════════════════════════════════════════════════════════
const DB = {
  async load() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      const raw = s ? JSON.parse(s) : null;
      if (raw && raw.version === APP_VERSION) return raw;
      return null;
    } catch { return null; }
  },
  async save(data) {
    try {
      const payload = JSON.stringify({ ...data, version: APP_VERSION, savedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch(e) { console.warn("Save failed", e); }
  },
};

// ═══════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════
const Ico = ({ n, s=16, c="currentColor" }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></>,
    bookings:  <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    broom:     <><path d="M9 3L5 21"/><path d="M9 3c0 0 6 1 9 6s3 9 3 9"/><path d="M5 21c0 0 3-1 6-3"/></>,
    tasks:     <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    users:     <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x:         <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    chevL:     <polyline points="15,18 9,12 15,6"/>,
    chevR:     <polyline points="9,18 15,12 9,6"/>,
    chevD:     <polyline points="6,9 12,15 18,9"/>,
    check:     <polyline points="20,6 9,17 4,12"/>,
    search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    alert:     <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    logout:    <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    lock:      <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    eye:       <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff:   <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    edit:      <><path d="M11 4H4a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:     <><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></>,
    menu:      <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    report:    <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    bed:       <><path d="M2 20v-8a2 2 0 012-2h16a2 2 0 012 2v8"/><path d="M2 14h20"/><path d="M7 14v-3a1 1 0 011-1h8a1 1 0 011 1v3"/><line x1="2" y1="20" x2="22" y2="20"/></>,
    wifi:      <><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[n] || <circle cx="12" cy="12" r="5"/>}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════
// SMALL UI COMPONENTS
// ═══════════════════════════════════════════════════════════════
const Badge = ({ status, small }) => (
  <span style={{
    fontSize: small?9:10, fontWeight:700, padding: small?"2px 6px":"3px 9px",
    borderRadius:20, background:STATUS_COLORS[status]+"20",
    color:STATUS_COLORS[status], textTransform:"uppercase", letterSpacing:"0.4px", whiteSpace:"nowrap"
  }}>{STATUS_LABELS[status]}</span>
);

const RoleBadge = ({ role }) => (
  <span style={{
    fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
    background:ROLES[role]?.color+"18", color:ROLES[role]?.color,
    textTransform:"uppercase", letterSpacing:"0.4px"
  }}>{ROLES[role]?.label || role}</span>
);

function Toast({ msg, type="success", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  const bg = type==="error"?"#dc2626":type==="warn"?"#d97706":"#059669";
  return (
    <div style={{ position:"fixed", top:16, right:16, background:bg, color:"white",
      padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:700, zIndex:9999,
      boxShadow:"0 8px 24px rgba(0,0,0,0.2)", maxWidth:320,
      animation:"slideIn 0.2s ease" }}>
      {msg}
    </div>
  );
}

// Avatar circle
const Av = ({ name, size=32, color="#1a4a5a" }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:color,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:size*0.38, fontWeight:800, color:"white", flexShrink:0, userSelect:"none" }}>
    {(name||"?")[0].toUpperCase()}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════
function LoginScreen({ users, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function attempt() {
    setErr("");
    setLoading(true);
    setTimeout(() => {
      const user = users.find(u => u.username===username.trim() && u.password===password && u.active);
      if (user) onLogin(user);
      else setErr("Invalid username or password");
      setLoading(false);
    }, 400);
  }

  const inp = { style:{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10,
    fontSize:14, fontFamily:"inherit", outline:"none", color:"#1e293b", background:"#f8fafc",
    boxSizing:"border-box", transition:"border-color 0.15s" } };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0d2233 0%,#1a3d4d 50%,#1d5c6b 100%)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;} body{margin:0;} button,input,select{font-family:inherit;}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      `}</style>
      <div style={{ background:"white", borderRadius:20, padding:"36px 32px", width:"100%", maxWidth:400,
        boxShadow:"0 24px 64px rgba(0,0,0,0.25)", animation:"fadeUp 0.3s ease" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <img src="https://covesuites.gr/wp-content/uploads/2021/08/COVESUITES.png"
            alt="Cove Suites" style={{ height:64, objectFit:"contain", display:"block", margin:"0 auto 14px" }}/>
          <div style={{ fontSize:13, color:"#94a3b8", marginTop:2 }}>Property Management System</div>
        </div>

        {err && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10,
            padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:16,
            display:"flex", alignItems:"center", gap:8 }}>
            <Ico n="alert" s={15} c="#dc2626"/>{err}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#475569", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Username</label>
          <input {...inp} value={username} onChange={e=>setUsername(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Enter username" autoFocus/>
        </div>
        <div style={{ marginBottom:20, position:"relative" }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#475569", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Password</label>
          <input {...inp} type={showPw?"text":"password"} value={password}
            onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Enter password"/>
          <button onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:12, top:34,
            background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:4 }}>
            <Ico n={showPw?"eyeOff":"eye"} s={16}/>
          </button>
        </div>

        <button onClick={attempt} disabled={loading || !username || !password}
          style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#1a3a4a,#2d6b7a)",
            color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:800,
            cursor:loading||!username||!password?"not-allowed":"pointer", opacity:loading||!username||!password?0.65:1,
            fontFamily:"inherit", transition:"opacity 0.15s" }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {/* Demo hint */}
        <div style={{ marginTop:20, padding:"12px 14px", background:"#f0f9ff", borderRadius:10, border:"1px solid #b0d8e0" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#1a4a5a", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Demo Accounts</div>
          {DEFAULT_USERS.map(u => (
            <button key={u.id} onClick={()=>{setUsername(u.username);setPassword(u.password);}}
              style={{ display:"block", width:"100%", textAlign:"left", background:"none", border:"none",
                padding:"4px 0", cursor:"pointer", fontSize:12, color:"#1a4a5a", fontFamily:"inherit" }}>
              <strong>{u.username}</strong> / {u.password} — <RoleBadge role={u.role}/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OCCUPANCY GAUGE
// ═══════════════════════════════════════════════════════════════
function OccGauge({ pct }) {
  const r=60, cx=80, cy=80, startA=-210, endA=30, totalDeg=240;
  const toRad = d => d*Math.PI/180;
  const pt = deg => ({ x:cx+r*Math.cos(toRad(deg)), y:cy+r*Math.sin(toRad(deg)) });
  const s=pt(startA), e=pt(endA), f=pt(startA+totalDeg*pct/100);
  const lg = totalDeg*pct/100>180;
  const color = pct>=80?"#059669":pct>=50?"#d97706":"#dc2626";
  return (
    <svg width={160} height={120} style={{ display:"block", margin:"0 auto" }}>
      <path d={`M${s.x} ${s.y} A${r} ${r} 0 1 1 ${e.x} ${e.y}`} fill="none" stroke="#e2e8f0" strokeWidth={12} strokeLinecap="round"/>
      {pct>0&&<path d={`M${s.x} ${s.y} A${r} ${r} 0 ${lg?1:0} 1 ${f.x} ${f.y}`} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"/>}
      <text x={cx} y={cy+8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#1e293b">{pct}%</text>
      <text x={cx} y={cy+22} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={600} textTransform="uppercase">OCCUPANCY</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORECAST CHART
// ═══════════════════════════════════════════════════════════════
function ForecastChart({ bookings, days=14 }) {
  const W=500, H=100, PL=20, PR=8, PT=8, PB=24, BW=12, GAP=4;
  const dates = Array.from({length:days},(_,i)=>addD(NOW,i-2));
  const data = dates.map(d=>({
    d, arr:bookings.filter(b=>b.checkin===d&&b.status!=="cancelled").length,
    dep:bookings.filter(b=>b.checkout===d&&b.status!=="cancelled").length,
  }));
  const maxV = Math.max(6,...data.map(d=>Math.max(d.arr,d.dep)));
  const slotW = (W-PL-PR)/days;
  const ys = v => PT+(H-PT-PB)*(1-v/maxV);
  const bh = v => (H-PT-PB)*(v/maxV);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H+4}`} style={{overflow:"visible"}}>
      {[0,2,4].map(v=>(
        <line key={v} x1={PL} x2={W-PR} y1={ys(v)} y2={ys(v)} stroke="#f1f5f9" strokeWidth={1}/>
      ))}
      {data.map((d,i)=>{
        const x=PL+slotW*(i+0.5), isT=d.d===NOW;
        const dt=new Date(d.d+"T12:00:00");
        return (
          <g key={d.d}>
            {d.arr>0&&<rect x={x-BW-GAP/2} y={ys(d.arr)} width={BW} height={bh(d.arr)} fill={isT?"#153d4d":"#2d8b9e"} rx={2} opacity={0.9}/>}
            {d.dep>0&&<rect x={x+GAP/2} y={ys(d.dep)} width={BW} height={bh(d.dep)} fill={isT?"#b91c1c":"#ef4444"} rx={2} opacity={0.9}/>}
            {d.arr>0&&<text x={x-BW/2-GAP/2} y={ys(d.arr)-3} textAnchor="middle" fontSize={8} fill="#2d8b9e" fontWeight={700}>{d.arr}</text>}
            {d.dep>0&&<text x={x+BW/2+GAP/2} y={ys(d.dep)-3} textAnchor="middle" fontSize={8} fill="#ef4444" fontWeight={700}>{d.dep}</text>}
            <text x={x} y={H-PB+16} textAnchor="middle" fontSize={8} fill={isT?"#1a4a5a":"#94a3b8"} fontWeight={isT?800:400}>{dispShort(d.d)}</text>
            {isT&&<rect x={x-slotW/2} y={PT} width={slotW} height={H-PT-PB} fill="#f0f6f7" rx={2} style={{opacity:0.4}}/>}
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TABLE
// ═══════════════════════════════════════════════════════════════
function OverviewTable({ bookings, days=14 }) {
  const dates = Array.from({length:days},(_,i)=>addD(NOW,i));
  const rows = [
    {label:"OCCUPANCY",    fn:d=>{ const o=bookings.filter(b=>b.checkin<=d&&b.checkout>d&&b.status!=="cancelled").length; return `${Math.round(o/ROOMS.length*100)}%`; }},
    {label:"AVAILABLE",    fn:d=>ROOMS.length-bookings.filter(b=>b.checkin<=d&&b.checkout>d&&b.status!=="cancelled").length},
    {label:"ARRIVALS",     fn:d=>bookings.filter(b=>b.checkin===d&&b.status!=="cancelled").length},
    {label:"IN HOUSE",     fn:d=>bookings.filter(b=>b.checkin<=d&&b.checkout>d&&b.status!=="cancelled").length},
    {label:"DEPARTURES",   fn:d=>bookings.filter(b=>b.checkout===d&&b.status!=="cancelled").length},
  ];
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:500}}>
        <thead>
          <tr>
            <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",borderBottom:"2px solid #f1f5f9",minWidth:100,whiteSpace:"nowrap"}}>{MONFULL[nowDate.getMonth()].toUpperCase()}</th>
            {dates.map(d=>{
              const dt=new Date(d+"T12:00:00"), isT=d===NOW;
              return (
                <th key={d} style={{padding:"4px 3px",textAlign:"center",borderBottom:"2px solid #f1f5f9",minWidth:38}}>
                  <div style={{fontSize:8,color:isT?"#1a4a5a":"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>{DAY3[dt.getDay()]}</div>
                  <div style={{fontSize:11,fontWeight:800,color:isT?"#1a4a5a":"#475569",background:isT?"#d4eaee":"transparent",borderRadius:4,lineHeight:"18px"}}>{dt.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,ri)=>(
            <tr key={row.label} style={{background:ri%2===0?"#f8fafc":"white"}}>
              <td style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.3px",borderBottom:"1px solid #f1f5f9",whiteSpace:"nowrap"}}>{row.label}</td>
              {dates.map(d=>{
                const val=row.fn(d), isT=d===NOW;
                const numV = typeof val==="string"&&val.includes("%")?parseInt(val):val;
                const highlight = ri===0&&typeof numV==="number"&&numV>=80?"#dcfce7":ri===0&&numV>=50?"#fef9c3":undefined;
                return (
                  <td key={d} style={{padding:"5px 3px",textAlign:"center",fontSize:11,fontWeight:isT?800:400,
                    color:isT?"#1a4a5a":"#374151",background:isT?"#f0f6f7":highlight||"transparent",
                    borderBottom:"1px solid #f1f5f9"}}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKING MODAL
// ═══════════════════════════════════════════════════════════════
function BookingModal({ booking, bookings, rooms:modalRooms, onSave, onDelete, onClose, defaultCheckin, defaultRoom, currentUser }) {
  const ROOMS = modalRooms || DEFAULT_ROOMS;
  const isNew = !booking;
  const canEdit = ROLE_CAN(currentUser.role, "all") || ROLE_CAN(currentUser.role, "checkin");
  const [f, setF] = useState(booking ? {...booking} : {
    id:uid(), roomId:defaultRoom||1, guest:"", phone:"", email:"",
    checkin:defaultCheckin||NOW, checkout:addD(defaultCheckin||NOW,1),
    status:"confirmed", notes:"", source:"direct", adults:2, children:0,
  });
  const [err, setErr] = useState("");
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const nights = Math.max(0, diffD(f.checkin, f.checkout));
  const room = ROOMS.find(r=>r.id===parseInt(f.roomId));
  const total = room ? nights*room.price : 0;
  const conflict = bookings.filter(b=>b.id!==f.id&&b.roomId===parseInt(f.roomId)&&!["cancelled","checkedout"].includes(b.status))
    .some(b=>f.checkin<b.checkout&&f.checkout>b.checkin);

  function save() {
    if (!canEdit) return;
    if (!f.guest.trim()) return setErr("Guest name required");
    if (!f.checkin||!f.checkout) return setErr("Dates required");
    if (f.checkin>=f.checkout) return setErr("Check-out must be after check-in");
    if (conflict) return setErr("Room already booked for those dates");
    onSave({...f, roomId:parseInt(f.roomId), adults:parseInt(f.adults)||1, children:parseInt(f.children)||0});
  }

  const inp = { style:{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,
    fontFamily:"inherit",outline:"none",background:canEdit?"white":"#f8fafc",color:"#1e293b",
    boxSizing:"border-box",cursor:canEdit?"text":"default"} };
  const lbl = text => <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>{text}</label>;

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:18,padding:"24px 22px 28px",width:"100%",maxWidth:520,maxHeight:"93vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>{isNew?"New Reservation":"Reservation Details"}</div>
            {!canEdit&&<div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>View only – your role cannot edit reservations</div>}
          </div>
          <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:9,padding:7,cursor:"pointer"}}><Ico n="x" s={17}/></button>
        </div>

        {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:9,padding:"10px 13px",fontSize:12,color:"#dc2626",marginBottom:14,display:"flex",gap:7,alignItems:"center"}}><Ico n="alert" s={14} c="#dc2626"/>{err}</div>}
        {conflict&&!err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:9,padding:"10px 13px",fontSize:12,color:"#dc2626",marginBottom:14}}>⚠ Room conflict with existing booking</div>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"span 2"}}>{lbl("Guest Name *")}<input {...inp} value={f.guest} onChange={e=>canEdit&&set("guest",e.target.value)} placeholder="Full name" readOnly={!canEdit}/></div>
          <div>{lbl("Phone")}<input {...inp} type="tel" value={f.phone} onChange={e=>canEdit&&set("phone",e.target.value)} placeholder="+30 69..." readOnly={!canEdit}/></div>
          <div>{lbl("Email")}<input {...inp} type="email" value={f.email} onChange={e=>canEdit&&set("email",e.target.value)} placeholder="guest@email.com" readOnly={!canEdit}/></div>
          <div>{lbl("Check-in *")}<input type="date" {...inp} value={f.checkin} onChange={e=>{if(canEdit){set("checkin",e.target.value);if(e.target.value>=f.checkout)set("checkout",addD(e.target.value,1));}}}/></div>
          <div>{lbl("Check-out *")}<input type="date" {...inp} value={f.checkout} onChange={e=>canEdit&&set("checkout",e.target.value)}/></div>
          <div style={{gridColumn:"span 2"}}>{lbl("Room *")}
            <select {...inp} value={f.roomId} onChange={e=>canEdit&&set("roomId",e.target.value)} disabled={!canEdit}>
              {ROOMS.map(r=><option key={r.id} value={r.id}>Room {r.name} – {r.type} · €{r.price}/night</option>)}
            </select>
          </div>
          <div>{lbl("Status")}
            <select {...inp} value={f.status} onChange={e=>canEdit&&set("status",e.target.value)} disabled={!canEdit}>
              {Object.entries(STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>{lbl("Source")}
            <select {...inp} value={f.source} onChange={e=>canEdit&&set("source",e.target.value)} disabled={!canEdit}>
              {["direct","booking.com","airbnb","expedia","phone","walkin"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div>{lbl("Adults")}<input type="number" {...inp} value={f.adults} min={1} max={6} onChange={e=>canEdit&&set("adults",e.target.value)} readOnly={!canEdit}/></div>
          <div>{lbl("Children")}<input type="number" {...inp} value={f.children} min={0} max={6} onChange={e=>canEdit&&set("children",e.target.value)} readOnly={!canEdit}/></div>
          <div style={{gridColumn:"span 2"}}>{lbl("Notes / Special Requests")}
            <textarea {...inp} style={{...inp.style,height:72,resize:"none"}} value={f.notes}
              onChange={e=>set("notes",e.target.value)} placeholder="Allergies, late arrival, preferences…"
              readOnly={!canEdit&&!ROLE_CAN(currentUser.role,"notes")}/>
          </div>
        </div>

        {nights>0&&room&&(
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,padding:"10px 14px",display:"flex",justifyContent:"space-between",fontSize:13,color:"#166534",margin:"14px 0 4px"}}>
            <span>{nights} night{nights!==1?"s":""} · {room.type} · Floor {room.floor}</span>
            <strong>€{total} total</strong>
          </div>
        )}

        {canEdit&&(
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={save} style={{flex:1,padding:"12px",background:"linear-gradient(135deg,#1a3a4a,#2d6b7a)",color:"white",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
              {isNew?"Confirm Reservation":"Save Changes"}
            </button>
            {!isNew&&<button onClick={()=>onDelete(f.id)} style={{padding:"12px 16px",background:"white",border:"1.5px solid #dc2626",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer",color:"#dc2626",fontFamily:"inherit"}}>Cancel</button>}
          </div>
        )}
        {!canEdit&&<button onClick={onClose} style={{width:"100%",marginTop:16,padding:"12px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:11,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Close</button>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({ bookings, rooms:localRooms, tasks, currentUser, onOpenModal, onEditBooking }) {
  const ROOMS = localRooms || DEFAULT_ROOMS;
  const act = b => !["cancelled","checkedout"].includes(b.status);
  const inhouse    = bookings.filter(b=>b.checkin<=NOW&&b.checkout>NOW&&act(b));
  const arrivals   = bookings.filter(b=>b.checkin===NOW&&act(b));
  const departures = bookings.filter(b=>b.checkout===NOW&&act(b));
  const occupied   = new Set(inhouse.map(b=>b.roomId)).size;
  const revenue    = inhouse.reduce((s,b)=>s+(ROOMS.find(r=>r.id===b.roomId)?.price||0),0);
  const occ        = Math.round(occupied/ROOMS.length*100);
  const todayTasks = tasks.filter(t=>t.due===NOW&&!t.done);
  const canCreate  = ROLE_CAN(currentUser.role,"all")||ROLE_CAN(currentUser.role,"checkin");

  return (
    <div style={{display:"flex",height:"100%",overflow:"hidden",flexDirection:"column"}}>
      {/* Mobile stat strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0,borderBottom:"1px solid #f1f5f9",background:"white",flexShrink:0}}>
        {[
          {l:"Occupancy",v:`${occ}%`,c:"#1a4a5a"},
          {l:"In House",v:inhouse.length,c:"#059669"},
          {l:"Arrivals",v:arrivals.length,c:"#d97706"},
          {l:"Departures",v:departures.length,c:"#dc2626"},
        ].map(x=>(
          <div key={x.l} style={{padding:"10px 8px",textAlign:"center",borderRight:"1px solid #f1f5f9"}}>
            <div style={{fontSize:18,fontWeight:800,color:x.c}}>{x.v}</div>
            <div style={{fontSize:9,color:"#94a3b8",fontWeight:600,textTransform:"uppercase"}}>{x.l}</div>
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <div style={{flex:1,overflow:"hidden",display:"flex",gap:0}}>
        {/* Left */}
        <div style={{width:260,flexShrink:0,borderRight:"1px solid #f1f5f9",overflowY:"auto",padding:"16px 14px",background:"#fafafa",display:"flex",flexDirection:"column",gap:14}}>
          {/* Gauge */}
          <div style={{background:"white",borderRadius:14,padding:"16px 12px",border:"1px solid #f1f5f9",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <OccGauge pct={occ}/>
            <div style={{display:"flex",justifyContent:"space-around",marginTop:6}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>{occupied}</div>
                <div style={{fontSize:10,color:"#94a3b8"}}>occupied</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>{ROOMS.length-occupied}</div>
                <div style={{fontSize:10,color:"#94a3b8"}}>available</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:800,color:"#059669"}}>€{revenue}</div>
                <div style={{fontSize:10,color:"#94a3b8"}}>tonight</div>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div style={{background:"white",borderRadius:14,padding:"14px 12px",border:"1px solid #f1f5f9",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10}}>Tasks Today</div>
            {todayTasks.length===0&&<div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"8px 0"}}>All tasks done ✓</div>}
            {todayTasks.slice(0,4).map(t=>(
              <div key={t.id} style={{padding:"8px 10px",background:"#f8fafc",borderRadius:8,marginBottom:6,borderLeft:`3px solid ${t.priority==="high"?"#dc2626":t.priority==="normal"?"#d97706":"#1a4a5a"}`}}>
                <div style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>{t.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 18px 40px",display:"flex",flexDirection:"column",gap:16}}>
          {/* Forecast */}
          <div style={{background:"white",borderRadius:14,border:"1px solid #f1f5f9",padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.6px"}}>14-Day Forecast</div>
              <div style={{display:"flex",gap:12,fontSize:11,color:"#94a3b8"}}>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:"#2d8b9e",borderRadius:2,display:"inline-block"}}/>arrivals</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:"#ef4444",borderRadius:2,display:"inline-block"}}/>departures</span>
              </div>
            </div>
            <ForecastChart bookings={bookings}/>
          </div>

          {/* Overview table */}
          <div style={{background:"white",borderRadius:14,border:"1px solid #f1f5f9",padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10}}>14-Day Overview</div>
            <OverviewTable bookings={bookings}/>
          </div>

          {/* Summary pills */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[
              {label:"ARRIVALS",sub:"today",val:arrivals.length,color:"#1a4a5a",bg:"#f0f6f7"},
              {label:"IN HOUSE",sub:"total",val:inhouse.length,color:"#059669",bg:"#f0fdf4"},
              {label:"DEPARTURES",sub:"today",val:departures.length,color:"#dc2626",bg:"#fef2f2"},
            ].map(x=>(
              <div key={x.label} style={{background:x.bg,borderRadius:12,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:26,fontWeight:800,color:x.color}}>{x.val}</div>
                <div style={{fontSize:9,fontWeight:700,color:x.color,textTransform:"uppercase"}}>{x.label}</div>
                <div style={{fontSize:10,color:"#94a3b8"}}>{x.sub}</div>
              </div>
            ))}
          </div>

          {/* Guest list */}
          <div style={{background:"white",borderRadius:14,border:"1px solid #f1f5f9",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #f1f5f9"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.5px"}}>Today's Reservations</div>
              {canCreate&&<button onClick={onOpenModal} style={{background:"#1a4a5a",color:"white",border:"none",borderRadius:8,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
                <Ico n="plus" s={12} c="white"/>New
              </button>}
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Guest","Room","Check-in / Out","Occ.","State","Price","Status"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.4px",textAlign:"left",borderBottom:"1px solid #f1f5f9",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[...arrivals,...inhouse.filter(b=>!arrivals.includes(b)),...departures.filter(b=>!arrivals.includes(b)&&!inhouse.includes(b))].map(b=>{
                    const rm=ROOMS.find(r=>r.id===b.roomId), n=diffD(b.checkin,b.checkout);
                    const dirty=departures.some(x=>x.id===b.id);
                    return (
                      <tr key={b.id} onClick={()=>onEditBooking(b)} style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer",transition:"background 0.1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{b.guest}</div>
                          {b.source&&b.source!=="direct"&&<div style={{fontSize:10,color:"#94a3b8"}}>{b.source}</div>}
                        </td>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#0f172a"}}>{rm?.name}</div>
                          <div style={{fontSize:10,color:"#94a3b8"}}>{rm?.type}</div>
                        </td>
                        <td style={{padding:"10px 12px",fontSize:11,color:"#475569",whiteSpace:"nowrap"}}>
                          <div>{dispDate(b.checkin)}</div>
                          <div>{dispDate(b.checkout)} · {n}n</div>
                        </td>
                        <td style={{padding:"10px 12px",fontSize:12,color:"#475569"}}>👤{b.adults+b.children}</td>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{background:dirty?"#fef2f2":"#f0fdf4",color:dirty?"#dc2626":"#059669",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20}}>{dirty?"Dirty":"Clean"}</span>
                        </td>
                        <td style={{padding:"10px 12px",fontSize:13,fontWeight:700,color:"#0f172a"}}>€{n*(rm?.price||0)}</td>
                        <td style={{padding:"10px 12px"}}><Badge status={b.status} small/></td>
                      </tr>
                    );
                  })}
                  {arrivals.length===0&&inhouse.length===0&&departures.length===0&&(
                    <tr><td colSpan={7} style={{padding:"28px",textAlign:"center",color:"#94a3b8",fontSize:13}}>No reservations for today</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CALENDAR SCREEN
// ═══════════════════════════════════════════════════════════════
function CalendarScreen({ bookings, rooms:localRooms, currentUser, onBookingClick, onCellClick }) {
  const ROOMS = localRooms || DEFAULT_ROOMS;
  const [vs, setVs] = useState(addD(NOW,-2));
  const DAYS=18, CW=42, RH=48, LW=110;
  const dates = Array.from({length:DAYS},(_,i)=>addD(vs,i));
  const canCreate = ROLE_CAN(currentUser.role,"all")||ROLE_CAN(currentUser.role,"checkin");

  function seg(b,roomId) {
    if(b.roomId!==roomId||b.status==="cancelled") return null;
    const end0=addD(vs,DAYS), s=b.checkin<vs?vs:b.checkin, e=b.checkout>end0?end0:b.checkout;
    if(s>=e) return null;
    return {left:diffD(vs,s),width:diffD(s,e),b,cl:b.checkin<vs,cr:b.checkout>end0};
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:"white",borderBottom:"1px solid #f1f5f9",flexShrink:0,flexWrap:"wrap",gap:8}}>
        <button onClick={()=>setVs(addD(vs,-7))} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"7px 10px",cursor:"pointer",display:"flex",alignItems:"center"}}><Ico n="chevL" s={15}/></button>
        <button onClick={()=>setVs(addD(NOW,-2))} style={{background:"#1a4a5a",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",color:"white",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>Today</button>
        <button onClick={()=>setVs(addD(vs,7))} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"7px 10px",cursor:"pointer",display:"flex",alignItems:"center"}}><Ico n="chevR" s={15}/></button>
        <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{MONFULL[new Date(vs+"T12:00:00").getMonth()]} {new Date(vs+"T12:00:00").getFullYear()}</span>
        <div style={{marginLeft:"auto",fontSize:11,color:"#94a3b8"}}>{dispShort(vs)} – {dispShort(addD(vs,DAYS-1))}</div>
      </div>
      <div style={{flex:1,overflowX:"auto",overflowY:"auto"}}>
        <div style={{minWidth:LW+DAYS*CW, minHeight:"100%"}}>
          {/* Header row */}
          <div style={{display:"flex",position:"sticky",top:0,background:"white",zIndex:10,borderBottom:"2px solid #f1f5f9"}}>
            <div style={{width:LW,flexShrink:0,padding:"8px 14px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",borderRight:"1px solid #f1f5f9"}}>ROOM</div>
            {dates.map(d=>{
              const dt=new Date(d+"T12:00:00"), isT=d===NOW;
              return (
                <div key={d} style={{width:CW,flexShrink:0,textAlign:"center",padding:"5px 2px",background:isT?"#f0f6f7":"transparent",borderLeft:"1px solid #f1f5f9"}}>
                  <div style={{fontSize:8,color:isT?"#1a4a5a":"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>{DAY3[dt.getDay()]}</div>
                  <div style={{fontSize:12,fontWeight:800,color:isT?"#1a4a5a":"#374151"}}>{dt.getDate()}</div>
                </div>
              );
            })}
          </div>
          {/* Room rows */}
          {ROOMS.map(room=>{
            const segs=bookings.map(b=>seg(b,room.id)).filter(Boolean);
            return (
              <div key={room.id} style={{display:"flex",alignItems:"center",height:RH,borderBottom:"1px solid #f8fafc"}}>
                <div style={{width:LW,flexShrink:0,padding:"0 14px",borderRight:"1px solid #f1f5f9"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>Room {room.name}</div>
                  <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase"}}>{room.type} · €{room.price}</div>
                </div>
                <div style={{display:"flex",position:"relative",flex:1,height:RH}}>
                  {dates.map(d=>(
                    <div key={d} onClick={()=>canCreate&&onCellClick(d,room.id)}
                      style={{width:CW,height:RH,flexShrink:0,cursor:canCreate?"pointer":"default",background:d===NOW?"#f0f6f733":"transparent",borderLeft:"1px solid #f8fafc"}}/>
                  ))}
                  {segs.map(sg=>{
                    const col=STATUS_COLORS[sg.b.status]||"#1a4a5a";
                    const n=diffD(sg.b.checkin,sg.b.checkout);
                    return (
                      <div key={sg.b.id} onClick={e=>{e.stopPropagation();onBookingClick(sg.b);}}
                        style={{position:"absolute",left:sg.left*CW+2,width:sg.width*CW-4,top:6,height:RH-12,
                          background:col,borderRadius:`${sg.cl?2:8}px ${sg.cr?2:8}px ${sg.cr?2:8}px ${sg.cl?2:8}px`,
                          display:"flex",alignItems:"center",paddingLeft:8,overflow:"hidden",cursor:"pointer",
                          boxShadow:`0 2px 8px ${col}55`,zIndex:5}}>
                        <span style={{fontSize:11,fontWeight:700,color:"white",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {sg.b.guest.split(",")[0]}{n>1?` · ${n}n`:""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:14,padding:"10px 16px",background:"white",borderTop:"1px solid #f1f5f9",flexShrink:0,flexWrap:"wrap"}}>
        {Object.entries(STATUS_LABELS).map(([k,l])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b"}}>
            <div style={{width:10,height:10,borderRadius:3,background:STATUS_COLORS[k]}}/>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKINGS LIST
// ═══════════════════════════════════════════════════════════════
function BookingsScreen({ bookings, rooms:localRooms, currentUser, onBookingClick }) {
  const ROOMS = localRooms || DEFAULT_ROOMS;
  const [search,setSearch]=useState(""), [filter,setFilter]=useState("active");
  const filtered = bookings
    .filter(b=>filter==="active"?(!["cancelled","checkedout"].includes(b.status)&&b.checkout>=NOW):filter==="past"?(b.checkout<NOW&&b.status!=="cancelled"):filter==="cancelled"?(b.status==="cancelled"):true)
    .filter(b=>!search||b.guest.toLowerCase().includes(search.toLowerCase())||b.email?.includes(search)||b.phone?.includes(search))
    .sort((a,b)=>a.checkin>b.checkin?-1:1);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",background:"white",borderBottom:"1px solid #f1f5f9",flexShrink:0,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{position:"relative"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search guest, email or phone…"
            style={{width:"100%",padding:"9px 12px 9px 36px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",color:"#0f172a",boxSizing:"border-box"}}/>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}><Ico n="search" s={15}/></span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[["active","Active"],["past","Past"],["cancelled","Cancelled"],["all","All"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)}
              style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${filter===v?"#1a4a5a":"#e2e8f0"}`,background:filter===v?"#1a4a5a":"white",color:filter===v?"white":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
          <span style={{marginLeft:"auto",fontSize:12,color:"#94a3b8",alignSelf:"center"}}>{filtered.length} records</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}>
            <thead style={{position:"sticky",top:0,background:"#f8fafc",zIndex:1}}>
              <tr>
                {["Guest","Room","Dates","Status","Price","Source","Notes"].map(h=>(
                  <th key={h} style={{padding:"9px 14px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.4px",textAlign:"left",borderBottom:"2px solid #f1f5f9",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b=>{
                const r=ROOMS.find(x=>x.id===b.roomId), n=diffD(b.checkin,b.checkout);
                return (
                  <tr key={b.id} onClick={()=>onBookingClick(b)} style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer",background:"white",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                    <td style={{padding:"11px 14px"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{b.guest}</div>
                      {b.phone&&<div style={{fontSize:10,color:"#94a3b8"}}>{b.phone}</div>}
                    </td>
                    <td style={{padding:"11px 14px"}}>
                      <div style={{fontSize:13,fontWeight:800,color:"#0f172a"}}>{r?.name}</div>
                      <div style={{fontSize:10,color:"#94a3b8"}}>{r?.type}</div>
                    </td>
                    <td style={{padding:"11px 14px",fontSize:11,color:"#475569",whiteSpace:"nowrap"}}>
                      <div>{dispDate(b.checkin)}</div><div>{dispDate(b.checkout)} · {n}n</div>
                    </td>
                    <td style={{padding:"11px 14px"}}><Badge status={b.status} small/></td>
                    <td style={{padding:"11px 14px",fontSize:13,fontWeight:700,color:"#0f172a"}}>€{n*(r?.price||0)}</td>
                    <td style={{padding:"11px 14px",fontSize:11,color:"#94a3b8"}}>{b.source||"direct"}</td>
                    <td style={{padding:"11px 14px",fontSize:11,color:"#94a3b8",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.notes||"—"}</td>
                  </tr>
                );
              })}
              {filtered.length===0&&<tr><td colSpan={7} style={{padding:"40px",textAlign:"center",color:"#94a3b8",fontSize:13}}>No reservations found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOUSEKEEPING
// ═══════════════════════════════════════════════════════════════
function HousekeepingScreen({ bookings, rooms:localRooms, cleanStatus, setCleanStatus, currentUser }) {
  const ROOMS = localRooms || DEFAULT_ROOMS;
  const canClean = ROLE_CAN(currentUser.role,"all")||ROLE_CAN(currentUser.role,"clean");
  const rows = ROOMS.map(r=>{
    const occ=bookings.find(b=>b.roomId===r.id&&b.checkin<=NOW&&b.checkout>NOW&&!["cancelled","checkedout"].includes(b.status));
    const dep=bookings.find(b=>b.roomId===r.id&&b.checkout===NOW&&!["cancelled","checkedout"].includes(b.status));
    const arr=bookings.find(b=>b.roomId===r.id&&b.checkin===NOW&&!["cancelled","checkedout"].includes(b.status));
    let label="Vacant",color="#6b7280",priority=4,guest=null;
    if(dep&&arr){label="Turnover";color="#d97706";priority=0;guest=dep.guest;}
    else if(dep){label="Post-checkout";color="#dc2626";priority:1;guest=dep.guest;}
    else if(occ){label="Stay-over";color:"#1a4a5a";priority:3;guest:occ.guest;}
    return {...r,label,color,priority,guest,done:!!cleanStatus[r.id]};
  }).sort((a,b)=>a.priority-b.priority);

  const pending = rows.filter(r=>!r.done&&r.priority<3);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0,background:"white",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
        {[
          {l:"Pending",v:pending.length,c:"#dc2626",bg:"#fef2f2"},
          {l:"Clean",v:rows.filter(r=>r.done).length,c:"#059669",bg:"#f0fdf4"},
          {l:"Total",v:ROOMS.length,c:"#1a4a5a",bg:"#f0f6f7"},
        ].map(x=>(
          <div key={x.l} style={{padding:"14px",textAlign:"center",background:x.bg,borderRight:"1px solid #f1f5f9"}}>
            <div style={{fontSize:26,fontWeight:800,color:x.c}}>{x.v}</div>
            <div style={{fontSize:10,fontWeight:700,color:x.c,textTransform:"uppercase"}}>{x.l}</div>
          </div>
        ))}
      </div>
      {canClean&&pending.length>1&&(
        <div style={{padding:"10px 16px",background:"white",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
          <button onClick={()=>setCleanStatus(p=>{const u={...p};rows.filter(r=>!r.done&&r.priority<3).forEach(r=>{u[r.id]=true;});return u;})}
            style={{padding:"8px 18px",background:"#059669",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ✓ Mark all pending as clean
          </button>
        </div>
      )}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
        {rows.map(r=>(
          <div key={r.id} style={{background:"white",borderRadius:12,padding:"14px 16px",border:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",opacity:r.done?0.6:1,transition:"opacity 0.2s"}}>
            <div style={{width:52,height:52,background:r.done?"#f0fdf4":r.color+"18",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:r.done?"#059669":r.color,flexShrink:0}}>
              {r.name}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{r.done?"✓ Clean":r.label}</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>{r.type}{r.guest?` · ${r.guest}`:""}</div>
            </div>
            {canClean&&(
              <button onClick={()=>setCleanStatus(p=>({...p,[r.id]:!p[r.id]}))}
                style={{padding:"8px 16px",background:r.done?"#f1f5f9":"#059669",color:r.done?"#64748b":"white",border:`1px solid ${r.done?"#e2e8f0":"#059669"}`,borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                {r.done?"Mark dirty":"Mark clean"}
              </button>
            )}
            {!canClean&&(
              <span style={{fontSize:11,color:"#94a3b8",fontStyle:"italic"}}>View only</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════
function TasksScreen({ tasks, setTasks, users, currentUser }) {
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({text:"",priority:"normal",due:NOW,assignedTo:""});
  const canManage = ROLE_CAN(currentUser.role,"all");
  const PRI={high:{label:"High",color:"#dc2626"},normal:{label:"Normal",color:"#d97706"},low:{label:"Low",color:"#1a4a5a"}};
  const myTasks = currentUser.role==="cleaner"?tasks.filter(t=>t.assignedTo===currentUser.id||!t.assignedTo):tasks;
  const pending=myTasks.filter(t=>!t.done).sort((a,b)=>a.due>b.due?1:-1);
  const done=myTasks.filter(t=>t.done);

  function add(){
    if(!form.text.trim()) return;
    setTasks(p=>[...p,{id:uid(),...form,done:false,createdBy:currentUser.id}]);
    setForm({text:"",priority:"normal",due:NOW,assignedTo:""}); setAdding(false);
  }

  const Row = ({t}) => {
    const p=PRI[t.priority]||PRI.normal;
    const assignee=users.find(u=>u.id===t.assignedTo);
    const canToggle=canManage||t.assignedTo===currentUser.id||!t.assignedTo;
    return (
      <div style={{background:"white",borderRadius:12,padding:"12px 16px",marginBottom:8,border:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",opacity:t.done?0.55:1}}>
        <button onClick={()=>canToggle&&setTasks(p=>p.map(x=>x.id===t.id?{...x,done:!x.done}:x))}
          style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${t.done?"#059669":"#cbd5e1"}`,background:t.done?"#059669":"white",cursor:canToggle?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
          {t.done&&<Ico n="check" s={11} c="white"/>}
        </button>
        <span style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:"#0f172a",textDecoration:t.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:2,display:"flex",gap:10,flexWrap:"wrap"}}>
            <span>Due {dispDate(t.due)}</span>
            <span style={{color:p.color,fontWeight:600}}>{p.label}</span>
            {assignee&&<span>👤 {assignee.name}</span>}
          </div>
        </div>
        {canManage&&<button onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))} style={{background:"none",border:"none",cursor:"pointer",color:"#cbd5e1",padding:4,flexShrink:0}}><Ico n="trash" s={14}/></button>}
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",background:"white",borderBottom:"1px solid #f1f5f9",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{pending.length} tasks pending</div>
        {canManage&&<button onClick={()=>setAdding(a=>!a)} style={{background:"#1a4a5a",color:"white",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
          <Ico n="plus" s={13} c="white"/>Add task
        </button>}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {adding&&(
          <div style={{background:"white",borderRadius:12,padding:"16px",border:"1px solid #e2e8f0",marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
            <input placeholder="Task description…" value={form.text} onChange={e=>setForm(p=>({...p,text:e.target.value}))} autoFocus
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}
                style={{padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}>
                <option value="high">🔴 High</option><option value="normal">🟡 Normal</option><option value="low">🔵 Low</option>
              </select>
              <input type="date" value={form.due} onChange={e=>setForm(p=>({...p,due:e.target.value}))}
                style={{padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
            </div>
            <select value={form.assignedTo} onChange={e=>setForm(p=>({...p,assignedTo:e.target.value}))}
              style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",marginBottom:10}}>
              <option value="">Unassigned</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.name} ({ROLES[u.role]?.label})</option>)}
            </select>
            <div style={{display:"flex",gap:8}}>
              <button onClick={add} style={{flex:1,padding:"9px",background:"#1a4a5a",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Add task</button>
              <button onClick={()=>setAdding(false)} style={{flex:1,padding:"9px",background:"white",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,color:"#64748b",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </div>
        )}
        {pending.length===0&&!adding&&<div style={{textAlign:"center",padding:"40px 0",color:"#94a3b8",fontSize:13}}>All tasks done ✓</div>}
        {pending.map(t=><Row key={t.id} t={t}/>)}
        {done.length>0&&<>
          <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.6px",marginTop:16,marginBottom:8}}>Completed</div>
          {done.map(t=><Row key={t.id} t={t}/>)}
        </>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// USERS MANAGEMENT (Admin only)
// ═══════════════════════════════════════════════════════════════
function UsersScreen({ users, setUsers, currentUser }) {
  const [editUser, setEditUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const blank = {id:uid(),name:"",username:"",password:"",role:"frontdesk",active:true};
  const [form, setForm] = useState(blank);
  const [showPw, setShowPw] = useState(false);

  function save() {
    if(!form.name||!form.username||!form.password) return;
    if(editUser) setUsers(p=>p.map(u=>u.id===form.id?form:u));
    else setUsers(p=>[...p,form]);
    setShowForm(false); setEditUser(null); setForm(blank);
  }
  function startEdit(u) { setForm({...u}); setEditUser(u); setShowForm(true); }
  function del(id) { if(id===currentUser.id) return; setUsers(p=>p.filter(u=>u.id!==id)); }
  function toggle(id) { setUsers(p=>p.map(u=>u.id===id?{...u,active:!u.active}:u)); }

  const inp2 = { style:{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#0f172a"} };
  const lbl2 = t => <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>{t}</label>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",background:"white",borderBottom:"1px solid #f1f5f9",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{users.length} users</div>
        <button onClick={()=>{setForm(blank);setEditUser(null);setShowForm(true);}} style={{background:"#1a4a5a",color:"white",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
          <Ico n="plus" s={13} c="white"/>Add user
        </button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {users.map(u=>(
          <div key={u.id} style={{background:"white",borderRadius:12,padding:"14px 16px",border:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",opacity:u.active?1:0.5}}>
            <Av name={u.name} size={44} color={ROLES[u.role]?.color||"#1a4a5a"}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{u.name}</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>@{u.username} · <RoleBadge role={u.role}/></div>
              {!u.active&&<div style={{fontSize:11,color:"#dc2626",marginTop:2}}>Inactive</div>}
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0}}>
              <button onClick={()=>toggle(u.id)} style={{padding:"6px 12px",background:u.active?"#fef2f2":"#f0fdf4",color:u.active?"#dc2626":"#059669",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {u.active?"Deactivate":"Activate"}
              </button>
              <button onClick={()=>startEdit(u)} style={{padding:"6px 10px",background:"#f0f6f7",color:"#1a4a5a",border:"none",borderRadius:7,fontSize:12,cursor:"pointer"}}>
                <Ico n="edit" s={14} c="#1a4a5a"/>
              </button>
              {u.id!==currentUser.id&&<button onClick={()=>del(u.id)} style={{padding:"6px 10px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:7,fontSize:12,cursor:"pointer"}}>
                <Ico n="trash" s={14} c="#dc2626"/>
              </button>}
            </div>
          </div>
        ))}
      </div>

      {showForm&&(
        <div onClick={e=>e.target===e.currentTarget&&(setShowForm(false),setEditUser(null))} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:18,padding:"24px 22px 28px",width:"100%",maxWidth:440,boxShadow:"0 24px 64px rgba(0,0,0,0.25)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>{editUser?"Edit User":"New User"}</div>
              <button onClick={()=>{setShowForm(false);setEditUser(null);}} style={{background:"#f1f5f9",border:"none",borderRadius:9,padding:7,cursor:"pointer"}}><Ico n="x" s={17}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"span 2"}}>{lbl2("Full Name")}<input {...inp2} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Full name"/></div>
              <div>{lbl2("Username")}<input {...inp2} value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))} placeholder="login name"/></div>
              <div style={{position:"relative"}}>
                {lbl2("Password")}
                <input {...inp2} type={showPw?"text":"password"} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="password"/>
                <button onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:10,top:30,background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:3}}><Ico n={showPw?"eyeOff":"eye"} s={14}/></button>
              </div>
              <div style={{gridColumn:"span 2"}}>{lbl2("Role")}
                <select {...inp2} value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                  {Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v.label} – {k==="admin"?"full access":k==="frontdesk"?"bookings & check-in":"housekeeping only"}</option>)}
                </select>
              </div>
            </div>
            <div style={{background:"#f0fdf4",borderRadius:9,padding:"10px 14px",fontSize:12,color:"#166534",marginTop:14,border:"1px solid #bbf7d0"}}>
              <strong>Access levels:</strong><br/>
              🔑 Admin — full access including user management<br/>
              🖥 Front Desk — bookings, check-in/out, notes<br/>
              🧹 Cleaner — housekeeping status & task completion only
            </div>
            <button onClick={save} style={{width:"100%",marginTop:16,padding:"12px",background:"linear-gradient(135deg,#1a3a4a,#2d6b7a)",color:"white",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
              {editUser?"Save Changes":"Create User"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// ROOMS MANAGEMENT SCREEN (Admin only)
// ═══════════════════════════════════════════════════════════════
function RoomsScreen({ rooms, setRooms, bookings }) {
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const blank = { id:uid(), name:"", type:"Double", price:70, floor:1, beds:2, notes:"" };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const sortedRooms = [...rooms].sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true}));

  function openAdd() { setForm({...blank, id:uid()}); setEditRoom(null); setErr(""); setShowForm(true); }
  function openEdit(r) { setForm({...r}); setEditRoom(r); setErr(""); setShowForm(true); }

  function save() {
    if (!form.name.trim()) return setErr("Room name/number is required");
    if (!form.price || form.price <= 0) return setErr("Price must be greater than 0");
    const duplicate = rooms.find(r => r.id !== form.id && r.name.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (duplicate) return setErr(`Room "${form.name}" already exists`);
    const saved = { ...form, name: form.name.trim(), price: parseFloat(form.price)||70, floor: parseInt(form.floor)||1, beds: parseInt(form.beds)||1 };
    if (editRoom) setRooms(rooms.map(r => r.id === saved.id ? saved : r));
    else setRooms([...rooms, saved]);
    setShowForm(false); setEditRoom(null); setForm(blank);
  }

  function deleteRoom(id) {
    const hasBookings = bookings.some(b => b.roomId === id && !["cancelled","checkedout"].includes(b.status));
    if (hasBookings) { setConfirmDel(null); return alert("Cannot delete: this room has active bookings. Cancel them first."); }
    setRooms(rooms.filter(r => r.id !== id));
    setConfirmDel(null);
  }

  const hasActiveBooking = (id) => bookings.some(b => b.roomId === id && !["cancelled","checkedout"].includes(b.status));

  const inp = { style:{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",color:"#0f172a",background:"white",boxSizing:"border-box"} };
  const lbl = t => <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>{t}</label>;

  // Group by floor
  const floors = [...new Set(sortedRooms.map(r => r.floor))].sort((a,b)=>a-b);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"12px 16px",background:"white",borderBottom:"1px solid #f1f5f9",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"#0f172a"}}>{rooms.length} rooms configured</div>
          <div style={{fontSize:12,color:"#94a3b8"}}>Add, edit or remove rooms from your property</div>
        </div>
        <button onClick={openAdd} style={{background:"linear-gradient(135deg,#1a3a4a,#2d6b7a)",color:"white",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
          <Ico n="plus" s={14} c="white"/>Add room
        </button>
      </div>

      {/* Room list grouped by floor */}
      <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
        {floors.map(floor => (
          <div key={floor} style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:10,paddingBottom:6,borderBottom:"2px solid #f1f5f9"}}>
              Floor {floor}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
              {sortedRooms.filter(r=>r.floor===floor).map(r => {
                const active = hasActiveBooking(r.id);
                const booking = bookings.find(b=>b.roomId===r.id&&b.checkin<=NOW&&b.checkout>NOW&&!["cancelled","checkedout"].includes(b.status));
                return (
                  <div key={r.id} style={{background:"white",borderRadius:12,border:"1px solid #f1f5f9",padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",borderLeft:`4px solid ${active?"#059669":"#e2e8f0"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>Room {r.name}</div>
                        <div style={{fontSize:12,color:"#64748b"}}>{r.type} · {r.beds} bed{r.beds!==1?"s":""} · Floor {r.floor}</div>
                      </div>
                      <div style={{fontSize:16,fontWeight:800,color:"#1a4a5a"}}>€{r.price}<span style={{fontSize:10,color:"#94a3b8",fontWeight:400}}>/night</span></div>
                    </div>
                    {r.notes && <div style={{fontSize:11,color:"#94a3b8",fontStyle:"italic",marginBottom:8}}>📝 {r.notes}</div>}
                    {booking && (
                      <div style={{background:"#f0fdf4",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#059669",fontWeight:600,marginBottom:8}}>
                        🔑 {booking.guest} · until {dispDate(booking.checkout)}
                      </div>
                    )}
                    {!booking && (
                      <div style={{background:"#f8fafc",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#94a3b8",marginBottom:8}}>
                        Available
                      </div>
                    )}
                    <div style={{display:"flex",gap:8,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>
                      <button onClick={()=>openEdit(r)} style={{flex:1,padding:"7px",background:"#eff6ff",color:"#1a4a5a",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                        <Ico n="edit" s={13} c="#1a4a5a"/>Edit
                      </button>
                      <button onClick={()=>setConfirmDel(r)} style={{flex:1,padding:"7px",background:active?"#f1f5f9":"#fef2f2",color:active?"#94a3b8":"#dc2626",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:active?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}
                        title={active?"Has active bookings":""}>
                        <Ico n="trash" s={13} c={active?"#94a3b8":"#dc2626"}/>Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
            <div style={{fontSize:40,marginBottom:12}}>🏨</div>
            <div style={{fontSize:16,fontWeight:700,color:"#0f172a",marginBottom:6}}>No rooms yet</div>
            <div style={{fontSize:13,marginBottom:20}}>Add your first room to get started.</div>
            <button onClick={openAdd} style={{padding:"11px 24px",background:"linear-gradient(135deg,#1a3a4a,#2d6b7a)",color:"white",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Add first room</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div onClick={e=>e.target===e.currentTarget&&(setShowForm(false),setEditRoom(null))} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:18,padding:"24px 22px 28px",width:"100%",maxWidth:460,boxShadow:"0 24px 64px rgba(0,0,0,0.25)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>{editRoom?"Edit Room":"Add New Room"}</div>
              <button onClick={()=>{setShowForm(false);setEditRoom(null);}} style={{background:"#f1f5f9",border:"none",borderRadius:9,padding:7,cursor:"pointer"}}><Ico n="x" s={17}/></button>
            </div>

            {err && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:9,padding:"10px 13px",fontSize:12,color:"#dc2626",marginBottom:14,display:"flex",gap:7,alignItems:"center"}}><Ico n="alert" s={14} c="#dc2626"/>{err}</div>}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                {lbl("Room Number / Name *")}
                <input {...inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. 101 or Sunset Villa" autoFocus/>
              </div>
              <div>
                {lbl("Room Type")}
                <select {...inp} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                  {ROOM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                {lbl("Price per Night (€) *")}
                <input type="number" {...inp} value={form.price} min={1} onChange={e=>setForm(p=>({...p,price:e.target.value}))} placeholder="70"/>
              </div>
              <div>
                {lbl("Floor")}
                <input type="number" {...inp} value={form.floor} min={0} max={50} onChange={e=>setForm(p=>({...p,floor:e.target.value}))} placeholder="1"/>
              </div>
              <div>
                {lbl("Number of Beds")}
                <input type="number" {...inp} value={form.beds} min={1} max={10} onChange={e=>setForm(p=>({...p,beds:e.target.value}))} placeholder="2"/>
              </div>
              <div style={{gridColumn:"span 2"}}>
                {lbl("Notes (optional)")}
                <input {...inp} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="e.g. Sea view, Pool access, Accessible…"/>
              </div>
            </div>

            {/* Preview */}
            {form.name && (
              <div style={{background:"#f0f6f7",borderRadius:9,padding:"10px 14px",fontSize:13,color:"#1a4a5a",marginTop:14,border:"1px solid #d4eaee",display:"flex",justifyContent:"space-between"}}>
                <span>Room {form.name} · {form.type} · {form.beds} bed{parseInt(form.beds)!==1?"s":""} · Floor {form.floor}</span>
                <strong>€{form.price}/night</strong>
              </div>
            )}

            <button onClick={save} style={{width:"100%",marginTop:16,padding:"13px",background:"linear-gradient(135deg,#1a3a4a,#2d6b7a)",color:"white",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
              {editRoom?"Save Changes":"Add Room"}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div onClick={e=>e.target===e.currentTarget&&setConfirmDel(null)} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:18,padding:"28px 24px",width:"100%",maxWidth:380,boxShadow:"0 24px 64px rgba(0,0,0,0.25)",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>🗑️</div>
            <div style={{fontSize:17,fontWeight:800,color:"#0f172a",marginBottom:8}}>Delete Room {confirmDel.name}?</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>This cannot be undone. All past booking records will be kept but this room won't be available for new reservations.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"12px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>deleteRoom(confirmDel.id)} style={{flex:1,padding:"12px",background:"#dc2626",color:"white",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [rooms, setRooms]             = useState(DEFAULT_ROOMS);
  const [bookings, setBookings]       = useState(null);
  const [cleanStatus, setCleanStatus] = useState({});
  const [tasks, setTasks]             = useState(null);
  const [users, setUsers]             = useState(DEFAULT_USERS);
  const [screen, setScreen]           = useState("dashboard");
  const [modal, setModal]             = useState(null);
  const [toast, setToast]             = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [loaded, setLoaded]           = useState(false);

  // Load DB
  useEffect(() => {
    (async () => {
      try {
        const data = await DB.load();
        if (data) {
          if (data.bookings?.length)   setBookings(data.bookings);
          if (data.cleanStatus)        setCleanStatus(data.cleanStatus);
          if (data.tasks?.length)      setTasks(data.tasks);
          if (data.users?.length)      setUsers(data.users);
          if (data.rooms?.length)      { setRooms(data.rooms); ROOMS = data.rooms; }
        }
        if (!data?.bookings?.length) setBookings(SAMPLE_BOOKINGS);
        if (!data?.tasks?.length)    setTasks(SAMPLE_TASKS);
      } catch {
        setBookings(SAMPLE_BOOKINGS);
        setTasks(SAMPLE_TASKS);
      }
      setLoaded(true);
    })();
  }, []);

  // Auto-save on any change
  useEffect(() => {
    if (bookings && tasks && loaded) {
      DB.save({ bookings, cleanStatus, tasks, users, rooms });
      ROOMS = rooms;
    }
  }, [bookings, cleanStatus, tasks, users, rooms, loaded]);

  const showToast = (msg, type="success") => setToast({ msg, type });

  function saveBooking(b) {
    setBookings(p => { const ex=p.find(x=>x.id===b.id); return ex?p.map(x=>x.id===b.id?b:x):[b,...p]; });
    setModal(null);
    showToast(b.status==="confirmed"?"Reservation saved ✓":"Changes saved ✓");
  }
  function deleteBooking(id) {
    setBookings(p => p.map(b => b.id===id ? {...b,status:"cancelled"} : b));
    setModal(null);
    showToast("Reservation cancelled","warn");
  }
  function logout() {
    setCurrentUser(null);
    setScreen("dashboard");
    setMobileSidebar(false);
  }

  if (!loaded) return (
    <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",background:"#f0f9ff",fontFamily:"sans-serif",color:"#64748b",fontSize:14}}>
      <div style={{textAlign:"center"}}>
        <img src="https://covesuites.gr/wp-content/uploads/2021/08/COVESUITES.png" alt="Cove Suites" style={{height:52,objectFit:"contain",display:"block",margin:"0 auto 14px"}}/>
        <div style={{fontSize:13,color:"#94a3b8"}}>Loading Property Management System…</div>
      </div>
    </div>
  );

  if (!currentUser) return <LoginScreen users={users} onLogin={u=>{setCurrentUser(u);showToast(`Welcome, ${u.name}!`);}} />;

  // Nav items filtered by role
  const isAdmin = currentUser.role==="admin";
  const isCleaner = currentUser.role==="cleaner";
  const NAV = [
    { id:"dashboard",   icon:"dashboard", label:"Dashboard",    show:true },
    { id:"calendar",    icon:"calendar",  label:"Calendar",     show:!isCleaner },
    { id:"bookings",    icon:"bookings",  label:"Reservations", show:!isCleaner },
    { id:"housekeeping",icon:"broom",     label:"Housekeeping", show:true },
    { id:"tasks",       icon:"tasks",     label:"Tasks",        show:true },
    null,
    { id:"rooms",       icon:"bed",       label:"Rooms",        show:isAdmin },
    { id:"users",       icon:"users",     label:"Users",        show:isAdmin },
    { id:"settings",    icon:"settings",  label:"Settings",     show:isAdmin },
  ].filter(n=>n===null||n.show);

  const act = b => !["cancelled","checkedout"].includes(b.status);
  const alertCount = {
    dashboard: bookings?.filter(b=>b.checkin===NOW&&act(b)).length||0,
    housekeeping: rooms.filter(r=>!cleanStatus[r.id]&&bookings?.some(b=>b.roomId===r.id&&b.checkout===NOW&&act(b))).length,
    tasks: tasks?.filter(t=>!t.done&&t.due<=NOW).length||0,
  };
  const canCreate = ROLE_CAN(currentUser.role,"all")||ROLE_CAN(currentUser.role,"checkin");

  const SidebarContent = ({ mobile=false }) => (
    <>
      <div style={{padding:"16px 14px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10,whiteSpace:"nowrap",flexShrink:0}}>
        {(sidebarOpen||mobile)
          ? <img src="https://covesuites.gr/wp-content/uploads/2021/08/COVESUITES.png" alt="Cove Suites" style={{height:28,objectFit:"contain",flexShrink:0,maxWidth:140}}/>
          : <div style={{width:30,height:30,background:"linear-gradient(135deg,#1a3a4a,#2d6b7a)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"white",fontSize:13,fontWeight:900}}>C</span>
            </div>
        }
        {(sidebarOpen||mobile)&&<div style={{fontSize:10,color:"#94a3b8",fontWeight:600,marginLeft:2}}>PMS · {ROLES[currentUser.role]?.label}</div>}
      </div>

      <nav style={{flex:1,padding:"8px 0",overflowY:"auto"}}>
        {NAV.map((item,i)=>{
          if(!item) return <div key={i} style={{height:1,background:"#f1f5f9",margin:"6px 10px"}}/>;
          const isActive=screen===item.id;
          const alert=alertCount[item.id]||0;
          return (
            <button key={item.id} onClick={()=>{setScreen(item.id);if(mobile)setMobileSidebar(false);}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:isActive?"#f0f6f7":"none",border:"none",cursor:"pointer",color:isActive?"#1a4a5a":"#64748b",fontWeight:isActive?700:500,fontSize:13,textAlign:"left",position:"relative",borderRight:isActive?"3px solid #1a4a5a":"3px solid transparent",transition:"all 0.1s",whiteSpace:"nowrap",fontFamily:"inherit"}}>
              <span style={{flexShrink:0}}><Ico n={item.icon} s={17} c={isActive?"#1a4a5a":"#94a3b8"}/></span>
              {(sidebarOpen||mobile)&&item.label}
              {alert>0&&<span style={{position:"absolute",right:sidebarOpen||mobile?14:6,top:"50%",transform:"translateY(-50%)",background:"#dc2626",color:"white",fontSize:9,fontWeight:800,minWidth:16,height:16,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{alert}</span>}
            </button>
          );
        })}
      </nav>

      {/* User info */}
      <div style={{borderTop:"1px solid #f1f5f9",padding:"12px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Av name={currentUser.name} size={32} color={ROLES[currentUser.role]?.color||"#1a4a5a"}/>
          {(sidebarOpen||mobile)&&<div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentUser.name}</div>
            <RoleBadge role={currentUser.role}/>
          </div>}
          <button onClick={logout} style={{background:"#fef2f2",border:"none",borderRadius:7,padding:6,cursor:"pointer",flexShrink:0}}><Ico n="logout" s={15} c="#dc2626"/></button>
        </div>
      </div>
    </>
  );

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',system-ui,sans-serif",background:"#f8fafc",color:"#0f172a",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        button,input,select,textarea{font-family:inherit;}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:0.5;cursor:pointer;}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:768px){.desktop-sidebar{display:none!important}.mobile-header{display:flex!important}.main-content{flex-direction:column!important}}
        @media(min-width:769px){.mobile-header{display:none!important}.mobile-nav-overlay{display:none!important}}
      `}</style>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{width:sidebarOpen?220:52,flexShrink:0,background:"white",borderRight:"1px solid #f1f5f9",display:"flex",flexDirection:"column",transition:"width 0.2s",overflow:"hidden"}}>
        <SidebarContent/>
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{padding:"10px 14px",background:"none",border:"none",borderTop:"1px solid #f1f5f9",cursor:"pointer",color:"#94a3b8",display:"flex",alignItems:"center",gap:8,fontSize:11,fontFamily:"inherit",flexShrink:0}}>
          <Ico n={sidebarOpen?"chevL":"chevR"} s={15}/>
          {sidebarOpen&&"Collapse"}
        </button>
      </div>

      {/* Mobile overlay sidebar */}
      {mobileSidebar&&(
        <div className="mobile-nav-overlay" onClick={()=>setMobileSidebar(false)}
          style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:900,display:"flex"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:260,background:"white",height:"100%",display:"flex",flexDirection:"column",boxShadow:"4px 0 20px rgba(0,0,0,0.15)"}}>
            <SidebarContent mobile/>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        {/* Top bar */}
        <div style={{background:"white",borderBottom:"1px solid #f1f5f9",padding:"0 16px",height:52,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          {/* Mobile menu btn */}
          <button className="mobile-header" onClick={()=>setMobileSidebar(true)}
            style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"7px",cursor:"pointer",display:"none",alignItems:"center"}}>
            <Ico n="menu" s={18}/>
          </button>

          <div style={{flex:1,minWidth:0}}>
            <img src="https://covesuites.gr/wp-content/uploads/2021/08/COVESUITES.png" alt="Cove Suites" style={{height:26,objectFit:"contain",marginRight:8}}/><span style={{fontSize:14,fontWeight:800,color:"#0f172a"}}>{DAY3[nowDate.getDay()]+", "}</span>
            <span style={{fontSize:14,fontWeight:400,color:"#475569"}}>{nowDate.getDate()} {MONFULL[nowDate.getMonth()]} {nowDate.getFullYear()}</span>
          </div>

          <div style={{position:"relative",display:"none"}} className="desktop-sidebar">
            <input placeholder="Search…" style={{padding:"7px 12px 7px 32px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:12,fontFamily:"inherit",outline:"none",width:180,color:"#0f172a"}}/>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}><Ico n="search" s={13}/></span>
          </div>

          {canCreate&&<button onClick={()=>setModal({type:"new"})}
            style={{background:"linear-gradient(135deg,#1a3a4a,#2d6b7a)",color:"white",border:"none",borderRadius:9,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
            <Ico n="plus" s={13} c="white"/><span className="desktop-sidebar" style={{display:"inline"}}>New reservation</span>
          </button>}

          <Av name={currentUser.name} size={32} color={ROLES[currentUser.role]?.color||"#1a4a5a"}/>
        </div>

        {/* Screen */}
        <div style={{flex:1,overflow:"hidden"}}>
          {screen==="dashboard"    && <Dashboard bookings={bookings||[]} tasks={tasks||[]} rooms={rooms} currentUser={currentUser} onOpenModal={()=>setModal({type:"new"})} onEditBooking={b=>setModal({type:"edit",booking:b})}/>}
          {screen==="calendar"     && <CalendarScreen bookings={bookings||[]} rooms={rooms} currentUser={currentUser} onBookingClick={b=>setModal({type:"edit",booking:b})} onCellClick={(d,r)=>setModal({type:"new",defaultCheckin:d,defaultRoom:r})}/>}
          {screen==="bookings"     && <BookingsScreen bookings={bookings||[]} rooms={rooms} currentUser={currentUser} onBookingClick={b=>setModal({type:"edit",booking:b})}/>}
          {screen==="housekeeping" && <HousekeepingScreen bookings={bookings||[]} rooms={rooms} cleanStatus={cleanStatus} setCleanStatus={setCleanStatus} currentUser={currentUser}/>}
          {screen==="tasks"        && <TasksScreen tasks={tasks||[]} setTasks={setTasks} users={users} currentUser={currentUser}/>}
          {screen==="rooms"        && isAdmin && <RoomsScreen rooms={rooms} setRooms={r=>{setRooms(r);ROOMS=r;}} bookings={bookings||[]}/>}
          {screen==="users"        && isAdmin && <UsersScreen users={users} setUsers={setUsers} currentUser={currentUser}/>}
          {screen==="settings"     && <div style={{padding:30,color:"#94a3b8",fontSize:14}}>Settings — coming soon</div>}
        </div>
      </div>

      {/* Booking modal */}
      {modal&&<BookingModal
        booking={modal.type==="edit"?modal.booking:null}
        bookings={bookings||[]}
        rooms={rooms}
        defaultCheckin={modal.defaultCheckin}
        defaultRoom={modal.defaultRoom}
        currentUser={currentUser}
        onSave={saveBooking}
        onDelete={deleteBooking}
        onClose={()=>setModal(null)}
      />}

      {/* Toast */}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
