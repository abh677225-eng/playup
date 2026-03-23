"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { email: string } | null;

const ACTIVITY_TYPES = [
  "Archery","Art & Drawing","Athletics","Badminton","Ballet","Baseball","Basketball",
  "Boxing","Calligraphy","Chess","Coding & Programming","Cooking","Cricket","Crossfit",
  "Cycling","Dancing","Drums","Fencing","Film & Photography","Football (AFL)","Football (Soccer)",
  "Golf","Guitar","Gymnastics","Hockey","Horse Riding","Karate","Kayaking","Keyboard",
  "Language Tutoring","Martial Arts","Maths Tutoring","Netball","Painting","Piano",
  "Pilates","Rock Climbing","Rugby","Running","Sailing","Science Tutoring","Singing",
  "Skateboarding","Skiing","Squash","Surfing","Swimming","Table Tennis","Tennis",
  "Touch Football","Ukulele","Violin","Volleyball","Yoga","Other"
];

const SUBURBS: { name: string; postcode: string; state: string; city: string }[] = [
  // VIC - Melbourne
  {name:"Abbotsford",postcode:"3067",state:"VIC",city:"Melbourne"},{name:"Albert Park",postcode:"3206",state:"VIC",city:"Melbourne"},{name:"Ascot Vale",postcode:"3032",state:"VIC",city:"Melbourne"},{name:"Balwyn",postcode:"3103",state:"VIC",city:"Melbourne"},{name:"Box Hill",postcode:"3128",state:"VIC",city:"Melbourne"},{name:"Brighton",postcode:"3186",state:"VIC",city:"Melbourne"},{name:"Brunswick",postcode:"3056",state:"VIC",city:"Melbourne"},{name:"Carlton",postcode:"3053",state:"VIC",city:"Melbourne"},{name:"Carnegie",postcode:"3163",state:"VIC",city:"Melbourne"},{name:"Caulfield",postcode:"3162",state:"VIC",city:"Melbourne"},{name:"CBD",postcode:"3000",state:"VIC",city:"Melbourne"},{name:"Coburg",postcode:"3058",state:"VIC",city:"Melbourne"},{name:"Collingwood",postcode:"3066",state:"VIC",city:"Melbourne"},{name:"Docklands",postcode:"3008",state:"VIC",city:"Melbourne"},{name:"Elsternwick",postcode:"3185",state:"VIC",city:"Melbourne"},{name:"Fitzroy",postcode:"3065",state:"VIC",city:"Melbourne"},{name:"Footscray",postcode:"3011",state:"VIC",city:"Melbourne"},{name:"Glen Iris",postcode:"3146",state:"VIC",city:"Melbourne"},{name:"Glen Waverley",postcode:"3150",state:"VIC",city:"Melbourne"},{name:"Hawthorn",postcode:"3122",state:"VIC",city:"Melbourne"},{name:"Kew",postcode:"3101",state:"VIC",city:"Melbourne"},{name:"Malvern",postcode:"3144",state:"VIC",city:"Melbourne"},{name:"Melbourne CBD",postcode:"3000",state:"VIC",city:"Melbourne"},{name:"Moonee Ponds",postcode:"3039",state:"VIC",city:"Melbourne"},{name:"Mordialloc",postcode:"3195",state:"VIC",city:"Melbourne"},{name:"Northcote",postcode:"3070",state:"VIC",city:"Melbourne"},{name:"Oakleigh",postcode:"3166",state:"VIC",city:"Melbourne"},{name:"Port Melbourne",postcode:"3207",state:"VIC",city:"Melbourne"},{name:"Prahran",postcode:"3181",state:"VIC",city:"Melbourne"},{name:"Richmond",postcode:"3121",state:"VIC",city:"Melbourne"},{name:"South Melbourne",postcode:"3205",state:"VIC",city:"Melbourne"},{name:"South Yarra",postcode:"3141",state:"VIC",city:"Melbourne"},{name:"Southbank",postcode:"3006",state:"VIC",city:"Melbourne"},{name:"St Kilda",postcode:"3182",state:"VIC",city:"Melbourne"},{name:"Sunshine",postcode:"3020",state:"VIC",city:"Melbourne"},{name:"Toorak",postcode:"3142",state:"VIC",city:"Melbourne"},{name:"West Melbourne",postcode:"3003",state:"VIC",city:"Melbourne"},{name:"Williamstown",postcode:"3016",state:"VIC",city:"Melbourne"},{name:"Windsor",postcode:"3181",state:"VIC",city:"Melbourne"},
  // NSW - Sydney
  {name:"Bondi",postcode:"2026",state:"NSW",city:"Sydney"},{name:"Bondi Junction",postcode:"2022",state:"NSW",city:"Sydney"},{name:"CBD",postcode:"2000",state:"NSW",city:"Sydney"},{name:"Chatswood",postcode:"2067",state:"NSW",city:"Sydney"},{name:"Coogee",postcode:"2034",state:"NSW",city:"Sydney"},{name:"Darlinghurst",postcode:"2010",state:"NSW",city:"Sydney"},{name:"Double Bay",postcode:"2028",state:"NSW",city:"Sydney"},{name:"Glebe",postcode:"2037",state:"NSW",city:"Sydney"},{name:"Manly",postcode:"2095",state:"NSW",city:"Sydney"},{name:"Newtown",postcode:"2042",state:"NSW",city:"Sydney"},{name:"North Sydney",postcode:"2060",state:"NSW",city:"Sydney"},{name:"Parramatta",postcode:"2150",state:"NSW",city:"Sydney"},{name:"Pyrmont",postcode:"2009",state:"NSW",city:"Sydney"},{name:"Redfern",postcode:"2016",state:"NSW",city:"Sydney"},{name:"Surry Hills",postcode:"2010",state:"NSW",city:"Sydney"},{name:"Sydney CBD",postcode:"2000",state:"NSW",city:"Sydney"},{name:"Ultimo",postcode:"2007",state:"NSW",city:"Sydney"},
  // QLD - Brisbane
  {name:"Brisbane CBD",postcode:"4000",state:"QLD",city:"Brisbane"},{name:"Fortitude Valley",postcode:"4006",state:"QLD",city:"Brisbane"},{name:"New Farm",postcode:"4005",state:"QLD",city:"Brisbane"},{name:"Newstead",postcode:"4006",state:"QLD",city:"Brisbane"},{name:"South Brisbane",postcode:"4101",state:"QLD",city:"Brisbane"},{name:"Spring Hill",postcode:"4000",state:"QLD",city:"Brisbane"},{name:"West End",postcode:"4101",state:"QLD",city:"Brisbane"},{name:"Woolloongabba",postcode:"4102",state:"QLD",city:"Brisbane"},
  // QLD - Gold Coast
  {name:"Broadbeach",postcode:"4218",state:"QLD",city:"Gold Coast"},{name:"Burleigh Heads",postcode:"4220",state:"QLD",city:"Gold Coast"},{name:"Coolangatta",postcode:"4225",state:"QLD",city:"Gold Coast"},{name:"Southport",postcode:"4215",state:"QLD",city:"Gold Coast"},{name:"Surfers Paradise",postcode:"4217",state:"QLD",city:"Gold Coast"},
  // SA - Adelaide
  {name:"Adelaide CBD",postcode:"5000",state:"SA",city:"Adelaide"},{name:"Glenelg",postcode:"5045",state:"SA",city:"Adelaide"},{name:"North Adelaide",postcode:"5006",state:"SA",city:"Adelaide"},{name:"Norwood",postcode:"5067",state:"SA",city:"Adelaide"},{name:"Unley",postcode:"5061",state:"SA",city:"Adelaide"},
  // WA - Perth
  {name:"Fremantle",postcode:"6160",state:"WA",city:"Perth"},{name:"Leederville",postcode:"6007",state:"WA",city:"Perth"},{name:"Northbridge",postcode:"6003",state:"WA",city:"Perth"},{name:"Perth CBD",postcode:"6000",state:"WA",city:"Perth"},{name:"Subiaco",postcode:"6008",state:"WA",city:"Perth"},
  // ACT
  {name:"Barton",postcode:"2600",state:"ACT",city:"Canberra"},{name:"Braddon",postcode:"2612",state:"ACT",city:"Canberra"},{name:"Canberra CBD",postcode:"2601",state:"ACT",city:"Canberra"},{name:"Dickson",postcode:"2602",state:"ACT",city:"Canberra"},{name:"Manuka",postcode:"2603",state:"ACT",city:"Canberra"},
  // TAS
  {name:"Hobart CBD",postcode:"7000",state:"TAS",city:"Hobart"},{name:"Sandy Bay",postcode:"7005",state:"TAS",city:"Hobart"},{name:"West Hobart",postcode:"7000",state:"TAS",city:"Hobart"},
  // NT
  {name:"Darwin CBD",postcode:"0800",state:"NT",city:"Darwin"},{name:"Parap",postcode:"0820",state:"NT",city:"Darwin"},{name:"Stuart Park",postcode:"0820",state:"NT",city:"Darwin"},
];

