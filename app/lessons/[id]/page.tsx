"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { email: string } | null;

const lessons = [
  { id:"1", type:"tennis", emoji:"🎾", sport:"Tennis", title:"Beginner to Intermediate Tennis Coaching", provider:"Coach Sarah Mitchell", bio:"Sarah has been coaching tennis in Melbourne for over 12 years. A former state-level competitor, she specialises in helping beginners build confidence and intermediate players sharpen technique. Her sessions are fun, structured, and tailored to your pace.", suburb:"Richmond", postcode:"3121", address:"Burnley Tennis Club, 500 Church St, Richmond", price:75, rating:4.9, reviews:82, featured:true, phone:"0412 345 678", email:"sarah@mitchelltennis.com.au", experience:"12 years", students:"200+", availability:["Monday 9am–12pm","Wednesday 9am–12pm","Saturday 8am–11am","Sunday 8am–11am"], tags:["Beginner Friendly","All Ages","Racquet Hire Available"] },
  { id:"2", type:"piano", emoji:"🎹", sport:"Piano", title:"Classical & Contemporary Piano for All Ages", provider:"James Okonkwo", bio:"James is a classically trained pianist with a degree from the Melbourne Conservatorium of Music. He teaches students of all ages and levels, from complete beginners to advanced players preparing for AMEB exams.", suburb:"Carlton", postcode:"3053", address:"Studio 4, 88 Lygon St, Carlton", price:65, rating:4.8, reviews:47, badge:"New", phone:"0423 456 789", email:"james@okonkwopiano.com.au", experience:"8 years", students:"120+", availability:["Tuesday 3pm–7pm","Thursday 3pm–7pm","Saturday 10am–4pm"], tags:["AMEB Exam Prep","All Ages","Keyboard Available"] },
  { id:"3", type:"swimming", emoji:"🏊", sport:"Swimming", title:"Adult Learn to Swim & Stroke Correction", provider:"Melbourne Aquatics", bio:"Melbourne Aquatics has helped hundreds of adults learn to swim or improve their technique. Our qualified instructors provide a safe, supportive environment for nervous beginners and serious lap swimmers alike.", suburb:"St Kilda", postcode:"3182", address:"St Kilda Sea Baths, 10 Jacka Blvd, St Kilda", price:55, rating:4.6, reviews:103, featured:true, phone:"0434 567 890", email:"info@melbourneaquatics.com.au", experience:"15 years", students:"500+", availability:["Monday 6am–8am","Wednesday 6am–8am","Friday 6am–8am","Saturday 7am–10am"], tags:["Adult Beginners","Stroke Correction","Heated Pool"] },
  { id:"4", type:"yoga", emoji:"🧘", sport:"Yoga", title:"Morning Vinyasa Flow – All Levels Welcome", provider:"Priya Sharma", bio:"Priya has been practising yoga for 15 years and teaching for 7. Her Vinyasa Flow classes blend breathwork, movement, and mindfulness to help students build strength, flexibility, and calm.", suburb:"South Yarra", postcode:"3141", address:"The Yoga Space, 22 Toorak Rd, South Yarra", price:40, rating:5.0, reviews:61, phone:"0445 678 901", email:"priya@priyayoga.com.au", experience:"7 years", students:"150+", availability:["Monday 7am–8am","Wednesday 7am–8am","Friday 7am–8am","Sunday 8am–9am"], tags:["All Levels","Mat Provided","Mindfulness Focus"] },
  { id:"5", type:"guitar", emoji:"🎸", sport:"Guitar", title:"Electric & Acoustic Guitar – Rock, Pop & Blues", provider:"Dan Caruso", bio:"Dan has been playing guitar professionally for 20 years, performing with multiple Melbourne bands. He teaches electric and acoustic guitar across rock, pop, blues, and fingerstyle — tailoring every lesson to what you actually want to play.", suburb:"Fitzroy", postcode:"3065", address:"Home studio, Fitzroy (address on booking)", price:70, rating:4.7, reviews:38, phone:"0456 789 012", email:"dan@carusoguitarlessons.com.au", experience:"20 years", students:"90+", availability:["Tuesday 4pm–8pm","Thursday 4pm–8pm","Saturday 12pm–5pm"], tags:["Electric & Acoustic","Rock/Blues/Pop","Loaner Guitar Available"] },
  { id:"6", type:"martial arts", emoji:"🥋", sport:"Martial Arts", title:"Brazilian Jiu-Jitsu – Kids & Adults Classes", provider:"Hawthorn BJJ Academy", bio:"Hawthorn BJJ Academy is one of Melbourne's most respected martial arts schools. Our qualified black belt instructors teach Brazilian Jiu-Jitsu for self-defence, fitness, and competition.", suburb:"Hawthorn", postcode:"3122", address:"Hawthorn BJJ Academy, 45 Burwood Rd, Hawthorn", price:60, rating:4.9, reviews:125, badge:"Popular", phone:"0467 890 123", email:"info@hawthornbjj.com.au", experience:"10 years", students:"300+", availability:["Monday 6pm–8pm","Wednesday 6pm–8pm","Friday 6pm–8pm","Saturday 9am–11am"], tags:["Kids & Adults","Self Defence","Competition Training"] },
];

