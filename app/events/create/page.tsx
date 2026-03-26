"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { id: string; email: string; first_name?: string } | null;

const SPORTS = [
  "Athletics","Badminton","Baseball","Basketball","Boxing","Cricket","Crossfit",
  "Cycling","Dancing","Football (AFL)","Football (Soccer)","Golf","Gymnastics",
  "Hockey","Kayaking","Martial Arts","Netball","Rock Climbing","Rugby","Running",
  "Sailing","Skateboarding","Skiing","Squash","Surfing","Swimming","Table Tennis",
  "Tennis","Touch Football","Volleyball","Other"
];

const SPORT_EMOJIS: Record<string,string> = {
  "Tennis":"🎾","Swimming":"🏊","Basketball":"🏀","Football (Soccer)":"⚽",
  "Cricket":"🏏","Boxing":"🥊","Golf":"⛳","Cycling":"🚴","Running":"🏃",
  "Volleyball":"🏐","Rugby":"🏉","Baseball":"⚾","Hockey":"🏑","Badminton":"🏸",
  "Table Tennis":"🏓","Skiing":"⛷️","Surfing":"🏄","Sailing":"⛵","Gymnastics":"🤸",
  "Martial Arts":"🥋","Dancing":"💃","Crossfit":"💪","Netball":"🏀",
  "Football (AFL)":"🏈","Skateboarding":"🛹","Kayaking":"🚣","Rock Climbing":"🧗",
  "Athletics":"🏃","Touch Football":"🏉","Squash":"🎾","Other":"🏅"
};

