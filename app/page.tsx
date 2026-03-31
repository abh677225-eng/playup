"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type User = { email: string; id: string } | null;
type Listing = {
  id: string;
  provider_name: string;
  activity_type: string;
  lesson_title: string;
  description: string;
  photo_url: string;
  suburbs: string;
  price: number;
  session_duration: string;
  lesson_type: string;
  status: string;
};
type Conversation = {
  id: string;
  listing_id: string;
  seeker_id: string;
  provider_id: string;
  last_message: string;
  last_message_at: string;
  listing?: { lesson_title: string; activity_type: string; provider_name: string };
  unread_count?: number;
};
type Event = {
  id: string;
  host_id: string;
  host_name: string;
  title: string;
  sport: string;
  description: string;
  location: string;
  suburb: string;
  postcode: string;
  date: string;
  time: string;
  duration: string;
  cost: string;
  spots_total: number;
  spots_filled: number;
  skill_level: string;
  age_group: string;
  status: string;
};

const ACTIVITY_EMOJIS: Record<string,string> = {
  "Tennis":"🎾","Piano":"🎹","Swimming":"🏊","Yoga":"🧘","Guitar":"🎸",
  "Martial Arts":"🥋","Dancing":"💃","Singing":"🎤","Basketball":"🏀",
  "Football (Soccer)":"⚽","Cricket":"🏏","Cooking":"👨‍🍳","Coding & Programming":"💻",
  "Art & Drawing":"🎨","Violin":"🎻","Drums":"🥁","Boxing":"🥊",
  "Golf":"⛳","Cycling":"🚴","Running":"🏃","Default":"📚"
};

const SPORT_EMOJIS: Record<string,string> = {
  "Tennis":"🎾","Swimming":"🏊","Basketball":"🏀","Football (Soccer)":"⚽",
  "Cricket":"🏏","Boxing":"🥊","Golf":"⛳","Cycling":"🚴","Running":"🏃",
  "Volleyball":"🏐","Rugby":"🏉","Baseball":"⚾","Hockey":"🏑","Badminton":"🏸",
  "Table Tennis":"🏓","Skiing":"⛷️","Surfing":"🏄","Sailing":"⛵","Gymnastics":"🤸",
  "Martial Arts":"🥋","Dancing":"💃","Crossfit":"💪","Netball":"🏀",
  "Football (AFL)":"🏈","Skateboarding":"🛹","Kayaking":"🚣","Rock Climbing":"🧗",
  "Athletics":"🏃","Touch Football":"🏉","Squash":"🎾","Other":"🏅"
};

