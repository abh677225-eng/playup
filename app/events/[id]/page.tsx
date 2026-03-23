"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { email: string } | null;

const events = [
  {
    id:"1", emoji:"⚽", sport:"Soccer", color:"lime",
    title:"Casual 7-a-Side Soccer – Weekend Kick Around",
    host:"Marcus T.", hostFull:"Marcus Thompson", hostBio:"Marcus has been organising community soccer games in Fitzroy for 3 years. These are friendly, inclusive games — all fitness levels welcome. Just show up ready to have fun!",
    location:"Edinburgh Gardens, Fitzroy North", postcode:"3068",
    date:"Saturday 22 Mar", time:"9:00 AM", duration:"2 hours",
    joined:5, total:7, cost:"Free",
    skillLevel:"All levels", ageGroup:"18+",
    whatToBring:["Boots or runners","Water bottle","Shin guards (optional)"],
    description:"A casual and friendly 7-a-side soccer game at Edinburgh Gardens. We play every weekend and welcome players of all skill levels. The vibe is social and fun — we usually grab a coffee nearby after the game. No experience needed, just enthusiasm!",
    rules:["Friendly play only — no rough tackles","Rotate teams every 20 minutes","Bring your own water"],
  },
  {
    id:"2", emoji:"🎾", sport:"Tennis", color:"orange",
    title:"Doubles Tennis – Intermediate Level Players",
    host:"Anika R.", hostFull:"Anika Rao", hostBio:"Anika is a keen tennis player who plays socially 3–4 times a week. She organises doubles matches for intermediate players who want a competitive but friendly hit.",
    location:"Burnley Tennis Club, Richmond", postcode:"3121",
    date:"Sunday 23 Mar", time:"7:30 AM", duration:"1.5 hours",
    joined:1, total:4, cost:"$10 court split",
    skillLevel:"Intermediate", ageGroup:"All ages",
    whatToBring:["Your own racquet","$10 cash for court fees","Water bottle"],
    description:"Looking for 3 more players for a doubles tennis session at Burnley Tennis Club. This is for intermediate players — you should be comfortable rallying and serving consistently. We rotate partners every set to keep it fun and fair.",
    rules:["Intermediate level preferred","Court fee split equally","Arrive 10 mins early to warm up"],
  },
  {
    id:"3", emoji:"🏀", sport:"Basketball", color:"blue",
    title:"3-on-3 Street Basketball – All Welcome",
    host:"Dev P.", hostFull:"Dev Patel", hostBio:"Dev runs weekly basketball meetups at the Docklands courts. He's passionate about keeping the sport accessible and fun for everyone, from beginners to experienced ballers.",
    location:"Docklands Basketball Courts", postcode:"3008",
    date:"Saturday 22 Mar", time:"3:00 PM", duration:"2 hours",
    joined:1, total:6, cost:"Free",
    skillLevel:"All levels", ageGroup:"16+",
    whatToBring:["Basketball shoes","Water","Positive attitude"],
    description:"Weekly 3-on-3 street basketball at the Docklands outdoor courts. We run multiple games simultaneously so everyone gets plenty of court time. Whether you're a seasoned player or just picking up the sport, you're welcome here. Games are competitive but friendly.",
    rules:["Call your own fouls","Winners stay on court","Rotate in every 2 games"],
  },
];

