"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { email: string } | null;

const events = [
  { id:"1", emoji:"⚽", sport:"Soccer", color:"orange", title:"Casual 7-a-Side Soccer – Weekend Kick Around", host:"Marcus T.", hostFull:"Marcus Thompson", hostBio:"Marcus has been organising community soccer games in Fitzroy for 3 years. These are friendly, inclusive games — all fitness levels welcome. Just show up ready to have fun!", location:"Edinburgh Gardens, Fitzroy North", postcode:"3068", date:"Saturday 22 Mar", time:"9:00 AM", duration:"2 hours", joined:5, total:7, cost:"Free", skillLevel:"All levels", ageGroup:"18+", whatToBring:["Boots or runners","Water bottle","Shin guards (optional)"], description:"A casual and friendly 7-a-side soccer game at Edinburgh Gardens. We play every weekend and welcome players of all skill levels. The vibe is social and fun — we usually grab a coffee nearby after the game.", rules:["Friendly play only — no rough tackles","Rotate teams every 20 minutes","Bring your own water"] },
  { id:"2", emoji:"🎾", sport:"Tennis", color:"lime", title:"Doubles Tennis – Intermediate Level Players", host:"Anika R.", hostFull:"Anika Rao", hostBio:"Anika is a keen tennis player who plays socially 3–4 times a week. She organises doubles matches for intermediate players who want a competitive but friendly hit.", location:"Burnley Tennis Club, Richmond", postcode:"3121", date:"Sunday 23 Mar", time:"7:30 AM", duration:"1.5 hours", joined:1, total:4, cost:"$10 court split", skillLevel:"Intermediate", ageGroup:"All ages", whatToBring:["Your own racquet","$10 cash for court fees","Water bottle"], description:"Looking for 3 more players for a doubles tennis session at Burnley Tennis Club. Intermediate players preferred — you should be comfortable rallying and serving consistently.", rules:["Intermediate level preferred","Court fee split equally","Arrive 10 mins early to warm up"] },
  { id:"3", emoji:"🏀", sport:"Basketball", color:"blue", title:"3-on-3 Street Basketball – All Welcome", host:"Dev P.", hostFull:"Dev Patel", hostBio:"Dev runs weekly basketball meetups at the Docklands courts. He's passionate about keeping the sport accessible and fun for everyone.", location:"Docklands Basketball Courts", postcode:"3008", date:"Saturday 22 Mar", time:"3:00 PM", duration:"2 hours", joined:1, total:6, cost:"Free", skillLevel:"All levels", ageGroup:"16+", whatToBring:["Basketball shoes","Water","Positive attitude"], description:"Weekly 3-on-3 street basketball at the Docklands outdoor courts. We run multiple games simultaneously so everyone gets plenty of court time.", rules:["Call your own fouls","Winners stay on court","Rotate in every 2 games"] },
];