const MAX_SUBURBS = 10;

export default function ProviderCreate() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form fields
  const [providerName, setProviderName] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityType, setActivityType] = useState("");
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File|null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [suburbSearch, setSuburbSearch] = useState("");
  const [selectedSuburbs, setSelectedSuburbs] = useState<{name:string;postcode:string;state:string;city:string}[]>([]);
  const [showSuburbDropdown, setShowSuburbDropdown] = useState(false);
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [price, setPrice] = useState("");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [lessonType, setLessonType] = useState("Private");
  const [errors, setErrors] = useState<Record<string,string>>({});

  const activityRef = useRef<HTMLDivElement>(null);
  const suburbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { email: session.user.email! } : null);
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (activityRef.current && !activityRef.current.contains(e.target as Node)) setShowActivityDropdown(false);
      if (suburbRef.current && !suburbRef.current.contains(e.target as Node)) setShowSuburbDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const STATES = ["ACT","NSW","NT","QLD","SA","TAS","VIC","WA"];
  const cities = [...new Set(SUBURBS.filter(s => !selectedState || s.state === selectedState).map(s => s.city))].sort();
  const filteredSuburbs = SUBURBS.filter(s => {
    const matchState = !selectedState || s.state === selectedState;
    const matchCity = !selectedCity || s.city === selectedCity;
    const matchSearch = !suburbSearch || s.name.toLowerCase().includes(suburbSearch.toLowerCase()) || s.postcode.includes(suburbSearch);
    const notSelected = !selectedSuburbs.find(x => x.name === s.name && x.postcode === s.postcode);
    return matchState && matchCity && matchSearch && notSelected;
  }).slice(0, 20);

  const filteredActivities = ACTIVITY_TYPES.filter(a => a.toLowerCase().includes(activitySearch.toLowerCase()));

  const selectActivity = (a: string) => { setActivityType(a); setActivitySearch(a); setShowActivityDropdown(false); };
  const addSuburb = (s: typeof SUBURBS[0]) => {
    if (selectedSuburbs.length >= MAX_SUBURBS) return;
    setSelectedSuburbs(prev => [...prev, s]);
    setSuburbSearch("");
  };
  const removeSuburb = (idx: number) => setSelectedSuburbs(prev => prev.filter((_,i) => i !== idx));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)); }
  };

  const validate = () => {
    const e: Record<string,string> = {};
    if (!providerName.trim()) e.providerName = "Provider name is required";
    if (!activityType) e.activityType = "Activity type is required";
    if (!lessonTitle.trim()) e.lessonTitle = "Lesson title is required";
    if (!description.trim()) e.description = "Description is required";
    if (selectedSuburbs.length === 0) e.suburbs = "Please select at least one suburb";
    if (!price) e.price = "Price is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { display:"block", fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:"#64748b", marginBottom:"0.4rem" };
  const errorStyle: React.CSSProperties = { fontSize:"0.78rem", color:"#dc2626", marginTop:"0.3rem" };
  const cardStyle: React.CSSProperties = { background:"white", borderRadius:16, padding:"1.8rem", border:"1px solid #dbeafe", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(30,58,95,0.06)" };

  if (submitted) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}`}</style>
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",background:"rgba(255,255,255,0.95)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}><span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
      </nav>
      <div style={{maxWidth:560,margin:"5rem auto",padding:"2rem",textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:"#EAF3DE",border:"2px solid #84CC16",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",margin:"0 auto 1.5rem"}}>🎉</div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:1,marginBottom:"0.8rem",color:"#1e3a5f"}}>Listing Submitted!</h1>
        <p style={{color:"#64748b",lineHeight:1.7,marginBottom:"2rem",fontSize:"0.95rem"}}>Thanks <strong style={{color:"#1e3a5f"}}>{providerName}</strong>! Your listing is under review. We'll notify you within 24 hours once it's approved and live on PlayUp.</p>
        <div style={{background:"white",borderRadius:16,padding:"1.5rem",border:"1px solid #dbeafe",marginBottom:"2rem",textAlign:"left"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>Listing Summary</div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",fontSize:"0.88rem",color:"#475569"}}>
            <div><span style={{color:"#64748b",display:"inline-block",width:100}}>Activity:</span> <strong style={{color:"#1e3a5f"}}>{activityType}</strong></div>
            <div><span style={{color:"#64748b",display:"inline-block",width:100}}>Title:</span> {lessonTitle}</div>
            <div><span style={{color:"#64748b",display:"inline-block",width:100}}>Location:</span> {selectedSuburbs.map(s=>`${s.name} ${s.postcode}`).join(", ")}</div>
            <div><span style={{color:"#64748b",display:"inline-block",width:100}}>Price:</span> ${price}/session</div>
          </div>
        </div>
        <div style={{background:"#EAF3DE",borderRadius:12,padding:"1rem 1.25rem",border:"1px solid #97C459",marginBottom:"2rem",textAlign:"left"}}>
          <div style={{fontSize:"0.85rem",fontWeight:700,color:"#27500A",marginBottom:"0.5rem"}}>While you wait, complete your profile to get more enquiries:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
            {["Availability","Booking options","Pricing packages","Experience & credentials","What to bring","House rules"].map(item=>(
              <span key={item} style={{fontSize:"0.75rem",padding:"0.25rem 0.7rem",borderRadius:999,background:"white",border:"1px solid #97C459",color:"#27500A"}}>{item}</span>
            ))}
          </div>
        </div>
        <button onClick={()=>router.push("/")} style={{padding:"0.85rem 2rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.95rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        input:focus,select:focus,textarea:focus{border-color:#84CC16!important;outline:none;}
        .dropdown-item:hover{background:#EAF3DE!important;}
        .lesson-type-btn{padding:0.5rem 1.2rem;border-radius:999px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .dropdown-anim{animation:fadeIn 0.15s ease;}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}><span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
        <div style={{fontSize:"0.85rem",color:"#64748b",fontWeight:600}}>List Your Lessons</div>
        <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.5rem 1.2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"transparent",color:"#1e3a5f",fontSize:"0.85rem"}}>Cancel</button>
      </nav>

      <div style={{maxWidth:720,margin:"0 auto",padding:"2.5rem 2rem"}}>
        <div style={{marginBottom:"2rem"}}>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.4rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.4rem"}}>List Your Lessons</h1>
          <p style={{color:"#64748b",fontSize:"0.95rem"}}>Get live in under 5 minutes. Add more details from your dashboard after approval.</p>
        </div>

        {/* ABOUT */}
        <div style={cardStyle}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>About Your Lessons</div>
          <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.4rem"}}>Tell students who you are and what you teach.</p>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
            <div>
              <label style={labelStyle}>Provider / Business Name *</label>
              <input value={providerName} onChange={e=>setProviderName(e.target.value)} placeholder="e.g. Sarah Mitchell Coaching" style={{...inputStyle,borderColor:errors.providerName?"#fca5a5":"#bfdbfe"}}/>
              {errors.providerName && <div style={errorStyle}>{errors.providerName}</div>}
            </div>

            {/* ACTIVITY TYPE — searchable */}
            <div ref={activityRef}>
              <label style={labelStyle}>Activity Type *</label>
              <div style={{position:"relative"}}>
                <input
                  value={activitySearch}
                  onChange={e=>{ setActivitySearch(e.target.value); setActivityType(""); setShowActivityDropdown(true); }}
                  onFocus={()=>setShowActivityDropdown(true)}
                  placeholder="Type to search (e.g. Tennis)..."
                  style={{...inputStyle,borderColor:errors.activityType?"#fca5a5":"#bfdbfe"}}
                />
                {showActivityDropdown && filteredActivities.length > 0 && (
                  <div className="dropdown-anim" style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1px solid #bfdbfe",borderRadius:10,boxShadow:"0 8px 24px rgba(30,58,95,0.12)",zIndex:50,maxHeight:220,overflowY:"auto",marginTop:4}}>
                    {filteredActivities.map(a => (
                      <div key={a} className="dropdown-item" onClick={()=>selectActivity(a)}
                        style={{padding:"0.6rem 1rem",fontSize:"0.88rem",color:"#1e3a5f",cursor:"pointer",borderBottom:"1px solid #f1f5f9"}}>
                        {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.activityType && <div style={errorStyle}>{errors.activityType}</div>}
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Lesson Title *</label>
            <input value={lessonTitle} onChange={e=>setLessonTitle(e.target.value)} placeholder="e.g. Beginner to intermediate tennis coaching for adults" style={{...inputStyle,borderColor:errors.lessonTitle?"#fca5a5":"#bfdbfe"}}/>
            {errors.lessonTitle && <div style={errorStyle}>{errors.lessonTitle}</div>}
          </div>

          <div>
            <label style={labelStyle}>About You & Your Lessons *</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)}
              placeholder="A short bio — what you offer, your teaching style, and who your lessons are suited for. 2–4 sentences is plenty."
              style={{...inputStyle,resize:"vertical",minHeight:90,borderColor:errors.description?"#fca5a5":"#bfdbfe"}}/>
            {errors.description && <div style={errorStyle}>{errors.description}</div>}
          </div>
        </div>

        {/* PROFILE PHOTO */}
        <div style={cardStyle}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Profile Photo</div>
          <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.4rem"}}>A photo builds trust and gets 3x more enquiries. A headshot or action shot both work great.</p>
          {photoPreview ? (
            <div style={{display:"flex",alignItems:"center",gap:"1.5rem"}}>
              <img src={photoPreview} alt="preview" style={{width:100,height:100,borderRadius:12,objectFit:"cover",border:"2px solid #84CC16"}}/>
              <div>
                <div style={{fontSize:"0.88rem",fontWeight:600,color:"#1e3a5f",marginBottom:"0.4rem"}}>{photo?.name}</div>
                <button className="btn" onClick={()=>{setPhoto(null);setPhotoPreview("");}} style={{fontSize:"0.8rem",color:"#dc2626",background:"none",border:"none",padding:0}}>Remove photo</button>
              </div>
            </div>
          ) : (
            <label style={{display:"block",cursor:"pointer"}}>
              <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
              <div style={{border:"1.5px dashed #bfdbfe",borderRadius:12,padding:"2rem",textAlign:"center",background:"#f8faff",transition:"all 0.2s"}}>
                <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📷</div>
                <div style={{fontSize:"0.9rem",fontWeight:600,color:"#1e3a5f",marginBottom:"0.3rem"}}>Click to upload a photo</div>
                <div style={{fontSize:"0.78rem",color:"#94a3b8"}}>JPG or PNG · Max 2MB · Recommended 400×400px</div>
              </div>
            </label>
          )}
        </div>

        {/* LOCATION */}
        <div style={cardStyle}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Location</div>
          <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.4rem"}}>Select up to {MAX_SUBURBS} suburbs where you offer lessons. Include nearby suburbs to reach more students.</p>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
            <div>
              <label style={labelStyle}>State</label>
              <select value={selectedState} onChange={e=>{setSelectedState(e.target.value);setSelectedCity("");setSuburbSearch("");}} style={inputStyle}>
                <option value="">All states</option>
                {STATES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <select value={selectedCity} onChange={e=>{setSelectedCity(e.target.value);setSuburbSearch("");}} style={inputStyle}>
                <option value="">All cities</option>
                {cities.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* SUBURB MULTI-SELECT */}
          <div ref={suburbRef}>
            <label style={labelStyle}>
              Suburbs * 
              <span style={{textTransform:"none",letterSpacing:0,fontWeight:400,color:"#94a3b8",marginLeft:6}}>
                {selectedSuburbs.length}/{MAX_SUBURBS} selected
              </span>
            </label>
            <div style={{position:"relative"}}>
              <input
                value={suburbSearch}
                onChange={e=>setSuburbSearch(e.target.value)}
                onFocus={()=>setShowSuburbDropdown(true)}
                placeholder={selectedSuburbs.length >= MAX_SUBURBS ? `Maximum ${MAX_SUBURBS} suburbs reached` : "Type suburb name or postcode..."}
                disabled={selectedSuburbs.length >= MAX_SUBURBS}
                style={{...inputStyle,borderColor:errors.suburbs?"#fca5a5":"#bfdbfe",opacity:selectedSuburbs.length>=MAX_SUBURBS?0.6:1}}
              />
              {showSuburbDropdown && suburbSearch && filteredSuburbs.length > 0 && selectedSuburbs.length < MAX_SUBURBS && (
                <div className="dropdown-anim" style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1px solid #bfdbfe",borderRadius:10,boxShadow:"0 8px 24px rgba(30,58,95,0.12)",zIndex:50,maxHeight:240,overflowY:"auto",marginTop:4}}>
                  {filteredSuburbs.map(s => (
                    <div key={`${s.name}-${s.postcode}`} className="dropdown-item" onClick={()=>addSuburb(s)}
                      style={{padding:"0.65rem 1rem",fontSize:"0.88rem",color:"#1e3a5f",cursor:"pointer",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>{s.name}</span>
                      <span style={{fontSize:"0.78rem",color:"#94a3b8"}}>{s.state} {s.postcode}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.suburbs && <div style={errorStyle}>{errors.suburbs}</div>}

            {/* SELECTED SUBURBS */}
            {selectedSuburbs.length > 0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginTop:"0.8rem"}}>
                {selectedSuburbs.map((s,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"0.4rem",background:"#EAF3DE",border:"1px solid #97C459",borderRadius:999,padding:"0.3rem 0.8rem",fontSize:"0.82rem",color:"#27500A",fontWeight:600}}>
                    📍 {s.name} <span style={{color:"#4d7c0f",fontWeight:400}}>{s.postcode}</span>
                    <button className="btn" onClick={()=>removeSuburb(i)} style={{background:"none",border:"none",color:"#4d7c0f",fontSize:"0.9rem",padding:"0 0 0 2px",lineHeight:1}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{marginTop:"1rem",display:"flex",alignItems:"center",gap:"0.8rem",padding:"0.8rem 1rem",background:"#f8faff",borderRadius:10,border:"1px solid #dbeafe"}}>
            <label style={{display:"flex",alignItems:"center",gap:"0.6rem",cursor:"pointer",fontSize:"0.9rem",color:"#475569",userSelect:"none"}}>
              <input type="checkbox" checked={onlineAvailable} onChange={e=>setOnlineAvailable(e.target.checked)} style={{width:16,height:16,accentColor:"#84CC16"}}/>
              <span>I also offer <strong style={{color:"#1e3a5f"}}>online lessons</strong></span>
            </label>
          </div>
        </div>

        {/* PRICING */}
        <div style={cardStyle}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Pricing</div>
          <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.4rem"}}>Set your base rate. Add booking packages (weekly, term, annual etc.) from your dashboard after approval.</p>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
            <div>
              <label style={labelStyle}>Price per session (AUD) *</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:"0.8rem",top:"50%",transform:"translateY(-50%)",color:"#64748b",fontSize:"0.9rem"}}>$</span>
                <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="75" style={{...inputStyle,paddingLeft:"1.6rem",borderColor:errors.price?"#fca5a5":"#bfdbfe"}}/>
              </div>
              {errors.price && <div style={errorStyle}>{errors.price}</div>}
            </div>
            <div>
              <label style={labelStyle}>Session duration</label>
              <select value={sessionDuration} onChange={e=>setSessionDuration(e.target.value)} style={inputStyle}>
                {[["30","30 minutes"],["45","45 minutes"],["60","1 hour"],["90","1.5 hours"],["120","2 hours"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Lesson type</label>
              <div style={{display:"flex",gap:"0.4rem",marginTop:"0.1rem"}}>
                {["Private","Group","Both"].map(t=>(
                  <button key={t} className="lesson-type-btn" onClick={()=>setLessonType(t)}
                    style={{flex:1,background:lessonType===t?"#1e3a5f":"white",color:lessonType===t?"white":"#64748b",border:`1px solid ${lessonType===t?"#1e3a5f":"#bfdbfe"}`,fontSize:"0.78rem",padding:"0.5rem 0.4rem"}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* REVIEW NOTICE */}
        <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1.5rem",display:"flex",gap:"0.8rem",alignItems:"flex-start"}}>
          <div style={{fontSize:"1.2rem",marginTop:"0.1rem"}}>📋</div>
          <div>
            <div style={{fontSize:"0.9rem",fontWeight:700,color:"#27500A",marginBottom:"0.3rem"}}>Your listing will be reviewed before going live</div>
            <div style={{fontSize:"0.82rem",color:"#3B6D11",lineHeight:1.6}}>We check every listing within 24 hours. Most are approved same day. You'll get an email notification when you're live.</div>
          </div>
        </div>

        {/* SUBMIT */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.85rem 2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontWeight:600,fontSize:"0.95rem"}}>Cancel</button>
          <button className="btn" onClick={handleSubmit} style={{padding:"0.85rem 2.5rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"1rem"}}>Submit for Review →</button>
        </div>
      </div>
    </>
  );
}