export default function EventDetail() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [joined, setJoined] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joinSent, setJoinSent] = useState(false);
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const handleJoin = () => {
    setJoined(true);
    setJoinSent(true);
    setShowJoinModal(false);
    showToast("Request sent! The host will confirm you 🎉");
  };

  if (!event) return (
    <div style={{minHeight:"100vh",background:"#0F1A0A",display:"flex",alignItems:"center",justifyContent:"center",color:"#e8f5d8",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🔍</div>
        <div style={{fontSize:"1.2rem",marginBottom:"1rem"}}>Event not found</div>
        <button onClick={() => router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#C8F135",color:"#0F1A0A",border:"none",borderRadius:999,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
      </div>
    </div>
  );

  const colorMap: Record<string, string> = { lime:"#C8F135", orange:"#FF6B35", blue:"#35C8F1" };
  const c = colorMap[event.color];
  const spotsLeft = event.total - event.joined;

  const inputStyle = { width:"100%", background:"#172510", border:"1px solid #3a5a2a", borderRadius:10, padding:"0.7rem 1rem", color:"#e8f5d8", fontSize:"0.9rem", outline:"none" };
  const labelStyle = { display:"block" as const, fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase" as const, color:"#8aab72", marginBottom:"0.4rem" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#0F1A0A;color:#e8f5d8;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(15,26,10,0.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(200,241,53,0.1)"}}>
        <div onClick={() => router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",color:"#C8F135",letterSpacing:2,cursor:"pointer"}}>
          Play<span style={{color:"#FF6B35"}}>Up</span>
        </div>
        <button className="btn" onClick={() => router.push("/")} style={{padding:"0.5rem 1.2rem",border:"1px solid #3a5a2a",borderRadius:999,background:"transparent",color:"#e8f5d8",fontSize:"0.85rem"}}>
          ← Back to Events
        </button>
      </nav>

      {/* HERO BANNER */}
      <div style={{background:`linear-gradient(135deg,#1a2a1a,#2a3a1a)`,padding:"4rem 2.5rem 3rem",position:"relative",overflow:"hidden",borderBottom:`3px solid ${c}`}}>
        <div style={{position:"absolute",fontSize:"20vw",top:"-1rem",right:"-1rem",opacity:0.05,pointerEvents:"none"}}>{event.emoji}</div>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:c,background:`${c}15`,padding:"0.3rem 0.8rem",borderRadius:999,border:`1px solid ${c}30`}}>{event.sport}</span>
            <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:spotsLeft<=2?"rgba(255,107,53,0.15)":"rgba(200,241,53,0.1)",color:spotsLeft<=2?"#FF6B35":"#C8F135",border:`1px solid ${spotsLeft<=2?"rgba(255,107,53,0.3)":"rgba(200,241,53,0.2)"}`}}>
              {spotsLeft <= 2 ? `⚡ Only ${spotsLeft} spot${spotsLeft===1?"":"s"} left!` : `${spotsLeft} spots available`}
            </span>
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2rem,5vw,3.5rem)",lineHeight:1,marginBottom:"1rem",letterSpacing:1}}>{event.title}</h1>
          <div style={{display:"flex",alignItems:"center",gap:"1.5rem",flexWrap:"wrap",fontSize:"0.9rem",color:"#8aab72"}}>
            <span>👤 Hosted by {event.hostFull}</span>
            <span>📍 {event.location}</span>
            <span>📅 {event.date} at {event.time}</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"2.5rem",display:"grid",gridTemplateColumns:"1fr 300px",gap:"2rem",alignItems:"start"}}>

        {/* LEFT */}
        <div style={{animation:"fadeInUp 0.4s ease"}}>

          {/* ABOUT */}
          <div style={{background:"#172510",borderRadius:16,padding:"1.8rem",border:"1px solid rgba(200,241,53,0.07)",marginBottom:"1.5rem"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#C8F135"}}>About This Event</h2>
            <p style={{color:"#b8d8a8",lineHeight:1.8,fontSize:"0.95rem"}}>{event.description}</p>
          </div>

          {/* QUICK STATS */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
            {[["🎯",event.skillLevel,"Skill Level"],["👥",event.ageGroup,"Age Group"],["⏱️",event.duration,"Duration"]].map(([icon,val,label]) => (
              <div key={label} style={{background:"#172510",borderRadius:12,padding:"1.2rem",border:"1px solid rgba(200,241,53,0.07)",textAlign:"center"}}>
                <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>{icon}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:c,letterSpacing:1}}>{val}</div>
                <div style={{fontSize:"0.75rem",color:"#8aab72"}}>{label}</div>
              </div>
            ))}
          </div>

          {/* WHAT TO BRING */}
          <div style={{background:"#172510",borderRadius:16,padding:"1.8rem",border:"1px solid rgba(200,241,53,0.07)",marginBottom:"1.5rem"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#C8F135"}}>What to Bring</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {event.whatToBring.map(item => (
                <div key={item} style={{display:"flex",alignItems:"center",gap:"0.8rem",fontSize:"0.9rem",color:"#b8d8a8"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0}}/>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* RULES */}
          <div style={{background:"#172510",borderRadius:16,padding:"1.8rem",border:"1px solid rgba(200,241,53,0.07)",marginBottom:"1.5rem"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#C8F135"}}>House Rules</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {event.rules.map((rule,i) => (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"0.8rem",fontSize:"0.9rem",color:"#b8d8a8"}}>
                  <span style={{color:c,fontWeight:700,flexShrink:0}}>{i+1}.</span>
                  {rule}
                </div>
              ))}
            </div>
          </div>

          {/* LOCATION */}
          <div style={{background:"#172510",borderRadius:16,padding:"1.8rem",border:"1px solid rgba(200,241,53,0.07)"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#C8F135"}}>Location</h2>
            <div style={{display:"flex",alignItems:"flex-start",gap:"0.8rem",fontSize:"0.9rem",color:"#b8d8a8"}}>
              <span style={{fontSize:"1.2rem"}}>📍</span>
              <div>
                <div style={{fontWeight:600,marginBottom:"0.2rem"}}>{event.location}</div>
                <div style={{color:"#8aab72",fontSize:"0.85rem"}}>Postcode {event.postcode} · Melbourne VIC</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — JOIN CARD */}
        <div style={{position:"sticky",top:"5rem",animation:"fadeInUp 0.4s ease 0.1s both"}}>
          <div style={{background:"#172510",borderRadius:20,border:`1px solid ${c}30`,overflow:"hidden"}}>

            {/* HEADER */}
            <div style={{background:"linear-gradient(135deg,#1C2E12,#0d2010)",padding:"1.5rem",borderBottom:"1px solid rgba(200,241,53,0.1)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:c,letterSpacing:1}}>{event.date}</div>
              </div>
              <div style={{fontSize:"0.9rem",color:"#8aab72"}}>{event.time} · {event.duration}</div>
              <div style={{marginTop:"0.8rem",fontSize:"1rem",fontWeight:700,color:event.cost==="Free"?"#C8F135":"#e8f5d8"}}>{event.cost === "Free" ? "🎉 Free to join" : `💰 ${event.cost}`}</div>
            </div>

            <div style={{padding:"1.5rem"}}>

              {/* HOST */}
              <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.2rem",paddingBottom:"1.2rem",borderBottom:"1px solid rgba(200,241,53,0.07)"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${c},#3a5a2a)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:"#0F1A0A",flexShrink:0}}>
                  {event.hostFull.split(" ").map(w=>w[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.9rem"}}>{event.hostFull}</div>
                  <div style={{fontSize:"0.8rem",color:"#8aab72"}}>Event Host</div>
                </div>
              </div>

              {/* HOST BIO */}
              <p style={{fontSize:"0.82rem",color:"#8aab72",lineHeight:1.6,marginBottom:"1.2rem"}}>{event.hostBio}</p>

              {/* SPOTS */}
              <div style={{background:`${c}10`,border:`1px solid ${c}25`,borderRadius:12,padding:"0.8rem 1rem",marginBottom:"1.2rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:"0.85rem",color:"#8aab72"}}>Spots filled</span>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",color:c,letterSpacing:1}}>{event.joined}/{event.total}</span>
              </div>

              {/* AVATARS */}
              <div style={{display:"flex",marginBottom:"1.2rem"}}>
                {["#C8F135","#FF6B35","#35C8F1","#F135C8"].slice(0,Math.min(event.joined,4)).map((bg,j) => (
                  <div key={j} style={{width:32,height:32,borderRadius:"50%",border:"2px solid #172510",marginLeft:j===0?0:-10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",fontWeight:700,color:"#0F1A0A"}}>
                    {event.host.split(" ").map((w:string)=>w[0]).join("").slice(0,2)}
                  </div>
                ))}
                {event.joined > 0 && <div style={{marginLeft:8,fontSize:"0.8rem",color:"#8aab72",display:"flex",alignItems:"center"}}>{event.joined} going</div>}
              </div>

              {/* JOIN BUTTON */}
              {joinSent ? (
                <div style={{background:"rgba(200,241,53,0.1)",border:"1px solid rgba(200,241,53,0.2)",borderRadius:12,padding:"1rem",textAlign:"center",marginBottom:"0.8rem"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>✅</div>
                  <div style={{fontSize:"0.9rem",color:"#C8F135",fontWeight:600}}>Request Sent!</div>
                  <div style={{fontSize:"0.8rem",color:"#8aab72",marginTop:"0.2rem"}}>The host will confirm you soon</div>
                </div>
              ) : (
                <button className="btn"
                  onClick={() => user ? setShowJoinModal(true) : router.push("/")}
                  style={{width:"100%",padding:"0.9rem",background:c,color:"#0F1A0A",border:"none",borderRadius:12,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem"}}>
                  {user ? `${event.emoji} Request to Join` : "🔐 Log In to Join"}
                </button>
              )}

              {!user && (
                <p style={{textAlign:"center",fontSize:"0.8rem",color:"#8aab72"}}>
                  <span style={{color:"#C8F135",cursor:"pointer"}} onClick={() => router.push("/")}>Sign up free</span> to join this event
                </p>
              )}

              <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid rgba(200,241,53,0.07)",fontSize:"0.78rem",color:"#3a5a2a",textAlign:"center"}}>
                ✓ Free to request · Host confirms your spot
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div onClick={(e) => { if(e.target===e.currentTarget) setShowJoinModal(false); }}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"#1C2E12",border:"1px solid rgba(200,241,53,0.15)",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease"}}>
            <button onClick={() => setShowJoinModal(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#8aab72",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem"}}>Request to Join</h3>
            <p style={{color:"#8aab72",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Send a message to {event.hostFull}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={labelStyle}>Your Name</label>
              <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="Alex Smith" style={inputStyle}/>
            </div>
            <div style={{marginBottom:"1.2rem"}}>
              <label style={labelStyle}>Message (optional)</label>
              <textarea value={joinMsg} onChange={e => setJoinMsg(e.target.value)}
                placeholder={`Hi ${event.hostFull.split(" ")[0]}, I'd love to join your ${event.sport} event! I'm a ${event.skillLevel.toLowerCase()} player and I'm available on ${event.date}.`}
                style={{...inputStyle,resize:"vertical",minHeight:100}}/>
            </div>
            <button className="btn" onClick={handleJoin}
              style={{width:"100%",padding:"0.85rem",background:c,color:"#0F1A0A",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem"}}>
              Send Request →
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#C8F135",color:"#0F1A0A",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,animation:"slideUp 0.3s ease"}}>
          {toast}
        </div>
      )}
    </>
  );
}
