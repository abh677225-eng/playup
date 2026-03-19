"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type User = { email: string } | null;

export default function PlayUp() {
  const [activeTab, setActiveTab] = useState<"lessons"|"events">("lessons");
  const [activeFilter, setActiveFilter] = useState("all");
  const [modal, setModal] = useState<string|null>(null);
  const [toast, setToast] = useState("");
  const [joinedEvents, setJoinedEvents] = useState<number[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchPostcode, setSearchPostcode] = useState("");
  const [user, setUser] = useState<User>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Check if user is already logged in
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
    setTimeout(() => setToast(""), 4000);
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setModal(null);
      setEmail(""); setPassword("");
      showToast("Welcome back! You're logged in 🎉");
    }
  };

  const handleSignup = async () => {
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } }
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setModal(null);
      setEmail(""); setPassword(""); setFirstName(""); setLastName("");
      showToast("Account created! Check your email to confirm your account 📧");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showToast("You've been logged out. See you soon!");
  };

  const lessons = [
    { id:1, type:"tennis", emoji:"🎾", sport:"Tennis", title:"Beginner to Intermediate Tennis Coaching", provider:"Coach Sarah Mitchell", suburb:"Richmond", postcode:"3121", price:75, rating:4.9, reviews:82, featured:true },
    { id:2, type:"piano", emoji:"🎹", sport:"Piano", title:"Classical & Contemporary Piano for All Ages", provider:"James Okonkwo", suburb:"Carlton", postcode:"3053", price:65, rating:4.8, reviews:47, badge:"New" },
    { id:3, type:"swimming", emoji:"🏊", sport:"Swimming", title:"Adult Learn to Swim & Stroke Correction", provider:"Melbourne Aquatics", suburb:"St Kilda", postcode:"3182", price:55, rating:4.6, reviews:103, featured:true },
    { id:4, type:"yoga", emoji:"🧘", sport:"Yoga", title:"Morning Vinyasa Flow – All Levels Welcome", provider:"Priya Sharma", suburb:"South Yarra", postcode:"3141", price:40, rating:5.0, reviews:61 },
    { id:5, type:"guitar", emoji:"🎸", sport:"Guitar", title:"Electric & Acoustic Guitar – Rock, Pop & Blues", provider:"Dan Caruso", suburb:"Fitzroy", postcode:"3065", price:70, rating:4.7, reviews:38 },
    { id:6, type:"martial arts", emoji:"🥋", sport:"Martial Arts", title:"Brazilian Jiu-Jitsu – Kids & Adults Classes", provider:"Hawthorn BJJ Academy", suburb:"Hawthorn", postcode:"3122", price:60, rating:4.9, reviews:125, badge:"Popular" },
  ];

  const events = [
    { id:1, emoji:"⚽", sport:"Soccer", title:"Casual 7-a-Side Soccer – Weekend Kick Around", host:"Marcus T.", location:"Edinburgh Gardens, Fitzroy North", postcode:"3068", date:"Saturday 22 Mar, 9:00 AM", joined:5, total:7, cost:"Free", color:"lime" },
    { id:2, emoji:"🎾", sport:"Tennis", title:"Doubles Tennis – Intermediate Level Players", host:"Anika R.", location:"Burnley Tennis Club, Richmond", postcode:"3121", date:"Sunday 23 Mar, 7:30 AM", joined:1, total:4, cost:"$10 court split", color:"orange" },
    { id:3, emoji:"🏀", sport:"Basketball", title:"3-on-3 Street Basketball – All Welcome", host:"Dev P.", location:"Docklands Basketball Courts", postcode:"3008", date:"Saturday 22 Mar, 3:00 PM", joined:1, total:6, cost:"Free", color:"blue" },
  ];

  const filtered = lessons.filter(l => {
    const matchesType = activeFilter === "all" || l.type === activeFilter;
    const matchesText = searchText === "" || l.title.toLowerCase().includes(searchText.toLowerCase()) || l.sport.toLowerCase().includes(searchText.toLowerCase()) || l.provider.toLowerCase().includes(searchText.toLowerCase());
    const matchesPostcode = searchPostcode === "" || l.postcode.includes(searchPostcode) || l.suburb.toLowerCase().includes(searchPostcode.toLowerCase());
    return matchesType && matchesText && matchesPostcode;
  });

  const filteredEvents = events.filter(e => {
    const matchesPostcode = searchPostcode === "" || e.postcode.includes(searchPostcode) || e.location.toLowerCase().includes(searchPostcode.toLowerCase());
    return matchesPostcode;
  });

  const colorMap: Record<string, string> = { lime:"#C8F135", orange:"#FF6B35", blue:"#35C8F1" };

  const inputStyle = {
    width:"100%", background:"#172510", border:"1px solid #3a5a2a",
    borderRadius:10, padding:"0.7rem 1rem", color:"#e8f5d8",
    fontSize:"0.9rem", outline:"none"
  };

  const labelStyle = {
    display:"block" as const, fontSize:"0.78rem", fontWeight:700,
    letterSpacing:0.8, textTransform:"uppercase" as const,
    color:"#8aab72", marginBottom:"0.4rem"
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#0F1A0A;color:#e8f5d8;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        input,select,textarea{font-family:'DM Sans',sans-serif;}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
      `}</style>

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(15,26,10,0.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(200,241,53,0.1)"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",color:"#C8F135",letterSpacing:2}}>
          Play<span style={{color:"#FF6B35"}}>Up</span>
        </div>
        <div style={{display:"flex",gap:"2rem"}}>
          {["Lessons","Events"].map(t => (
            <button key={t} className="btn" onClick={() => setActiveTab(t.toLowerCase() as "lessons"|"events")}
              style={{background:"none",border:"none",color:activeTab===t.toLowerCase()?"#C8F135":"#8aab72",fontWeight:600,fontSize:"0.9rem"}}>
              {t}
            </button>
          ))}
          <button className="btn" onClick={() => setModal("provider")} style={{background:"none",border:"none",color:"#8aab72",fontWeight:600,fontSize:"0.9rem"}}>List Your Lessons</button>
        </div>
        <div style={{display:"flex",gap:"0.8rem",alignItems:"center"}}>
          {user ? (
            <>
              <span style={{fontSize:"0.85rem",color:"#8aab72"}}>👋 {user.email.split("@")[0]}</span>
              <button className="btn" onClick={handleLogout} style={{padding:"0.5rem 1.2rem",border:"1px solid #3a5a2a",borderRadius:999,background:"transparent",color:"#e8f5d8",fontSize:"0.85rem"}}>Log Out</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => { setAuthError(""); setModal("login"); }} style={{padding:"0.5rem 1.2rem",border:"1px solid #3a5a2a",borderRadius:999,background:"transparent",color:"#e8f5d8",fontSize:"0.85rem"}}>Log In</button>
              <button className="btn" onClick={() => { setAuthError(""); setModal("signup"); }} style={{padding:"0.5rem 1.4rem",border:"none",borderRadius:999,background:"#C8F135",color:"#0F1A0A",fontWeight:700,fontSize:"0.85rem"}}>Sign Up Free</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{padding:"5rem 2.5rem 3rem",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",fontFamily:"'Bebas Neue',sans-serif",fontSize:"28vw",color:"rgba(200,241,53,0.03)",top:"-2rem",right:"-2rem",lineHeight:1,pointerEvents:"none",userSelect:"none"}}>PLAY</div>
        <div style={{display:"inline-block",background:"rgba(200,241,53,0.1)",color:"#C8F135",fontSize:"0.75rem",fontWeight:700,letterSpacing:2,textTransform:"uppercase",padding:"0.35rem 1rem",borderRadius:999,marginBottom:"1.5rem",border:"1px solid rgba(200,241,53,0.2)"}}>🏙️ Now in Melbourne</div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(3.5rem,8vw,7rem)",lineHeight:0.95,marginBottom:"1.5rem",maxWidth:700}}>
          Find Your<br/><span style={{color:"#C8F135"}}>Perfect Game</span>
        </h1>
        <p style={{fontSize:"1.05rem",color:"#8aab72",maxWidth:480,lineHeight:1.7,marginBottom:"2.5rem"}}>
          Book lessons from local experts, or find people to play with. Tennis, piano, yoga, soccer — whatever your game, PlayUp connects you.
        </p>
        <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
          <button className="btn" onClick={() => setActiveTab("lessons")} style={{padding:"0.85rem 2rem",fontSize:"1rem",borderRadius:999,fontWeight:700,background:"#C8F135",color:"#0F1A0A",border:"none"}}>Find Lessons</button>
          <button className="btn" onClick={() => setActiveTab("events")} style={{padding:"0.85rem 2rem",fontSize:"1rem",borderRadius:999,fontWeight:700,background:"transparent",color:"#e8f5d8",border:"1px solid #3a5a2a"}}>Join an Event</button>
        </div>
      </section>

      {/* STATS */}
      <div style={{display:"flex",gap:"3rem",padding:"2rem 2.5rem",borderTop:"1px solid rgba(200,241,53,0.07)",borderBottom:"1px solid rgba(200,241,53,0.07)",flexWrap:"wrap"}}>
        {[["240+","Lesson Providers"],["18","Sports & Activities"],["3,100+","Players in Melbourne"],["4.8 ⭐","Average Rating"]].map(([n,l]) => (
          <div key={l}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",color:"#C8F135",letterSpacing:1}}>{n}</div>
            <div style={{fontSize:"0.8rem",color:"#8aab72"}}>{l}</div>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <section style={{padding:"2.5rem 2.5rem"}}>
        <div style={{display:"flex",gap:"0.5rem",background:"#172510",border:"1px solid #3a5a2a",borderRadius:16,padding:"0.6rem",maxWidth:900,flexWrap:"wrap"}}>
          <input placeholder="Search lessons, sports, activities..." value={searchText} onChange={e => setSearchText(e.target.value)}
            style={{flex:2,background:"transparent",border:"none",outline:"none",color:"#e8f5d8",fontSize:"0.95rem",padding:"0.4rem 0.8rem",minWidth:160}}/>
          <div style={{width:1,background:"#3a5a2a",margin:"0.2rem 0"}}/>
          <input placeholder="Postcode or suburb..." value={searchPostcode} onChange={e => setSearchPostcode(e.target.value)}
            style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e8f5d8",fontSize:"0.95rem",padding:"0.4rem 0.8rem",minWidth:140}}/>
          <div style={{width:1,background:"#3a5a2a",margin:"0.2rem 0"}}/>
          <select style={{background:"transparent",border:"none",outline:"none",color:"#8aab72",fontSize:"0.9rem",padding:"0.4rem 0.8rem",cursor:"pointer"}} onChange={e => setSearchPostcode(e.target.value)}>
            <option value="">All Melbourne</option>
            {[["Richmond","3121"],["Fitzroy","3065"],["St Kilda","3182"],["South Yarra","3141"],["Carlton","3053"],["Hawthorn","3122"],["Toorak","3142"],["Docklands","3008"]].map(([s,p]) => (
              <option key={p} value={p}>{s} {p}</option>
            ))}
          </select>
          <button className="btn" style={{borderRadius:10,padding:"0.5rem 1.2rem",background:"#C8F135",color:"#0F1A0A",border:"none",fontWeight:700}}>Search</button>
        </div>
        {(searchPostcode || searchText) && (
          <div style={{marginTop:"0.8rem",fontSize:"0.82rem",color:"#8aab72",display:"flex",alignItems:"center",gap:"0.8rem"}}>
            {searchPostcode && <span>📍 Filtering by: <strong style={{color:"#C8F135"}}>{searchPostcode}</strong></span>}
            {searchText && <span>🔍 Searching: <strong style={{color:"#C8F135"}}>{searchText}</strong></span>}
            <button className="btn" onClick={() => { setSearchPostcode(""); setSearchText(""); }} style={{background:"rgba(200,241,53,0.1)",border:"1px solid rgba(200,241,53,0.2)",color:"#C8F135",borderRadius:999,padding:"0.2rem 0.7rem",fontSize:"0.75rem"}}>Clear ✕</button>
          </div>
        )}
        <div style={{display:"flex",gap:"0.6rem",marginTop:"1rem",flexWrap:"wrap"}}>
          {[["all","All"],["tennis","🎾 Tennis"],["piano","🎹 Piano"],["swimming","🏊 Swimming"],["yoga","🧘 Yoga"],["guitar","🎸 Guitar"],["martial arts","🥋 Martial Arts"]].map(([val,label]) => (
            <button key={val} className="btn" onClick={() => setActiveFilter(val)}
              style={{padding:"0.4rem 1rem",borderRadius:999,fontSize:"0.8rem",fontWeight:500,border:`1px solid ${activeFilter===val?"#C8F135":"#3a5a2a"}`,color:activeFilter===val?"#C8F135":"#8aab72",background:activeFilter===val?"rgba(200,241,53,0.07)":"transparent"}}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* TABS */}
      <div style={{display:"flex",padding:"0 2.5rem",borderBottom:"1px solid rgba(200,241,53,0.08)",marginBottom:"2rem"}}>
        {[["lessons","📚 Lessons"],["events","🏃 Community Events"]].map(([val,label]) => (
          <button key={val} className="btn" onClick={() => setActiveTab(val as "lessons"|"events")}
            style={{padding:"0.9rem 1.8rem",fontSize:"0.9rem",fontWeight:600,color:activeTab===val?"#C8F135":"#8aab72",background:"none",border:"none",borderBottom:`2px solid ${activeTab===val?"#C8F135":"transparent"}`}}>
            {label}
          </button>
        ))}
      </div>

      {/* LESSONS */}
      {activeTab === "lessons" && (
        <section style={{padding:"0 2.5rem 3rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1}}>
              {filtered.length > 0 ? `${filtered.length} Lesson${filtered.length===1?"":"s"} Found` : "No Lessons Found"}
            </div>
            <span style={{fontSize:"0.85rem",color:"#C8F135",cursor:"pointer",fontWeight:600}}>See all →</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"3rem",color:"#8aab72"}}>
              <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🔍</div>
              <div style={{fontSize:"1rem",marginBottom:"0.5rem"}}>No lessons found for that search</div>
              <button className="btn" onClick={() => { setSearchPostcode(""); setSearchText(""); setActiveFilter("all"); }} style={{marginTop:"1rem",background:"rgba(200,241,53,0.1)",border:"1px solid rgba(200,241,53,0.2)",color:"#C8F135",borderRadius:999,padding:"0.5rem 1.2rem",fontSize:"0.85rem"}}>Clear Search</button>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1.2rem"}}>
              {filtered.map((l,i) => (
                <div key={l.id} style={{background:"#172510",borderRadius:16,overflow:"hidden",border:"1px solid rgba(200,241,53,0.07)",cursor:"pointer",animation:`fadeInUp 0.4s ease ${i*0.05}s both`,transition:"all 0.25s"}}
                  onMouseEnter={e => {(e.currentTarget as HTMLDivElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLDivElement).style.borderColor="rgba(200,241,53,0.25)";}}
                  onMouseLeave={e => {(e.currentTarget as HTMLDivElement).style.transform="translateY(0)";(e.currentTarget as HTMLDivElement).style.borderColor="rgba(200,241,53,0.07)";}}>
                  <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"4rem",position:"relative",background:`linear-gradient(135deg, #1a2a1a, #2a4a2a)`}}>
                    {l.emoji}
                    {(l.featured || l.badge) && (
                      <div style={{position:"absolute",top:"0.8rem",right:"0.8rem",background:l.featured?"#FF6B35":"#C8F135",color:l.featured?"white":"#0F1A0A",fontSize:"0.7rem",fontWeight:800,padding:"0.25rem 0.6rem",borderRadius:999}}>
                        {l.featured ? "Featured" : l.badge}
                      </div>
                    )}
                  </div>
                  <div style={{padding:"1.2rem"}}>
                    <div style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#C8F135",marginBottom:"0.4rem"}}>{l.sport}</div>
                    <div style={{fontSize:"1rem",fontWeight:700,marginBottom:"0.3rem",lineHeight:1.3}}>{l.title}</div>
                    <div style={{fontSize:"0.8rem",color:"#8aab72",marginBottom:"0.8rem"}}>with {l.provider}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:"0.8rem"}}>
                      <span style={{color:"#8aab72"}}>📍 {l.suburb} <span style={{color:"#3a5a2a"}}>{l.postcode}</span></span>
                      <span style={{fontWeight:700,fontSize:"0.95rem"}}>${l.price} <span style={{fontSize:"0.7rem",color:"#8aab72",fontWeight:400}}>/session</span></span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"0.3rem",fontSize:"0.8rem",color:"#8aab72",marginTop:"0.6rem"}}>
                      <span style={{color:"#FFB800"}}>{"★".repeat(Math.floor(l.rating))}{"☆".repeat(5-Math.floor(l.rating))}</span>
                      {l.rating} ({l.reviews} reviews)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* EVENTS */}
      {activeTab === "events" && (
        <section style={{padding:"0 2.5rem 3rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1}}>
              {filteredEvents.length > 0 ? `${filteredEvents.length} Event${filteredEvents.length===1?"":"s"} Near You` : "No Events Found"}
            </div>
            <button className="btn" onClick={() => user ? setModal("event") : setModal("login")} style={{borderRadius:999,fontSize:"0.85rem",padding:"0.5rem 1.2rem",background:"#C8F135",color:"#0F1A0A",border:"none",fontWeight:700}}>+ Create Event</button>
          </div>
          {filteredEvents.length === 0 ? (
            <div style={{textAlign:"center",padding:"3rem",color:"#8aab72"}}>
              <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🏃</div>
              <div style={{fontSize:"1rem",marginBottom:"0.5rem"}}>No events found for that postcode</div>
              <button className="btn" onClick={() => setSearchPostcode("")} style={{marginTop:"1rem",background:"rgba(200,241,53,0.1)",border:"1px solid rgba(200,241,53,0.2)",color:"#C8F135",borderRadius:999,padding:"0.5rem 1.2rem",fontSize:"0.85rem"}}>Clear Search</button>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:"1.2rem"}}>
              {filteredEvents.map((ev,i) => {
                const c = colorMap[ev.color];
                const spotsLeft = ev.total - ev.joined;
                return (
                  <div key={ev.id} style={{background:"#172510",borderRadius:16,padding:"1.4rem",border:"1px solid rgba(200,241,53,0.07)",cursor:"pointer",position:"relative",overflow:"hidden",animation:`fadeInUp 0.4s ease ${i*0.05}s both`,transition:"all 0.25s",borderTop:`3px solid ${c}`}}
                    onMouseEnter={e => {(e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)";}}
                    onMouseLeave={e => {(e.currentTarget as HTMLDivElement).style.transform="translateY(0)";}}>
                    <div style={{fontSize:"2.2rem",marginBottom:"0.5rem"}}>{ev.emoji}</div>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"1rem"}}>
                      <div style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:c}}>{ev.sport}</div>
                      <span style={{background:`${c}18`,color:c,border:`1px solid ${c}33`,fontSize:"0.75rem",fontWeight:700,padding:"0.3rem 0.7rem",borderRadius:999}}>
                        {spotsLeft <= 2 ? `${spotsLeft} spot${spotsLeft===1?"":"s"} left!` : `${spotsLeft} spots`}
                      </span>
                    </div>
                    <div style={{fontSize:"1.05rem",fontWeight:700,marginBottom:"0.4rem",lineHeight:1.3}}>{ev.title}</div>
                    <div style={{fontSize:"0.82rem",color:"#8aab72",marginBottom:"1rem"}}>Hosted by {ev.host}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:"0.4rem",marginBottom:"1.2rem"}}>
                      {[["📅",ev.date],["📍",`${ev.location} (${ev.postcode})`],["👥",`${ev.joined} joined · looking for ${spotsLeft} more`],["💰",ev.cost]].map(([icon,text]) => (
                        <div key={text} style={{display:"flex",alignItems:"center",gap:"0.6rem",fontSize:"0.82rem",color:"#8aab72"}}>
                          <span>{icon}</span><span>{text}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex"}}>
                        {["#C8F135","#FF6B35","#35C8F1","#F135C8"].slice(0,Math.min(ev.joined,4)).map((bg,j) => (
                          <div key={j} style={{width:28,height:28,borderRadius:"50%",border:"2px solid #172510",marginLeft:j===0?0:-8,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.65rem",fontWeight:700,color:"#0F1A0A"}}>
                            {ev.host.split(" ").map((w:string)=>w[0]).join("").slice(0,2)}
                          </div>
                        ))}
                      </div>
                      <button className="btn"
                        onClick={() => {
                          if (!user) { setModal("login"); return; }
                          setJoinedEvents(p => [...p, ev.id]);
                          showToast("Request sent! The host will confirm you.");
                        }}
                        disabled={joinedEvents.includes(ev.id)}
                        style={{padding:"0.5rem 1.2rem",background:joinedEvents.includes(ev.id)?"#3a5a2a":c,color:joinedEvents.includes(ev.id)?"#8aab72":"#0F1A0A",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",opacity:joinedEvents.includes(ev.id)?0.7:1}}>
                        {joinedEvents.includes(ev.id) ? "Requested ✓" : "Request to Join"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* PROVIDER BANNER */}
      <div style={{margin:"0 2.5rem 3rem",background:"linear-gradient(135deg,#1C2E12,#0d2010)",border:"1px solid rgba(200,241,53,0.15)",borderRadius:20,padding:"2.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"2rem",flexWrap:"wrap"}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:1,marginBottom:"0.5rem"}}>Are You a <span style={{color:"#C8F135"}}>Lesson Provider?</span></h2>
          <p style={{color:"#8aab72",fontSize:"0.9rem",maxWidth:400,lineHeight:1.6}}>List your lessons on PlayUp and reach thousands of learners across Melbourne.</p>
          <div style={{display:"flex",gap:"1.5rem",marginTop:"1.2rem",flexWrap:"wrap"}}>
            {["Free listing to start","Attendance tracking","Direct messaging","Featured placement"].map(p => (
              <div key={p} style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.82rem",color:"#8aab72"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#C8F135"}}/>
                {p}
              </div>
            ))}
          </div>
        </div>
        <button className="btn" onClick={() => user ? setModal("provider") : setModal("signup")} style={{padding:"0.85rem 2rem",fontSize:"1rem",borderRadius:999,fontWeight:700,background:"#C8F135",color:"#0F1A0A",border:"none",whiteSpace:"nowrap"}}>List My Lessons →</button>
      </div>

      {/* FOOTER */}
      <footer style={{background:"#1C2E12",borderTop:"1px solid rgba(200,241,53,0.08)",padding:"2rem 2.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",color:"#C8F135",letterSpacing:2}}>PlayUp</div>
        <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
          {["About","For Providers","Help","Privacy","Terms"].map(l => (
            <a key={l} href="#" style={{fontSize:"0.82rem",color:"#8aab72",textDecoration:"none"}}>{l}</a>
          ))}
        </div>
        <div style={{fontSize:"0.75rem",color:"#3a5a2a"}}>© 2026 PlayUp · Melbourne, VIC</div>
      </footer>

      {/* MODALS */}
      {modal && (
        <div onClick={(e) => { if(e.target===e.currentTarget) setModal(null); }}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"#1C2E12",border:"1px solid rgba(200,241,53,0.15)",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease"}}>
            <button onClick={() => setModal(null)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#8aab72",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>

            {/* LOGIN */}
            {modal === "login" && <>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem"}}>Welcome Back</h3>
              <p style={{color:"#8aab72",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Log in to your PlayUp account</p>
              {authError && <div style={{background:"rgba(255,100,100,0.1)",border:"1px solid rgba(255,100,100,0.3)",borderRadius:8,padding:"0.7rem 1rem",marginBottom:"1rem",fontSize:"0.85rem",color:"#ff8080"}}>{authError}</div>}
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Email</label>
                <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle}/>
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}/>
              </div>
              <button className="btn" onClick={handleLogin} disabled={authLoading}
                style={{width:"100%",padding:"0.85rem",background:"#C8F135",color:"#0F1A0A",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",marginTop:"0.5rem",opacity:authLoading?0.7:1}}>
                {authLoading ? "Logging in..." : "Log In"}
              </button>
              <p style={{textAlign:"center",marginTop:"1rem",fontSize:"0.85rem",color:"#8aab72"}}>
                Don't have an account?{" "}
                <span style={{color:"#C8F135",cursor:"pointer"}} onClick={() => { setAuthError(""); setModal("signup"); }}>Sign up free</span>
              </p>
            </>}

            {/* SIGNUP */}
            {modal === "signup" && <>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem"}}>Join PlayUp</h3>
              <p style={{color:"#8aab72",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Free to sign up. Find lessons and players near you.</p>
              {authError && <div style={{background:"rgba(255,100,100,0.1)",border:"1px solid rgba(255,100,100,0.3)",borderRadius:8,padding:"0.7rem 1rem",marginBottom:"1rem",fontSize:"0.85rem",color:"#ff8080"}}>{authError}</div>}
              <div style={{display:"flex",gap:"0.8rem",marginBottom:"1rem"}}>
                <div style={{flex:1}}>
                  <label style={labelStyle}>First Name</label>
                  <input placeholder="Alex" value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle}/>
                </div>
                <div style={{flex:1}}>
                  <label style={labelStyle}>Last Name</label>
                  <input placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle}/>
                </div>
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Email</label>
                <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle}/>
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Password</label>
                <input type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle}/>
              </div>
              <button className="btn" onClick={handleSignup} disabled={authLoading}
                style={{width:"100%",padding:"0.85rem",background:"#C8F135",color:"#0F1A0A",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",marginTop:"0.5rem",opacity:authLoading?0.7:1}}>
                {authLoading ? "Creating account..." : "Create Free Account"}
              </button>
              <p style={{textAlign:"center",marginTop:"1rem",fontSize:"0.85rem",color:"#8aab72"}}>
                Already have an account?{" "}
                <span style={{color:"#C8F135",cursor:"pointer"}} onClick={() => { setAuthError(""); setModal("login"); }}>Log in</span>
              </p>
            </>}

            {/* PROVIDER */}
            {modal === "provider" && <>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem"}}>List Your Lesson</h3>
              <p style={{color:"#8aab72",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Get discovered by students in Melbourne</p>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Your Name / Business</label>
                <input placeholder="e.g. Sarah Mitchell Coaching" style={inputStyle}/>
              </div>
              <div style={{display:"flex",gap:"0.8rem",marginBottom:"1rem"}}>
                {[["Activity Type",["Tennis","Piano","Swimming","Yoga","Guitar","Martial Arts","Other"]],["Suburb",["Richmond","Fitzroy","St Kilda","Carlton","Hawthorn","Toorak"]]].map(([l,opts]) => (
                  <div key={l as string} style={{flex:1}}>
                    <label style={labelStyle}>{l as string}</label>
                    <select style={inputStyle}>
                      {(opts as string[]).map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Postcode</label>
                <input placeholder="e.g. 3121" style={inputStyle}/>
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>About Your Lessons</label>
                <textarea placeholder="Describe your experience and lesson style..." style={{...inputStyle,resize:"vertical",minHeight:80}}/>
              </div>
              <button className="btn" onClick={() => { setModal(null); showToast("Your listing is under review!"); }}
                style={{width:"100%",padding:"0.85rem",background:"#C8F135",color:"#0F1A0A",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",marginTop:"0.5rem"}}>
                Submit My Listing
              </button>
            </>}

            {/* EVENT */}
            {modal === "event" && <>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem"}}>Create an Event</h3>
              <p style={{color:"#8aab72",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Find players to join your game</p>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Event Title</label>
                <input placeholder="e.g. Casual soccer at Edinburgh Gardens" style={inputStyle}/>
              </div>
              <div style={{display:"flex",gap:"0.8rem",marginBottom:"1rem"}}>
                <div style={{flex:1}}>
                  <label style={labelStyle}>Sport</label>
                  <select style={inputStyle}>
                    {["Soccer","Tennis","Basketball","Cricket","Volleyball","Badminton","Other"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label style={labelStyle}>Players Needed</label>
                  <input type="number" placeholder="e.g. 4" style={inputStyle}/>
                </div>
              </div>
              <div style={{display:"flex",gap:"0.8rem",marginBottom:"1rem"}}>
                <div style={{flex:1}}><label style={labelStyle}>Date</label><input type="date" style={inputStyle}/></div>
                <div style={{flex:1}}><label style={labelStyle}>Time</label><input type="time" style={inputStyle}/></div>
              </div>
              <div style={{display:"flex",gap:"0.8rem",marginBottom:"1rem"}}>
                <div style={{flex:2}}>
                  <label style={labelStyle}>Location</label>
                  <input placeholder="e.g. Edinburgh Gardens, Fitzroy North" style={inputStyle}/>
                </div>
                <div style={{flex:1}}>
                  <label style={labelStyle}>Postcode</label>
                  <input placeholder="e.g. 3068" style={inputStyle}/>
                </div>
              </div>
              <button className="btn" onClick={() => { setModal(null); showToast("Event posted! Players will find you."); }}
                style={{width:"100%",padding:"0.85rem",background:"#C8F135",color:"#0F1A0A",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",marginTop:"0.5rem"}}>
                Post My Event
              </button>
            </>}
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
