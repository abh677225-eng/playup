"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { id: string; email: string } | null;
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
  what_to_bring: string[];
  rules: string[];
  status: string;
  created_at: string;
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

const formatDate = (d: string) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-AU", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
};

const formatTime = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export default function EventDetail() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [event, setEvent] = useState<Event|null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [myRequest, setMyRequest] = useState<{status:string}|null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joining, setJoining] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email! });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email! } : null);
    });
    loadEvent();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && event) loadMyRequest();
  }, [user, event]);

  const loadEvent = async () => {
    const { data, error } = await supabase.from("events").select("*").eq("id", params.id).single();
    setLoading(false);
    if (error || !data) { setNotFound(true); return; }
    setEvent(data);
  };

  const loadMyRequest = async () => {
    if (!user || !event) return;
    const { data } = await supabase.from("event_requests").select("status").eq("event_id", event.id).eq("requester_id", user.id).single();
    if (data) setMyRequest(data);
  };

  const handleJoin = async () => {
    if (!user || !event || joining) return;
    if (!joinName.trim()) { showToast("Please enter your name"); return; }
    setJoining(true);

    try {
      // 1. Save the join request
      const { error: reqError } = await supabase.from("event_requests").insert({
        event_id: event.id,
        requester_id: user.id,
        requester_name: joinName.trim(),
        message: joinMsg.trim(),
        status: "pending",
      });
      if (reqError) throw reqError;

      // 2. Update spots_filled
      await supabase.from("events").update({ spots_filled: event.spots_filled + 1 }).eq("id", event.id);

      // 3. Send a message to the host via conversations + messages
      // Check if conversation exists between requester and host
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("listing_id", event.id)
        .eq("seeker_id", user.id)
        .single();

      let convId = existingConv?.id;
      if (!convId) {
        const { data: newConv, error: convError } = await supabase.from("conversations").insert({
          listing_id: event.id,
          seeker_id: user.id,
          provider_id: event.host_id,
          last_message: joinMsg.trim() || `Hi, I'd like to join your ${event.sport} event!`,
          last_message_at: new Date().toISOString(),
        }).select().single();
        if (convError) throw convError;
        convId = newConv.id;
      }

      const msgText = joinMsg.trim() || `Hi ${event.host_name.split(" ")[0]}, I'd like to join your ${event.sport} event — ${event.title}!`;
      await supabase.from("messages").insert({
        listing_id: event.id,
        sender_id: user.id,
        receiver_id: event.host_id,
        message: msgText,
        read: false,
      });

      setMyRequest({ status: "pending" });
      setEvent(prev => prev ? { ...prev, spots_filled: prev.spots_filled + 1 } : prev);
      setShowJoinModal(false);
      setJoinName("");
      setJoinMsg("");
      showToast("🎉 Request sent! The host will confirm you soon.");
    } catch (err: any) {
      showToast(err.message || "Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const updateEventStatus = async (status: string) => {
    if (!event) return;
    setStatusUpdating(true);
    const { error } = await supabase.from("events").update({ status }).eq("id", event.id);
    if (!error) {
      setEvent(prev => prev ? { ...prev, status } : prev);
      showToast(status === "cancelled" ? "Event cancelled." : "Event closed.");
    }
    setStatusUpdating(false);
  };

  const inputStyle = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif" };
  const labelStyle = { display:"block" as const, fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase" as const, color:"#64748b", marginBottom:"0.4rem" };
  const cardStyle = { background:"white", borderRadius:16, padding:"1.8rem", border:"1px solid #dbeafe", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(30,58,95,0.06)" };

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;font-family:'DM Sans',sans-serif;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"1rem",textAlign:"center",padding:"2rem"}}>
        <div style={{fontSize:"3rem"}}>🔍</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"#1e3a5f"}}>Event Not Found</div>
        <p style={{color:"#64748b"}}>This event may have been removed or is no longer available.</p>
        <button onClick={()=>router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
      </div>
    </>
  );

  const emoji = SPORT_EMOJIS[event!.sport] || "🏅";
  const spotsLeft = event!.spots_total - event!.spots_filled;
  const isFull = spotsLeft <= 0;
  const isHost = user?.id === event!.host_id;
  const isCancelledOrClosed = event!.status === "cancelled" || event!.status === "closed";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
        <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.5rem 1.2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"transparent",color:"#1e3a5f",fontSize:"0.85rem"}}>← Back to Events</button>
      </nav>

      {/* HERO */}
      <div style={{background:"#1e3a5f",padding:"4rem 2.5rem 3rem",position:"relative",overflow:"hidden",borderBottom:"4px solid #84CC16"}}>
        <div style={{position:"absolute",fontSize:"20vw",top:"-1rem",right:"-1rem",opacity:0.06,pointerEvents:"none"}}>{emoji}</div>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#84CC16",background:"rgba(132,204,22,0.15)",padding:"0.3rem 0.8rem",borderRadius:999,border:"1px solid rgba(132,204,22,0.3)"}}>{event!.sport}</span>
            {isCancelledOrClosed ? (
              <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:"rgba(239,68,68,0.2)",color:"#EF4444",border:"1px solid rgba(239,68,68,0.4)"}}>
                {event!.status === "cancelled" ? "❌ Cancelled" : "🔒 Closed"}
              </span>
            ) : isFull ? (
              <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:"rgba(249,115,22,0.2)",color:"#F97316",border:"1px solid rgba(249,115,22,0.4)"}}>🔒 Full</span>
            ) : spotsLeft <= 2 ? (
              <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:"rgba(249,115,22,0.2)",color:"#F97316",border:"1px solid rgba(249,115,22,0.4)"}}>⚡ Only {spotsLeft} spot{spotsLeft===1?"":"s"} left!</span>
            ) : (
              <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:"rgba(132,204,22,0.15)",color:"#84CC16",border:"1px solid rgba(132,204,22,0.3)"}}>{spotsLeft} spots available</span>
            )}
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2rem,5vw,3.5rem)",lineHeight:1,marginBottom:"1rem",letterSpacing:1,color:"white"}}>{event!.title}</h1>
          <div style={{display:"flex",alignItems:"center",gap:"1.5rem",flexWrap:"wrap",fontSize:"0.9rem",color:"#93c5fd"}}>
            <span>👤 Hosted by {event!.host_name}</span>
            <span>📍 {event!.location}, {event!.suburb}</span>
            <span>📅 {formatDate(event!.date)} at {formatTime(event!.time)}</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"2.5rem",display:"grid",gridTemplateColumns:"1fr 300px",gap:"2rem",alignItems:"start"}}>
        <div style={{animation:"fadeInUp 0.4s ease"}}>

          {/* ABOUT */}
          {event!.description && (
            <div style={cardStyle}>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>About This Event</h2>
              <p style={{color:"#475569",lineHeight:1.8,fontSize:"0.95rem"}}>{event!.description}</p>
            </div>
          )}

          {/* DETAILS */}
          <div style={cardStyle}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>Event Details</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.8rem"}}>
              {[
                ["📅","Date",formatDate(event!.date)],
                ["⏰","Time",`${formatTime(event!.time)} · ${event!.duration}`],
                ["💰","Cost",event!.cost],
                ["👥","Spots",`${event!.spots_filled}/${event!.spots_total} filled`],
                ["🎯","Skill Level",event!.skill_level],
                ["🎂","Age Group",event!.age_group],
              ].map(([icon,label,value])=>(
                <div key={label as string} style={{background:"#f8faff",borderRadius:10,padding:"1rem",border:"1px solid #dbeafe",display:"flex",gap:"0.8rem",alignItems:"flex-start"}}>
                  <span style={{fontSize:"1.2rem",flexShrink:0}}>{icon}</span>
                  <div>
                    <div style={{fontSize:"0.72rem",color:"#64748b",textTransform:"uppercase",letterSpacing:0.8,fontWeight:700,marginBottom:"0.2rem"}}>{label}</div>
                    <div style={{fontSize:"0.9rem",fontWeight:600,color:"#1e3a5f"}}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LOCATION */}
          <div style={cardStyle}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>Location</h2>
            <div style={{display:"flex",alignItems:"flex-start",gap:"0.8rem",fontSize:"0.9rem",color:"#475569"}}>
              <span style={{fontSize:"1.2rem"}}>📍</span>
              <div>
                <div style={{fontWeight:600,marginBottom:"0.2rem"}}>{event!.location}</div>
                <div style={{color:"#64748b",fontSize:"0.85rem"}}>{event!.suburb} · Postcode {event!.postcode}</div>
              </div>
            </div>
          </div>

          {/* WHAT TO BRING */}
          {event!.what_to_bring?.length > 0 && (
            <div style={cardStyle}>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>What to Bring</h2>
              <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                {event!.what_to_bring.map((item,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"0.8rem",fontSize:"0.9rem",color:"#475569"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#84CC16",flexShrink:0}}/>{item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RULES */}
          {event!.rules?.length > 0 && (
            <div style={cardStyle}>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>House Rules</h2>
              <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                {event!.rules.map((rule,i) => (
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"0.8rem",fontSize:"0.9rem",color:"#475569"}}>
                    <span style={{color:"#84CC16",fontWeight:700,flexShrink:0}}>{i+1}.</span>{rule}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HOST CONTROLS */}
          {isHost && !isCancelledOrClosed && (
            <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:16,padding:"1.5rem",marginBottom:"1.5rem"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,color:"#F97316",marginBottom:"0.8rem"}}>Host Controls</div>
              <p style={{fontSize:"0.85rem",color:"#78350f",marginBottom:"1rem"}}>You're the host of this event. You can close or cancel it below.</p>
              <div style={{display:"flex",gap:"0.8rem"}}>
                <button className="btn" onClick={()=>updateEventStatus("closed")} disabled={statusUpdating}
                  style={{padding:"0.6rem 1.2rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.85rem",opacity:statusUpdating?0.6:1}}>
                  {statusUpdating?"...":"🔒 Close Event"}
                </button>
                <button className="btn" onClick={()=>updateEventStatus("cancelled")} disabled={statusUpdating}
                  style={{padding:"0.6rem 1.2rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:700,fontSize:"0.85rem",opacity:statusUpdating?0.6:1}}>
                  {statusUpdating?"...":"❌ Cancel Event"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{position:"sticky",top:"5rem",animation:"fadeInUp 0.4s ease 0.1s both"}}>
          <div style={{background:"white",borderRadius:20,border:"1px solid #dbeafe",overflow:"hidden",boxShadow:"0 4px 20px rgba(30,58,95,0.1)"}}>
            <div style={{background:"#1e3a5f",padding:"1.5rem",borderBottom:"3px solid #84CC16"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",color:"#84CC16",letterSpacing:1}}>{formatDate(event!.date)}</div>
              <div style={{fontSize:"0.9rem",color:"#93c5fd",marginTop:"0.2rem"}}>{formatTime(event!.time)} · {event!.duration}</div>
              <div style={{marginTop:"0.8rem",fontSize:"1rem",fontWeight:700,color:event!.cost==="Free"?"#84CC16":"white"}}>{event!.cost === "Free" ? "🎉 Free to join" : `💰 ${event!.cost}`}</div>
            </div>
            <div style={{padding:"1.5rem"}}>
              {/* HOST */}
              <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1rem",paddingBottom:"1rem",borderBottom:"1px solid #f1f5f9"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:"#84CC16",flexShrink:0}}>
                  {event!.host_name.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f"}}>{event!.host_name}</div>
                  <div style={{fontSize:"0.8rem",color:"#64748b"}}>Event Host</div>
                </div>
              </div>

              {/* SPOTS */}
              <div style={{background:"#f8faff",border:"1px solid #dbeafe",borderRadius:12,padding:"0.8rem 1rem",marginBottom:"1.2rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:"0.85rem",color:"#64748b"}}>Spots filled</span>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",color:"#84CC16",letterSpacing:1}}>{event!.spots_filled}/{event!.spots_total}</span>
              </div>

              {/* JOIN BUTTON */}
              {isCancelledOrClosed ? (
                <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:12,padding:"1rem",textAlign:"center",marginBottom:"0.8rem"}}>
                  <div style={{fontSize:"1.2rem",marginBottom:"0.3rem"}}>{event!.status==="cancelled"?"❌":"🔒"}</div>
                  <div style={{fontSize:"0.9rem",color:"#dc2626",fontWeight:700}}>{event!.status==="cancelled"?"Event Cancelled":"Event Closed"}</div>
                </div>
              ) : myRequest ? (
                <div style={{background:"rgba(132,204,22,0.1)",border:"1px solid rgba(132,204,22,0.3)",borderRadius:12,padding:"1rem",textAlign:"center",marginBottom:"0.8rem"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>✅</div>
                  <div style={{fontSize:"0.9rem",color:"#4d7c0f",fontWeight:700}}>Request Sent!</div>
                  <div style={{fontSize:"0.8rem",color:"#64748b",marginTop:"0.2rem"}}>
                    Status: <strong style={{color: myRequest.status==="approved"?"#84CC16":myRequest.status==="rejected"?"#EF4444":"#F97316"}}>{myRequest.status}</strong>
                  </div>
                </div>
              ) : isFull ? (
                <div style={{background:"#f8faff",border:"1px solid #dbeafe",borderRadius:12,padding:"1rem",textAlign:"center",marginBottom:"0.8rem"}}>
                  <div style={{fontSize:"0.9rem",color:"#64748b",fontWeight:600}}>🔒 This event is full</div>
                </div>
              ) : isHost ? (
                <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:12,padding:"0.8rem 1rem",textAlign:"center",marginBottom:"0.8rem",fontSize:"0.85rem",color:"#27500A",fontWeight:600}}>
                  👑 You're hosting this event
                </div>
              ) : (
                <button className="btn" onClick={()=>user?setShowJoinModal(true):router.push("/")}
                  style={{width:"100%",padding:"0.9rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:12,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem"}}>
                  {user ? `${emoji} Request to Join` : "🔐 Log In to Join"}
                </button>
              )}

              {!user && !isCancelledOrClosed && <p style={{textAlign:"center",fontSize:"0.8rem",color:"#64748b"}}><span style={{color:"#84CC16",cursor:"pointer",fontWeight:700}} onClick={()=>router.push("/")}>Sign up free</span> to join this event</p>}
              <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid #f1f5f9",fontSize:"0.78rem",color:"#94a3b8",textAlign:"center"}}>✓ Free to request · Host confirms your spot</div>
            </div>
          </div>
        </div>
      </div>

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div onClick={(e)=>{if(e.target===e.currentTarget)setShowJoinModal(false);}} style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",border:"1px solid #bfdbfe",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease",boxShadow:"0 20px 60px rgba(30,58,95,0.15)"}}>
            <button onClick={()=>setShowJoinModal(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#64748b",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>Request to Join</h3>
            <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Send a message to {event!.host_name}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={labelStyle}>Your Name *</label>
              <input value={joinName} onChange={e=>setJoinName(e.target.value)} placeholder="Alex Smith" style={inputStyle}/>
            </div>
            <div style={{marginBottom:"1.2rem"}}>
              <label style={labelStyle}>Message (optional)</label>
              <textarea value={joinMsg} onChange={e=>setJoinMsg(e.target.value)} placeholder={`Hi ${event!.host_name.split(" ")[0]}, I'd love to join your ${event!.sport} event!`} style={{...inputStyle,resize:"vertical" as const,minHeight:100}}/>
            </div>
            <button className="btn" onClick={handleJoin} disabled={joining}
              style={{width:"100%",padding:"0.85rem",background:joining?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",opacity:joining?0.7:1}}>
              {joining ? "Sending..." : "Send Request →"}
            </button>
          </div>
        </div>
      )}

      {toast && <div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,animation:"slideUp 0.3s ease",border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}