export default function PlayUp() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lessons"|"events">("lessons");
  const [activeFilter, setActiveFilter] = useState("all");
  const [modal, setModal] = useState<string|null>(null);
  const [toast, setToast] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchPostcode, setSearchPostcode] = useState("");
  const [user, setUser] = useState<User>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [loginView, setLoginView] = useState<"login"|"forgot">("login");
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [dbEvents, setDbEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showMsgPanel, setShowMsgPanel] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const msgPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ email: session.user.email!, id: session.user.id });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ email: session.user.email!, id: session.user.id });
      else setUser(null);
    });
    loadListings();
    loadEvents();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadConversations();
    else { setConversations([]); setUnreadCount(0); }
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (msgPanelRef.current && !msgPanelRef.current.contains(e.target as Node)) setShowMsgPanel(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadListings = async () => {
    setLoadingListings(true);
    const { data } = await supabase.from("listings").select("*").eq("status","approved").order("created_at", { ascending: false });
    setDbListings(data || []);
    setLoadingListings(false);
  };

  const loadEvents = async () => {
    setLoadingEvents(true);
    const { data } = await supabase.from("events").select("*").eq("status","approved").order("created_at", { ascending: false });
    setDbEvents(data || []);
    setLoadingEvents(false);
  };

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase.from("conversations").select("*").or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`).order("last_message_at", { ascending: false }).limit(10);
    if (!data) return;
    const enriched = await Promise.all(data.map(async (conv) => {
      const { data: listing } = await supabase.from("listings").select("lesson_title,activity_type,provider_name").eq("id", conv.listing_id).single();
      const { count } = await supabase.from("messages").select("id", { count: "exact" }).eq("listing_id", conv.listing_id).eq("receiver_id", user.id).eq("read", false);
      return { ...conv, listing: listing || undefined, unread_count: count || 0 };
    }));
    setConversations(enriched);
    setUnreadCount(enriched.reduce((sum, c) => sum + (c.unread_count || 0), 0));
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };
  const openLogin = () => { setAuthError(""); setAuthSuccess(""); setLoginView("login"); setModal("login"); };
  const openSignup = () => { setAuthError(""); setAuthSuccess(""); setModal("signup"); };

  const handleLogin = async () => {
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) setAuthError("Incorrect email or password. Try again or use Forgot Password.");
      else if (error.message.includes("Email not confirmed")) setAuthError("Please confirm your email first — check your inbox.");
      else setAuthError(error.message);
    } else { setModal(null); setEmail(""); setPassword(""); showToast("Welcome back! 🎉"); }
  };

  const handleSignup = async () => {
    setAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName } } });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); }
    else { setModal(null); setEmail(""); setPassword(""); setFirstName(""); setLastName(""); showToast("Account created! Check your email 📧"); }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { setAuthError("Please enter your email address."); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/reset-password` });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); }
    else { setAuthSuccess(`Reset link sent to ${forgotEmail}!`); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); showToast("See you soon!"); };

  const getEmoji = (activityType: string) => ACTIVITY_EMOJIS[activityType] || ACTIVITY_EMOJIS["Default"];
  const getSuburbs = (json: string) => { try { return JSON.parse(json); } catch { return []; } };

  const sampleLessons = [
    { id:"sample-1", type:"tennis", emoji:"🎾", sport:"Tennis", title:"Beginner to Intermediate Tennis Coaching", provider:"Coach Sarah Mitchell", suburb:"Richmond", postcode:"3121", price:75, rating:4.9, reviews:82, featured:true, isDb:false },
    { id:"sample-2", type:"piano", emoji:"🎹", sport:"Piano", title:"Classical & Contemporary Piano for All Ages", provider:"James Okonkwo", suburb:"Carlton", postcode:"3053", price:65, rating:4.8, reviews:47, badge:"New", isDb:false },
    { id:"sample-3", type:"swimming", emoji:"🏊", sport:"Swimming", title:"Adult Learn to Swim & Stroke Correction", provider:"Melbourne Aquatics", suburb:"St Kilda", postcode:"3182", price:55, rating:4.6, reviews:103, featured:true, isDb:false },
    { id:"sample-4", type:"yoga", emoji:"🧘", sport:"Yoga", title:"Morning Vinyasa Flow – All Levels Welcome", provider:"Priya Sharma", suburb:"South Yarra", postcode:"3141", price:40, rating:5.0, reviews:61, isDb:false },
    { id:"sample-5", type:"guitar", emoji:"🎸", sport:"Guitar", title:"Electric & Acoustic Guitar – Rock, Pop & Blues", provider:"Dan Caruso", suburb:"Fitzroy", postcode:"3065", price:70, rating:4.7, reviews:38, isDb:false },
    { id:"sample-6", type:"martial arts", emoji:"🥋", sport:"Martial Arts", title:"Brazilian Jiu-Jitsu – Kids & Adults Classes", provider:"Hawthorn BJJ Academy", suburb:"Hawthorn", postcode:"3122", price:60, rating:4.9, reviews:125, badge:"Popular", isDb:false },
  ];

  const dbLessonsFormatted = dbListings.map(l => {
    const suburbs = getSuburbs(l.suburbs);
    const firstSuburb = suburbs[0] || {};
    return { id:l.id, type:l.activity_type.toLowerCase().replace(/\s+/g,"-"), emoji:getEmoji(l.activity_type), sport:l.activity_type, title:l.lesson_title, provider:l.provider_name, suburb:firstSuburb.name||"", postcode:firstSuburb.postcode||"", price:l.price, rating:0, reviews:0, isDb:true, badge:"New" as string|undefined };
  });

  const allLessons = dbLessonsFormatted.length > 0 ? [...dbLessonsFormatted, ...sampleLessons] : sampleLessons;

  const filtered = allLessons.filter(l => {
    const matchesType = activeFilter==="all" || l.type.includes(activeFilter) || l.sport.toLowerCase().includes(activeFilter);
    const matchesText = searchText==="" || l.title.toLowerCase().includes(searchText.toLowerCase()) || l.sport.toLowerCase().includes(searchText.toLowerCase()) || l.provider.toLowerCase().includes(searchText.toLowerCase());
    const matchesPostcode = searchPostcode==="" || l.postcode.includes(searchPostcode) || l.suburb.toLowerCase().includes(searchPostcode.toLowerCase());
    return matchesType && matchesText && matchesPostcode;
  });

  const filteredEvents = dbEvents.filter(e =>
    searchPostcode==="" || e.postcode.includes(searchPostcode) || e.suburb.toLowerCase().includes(searchPostcode.toLowerCase()) || e.location.toLowerCase().includes(searchPostcode.toLowerCase())
  );

  const inputStyle = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif" };
  const labelStyle = { display:"block" as const, fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase" as const, color:"#64748b", marginBottom:"0.4rem" };
  const formatTime = (d: string) => { const date = new Date(d); const diff = Date.now()-date.getTime(); if(diff<3600000) return `${Math.floor(diff/60000)}m ago`; if(diff<86400000) return date.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"}); return date.toLocaleDateString("en-AU",{day:"numeric",month:"short"}); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        input,select,textarea{font-family:'DM Sans',sans-serif;}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .lesson-card:hover{transform:translateY(-3px)!important;box-shadow:0 8px 32px rgba(30,58,95,0.12)!important;border-color:#bfdbfe!important;}
        .event-card:hover{transform:translateY(-2px)!important;box-shadow:0 8px 24px rgba(30,58,95,0.1)!important;}
        select option{background:#ffffff;color:#1e3a5f;}
        .conv-row{padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:flex-start;gap:8px;transition:background 0.15s;}
        .conv-row:hover{background:#f8faff;}
      `}</style>

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:200,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #e0f0ff",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2}}><span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
        <div style={{display:"flex",gap:"2rem"}}>
          {["Lessons","Events"].map(t=>(
            <button key={t} className="btn" onClick={()=>setActiveTab(t.toLowerCase() as "lessons"|"events")} style={{background:"none",border:"none",color:activeTab===t.toLowerCase()?"#1e3a5f":"#64748b",fontWeight:600,fontSize:"0.9rem",borderBottom:activeTab===t.toLowerCase()?"2px solid #84CC16":"2px solid transparent",paddingBottom:"2px"}}>{t}</button>
          ))}
          <button className="btn" onClick={()=>setModal("provider")} style={{background:"none",border:"none",color:"#64748b",fontWeight:600,fontSize:"0.9rem"}}>List Your Lessons</button>
        </div>
        <div style={{display:"flex",gap:"0.8rem",alignItems:"center"}}>
          {user ? (
            <>
              <div ref={msgPanelRef} style={{position:"relative"}}>
                <button className="btn" onClick={()=>setShowMsgPanel(!showMsgPanel)}
                  style={{position:"relative",padding:"0.5rem 1rem",border:"1px solid #bfdbfe",borderRadius:999,background:showMsgPanel?"#EAF3DE":"white",color:"#1e3a5f",fontSize:"0.85rem",fontWeight:600,display:"flex",alignItems:"center",gap:"0.4rem"}}>
                  💬 Messages
                  {unreadCount > 0 && <span style={{background:"#EF4444",color:"white",fontSize:"0.65rem",fontWeight:700,padding:"1px 5px",borderRadius:999,minWidth:16,textAlign:"center"}}>{unreadCount}</span>}
                </button>
                {showMsgPanel && (
                  <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,width:320,background:"white",borderRadius:16,border:"1px solid #dbeafe",boxShadow:"0 8px 32px rgba(30,58,95,0.15)",zIndex:300,animation:"slideInRight 0.2s ease",overflow:"hidden"}}>
                    <div style={{padding:"1rem 1.2rem",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f"}}>Messages</div>
                      <button className="btn" onClick={()=>router.push("/messages")} style={{fontSize:"0.75rem",color:"#84CC16",background:"none",border:"none",fontWeight:700}}>See all →</button>
                    </div>
                    {conversations.length === 0 ? (
                      <div style={{padding:"1.5rem",textAlign:"center",color:"#64748b"}}>
                        <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>💬</div>
                        <div style={{fontSize:"0.82rem"}}>No conversations yet</div>
                      </div>
                    ) : conversations.slice(0,5).map(conv => (
                      <div key={conv.id} className="conv-row" onClick={()=>{setShowMsgPanel(false);router.push(`/messages?conv=${conv.id}`);}}>
                        <div style={{width:36,height:36,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",fontWeight:700,color:"#84CC16",flexShrink:0}}>
                          {(conv.listing?.provider_name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.15rem"}}>
                            <span style={{fontSize:"0.82rem",fontWeight:700,color:"#1e3a5f"}}>{conv.listing?.provider_name||"Provider"}</span>
                            <span style={{fontSize:"0.68rem",color:"#94a3b8"}}>{formatTime(conv.last_message_at)}</span>
                          </div>
                          <div style={{fontSize:"0.72rem",color:"#84CC16",fontWeight:600,marginBottom:"0.15rem"}}>{conv.listing?.activity_type}</div>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <span style={{fontSize:"0.75rem",color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:180}}>{conv.last_message}</span>
                            {(conv.unread_count||0)>0&&<span style={{background:"#EF4444",color:"white",fontSize:"0.62rem",fontWeight:700,padding:"1px 4px",borderRadius:999,flexShrink:0,marginLeft:4}}>{conv.unread_count}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{padding:"0.8rem",borderTop:"1px solid #f1f5f9"}}>
                      <button className="btn" onClick={()=>{setShowMsgPanel(false);router.push("/messages");}} style={{width:"100%",padding:"0.6rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:8,fontSize:"0.82rem",fontWeight:700}}>Open Messages</button>
                    </div>
                  </div>
                )}
              </div>
              <button className="btn" onClick={()=>router.push("/profile")}
                style={{padding:"0.5rem 1rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.85rem",fontWeight:600}}>
                👤 Profile
              </button>
              <button className="btn" onClick={handleLogout} style={{padding:"0.5rem 1.2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"transparent",color:"#1e3a5f",fontSize:"0.85rem"}}>Log Out</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={openLogin} style={{padding:"0.5rem 1.2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"transparent",color:"#1e3a5f",fontSize:"0.85rem"}}>Log In</button>
              <button className="btn" onClick={openSignup} style={{padding:"0.5rem 1.4rem",border:"none",borderRadius:999,background:"#84CC16",color:"#1e3a5f",fontWeight:700,fontSize:"0.85rem"}}>Sign Up Free</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{padding:"5rem 2.5rem 3rem",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",fontFamily:"'Bebas Neue',sans-serif",fontSize:"28vw",color:"rgba(30,58,95,0.04)",top:"-2rem",right:"-2rem",lineHeight:1,pointerEvents:"none",userSelect:"none"}}>PLAY</div>
        <div style={{display:"inline-block",background:"rgba(132,204,22,0.12)",color:"#4d7c0f",fontSize:"0.75rem",fontWeight:700,letterSpacing:2,textTransform:"uppercase",padding:"0.35rem 1rem",borderRadius:999,marginBottom:"1.5rem",border:"1px solid rgba(132,204,22,0.3)"}}>🏙️ Now Across Australia</div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(3.5rem,8vw,7rem)",lineHeight:0.95,marginBottom:"1.5rem",maxWidth:700,color:"#1e3a5f"}}>Find Your<br/><span style={{color:"#84CC16"}}>Perfect Game</span></h1>
        <p style={{fontSize:"1.05rem",color:"#64748b",maxWidth:480,lineHeight:1.7,marginBottom:"2.5rem"}}>Book lessons from local experts, or find people to play with. Tennis, piano, yoga, soccer — whatever your game, PlayUp connects you.</p>
        <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
          <button className="btn" onClick={()=>setActiveTab("lessons")} style={{padding:"0.85rem 2rem",fontSize:"1rem",borderRadius:999,fontWeight:700,background:"#1e3a5f",color:"white",border:"none"}}>Find Lessons</button>
          <button className="btn" onClick={()=>setActiveTab("events")} style={{padding:"0.85rem 2rem",fontSize:"1rem",borderRadius:999,fontWeight:700,background:"#84CC16",color:"#1e3a5f",border:"none"}}>Join an Event</button>
        </div>
      </section>

      <div style={{display:"flex",gap:"3rem",padding:"2rem 2.5rem",borderTop:"1px solid #dbeafe",borderBottom:"1px solid #dbeafe",flexWrap:"wrap",background:"white"}}>
        {[["240+","Lesson Providers"],["18","Sports & Activities"],["3,100+","Players in Australia"],["4.8 ⭐","Average Rating"]].map(([n,l])=>(
          <div key={l}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",color:"#1e3a5f",letterSpacing:1}}>{n}</div><div style={{fontSize:"0.8rem",color:"#64748b"}}>{l}</div></div>
        ))}
      </div>

      <section style={{padding:"2.5rem 2.5rem"}}>
        <div style={{display:"flex",gap:"0.5rem",background:"white",border:"1px solid #bfdbfe",borderRadius:16,padding:"0.6rem",maxWidth:900,flexWrap:"wrap",boxShadow:"0 2px 12px rgba(30,58,95,0.06)"}}>
          <input placeholder="Search lessons, sports, activities..." value={searchText} onChange={e=>setSearchText(e.target.value)} style={{flex:2,background:"transparent",border:"none",outline:"none",color:"#1e3a5f",fontSize:"0.95rem",padding:"0.4rem 0.8rem",minWidth:160}}/>
          <div style={{width:1,background:"#dbeafe",margin:"0.2rem 0"}}/>
          <input placeholder="Postcode or suburb..." value={searchPostcode} onChange={e=>setSearchPostcode(e.target.value)} style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#1e3a5f",fontSize:"0.95rem",padding:"0.4rem 0.8rem",minWidth:140}}/>
          <div style={{width:1,background:"#dbeafe",margin:"0.2rem 0"}}/>
          <select style={{background:"transparent",border:"none",outline:"none",color:"#64748b",fontSize:"0.9rem",padding:"0.4rem 0.8rem",cursor:"pointer"}} onChange={e=>setSearchPostcode(e.target.value)}>
            <option value="">All Australia</option>
            {[["Richmond VIC","3121"],["Fitzroy VIC","3065"],["St Kilda VIC","3182"],["South Yarra VIC","3141"],["Carlton VIC","3053"],["Bondi NSW","2026"],["Newtown NSW","2042"],["South Brisbane QLD","4101"]].map(([s,p])=><option key={p} value={p}>{s}</option>)}
          </select>
          <button className="btn" style={{borderRadius:10,padding:"0.5rem 1.2rem",background:"#1e3a5f",color:"white",border:"none",fontWeight:700}}>Search</button>
        </div>
        {(searchPostcode||searchText)&&(
          <div style={{marginTop:"0.8rem",fontSize:"0.82rem",color:"#64748b",display:"flex",alignItems:"center",gap:"0.8rem"}}>
            {searchPostcode&&<span>📍 <strong style={{color:"#1e3a5f"}}>{searchPostcode}</strong></span>}
            {searchText&&<span>🔍 <strong style={{color:"#1e3a5f"}}>{searchText}</strong></span>}
            <button className="btn" onClick={()=>{setSearchPostcode("");setSearchText("");}} style={{background:"rgba(30,58,95,0.08)",border:"1px solid #bfdbfe",color:"#1e3a5f",borderRadius:999,padding:"0.2rem 0.7rem",fontSize:"0.75rem"}}>Clear ✕</button>
          </div>
        )}
        <div style={{display:"flex",gap:"0.6rem",marginTop:"1rem",flexWrap:"wrap"}}>
          {[["all","All"],["tennis","🎾 Tennis"],["piano","🎹 Piano"],["swimming","🏊 Swimming"],["yoga","🧘 Yoga"],["guitar","🎸 Guitar"],["martial","🥋 Martial Arts"]].map(([val,label])=>(
            <button key={val} className="btn" onClick={()=>setActiveFilter(val)} style={{padding:"0.4rem 1rem",borderRadius:999,fontSize:"0.8rem",fontWeight:500,border:`1px solid ${activeFilter===val?"#84CC16":"#bfdbfe"}`,color:activeFilter===val?"#4d7c0f":"#64748b",background:activeFilter===val?"rgba(132,204,22,0.1)":"white"}}>{label}</button>
          ))}
        </div>
      </section>

      <div style={{display:"flex",padding:"0 2.5rem",borderBottom:"1px solid #dbeafe",marginBottom:"2rem",background:"white"}}>
        {[["lessons","📚 Lessons"],["events","🏃 Community Events"]].map(([val,label])=>(
          <button key={val} className="btn" onClick={()=>setActiveTab(val as "lessons"|"events")} style={{padding:"0.9rem 1.8rem",fontSize:"0.9rem",fontWeight:600,color:activeTab===val?"#1e3a5f":"#64748b",background:"none",border:"none",borderBottom:`2px solid ${activeTab===val?"#84CC16":"transparent"}`}}>{label}</button>
        ))}
      </div>

      {/* LESSONS TAB */}
      {activeTab==="lessons"&&(
        <section style={{padding:"0 2.5rem 3rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,color:"#1e3a5f"}}>{loadingListings?"Loading...":filtered.length>0?`${filtered.length} Lesson${filtered.length===1?"":"s"} Found`:"No Lessons Found"}</div>
            <span style={{fontSize:"0.85rem",color:"#84CC16",cursor:"pointer",fontWeight:700}}>See all →</span>
          </div>
          {loadingListings?(
            <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
              <div style={{width:32,height:32,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 1rem"}}/>
              Loading lessons...
            </div>
          ):filtered.length===0?(
            <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
              <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🔍</div>
              <div style={{fontSize:"1rem",marginBottom:"0.5rem"}}>No lessons found</div>
              <button className="btn" onClick={()=>{setSearchPostcode("");setSearchText("");setActiveFilter("all");}} style={{marginTop:"1rem",background:"rgba(132,204,22,0.1)",border:"1px solid rgba(132,204,22,0.3)",color:"#4d7c0f",borderRadius:999,padding:"0.5rem 1.2rem",fontSize:"0.85rem"}}>Clear Search</button>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1.2rem"}}>
              {filtered.map((l,i)=>(
                <div key={l.id} className="lesson-card" onClick={()=>router.push(l.isDb?`/listings/${l.id}`:`/lessons/${l.id}`)} style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid #dbeafe",cursor:"pointer",animation:`fadeInUp 0.4s ease ${i*0.05}s both`,transition:"all 0.25s",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
                  <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"4rem",position:"relative",background:"#1e3a5f"}}>
                    {l.emoji}
                    {(l as any).featured&&<div style={{position:"absolute",top:"0.8rem",right:"0.8rem",background:"#F97316",color:"white",fontSize:"0.7rem",fontWeight:800,padding:"0.25rem 0.6rem",borderRadius:999}}>Featured</div>}
                    {(l as any).badge&&!(l as any).featured&&<div style={{position:"absolute",top:"0.8rem",right:"0.8rem",background:"#84CC16",color:"#1e3a5f",fontSize:"0.7rem",fontWeight:800,padding:"0.25rem 0.6rem",borderRadius:999}}>{(l as any).badge}</div>}
                    {l.isDb&&<div style={{position:"absolute",top:"0.8rem",left:"0.8rem",background:"#1e3a5f",color:"#84CC16",fontSize:"0.65rem",fontWeight:800,padding:"0.2rem 0.5rem",borderRadius:999,border:"1px solid #84CC16"}}>NEW</div>}
                  </div>
                  <div style={{padding:"1.2rem"}}>
                    <div style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#84CC16",marginBottom:"0.4rem"}}>{l.sport}</div>
                    <div style={{fontSize:"1rem",fontWeight:700,marginBottom:"0.3rem",lineHeight:1.3,color:"#1e3a5f"}}>{l.title}</div>
                    <div style={{fontSize:"0.8rem",color:"#64748b",marginBottom:"0.8rem"}}>with {l.provider}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:"0.8rem"}}>
                      <span style={{color:"#64748b"}}>📍 {l.suburb} <span style={{color:"#94a3b8"}}>{l.postcode}</span></span>
                      <span style={{fontWeight:700,fontSize:"0.95rem",color:"#1e3a5f"}}>${l.price} <span style={{fontSize:"0.7rem",color:"#94a3b8",fontWeight:400}}>/session</span></span>
                    </div>
                    {!l.isDb&&(l as any).rating>0&&(
                      <div style={{display:"flex",alignItems:"center",gap:"0.3rem",fontSize:"0.8rem",color:"#64748b",marginTop:"0.6rem"}}>
                        <span style={{color:"#F59E0B"}}>{"★".repeat(Math.floor((l as any).rating))}{"☆".repeat(5-Math.floor((l as any).rating))}</span>
                        {(l as any).rating} ({(l as any).reviews} reviews)
                      </div>
                    )}
                    <div style={{marginTop:"0.8rem",fontSize:"0.8rem",color:"#84CC16",fontWeight:700}}>View Details →</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* EVENTS TAB */}
      {activeTab==="events"&&(
        <section style={{padding:"0 2.5rem 3rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,color:"#1e3a5f"}}>
              {loadingEvents?"Loading...":filteredEvents.length>0?`${filteredEvents.length} Event${filteredEvents.length===1?"":"s"} Near You`:"No Events Found"}
            </div>
            <button className="btn" onClick={()=>user?router.push("/events/create"):openLogin()}
              style={{borderRadius:999,fontSize:"0.85rem",padding:"0.5rem 1.2rem",background:"#84CC16",color:"#1e3a5f",border:"none",fontWeight:700}}>
              + Post an Event
            </button>
          </div>
          {loadingEvents?(
            <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
              <div style={{width:32,height:32,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 1rem"}}/>
              Loading events...
            </div>
          ):filteredEvents.length===0?(
            <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>⚽</div>
              <div style={{fontWeight:600,color:"#1e3a5f",fontSize:"1rem",marginBottom:"0.4rem"}}>No events yet</div>
              <div style={{fontSize:"0.85rem",marginBottom:"1.5rem"}}>Be the first to post a community event!</div>
              <button className="btn" onClick={()=>user?router.push("/events/create"):openLogin()}
                style={{padding:"0.7rem 1.5rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.88rem"}}>
                + Post an Event
              </button>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1.2rem"}}>
              {filteredEvents.map((ev,i)=>{
                const spotsLeft=ev.spots_total-ev.spots_filled;
                const isFull=spotsLeft<=0;
                const emoji=SPORT_EMOJIS[ev.sport]||"🏅";
                return (
                  <div key={ev.id} className="event-card" onClick={()=>router.push(`/events/${ev.id}`)}
                    style={{background:"white",borderRadius:16,border:"1px solid #dbeafe",overflow:"hidden",cursor:"pointer",animation:`fadeInUp 0.4s ease ${i*0.05}s both`,transition:"all 0.25s",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
                    <div style={{background:"#1e3a5f",padding:"1.2rem",position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",fontSize:"5rem",right:"-0.5rem",top:"-0.5rem",opacity:0.1,pointerEvents:"none"}}>{emoji}</div>
                      <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.6rem"}}>
                        <span style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"#84CC16",background:"rgba(132,204,22,0.15)",padding:"0.2rem 0.6rem",borderRadius:999,border:"1px solid rgba(132,204,22,0.3)"}}>{ev.sport}</span>
                        {isFull?<span style={{fontSize:"0.68rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"rgba(239,68,68,0.2)",color:"#EF4444"}}>🔒 Full</span>
                        :spotsLeft<=2?<span style={{fontSize:"0.68rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"rgba(249,115,22,0.2)",color:"#F97316"}}>⚡ {spotsLeft} left</span>
                        :<span style={{fontSize:"0.68rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"rgba(132,204,22,0.15)",color:"#84CC16"}}>{spotsLeft} spots</span>}
                      </div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.15rem",letterSpacing:0.5,color:"white",lineHeight:1.2,marginBottom:"0.5rem"}}>{ev.title}</div>
                      <div style={{fontSize:"0.78rem",color:"#93c5fd"}}>👤 {ev.host_name}</div>
                    </div>
                    <div style={{padding:"1rem"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:"0.35rem",fontSize:"0.82rem",color:"#475569",marginBottom:"0.8rem"}}>
                        <div>📍 {ev.location}, {ev.suburb}</div>
                        <div>📅 {ev.date} at {ev.time} · {ev.duration}</div>
                        <div style={{fontWeight:600,color:ev.cost==="Free"?"#84CC16":"#1e3a5f"}}>{ev.cost==="Free"?"🎉 Free":`💰 ${ev.cost}`}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{fontSize:"0.78rem",color:"#94a3b8"}}>{ev.skill_level} · {ev.age_group}</div>
                        <div style={{fontSize:"0.78rem",fontWeight:700,color:"#84CC16"}}>View →</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* PROVIDER CTA */}
      <div style={{margin:"0 2.5rem 3rem",background:"#1e3a5f",borderRadius:20,padding:"2.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"2rem",flexWrap:"wrap"}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:1,marginBottom:"0.5rem",color:"white"}}>Are You a <span style={{color:"#84CC16"}}>Lesson Provider?</span></h2>
          <p style={{color:"#93c5fd",fontSize:"0.9rem",maxWidth:400,lineHeight:1.6}}>List your lessons on PlayUp and reach thousands of learners across Australia.</p>
          <div style={{display:"flex",gap:"1.5rem",marginTop:"1.2rem",flexWrap:"wrap"}}>
            {["Free listing to start","Admin reviewed","In-app messaging","Students come to you"].map(p=>(
              <div key={p} style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.82rem",color:"#93c5fd"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#84CC16"}}/>{p}</div>
            ))}
          </div>
        </div>
        <button className="btn" onClick={()=>router.push("/provider/create")} style={{padding:"0.85rem 2rem",fontSize:"1rem",borderRadius:999,fontWeight:700,background:"#84CC16",color:"#1e3a5f",border:"none",whiteSpace:"nowrap"}}>List My Lessons →</button>
      </div>

      <footer style={{background:"#1e3a5f",borderTop:"1px solid rgba(255,255,255,0.1)",padding:"2rem 2.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:2}}><span style={{color:"white"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
        <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
          {["About","For Providers","Help","Privacy","Terms"].map(l=><a key={l} href="#" style={{fontSize:"0.82rem",color:"#93c5fd",textDecoration:"none"}}>{l}</a>)}
        </div>
        <div style={{fontSize:"0.75rem",color:"#60a5fa"}}>© 2026 PlayUp · Australia</div>
      </footer>

      {/* MODALS */}
      {modal&&(
        <div onClick={(e)=>{if(e.target===e.currentTarget)setModal(null);}} style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",border:"1px solid #bfdbfe",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease",boxShadow:"0 20px 60px rgba(30,58,95,0.15)"}}>
            <button onClick={()=>setModal(null)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#64748b",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>

            {modal==="login"&&loginView==="login"&&<>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>Welcome Back</h3>
              <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Log in to your PlayUp account</p>
              {authError&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"0.7rem 1rem",marginBottom:"1rem",fontSize:"0.85rem",color:"#dc2626"}}>{authError}</div>}
              <div style={{marginBottom:"1rem"}}><label style={labelStyle}>Email</label><input type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/></div>
              <div style={{marginBottom:"0.5rem"}}><label style={labelStyle}>Password</label><input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inputStyle}/></div>
              <div style={{textAlign:"right",marginBottom:"1.2rem"}}><button className="btn" onClick={()=>{setAuthError("");setAuthSuccess("");setForgotEmail(email);setLoginView("forgot");}} style={{background:"none",border:"none",color:"#84CC16",fontSize:"0.82rem",fontWeight:600,padding:0,cursor:"pointer"}}>Forgot password?</button></div>
              <button className="btn" onClick={handleLogin} disabled={authLoading} style={{width:"100%",padding:"0.85rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",marginBottom:"1rem",opacity:authLoading?0.7:1}}>{authLoading?"Logging in...":"Log In"}</button>
              <p style={{textAlign:"center",fontSize:"0.85rem",color:"#64748b"}}>Don't have an account? <span style={{color:"#84CC16",cursor:"pointer",fontWeight:700}} onClick={()=>{setAuthError("");setModal("signup");}}>Sign up free</span></p>
            </>}

            {modal==="login"&&loginView==="forgot"&&<>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>Reset Password</h3>
              <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Enter your email and we'll send a reset link.</p>
              {authError&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"0.7rem 1rem",marginBottom:"1rem",fontSize:"0.85rem",color:"#dc2626"}}>{authError}</div>}
              {authSuccess&&<div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"0.7rem 1rem",marginBottom:"1rem",fontSize:"0.85rem",color:"#16a34a"}}>{authSuccess}</div>}
              <div style={{marginBottom:"1.2rem"}}><label style={labelStyle}>Email Address</label><input type="email" placeholder="you@email.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleForgotPassword()} style={inputStyle}/></div>
              <button className="btn" onClick={handleForgotPassword} disabled={authLoading||!!authSuccess} style={{width:"100%",padding:"0.85rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",marginBottom:"1rem",opacity:(authLoading||!!authSuccess)?0.7:1}}>{authLoading?"Sending...":"Send Reset Link"}</button>
              <div style={{textAlign:"center"}}><button className="btn" onClick={()=>{setAuthError("");setAuthSuccess("");setLoginView("login");}} style={{background:"none",border:"none",color:"#64748b",fontSize:"0.85rem",cursor:"pointer"}}>← Back to Log In</button></div>
            </>}

            {modal==="signup"&&<>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>Join PlayUp</h3>
              <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Free to sign up. Find lessons and players near you.</p>
              {authError&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"0.7rem 1rem",marginBottom:"1rem",fontSize:"0.85rem",color:"#dc2626"}}>{authError}</div>}
              <div style={{display:"flex",gap:"0.8rem",marginBottom:"1rem"}}>
                <div style={{flex:1}}><label style={labelStyle}>First Name</label><input placeholder="Alex" value={firstName} onChange={e=>setFirstName(e.target.value)} style={inputStyle}/></div>
                <div style={{flex:1}}><label style={labelStyle}>Last Name</label><input placeholder="Smith" value={lastName} onChange={e=>setLastName(e.target.value)} style={inputStyle}/></div>
              </div>
              <div style={{marginBottom:"1rem"}}><label style={labelStyle}>Email</label><input type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/></div>
              <div style={{marginBottom:"1rem"}}><label style={labelStyle}>Password</label><input type="password" placeholder="Min. 6 characters" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle}/></div>
              <button className="btn" onClick={handleSignup} disabled={authLoading} style={{width:"100%",padding:"0.85rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",marginBottom:"1rem",opacity:authLoading?0.7:1}}>{authLoading?"Creating account...":"Create Free Account"}</button>
              <p style={{textAlign:"center",fontSize:"0.85rem",color:"#64748b"}}>Already have an account? <span style={{color:"#1e3a5f",cursor:"pointer",fontWeight:700}} onClick={()=>{setAuthError("");setLoginView("login");setModal("login");}}>Log in</span></p>
            </>}

            {modal==="provider"&&<>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>List Your Lesson</h3>
              <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Ready to reach students across Australia?</p>
              <div style={{background:"#f8faff",borderRadius:12,padding:"1.2rem",border:"1px solid #dbeafe",marginBottom:"1.5rem"}}>
                {["Free listing to get started","Admin reviewed & verified","In-app messaging","Get listed in under 5 minutes"].map(p=>(
                  <div key={p} style={{display:"flex",alignItems:"center",gap:"0.6rem",fontSize:"0.88rem",color:"#475569",marginBottom:"0.5rem"}}><span style={{color:"#84CC16",fontWeight:700}}>✓</span>{p}</div>
                ))}
              </div>
              <button className="btn" onClick={()=>{setModal(null);router.push("/provider/create");}} style={{width:"100%",padding:"0.85rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem"}}>Start My Listing →</button>
              <button className="btn" onClick={()=>setModal(null)} style={{width:"100%",padding:"0.7rem",background:"transparent",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:10,fontWeight:500,fontSize:"0.9rem"}}>Maybe Later</button>
            </>}
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,animation:"slideUp 0.3s ease",border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}