const SUBURBS = [
  {name:"Abbotsford",postcode:"3067",state:"VIC",city:"Melbourne"},{name:"Albert Park",postcode:"3206",state:"VIC",city:"Melbourne"},{name:"Ascot Vale",postcode:"3032",state:"VIC",city:"Melbourne"},{name:"Balwyn",postcode:"3103",state:"VIC",city:"Melbourne"},{name:"Box Hill",postcode:"3128",state:"VIC",city:"Melbourne"},{name:"Brighton",postcode:"3186",state:"VIC",city:"Melbourne"},{name:"Brunswick",postcode:"3056",state:"VIC",city:"Melbourne"},{name:"Carlton",postcode:"3053",state:"VIC",city:"Melbourne"},{name:"Carnegie",postcode:"3163",state:"VIC",city:"Melbourne"},{name:"Caulfield",postcode:"3162",state:"VIC",city:"Melbourne"},{name:"Coburg",postcode:"3058",state:"VIC",city:"Melbourne"},{name:"Collingwood",postcode:"3066",state:"VIC",city:"Melbourne"},{name:"Docklands",postcode:"3008",state:"VIC",city:"Melbourne"},{name:"Elsternwick",postcode:"3185",state:"VIC",city:"Melbourne"},{name:"Fitzroy",postcode:"3065",state:"VIC",city:"Melbourne"},{name:"Footscray",postcode:"3011",state:"VIC",city:"Melbourne"},{name:"Glen Iris",postcode:"3146",state:"VIC",city:"Melbourne"},{name:"Glen Waverley",postcode:"3150",state:"VIC",city:"Melbourne"},{name:"Hawthorn",postcode:"3122",state:"VIC",city:"Melbourne"},{name:"Kew",postcode:"3101",state:"VIC",city:"Melbourne"},{name:"Malvern",postcode:"3144",state:"VIC",city:"Melbourne"},{name:"Melbourne CBD",postcode:"3000",state:"VIC",city:"Melbourne"},{name:"Moonee Ponds",postcode:"3039",state:"VIC",city:"Melbourne"},{name:"Mordialloc",postcode:"3195",state:"VIC",city:"Melbourne"},{name:"Northcote",postcode:"3070",state:"VIC",city:"Melbourne"},{name:"Oakleigh",postcode:"3166",state:"VIC",city:"Melbourne"},{name:"Port Melbourne",postcode:"3207",state:"VIC",city:"Melbourne"},{name:"Prahran",postcode:"3181",state:"VIC",city:"Melbourne"},{name:"Richmond",postcode:"3121",state:"VIC",city:"Melbourne"},{name:"South Melbourne",postcode:"3205",state:"VIC",city:"Melbourne"},{name:"South Yarra",postcode:"3141",state:"VIC",city:"Melbourne"},{name:"Southbank",postcode:"3006",state:"VIC",city:"Melbourne"},{name:"St Kilda",postcode:"3182",state:"VIC",city:"Melbourne"},{name:"Sunshine",postcode:"3020",state:"VIC",city:"Melbourne"},{name:"Toorak",postcode:"3142",state:"VIC",city:"Melbourne"},{name:"West Melbourne",postcode:"3003",state:"VIC",city:"Melbourne"},{name:"Williamstown",postcode:"3016",state:"VIC",city:"Melbourne"},{name:"Windsor",postcode:"3181",state:"VIC",city:"Melbourne"},
  {name:"Bondi",postcode:"2026",state:"NSW",city:"Sydney"},{name:"Chatswood",postcode:"2067",state:"NSW",city:"Sydney"},{name:"Glebe",postcode:"2037",state:"NSW",city:"Sydney"},{name:"Manly",postcode:"2095",state:"NSW",city:"Sydney"},{name:"Newtown",postcode:"2042",state:"NSW",city:"Sydney"},{name:"North Sydney",postcode:"2060",state:"NSW",city:"Sydney"},{name:"Parramatta",postcode:"2150",state:"NSW",city:"Sydney"},{name:"Surry Hills",postcode:"2010",state:"NSW",city:"Sydney"},{name:"Sydney CBD",postcode:"2000",state:"NSW",city:"Sydney"},
  {name:"Brisbane CBD",postcode:"4000",state:"QLD",city:"Brisbane"},{name:"Fortitude Valley",postcode:"4006",state:"QLD",city:"Brisbane"},{name:"New Farm",postcode:"4005",state:"QLD",city:"Brisbane"},{name:"South Brisbane",postcode:"4101",state:"QLD",city:"Brisbane"},{name:"West End",postcode:"4101",state:"QLD",city:"Brisbane"},
  {name:"Surfers Paradise",postcode:"4217",state:"QLD",city:"Gold Coast"},{name:"Broadbeach",postcode:"4218",state:"QLD",city:"Gold Coast"},
  {name:"Adelaide CBD",postcode:"5000",state:"SA",city:"Adelaide"},{name:"Glenelg",postcode:"5045",state:"SA",city:"Adelaide"},{name:"North Adelaide",postcode:"5006",state:"SA",city:"Adelaide"},
  {name:"Perth CBD",postcode:"6000",state:"WA",city:"Perth"},{name:"Fremantle",postcode:"6160",state:"WA",city:"Perth"},{name:"Subiaco",postcode:"6008",state:"WA",city:"Perth"},
  {name:"Canberra CBD",postcode:"2601",state:"ACT",city:"Canberra"},
  {name:"Hobart CBD",postcode:"7000",state:"TAS",city:"Hobart"},
  {name:"Darwin CBD",postcode:"0800",state:"NT",city:"Darwin"},
];