export default function LessonDetail() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryMsg, setEnquiryMsg] = useState("");
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryEmail, setEnquiryEmail] = useState("");
  const [enquirySent, setEnquirySent] = useState(false);
  const [toast, setToast] = useState("");

  const lesson = lessons.find(l => l.id === params.id);

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
  const handleEnquiry = () => { setEnquirySent(true); setShowEnquiry(false); showToast("Enquiry sent! The provider will be in touch soon 📧"); };

  const inputStyle = { width:"100%", background:"#0d0d1a", border:"1px solid #2d2d5a", borderRadius:10, padding:"0.7rem 1rem", color:"#f0f0ff", fontSize:"0.9rem", outline:"none" };
  const labelStyle = { display:"block" as const, fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase" as const, color:"#7070a0", marginBottom:"0.4rem" };

  if (!lesson) return (
    <div style={{minHeight:"100vh",background:"#0d0d1f",display:"flex",alignItems:"center",justifyContent:"center",color:"#f0f0ff",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🔍</div>
        <div style={{fontSize:"1.2rem",marginBottom:"1rem"}}>Lesson not found</div>
        <button onClick={() => router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#FFD166",color:"#0d0d1f",border:"none",borderRadius:999,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#0d0d1f;color:#f0f0ff;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(13,13,31,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(255,209,102,0.1)"}}>
        <div onClick={() => router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#FFD166"}}>Play</span><span style={{color:"#FF6B6B"}}>Up</span>
        </div>
        <button className="btn" onClick={() => router.push("/")} style={{padding:"0.5rem 1.2rem",border:"1px solid #2d2d5a",borderRadius:999,background:"transparent",color:"#f0f0ff",fontSize:"0.85rem"}}>← Back to Listings</button>
      </nav>

      <div style={{background:"linear-gradient(135deg,#2D1B69,#1a1a3a)",padding:"4rem 2.5rem 3rem",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",fontSize:"20vw",top:"-1rem",right:"-1rem",opacity:0.05,pointerEvents:"none"}}>{lesson.emoji}</div>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#FFD166",background:"rgba(255,209,102,0.1)",padding:"0.3rem 0.8rem",borderRadius:999,border:"1px solid rgba(255,209,102,0.2)"}}>{lesson.sport}</span>
            {lesson.featured && <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:"#FF6B6B",color:"white"}}>Featured</span>}
            {lesson.badge && <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:"#FFD166",color:"#0d0d1f"}}>{lesson.badge}</span>}
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2rem,5vw,3.5rem)",lineHeight:1,marginBottom:"1rem",letterSpacing:1}}>{lesson.title}</h1>
          <div style={{display:"flex",alignItems:"center",gap:"1.5rem",flexWrap:"wrap",fontSize:"0.9rem",color:"#a0a0c0"}}>
            <span>👤 {lesson.provider}</span>
            <span>📍 {lesson.suburb} {lesson.postcode}</span>
            <span style={{color:"#FFB800"}}>{"★".repeat(Math.floor(lesson.rating))} <span style={{color:"#7070a0"}}>{lesson.rating} ({lesson.reviews} reviews)</span></span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"2.5rem",display:"grid",gridTemplateColumns:"1fr 320px",gap:"2rem",alignItems:"start"}}>
        <div style={{animation:"fadeInUp 0.4s ease"}}>
          <div style={{background:"#13132b",borderRadius:16,padding:"1.8rem",border:"1px solid rgba(255,209,102,0.08)",marginBottom:"1.5rem"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#FFD166"}}>About These Lessons</h2>
            <p style={{color:"#a0a0c0",lineHeight:1.8,fontSize:"0.95rem"}}>{lesson.bio}</p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
            {[["🎓",lesson.experience,"Experience"],["👥",lesson.students,"Students Taught"],["⭐",`${lesson.rating}/5`,"Rating"]].map(([icon,val,label]) => (
              <div key={label} style={{background:"#13132b",borderRadius:12,padding:"1.2rem",border:"1px solid rgba(255,209,102,0.08)",textAlign:"center"}}>
                <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>{icon}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",color:"#FFD166",letterSpacing:1}}>{val}</div>
                <div style={{fontSize:"0.75rem",color:"#7070a0"}}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{background:"#13132b",borderRadius:16,padding:"1.8rem",border:"1px solid rgba(255,209,102,0.08)",marginBottom:"1.5rem"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#FFD166"}}>Availability</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {lesson.availability.map(a => (
                <div key={a} style={{display:"flex",alignItems:"center",gap:"0.8rem",fontSize:"0.9rem",color:"#a0a0c0"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#FFD166",flexShrink:0}}/>
                  {a}
                </div>
              ))}
            </div>
          </div>

          <div style={{background:"#13132b",borderRadius:16,padding:"1.8rem",border:"1px solid rgba(255,209,102,0.08)",marginBottom:"1.5rem"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#FFD166"}}>Location</h2>
            <div style={{display:"flex",alignItems:"flex-start",gap:"0.8rem",fontSize:"0.9rem",color:"#a0a0c0"}}>
              <span style={{fontSize:"1.2rem"}}>📍</span>
              <div>
                <div style={{fontWeight:600,marginBottom:"0.2rem"}}>{lesson.address}</div>
                <div style={{color:"#7070a0",fontSize:"0.85rem"}}>{lesson.suburb} VIC {lesson.postcode}</div>
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
            {lesson.tags.map(tag => (
              <span key={tag} style={{padding:"0.4rem 1rem",borderRadius:999,fontSize:"0.8rem",fontWeight:500,border:"1px solid rgba(255,209,102,0.2)",color:"#FFD166",background:"rgba(255,209,102,0.05)"}}>✓ {tag}</span>
            ))}
          </div>
        </div>

        <div style={{position:"sticky",top:"5rem",animation:"fadeInUp 0.4s ease 0.1s both"}}>
          <div style={{background:"#13132b",borderRadius:20,border:"1px solid rgba(255,209,102,0.15)",overflow:"hidden"}}>
            <div style={{background:"linear-gradient(135deg,#2D1B69,#1a1a3a)",padding:"1.5rem",borderBottom:"1px solid rgba(255,209,102,0.1)"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.5rem",color:"#FFD166",letterSpacing:1,lineHeight:1}}>${lesson.price}</div>
              <div style={{fontSize:"0.85rem",color:"#7070a0",marginTop:"0.2rem"}}>per session · no lock-in contract</div>
            </div>
            <div style={{padding:"1.5rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.2rem",paddingBottom:"1.2rem",borderBottom:"1px solid rgba(255,209,102,0.07)"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#FFD166,#FF6B6B)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:"#0d0d1f",flexShrink:0}}>
                  {lesson.provider.split(" ").map(w=>w[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.9rem"}}>{lesson.provider}</div>
                  <div style={{fontSize:"0.8rem",color:"#7070a0"}}>{lesson.experience} experience</div>
                </div>
              </div>

              {enquirySent ? (
                <div style={{background:"rgba(255,209,102,0.1)",border:"1px solid rgba(255,209,102,0.2)",borderRadius:12,padding:"1rem",textAlign:"center",marginBottom:"1rem"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>✅</div>
                  <div style={{fontSize:"0.9rem",color:"#FFD166",fontWeight:600}}>Enquiry Sent!</div>
                  <div style={{fontSize:"0.8rem",color:"#7070a0",marginTop:"0.2rem"}}>The provider will be in touch soon</div>
                </div>
              ) : (
                <button className="btn" onClick={() => user ? setShowEnquiry(true) : router.push("/")}
                  style={{width:"100%",padding:"0.9rem",background:"#FFD166",color:"#0d0d1f",border:"none",borderRadius:12,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem"}}>
                  {user ? "📧 Send Enquiry" : "🔐 Log In to Enquire"}
                </button>
              )}

              {!user && <p style={{textAlign:"center",fontSize:"0.8rem",color:"#7070a0",marginBottom:"1rem"}}><span style={{color:"#FFD166",cursor:"pointer"}} onClick={() => router.push("/")}>Sign up free</span> to send an enquiry</p>}

              <div style={{display:"flex",flexDirection:"column",gap:"0.6rem",fontSize:"0.82rem",color:"#7070a0"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                  <span>📞</span>
                  {user ? <span style={{color:"#a0a0c0"}}>{lesson.phone}</span> : <span style={{fontStyle:"italic"}}>Log in to view</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                  <span>✉️</span>
                  {user ? <span style={{color:"#a0a0c0"}}>{lesson.email}</span> : <span style={{fontStyle:"italic"}}>Log in to view</span>}
                </div>
              </div>

              <div style={{marginTop:"1.2rem",paddingTop:"1.2rem",borderTop:"1px solid rgba(255,209,102,0.07)",fontSize:"0.78rem",color:"#4040a0",textAlign:"center"}}>✓ Free to enquire · No booking fees</div>
            </div>
          </div>
        </div>
      </div>

      {showEnquiry && (
        <div onClick={(e) => { if(e.target===e.currentTarget) setShowEnquiry(false); }}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"#1a1a3a",border:"1px solid rgba(255,209,102,0.15)",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease"}}>
            <button onClick={() => setShowEnquiry(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#7070a0",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem"}}>Send Enquiry</h3>
            <p style={{color:"#7070a0",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Message {lesson.provider} about this lesson</p>
            <div style={{marginBottom:"1rem"}}><label style={labelStyle}>Your Name</label><input value={enquiryName} onChange={e => setEnquiryName(e.target.value)} placeholder="Alex Smith" style={inputStyle}/></div>
            <div style={{marginBottom:"1rem"}}><label style={labelStyle}>Your Email</label><input value={enquiryEmail} onChange={e => setEnquiryEmail(e.target.value)} placeholder={user?.email || "you@email.com"} type="email" style={inputStyle}/></div>
            <div style={{marginBottom:"1.2rem"}}><label style={labelStyle}>Message</label><textarea value={enquiryMsg} onChange={e => setEnquiryMsg(e.target.value)} placeholder={`Hi ${lesson.provider.split(" ")[0]}, I'm interested in your ${lesson.sport} lessons...`} style={{...inputStyle,resize:"vertical" as const,minHeight:120}}/></div>
            <button className="btn" onClick={handleEnquiry} style={{width:"100%",padding:"0.85rem",background:"#FFD166",color:"#0d0d1f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem"}}>Send Enquiry →</button>
          </div>
        </div>
      )}

      {toast && <div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#FFD166",color:"#0d0d1f",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,animation:"slideUp 0.3s ease"}}>{toast}</div>}
    </>
  );
}