export default function EventDetail() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [joinSent, setJoinSent] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [toast, setToast] = useState("");

  const event = events.find(e => e.id === params.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { email: session.user.email! } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email! } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };
  const handleJoin = () => { setJoinSent(true); setShowJoinModal(false); showToast("Request sent! The host will confirm you 🎉"); };

  const inputStyle = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none" };
  const labelStyle = { display:"block" as const, fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase" as const, color:"#64748b", marginBottom:"0.4rem" };

  if (!event) return (
    <div style={{minHeight:"100vh",background:"#F0F7FF",display:"flex",alignItems:"center",justifyContent:"center",color:"#1e3a5f",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🔍</div>
        <div style={{fontSize:"1.2rem",marginBottom:"1rem"}}>Event not found</div>
        <button onClick={() => router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
      </div>
    </div>
  );

  const colorMap: Record<string,string> = { orange:"#F97316", lime:"#84CC16", blue:"#3B82F6" };
  const c = colorMap[event.color];
  const spotsLeft = event.total - event.joined;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={() => router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
        <button className="btn" onClick={() => router.push("/")} style={{padding:"0.5rem 1.2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"transparent",color:"#1e3a5f",fontSize:"0.85rem"}}>← Back to Events</button>
      </nav>

      <div style={{background:"#1e3a5f",padding:"4rem 2.5rem 3rem",position:"relative",overflow:"hidden",borderBottom:`4px solid ${c}`}}>
        <div style={{position:"absolute",fontSize:"20vw",top:"-1rem",right:"-1rem",opacity:0.06,pointerEvents:"none"}}>{event.emoji}</div>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:c,background:`${c}20`,padding:"0.3rem 0.8rem",borderRadius:999,border:`1px solid ${c}40`}}>{event.sport}</span>
            <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:spotsLeft<=2?"rgba(249,115,22,0.2)":"rgba(132,204,22,0.15)",color:spotsLeft<=2?"#F97316":"#84CC16",border:`1px solid ${spotsLeft<=2?"rgba(249,115,22,0.4)":"rgba(132,204,22,0.3)"}`}}>
              {spotsLeft <= 2 ? `⚡ Only ${spotsLeft} spot${spotsLeft===1?"":"s"} left!` : `${spotsLeft} spots available`}
            </span>
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2rem,5vw,3.5rem)",lineHeight:1,marginBottom:"1rem",letterSpacing:1,color:"white"}}>{event.title}</h1>
          <div style={{display:"flex",alignItems:"center",gap:"1.5rem",flexWrap:"wrap",fontSize:"0.9rem",color:"#93c5fd"}}>
            <span>👤 Hosted by {event.hostFull}</span>
            <span>📍 {event.location}</span>
            <span>📅 {event.date} at {event.time}</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"2.5rem",display:"grid",gridTemplateColumns:"1fr 300px",gap:"2rem",alignItems:"start"}}>
        <div style={{animation:"fadeInUp 0.4s ease"}}>
          {[
            {title:"About This Event", content:<p style={{color:"#475569",lineHeight:1.8,fontSize:"0.95rem"}}>{event.description}</p>},
          ].map(({title,content}) => (
            <div key={title} style={{background:"white",borderRadius:16,padding:"1.8rem",border:"1px solid #dbeafe",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>{title}</h2>
              {content}
            </div>
          ))}

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
            {[["🎯",event.skillLevel,"Skill Level"],["👥",event.ageGroup,"Age Group"],["⏱️",event.duration,"Duration"]].map(([icon,val,label]) => (
              <div key={label} style={{background:"white",borderRadius:12,padding:"1.2rem",border:"1px solid #dbeafe",textAlign:"center",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
                <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>{icon}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:c,letterSpacing:1}}>{val}</div>
                <div style={{fontSize:"0.75rem",color:"#64748b"}}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{background:"white",borderRadius:16,padding:"1.8rem",border:"1px solid #dbeafe",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>What to Bring</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {event.whatToBring.map(item => (
                <div key={item} style={{display:"flex",alignItems:"center",gap:"0.8rem",fontSize:"0.9rem",color:"#475569"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0}}/>{item}
                </div>
              ))}
            </div>
          </div>

          <div style={{background:"white",borderRadius:16,padding:"1.8rem",border:"1px solid #dbeafe",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>House Rules</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {event.rules.map((rule,i) => (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"0.8rem",fontSize:"0.9rem",color:"#475569"}}>
                  <span style={{color:c,fontWeight:700,flexShrink:0}}>{i+1}.</span>{rule}
                </div>
              ))}
            </div>
          </div>

          <div style={{background:"white",borderRadius:16,padding:"1.8rem",border:"1px solid #dbeafe",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>Location</h2>
            <div style={{display:"flex",alignItems:"flex-start",gap:"0.8rem",fontSize:"0.9rem",color:"#475569"}}>
              <span style={{fontSize:"1.2rem"}}>📍</span>
              <div>
                <div style={{fontWeight:600,marginBottom:"0.2rem"}}>{event.location}</div>
                <div style={{color:"#64748b",fontSize:"0.85rem"}}>Postcode {event.postcode} · Melbourne VIC</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{position:"sticky",top:"5rem",animation:"fadeInUp 0.4s ease 0.1s both"}}>
          <div style={{background:"white",borderRadius:20,border:"1px solid #dbeafe",overflow:"hidden",boxShadow:"0 4px 20px rgba(30,58,95,0.1)"}}>
            <div style={{background:"#1e3a5f",padding:"1.5rem",borderBottom:`3px solid ${c}`}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:c,letterSpacing:1}}>{event.date}</div>
              <div style={{fontSize:"0.9rem",color:"#93c5fd"}}>{event.time} · {event.duration}</div>
              <div style={{marginTop:"0.8rem",fontSize:"1rem",fontWeight:700,color:event.cost==="Free"?"#84CC16":"white"}}>{event.cost === "Free" ? "🎉 Free to join" : `💰 ${event.cost}`}</div>
            </div>
            <div style={{padding:"1.5rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1rem",paddingBottom:"1rem",borderBottom:"1px solid #f1f5f9"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:c,flexShrink:0}}>
                  {event.hostFull.split(" ").map(w=>w[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f"}}>{event.hostFull}</div>
                  <div style={{fontSize:"0.8rem",color:"#64748b"}}>Event Host</div>
                </div>
              </div>
              <p style={{fontSize:"0.82rem",color:"#64748b",lineHeight:1.6,marginBottom:"1.2rem"}}>{event.hostBio}</p>
              <div style={{background:`${c}10`,border:`1px solid ${c}30`,borderRadius:12,padding:"0.8rem 1rem",marginBottom:"1.2rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:"0.85rem",color:"#64748b"}}>Spots filled</span>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",color:c,letterSpacing:1}}>{event.joined}/{event.total}</span>
              </div>

              {joinSent ? (
                <div style={{background:"rgba(132,204,22,0.1)",border:"1px solid rgba(132,204,22,0.3)",borderRadius:12,padding:"1rem",textAlign:"center",marginBottom:"0.8rem"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>✅</div>
                  <div style={{fontSize:"0.9rem",color:"#4d7c0f",fontWeight:700}}>Request Sent!</div>
                  <div style={{fontSize:"0.8rem",color:"#64748b",marginTop:"0.2rem"}}>The host will confirm you soon</div>
                </div>
              ) : (
                <button className="btn" onClick={() => user ? setShowJoinModal(true) : router.push("/")}
                  style={{width:"100%",padding:"0.9rem",background:c,color:event.color==="lime"?"#1e3a5f":"white",border:"none",borderRadius:12,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem"}}>
                  {user ? `${event.emoji} Request to Join` : "🔐 Log In to Join"}
                </button>
              )}

              {!user && <p style={{textAlign:"center",fontSize:"0.8rem",color:"#64748b"}}><span style={{color:"#84CC16",cursor:"pointer",fontWeight:700}} onClick={() => router.push("/")}>Sign up free</span> to join this event</p>}
              <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid #f1f5f9",fontSize:"0.78rem",color:"#94a3b8",textAlign:"center"}}>✓ Free to request · Host confirms your spot</div>
            </div>
          </div>
        </div>
      </div>

      {showJoinModal && (
        <div onClick={(e) => { if(e.target===e.currentTarget) setShowJoinModal(false); }}
          style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",border:"1px solid #bfdbfe",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease",boxShadow:"0 20px 60px rgba(30,58,95,0.15)"}}>
            <button onClick={() => setShowJoinModal(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#64748b",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>Request to Join</h3>
            <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Send a message to {event.hostFull}</p>
            <div style={{marginBottom:"1rem"}}><label style={labelStyle}>Your Name</label><input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="Alex Smith" style={inputStyle}/></div>
            <div style={{marginBottom:"1.2rem"}}><label style={labelStyle}>Message (optional)</label><textarea value={joinMsg} onChange={e => setJoinMsg(e.target.value)} placeholder={`Hi ${event.hostFull.split(" ")[0]}, I'd love to join your ${event.sport} event!`} style={{...inputStyle,resize:"vertical" as const,minHeight:100}}/></div>
            <button className="btn" onClick={handleJoin} style={{width:"100%",padding:"0.85rem",background:c,color:event.color==="lime"?"#1e3a5f":"white",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem"}}>Send Request →</button>
          </div>
        </div>
      )}

      {toast && <div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,animation:"slideUp 0.3s ease",border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}