export default function CreateEvent() {
  const router = useRouter();
  const suburbRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<Record<string,string>>({});

  // Form fields
  const [hostName, setHostName] = useState("");
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [suburbSearch, setSuburbSearch] = useState("");
  const [selectedSuburb, setSelectedSuburb] = useState<typeof SUBURBS[0]|null>(null);
  const [showSuburbDropdown, setShowSuburbDropdown] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("2 hours");
  const [cost, setCost] = useState("Free");
  const [customCost, setCustomCost] = useState("");
  const [spotsTotal, setSpotsTotal] = useState("10");
  const [skillLevel, setSkillLevel] = useState("All levels");
  const [ageGroup, setAgeGroup] = useState("All ages");
  const [whatToBring, setWhatToBring] = useState("");
  const [rules, setRules] = useState("");

  const filteredSuburbs = SUBURBS.filter(s =>
    suburbSearch.length > 0 &&
    (s.name.toLowerCase().includes(suburbSearch.toLowerCase()) || s.postcode.includes(suburbSearch))
  ).slice(0, 20);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      setUser({ id: session.user.id, email: session.user.email! });
    });
    const handleClick = (e: MouseEvent) => {
      if (suburbRef.current && !suburbRef.current.contains(e.target as Node)) setShowSuburbDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!hostName.trim()) e.hostName = "Your name is required";
    if (!title.trim()) e.title = "Event title is required";
    if (!sport) e.sport = "Please select a sport";
    if (!location.trim()) e.location = "Location/venue is required";
    if (!selectedSuburb) e.suburb = "Please select a suburb";
    if (!date) e.date = "Date is required";
    if (!time) e.time = "Time is required";
    if (!spotsTotal || parseInt(spotsTotal) < 2) e.spotsTotal = "Minimum 2 spots required";
    if (cost === "custom" && !customCost.trim()) e.cost = "Please enter the cost";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;
    setSubmitting(true);
    setSubmitError("");

    const whatToBringArr = whatToBring.split("\n").map(s => s.trim()).filter(Boolean);
    const rulesArr = rules.split("\n").map(s => s.trim()).filter(Boolean);
    const finalCost = cost === "Free" ? "Free" : cost === "custom" ? customCost : cost;

    const { error } = await supabase.from("events").insert({
      host_id: user.id,
      host_name: hostName.trim(),
      title: title.trim(),
      sport,
      description: description.trim(),
      location: location.trim(),
      suburb: selectedSuburb!.name,
      postcode: selectedSuburb!.postcode,
      date,
      time,
      duration,
      cost: finalCost,
      spots_total: parseInt(spotsTotal),
      spots_filled: 0,
      skill_level: skillLevel,
      age_group: ageGroup,
      what_to_bring: whatToBringArr,
      rules: rulesArr,
      status: "pending",
    });

    setSubmitting(false);
    if (error) { setSubmitError(error.message); return; }
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { display:"block", fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:"#64748b", marginBottom:"0.4rem" };
  const errorStyle: React.CSSProperties = { color:"#dc2626", fontSize:"0.78rem", marginTop:"0.3rem" };
  const cardStyle: React.CSSProperties = { background:"white", borderRadius:16, padding:"1.8rem", border:"1px solid #dbeafe", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(30,58,95,0.06)" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        .dropdown-item:hover{background:#f0f9ff;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",background:"rgba(255,255,255,0.95)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)",position:"sticky",top:0,zIndex:100}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,color:"#1e3a5f"}}>Create an Event</div>
        <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.4rem 1rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>← Back</button>
      </nav>

      {submitted ? (
        <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          <div style={{background:"white",borderRadius:20,padding:"3rem",maxWidth:480,width:"100%",textAlign:"center",border:"1px solid #dbeafe",boxShadow:"0 4px 20px rgba(30,58,95,0.1)",animation:"slideUp 0.4s ease"}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"#EAF3DE",border:"2px solid #84CC16",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",margin:"0 auto 1.5rem"}}>🎉</div>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.5rem"}}>Event Submitted!</h2>
            <p style={{color:"#64748b",fontSize:"0.92rem",lineHeight:1.7,marginBottom:"2rem"}}>Your event is under review. We'll have it live within 24 hours — usually much sooner.</p>
            <div style={{background:"#f8faff",borderRadius:12,padding:"1rem",border:"1px solid #dbeafe",marginBottom:"1.5rem",fontSize:"0.85rem",color:"#475569",lineHeight:1.7}}>
              <div>✓ Admin reviews within 24 hours</div>
              <div>✓ You'll receive a confirmation email</div>
              <div>✓ Players can request to join once approved</div>
            </div>
            <button className="btn" onClick={()=>router.push("/")} style={{width:"100%",padding:"0.85rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem"}}>Back to PlayUp →</button>
          </div>
        </div>
      ) : (
        <div style={{maxWidth:680,margin:"0 auto",padding:"2.5rem 1.5rem"}}>

          <div style={{marginBottom:"2rem"}}>
            <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.4rem"}}>Post Your Event</h1>
            <p style={{color:"#64748b",fontSize:"0.9rem"}}>Find players for your game. Free to post — admin reviewed before going live.</p>
          </div>

          {/* ABOUT YOU */}
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"1.2rem"}}>About You</div>
            <div>
              <label style={labelStyle}>Your Name *</label>
              <input value={hostName} onChange={e=>setHostName(e.target.value)} placeholder="e.g. Marcus Thompson" style={{...inputStyle,borderColor:errors.hostName?"#fca5a5":"#bfdbfe"}}/>
              {errors.hostName && <div style={errorStyle}>{errors.hostName}</div>}
            </div>
          </div>

          {/* EVENT DETAILS */}
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"1.2rem"}}>Event Details</div>
            <div style={{marginBottom:"1rem"}}>
              <label style={labelStyle}>Event Title *</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Casual 7-a-side Soccer – Weekend Kick Around" style={{...inputStyle,borderColor:errors.title?"#fca5a5":"#bfdbfe"}}/>
              {errors.title && <div style={errorStyle}>{errors.title}</div>}
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={labelStyle}>Sport *</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
                {SPORTS.map(s=>(
                  <button key={s} className="btn" onClick={()=>setSport(s)}
                    style={{padding:"0.4rem 0.9rem",borderRadius:999,fontSize:"0.82rem",fontWeight:600,
                      background:sport===s?"#1e3a5f":"white",color:sport===s?"#84CC16":"#64748b",
                      border:`1px solid ${sport===s?"#1e3a5f":"#dbeafe"}`}}>
                    {SPORT_EMOJIS[s]||"🏅"} {s}
                  </button>
                ))}
              </div>
              {errors.sport && <div style={errorStyle}>{errors.sport}</div>}
            </div>
            <div>
              <label style={labelStyle}>Description (optional)</label>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell players what to expect, who it's for, the vibe..." style={{...inputStyle,resize:"vertical",minHeight:100}}/>
            </div>
          </div>

          {/* LOCATION & TIME */}
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"1.2rem"}}>Location & Time</div>
            <div style={{marginBottom:"1rem"}}>
              <label style={labelStyle}>Venue / Location *</label>
              <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Edinburgh Gardens, Fitzroy North" style={{...inputStyle,borderColor:errors.location?"#fca5a5":"#bfdbfe"}}/>
              {errors.location && <div style={errorStyle}>{errors.location}</div>}
            </div>
            <div style={{marginBottom:"1rem"}} ref={suburbRef}>
              <label style={labelStyle}>Suburb *</label>
              {selectedSuburb ? (
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem",background:"#EAF3DE",border:"1px solid #97C459",borderRadius:10,padding:"0.6rem 1rem"}}>
                  <span style={{fontSize:"0.88rem",color:"#27500A",fontWeight:600}}>📍 {selectedSuburb.name} {selectedSuburb.postcode} · {selectedSuburb.state}</span>
                  <button className="btn" onClick={()=>{setSelectedSuburb(null);setSuburbSearch("");}} style={{marginLeft:"auto",background:"none",border:"none",color:"#4d7c0f",fontSize:"0.9rem",padding:0}}>✕</button>
                </div>
              ) : (
                <div style={{position:"relative"}}>
                  <input value={suburbSearch} onChange={e=>{setSuburbSearch(e.target.value);setShowSuburbDropdown(true);}} onFocus={()=>setShowSuburbDropdown(true)} placeholder="Search suburb or postcode..." style={{...inputStyle,borderColor:errors.suburb?"#fca5a5":"#bfdbfe"}}/>
                  {showSuburbDropdown && filteredSuburbs.length > 0 && (
                    <div style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1px solid #bfdbfe",borderRadius:10,boxShadow:"0 8px 24px rgba(30,58,95,0.12)",zIndex:50,maxHeight:220,overflowY:"auto",marginTop:4}}>
                      {filteredSuburbs.map(s=>(
                        <div key={`${s.name}-${s.postcode}`} className="dropdown-item" onClick={()=>{setSelectedSuburb(s);setSuburbSearch("");setShowSuburbDropdown(false);}}
                          style={{padding:"0.65rem 1rem",fontSize:"0.88rem",color:"#1e3a5f",cursor:"pointer",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between"}}>
                          <span>{s.name}</span>
                          <span style={{fontSize:"0.78rem",color:"#94a3b8"}}>{s.state} {s.postcode}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {errors.suburb && <div style={errorStyle}>{errors.suburb}</div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem"}}>
              <div>
                <label style={labelStyle}>Date *</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inputStyle,borderColor:errors.date?"#fca5a5":"#bfdbfe"}}/>
                {errors.date && <div style={errorStyle}>{errors.date}</div>}
              </div>
              <div>
                <label style={labelStyle}>Time *</label>
                <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{...inputStyle,borderColor:errors.time?"#fca5a5":"#bfdbfe"}}/>
                {errors.time && <div style={errorStyle}>{errors.time}</div>}
              </div>
              <div>
                <label style={labelStyle}>Duration</label>
                <select value={duration} onChange={e=>setDuration(e.target.value)} style={inputStyle}>
                  {["30 minutes","45 minutes","1 hour","1.5 hours","2 hours","2.5 hours","3 hours"].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* SPOTS & FORMAT */}
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"1.2rem"}}>Spots & Format</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
              <div>
                <label style={labelStyle}>Players Needed *</label>
                <input type="number" value={spotsTotal} onChange={e=>setSpotsTotal(e.target.value)} min="2" max="100" placeholder="e.g. 10" style={{...inputStyle,borderColor:errors.spotsTotal?"#fca5a5":"#bfdbfe"}}/>
                {errors.spotsTotal && <div style={errorStyle}>{errors.spotsTotal}</div>}
              </div>
              <div>
                <label style={labelStyle}>Skill Level</label>
                <select value={skillLevel} onChange={e=>setSkillLevel(e.target.value)} style={inputStyle}>
                  {["All levels","Beginner","Intermediate","Advanced","Competitive"].map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Age Group</label>
                <select value={ageGroup} onChange={e=>setAgeGroup(e.target.value)} style={inputStyle}>
                  {["All ages","Under 18","18+","21+","25+"].map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Cost</label>
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                {["Free","$5","$10","$15","$20","custom"].map(c=>(
                  <button key={c} className="btn" onClick={()=>setCost(c)}
                    style={{padding:"0.45rem 1rem",borderRadius:999,fontSize:"0.85rem",fontWeight:600,
                      background:cost===c?"#1e3a5f":"white",color:cost===c?"#84CC16":"#64748b",
                      border:`1px solid ${cost===c?"#1e3a5f":"#dbeafe"}`}}>
                    {c === "custom" ? "Other..." : c}
                  </button>
                ))}
              </div>
              {cost === "custom" && (
                <input value={customCost} onChange={e=>setCustomCost(e.target.value)} placeholder="e.g. $10 court split" style={{...inputStyle,marginTop:"0.6rem",borderColor:errors.cost?"#fca5a5":"#bfdbfe"}}/>
              )}
              {errors.cost && <div style={errorStyle}>{errors.cost}</div>}
            </div>
          </div>

          {/* EXTRAS */}
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.4rem"}}>What to Bring & Rules</div>
            <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.2rem"}}>Optional — one item per line</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <div>
                <label style={labelStyle}>What to Bring</label>
                <textarea value={whatToBring} onChange={e=>setWhatToBring(e.target.value)} placeholder={"Boots or runners\nWater bottle\nShin guards (optional)"} style={{...inputStyle,resize:"vertical",minHeight:100}}/>
              </div>
              <div>
                <label style={labelStyle}>House Rules</label>
                <textarea value={rules} onChange={e=>setRules(e.target.value)} placeholder={"Friendly play only\nArrive 10 mins early\nRespect all players"} style={{...inputStyle,resize:"vertical",minHeight:100}}/>
              </div>
            </div>
          </div>

          {/* REVIEW NOTICE */}
          <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1.5rem",display:"flex",gap:"0.8rem",alignItems:"flex-start"}}>
            <div style={{fontSize:"1.2rem",marginTop:"0.1rem"}}>📋</div>
            <div>
              <div style={{fontSize:"0.9rem",fontWeight:700,color:"#27500A",marginBottom:"0.3rem"}}>Your event will be reviewed before going live</div>
              <div style={{fontSize:"0.82rem",color:"#3B6D11",lineHeight:1.6}}>We check every event within 24 hours. Most are approved same day.</div>
            </div>
          </div>

          {submitError && <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"0.8rem 1rem",marginBottom:"1rem",fontSize:"0.85rem",color:"#dc2626"}}>{submitError}</div>}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.85rem 2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontWeight:600,fontSize:"0.95rem"}}>Cancel</button>
            <button className="btn" onClick={handleSubmit} disabled={submitting} style={{padding:"0.85rem 2.5rem",background:submitting?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"1rem",opacity:submitting?0.8:1}}>
              {submitting ? "Submitting..." : "Submit for Review →"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
