"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { email: string } | null;

const ACTIVITY_TYPES = ["Tennis","Piano","Swimming","Yoga","Guitar","Martial Arts","Dancing","Singing","Drawing & Art","Basketball","Cricket","Football","Cooking","Coding","Tutoring","Other"];
const SUBURBS = ["Richmond","Fitzroy","St Kilda","South Yarra","Carlton","Hawthorn","Toorak","Docklands","Collingwood","Prahran","Windsor","Brunswick","Northcote","Coburg","Footscray","Williamstown","Brighton","Bayside","Glen Waverley","Box Hill"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const QUALIFICATIONS = ["Coaching Certificate","Teaching Degree","Bachelor of Music","Personal Training Certificate","First Aid Certified","Working With Children Check","Police Check","Professional Membership","Other"];

const BOOKING_TYPES = [
  { key:"adhoc", label:"Ad-hoc", desc:"Single one-off session, booked as needed" },
  { key:"weekly", label:"Weekly", desc:"Fixed recurring slot every week" },
  { key:"fortnightly", label:"Fortnightly", desc:"Recurring session every two weeks" },
  { key:"monthly", label:"Monthly", desc:"Set number of sessions per month" },
  { key:"term", label:"Term (10 weeks)", desc:"School term based package — 10 sessions" },
  { key:"annual", label:"Annual", desc:"Full year commitment — 40 sessions" },
  { key:"custom", label:"Custom Range", desc:"You define the number of sessions and timeframe" },
];

type TimeSlot = { day: string; from: string; to: string };
type BookingOption = {
  enabled: boolean;
  price: string;
  sessions: string;
  billing: string;
  discount: string;
  cancellation: string;
  customLabel?: string;
  customSessions?: string;
  customWeeks?: string;
};

export default function ProviderCreate() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Step 1
  const [providerName, setProviderName] = useState("");
  const [activityType, setActivityType] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [contactMethod, setContactMethod] = useState("Email");
  const [experience, setExperience] = useState("");
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [whatToBring, setWhatToBring] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [trialPrice, setTrialPrice] = useState("");

  // Step 2
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ day:"Monday", from:"09:00", to:"10:00" }]);
  const [sessionDuration, setSessionDuration] = useState("60");
  const [maxStudents, setMaxStudents] = useState("1");
  const [lessonType, setLessonType] = useState("Private");
  const [bookingNotice, setBookingNotice] = useState("24");

  // Step 3
  const [bookingOptions, setBookingOptions] = useState<Record<string, BookingOption>>({
    adhoc:       { enabled:true,  price:"75",   sessions:"1",  billing:"Per session", discount:"0",  cancellation:"24 hours notice" },
    weekly:      { enabled:false, price:"65",   sessions:"4",  billing:"Monthly",     discount:"13", cancellation:"1 week notice" },
    fortnightly: { enabled:false, price:"70",   sessions:"2",  billing:"Fortnightly", discount:"7",  cancellation:"48 hours notice" },
    monthly:     { enabled:false, price:"260",  sessions:"4",  billing:"Monthly",     discount:"13", cancellation:"1 week notice" },
    term:        { enabled:false, price:"650",  sessions:"10", billing:"Upfront",     discount:"13", cancellation:"No refund after week 2" },
    annual:      { enabled:false, price:"2400", sessions:"40", billing:"Upfront",     discount:"20", cancellation:"No refund after month 1" },
    custom:      { enabled:false, price:"",     sessions:"",   billing:"Upfront",     discount:"",   cancellation:"", customLabel:"", customSessions:"", customWeeks:"" },
  });
  const [earlyBird, setEarlyBird] = useState(false);
  const [earlyBirdDays, setEarlyBirdDays] = useState("7");
  const [earlyBirdDiscount, setEarlyBirdDiscount] = useState("10");
  const [groupDiscount, setGroupDiscount] = useState(false);
  const [groupDiscountPct, setGroupDiscountPct] = useState("10");
  const [concessionRate, setConcessionRate] = useState(false);
  const [concessionDiscount, setConcessionDiscount] = useState("15");
  const [siblingDiscount, setSiblingDiscount] = useState(false);
  const [siblingDiscountPct, setSiblingDiscountPct] = useState("10");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["Bank Transfer"]);
  const [paymentTiming, setPaymentTiming] = useState("Before session");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { email: session.user.email! } : null);
    });
  }, []);

  const inputStyle = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif" };
  const labelStyle = { display:"block" as const, fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase" as const, color:"#64748b", marginBottom:"0.4rem" };
  const cardStyle = { background:"white", borderRadius:16, padding:"1.8rem", border:"1px solid #dbeafe", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(30,58,95,0.06)" };

  const toggleQualification = (q: string) => setQualifications(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]);
  const togglePaymentMethod = (m: string) => setPaymentMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const addTimeSlot = () => setTimeSlots(prev => [...prev, { day:"Monday", from:"09:00", to:"10:00" }]);
  const removeTimeSlot = (i: number) => setTimeSlots(prev => prev.filter((_,idx) => idx !== i));
  const updateTimeSlot = (i: number, field: keyof TimeSlot, val: string) => setTimeSlots(prev => prev.map((s,idx) => idx===i ? {...s,[field]:val} : s));

  const updateBookingOption = (key: string, field: keyof BookingOption, val: string | boolean) => {
    setBookingOptions(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
  };

  const getAdHocPrice = () => parseFloat(bookingOptions.adhoc.price) || 0;
  const getSaving = (key: string) => {
    const opt = bookingOptions[key];
    const sessions = parseFloat(opt.sessions) || 0;
    const price = parseFloat(opt.price) || 0;
    const adhoc = getAdHocPrice();
    if (!sessions || !adhoc) return null;
    const saving = (adhoc * sessions) - price;
    return saving > 0 ? saving.toFixed(0) : null;
  };

  const handleSubmit = async () => {
    setSubmitted(true);
  };

  const stepLabels = ["About Your Lessons", "Availability", "Pricing & Booking"];

  if (submitted) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}`}</style>
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",background:"rgba(255,255,255,0.95)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={() => router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
      </nav>
      <div style={{maxWidth:600,margin:"6rem auto",padding:"2rem",textAlign:"center"}}>
        <div style={{fontSize:"4rem",marginBottom:"1rem"}}>🎉</div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.5rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>Listing Submitted!</h1>
        <p style={{color:"#64748b",lineHeight:1.7,marginBottom:"2rem"}}>Thanks {providerName}! Your listing is under review. We'll be in touch within 24 hours to confirm and get you live on PlayUp.</p>
        <div style={{background:"white",borderRadius:16,padding:"1.5rem",border:"1px solid #dbeafe",marginBottom:"2rem",textAlign:"left"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>Your Listing Summary</div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",fontSize:"0.9rem",color:"#475569"}}>
            <div><strong style={{color:"#1e3a5f"}}>Activity:</strong> {activityType} — {lessonTitle}</div>
            <div><strong style={{color:"#1e3a5f"}}>Location:</strong> {suburb} {postcode}</div>
            <div><strong style={{color:"#1e3a5f"}}>Ad-hoc price:</strong> ${bookingOptions.adhoc.price}/session</div>
            <div><strong style={{color:"#1e3a5f"}}>Booking types:</strong> {BOOKING_TYPES.filter(b => bookingOptions[b.key].enabled).map(b => b.label).join(", ")}</div>
            <div><strong style={{color:"#1e3a5f"}}>Contact:</strong> {email} · {phone}</div>
          </div>
        </div>
        <button onClick={() => router.push("/")} style={{padding:"0.85rem 2rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"1rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
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
        .toggle-chip{padding:0.4rem 1rem;border-radius:999px;font-size:0.82rem;font-weight:600;cursor:pointer;border:1px solid #bfdbfe;color:#64748b;background:white;transition:all 0.2s;font-family:'DM Sans',sans-serif;}
        .toggle-chip.active{border-color:#84CC16;color:#4d7c0f;background:rgba(132,204,22,0.1);}
        .booking-card{background:white;border-radius:12px;border:1px solid #dbeafe;overflow:hidden;margin-bottom:1rem;transition:all 0.2s;}
        .booking-card.active{border-color:#84CC16;box-shadow:0 2px 12px rgba(132,204,22,0.15);}
        input:focus,select:focus,textarea:focus{border-color:#84CC16!important;}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeInUp 0.3s ease both;}
      `}</style>

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={() => router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
        <div style={{fontSize:"0.85rem",color:"#64748b"}}>Provider Onboarding</div>
        <button className="btn" onClick={() => router.push("/")} style={{padding:"0.5rem 1.2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"transparent",color:"#1e3a5f",fontSize:"0.85rem"}}>Cancel</button>
      </nav>

      {/* PROGRESS */}
      <div style={{background:"white",borderBottom:"1px solid #dbeafe",padding:"1.5rem 2.5rem"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <div style={{display:"flex",gap:"0",marginBottom:"1rem"}}>
            {stepLabels.map((label,i) => (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"0.4rem",position:"relative"}}>
                {i > 0 && <div style={{position:"absolute",top:16,left:"-50%",right:"50%",height:2,background:step>i?"#84CC16":"#dbeafe",zIndex:0}}/>}
                <div style={{width:32,height:32,borderRadius:"50%",background:step>i+1?"#84CC16":step===i+1?"#1e3a5f":"white",border:`2px solid ${step>=i+1?"#1e3a5f":"#dbeafe"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",fontWeight:700,color:step>i+1?"#1e3a5f":step===i+1?"white":"#94a3b8",zIndex:1,position:"relative"}}>
                  {step>i+1 ? "✓" : i+1}
                </div>
                <div style={{fontSize:"0.75rem",fontWeight:600,color:step===i+1?"#1e3a5f":"#94a3b8",textAlign:"center"}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:800,margin:"0 auto",padding:"2.5rem"}}>

        {/* ============ STEP 1 ============ */}
        {step === 1 && (
          <div className="fade-in">
            <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:1,marginBottom:"0.5rem",color:"#1e3a5f"}}>About Your Lessons</h1>
            <p style={{color:"#64748b",marginBottom:"2rem"}}>Tell students who you are and what you offer.</p>

            <div style={cardStyle}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Basic Information</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div><label style={labelStyle}>Provider / Business Name</label><input value={providerName} onChange={e=>setProviderName(e.target.value)} placeholder="e.g. Sarah Mitchell Coaching" style={inputStyle}/></div>
                <div>
                  <label style={labelStyle}>Activity Type</label>
                  <select value={activityType} onChange={e=>setActivityType(e.target.value)} style={inputStyle}>
                    <option value="">Select activity...</option>
                    {ACTIVITY_TYPES.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:"1rem"}}><label style={labelStyle}>Lesson Title</label><input value={lessonTitle} onChange={e=>setLessonTitle(e.target.value)} placeholder="e.g. Beginner to Intermediate Tennis Coaching" style={inputStyle}/></div>
              <div><label style={labelStyle}>Description</label><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe your lessons, teaching style, and who they're suited for..." style={{...inputStyle,resize:"vertical",minHeight:100}}/></div>
            </div>

            <div style={cardStyle}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Location</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div>
                  <label style={labelStyle}>Suburb</label>
                  <select value={suburb} onChange={e=>setSuburb(e.target.value)} style={inputStyle}>
                    <option value="">Select suburb...</option>
                    {SUBURBS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Postcode</label><input value={postcode} onChange={e=>setPostcode(e.target.value)} placeholder="e.g. 3121" style={inputStyle}/></div>
              </div>
              <div style={{marginBottom:"1rem"}}><label style={labelStyle}>Full Address</label><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="e.g. Burnley Tennis Club, 500 Church St" style={inputStyle}/></div>
              <label style={{display:"flex",alignItems:"center",gap:"0.6rem",cursor:"pointer",fontSize:"0.9rem",color:"#475569"}}>
                <input type="checkbox" checked={onlineAvailable} onChange={e=>setOnlineAvailable(e.target.checked)} style={{width:16,height:16,accentColor:"#84CC16"}}/>
                Online lessons also available
              </label>
            </div>

            <div style={cardStyle}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Experience & Credentials</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.2rem"}}>
                <div><label style={labelStyle}>Years of Experience</label><input value={experience} onChange={e=>setExperience(e.target.value)} placeholder="e.g. 12" style={inputStyle}/></div>
                <div>
                  <label style={labelStyle}>Lesson Type</label>
                  <select value={lessonType} onChange={e=>setLessonType(e.target.value)} style={inputStyle}>
                    {["Private","Group","Both"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <label style={labelStyle}>Qualifications & Certifications</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1rem"}}>
                {QUALIFICATIONS.map(q => (
                  <button key={q} className={`toggle-chip ${qualifications.includes(q)?"active":""}`} onClick={() => toggleQualification(q)}>{q}</button>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Contact Details</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div><label style={labelStyle}>Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. 0412 345 678" style={inputStyle}/></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div><label style={labelStyle}>Website (optional)</label><input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yoursite.com" style={inputStyle}/></div>
                <div>
                  <label style={labelStyle}>Preferred Contact Method</label>
                  <select value={contactMethod} onChange={e=>setContactMethod(e.target.value)} style={inputStyle}>
                    {["Email","Phone","In-app message","Any"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>What to Bring & House Rules</div>
              <div style={{marginBottom:"1rem"}}><label style={labelStyle}>What Students Should Bring</label><textarea value={whatToBring} onChange={e=>setWhatToBring(e.target.value)} placeholder="e.g. Tennis racquet, water bottle, comfortable shoes" style={{...inputStyle,resize:"vertical",minHeight:80}}/></div>
              <div style={{marginBottom:"1rem"}}><label style={labelStyle}>House Rules & Policies</label><textarea value={houseRules} onChange={e=>setHouseRules(e.target.value)} placeholder="e.g. Please arrive 5 minutes early. 24 hour cancellation notice required." style={{...inputStyle,resize:"vertical",minHeight:80}}/></div>
              <div style={{display:"flex",alignItems:"flex-start",gap:"1rem",padding:"1rem",background:"#f8faff",borderRadius:12,border:"1px solid #dbeafe"}}>
                <div style={{flex:1}}>
                  <label style={{display:"flex",alignItems:"center",gap:"0.6rem",cursor:"pointer",fontSize:"0.9rem",color:"#475569",marginBottom:"0.6rem"}}>
                    <input type="checkbox" checked={trialAvailable} onChange={e=>setTrialAvailable(e.target.checked)} style={{width:16,height:16,accentColor:"#84CC16"}}/>
                    <span style={{fontWeight:600}}>Offer a trial session at a discounted rate</span>
                  </label>
                  {trialAvailable && <div style={{marginTop:"0.6rem"}}><label style={labelStyle}>Trial Session Price (AUD)</label><input value={trialPrice} onChange={e=>setTrialPrice(e.target.value)} placeholder="e.g. 40" style={{...inputStyle,maxWidth:200}}/></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 2 ============ */}
        {step === 2 && (
          <div className="fade-in">
            <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:1,marginBottom:"0.5rem",color:"#1e3a5f"}}>Availability</h1>
            <p style={{color:"#64748b",marginBottom:"2rem"}}>When are you available to teach? Students will see these times when enquiring.</p>

            <div style={cardStyle}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Session Settings</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem"}}>
                <div>
                  <label style={labelStyle}>Session Duration</label>
                  <select value={sessionDuration} onChange={e=>setSessionDuration(e.target.value)} style={inputStyle}>
                    {[["30","30 minutes"],["45","45 minutes"],["60","1 hour"],["90","1.5 hours"],["120","2 hours"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Max Students</label>
                  <select value={maxStudents} onChange={e=>setMaxStudents(e.target.value)} style={inputStyle}>
                    {["1","2","3","4","5","6","8","10","12","15","20+"].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Booking Notice</label>
                  <select value={bookingNotice} onChange={e=>setBookingNotice(e.target.value)} style={inputStyle}>
                    {[["1","1 hour"],["2","2 hours"],["4","4 hours"],["24","24 hours"],["48","48 hours"],["72","3 days"],["168","1 week"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.2rem"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,color:"#1e3a5f"}}>Available Time Slots</div>
                <button className="btn" onClick={addTimeSlot} style={{padding:"0.4rem 1rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontSize:"0.82rem",fontWeight:700}}>+ Add Slot</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
                {timeSlots.map((slot,i) => (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:"0.8rem",alignItems:"end",background:"#f8faff",padding:"1rem",borderRadius:12,border:"1px solid #dbeafe"}}>
                    <div>
                      <label style={labelStyle}>Day</label>
                      <select value={slot.day} onChange={e=>updateTimeSlot(i,"day",e.target.value)} style={inputStyle}>
                        {DAYS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>From</label>
                      <input type="time" value={slot.from} onChange={e=>updateTimeSlot(i,"from",e.target.value)} style={inputStyle}/>
                    </div>
                    <div>
                      <label style={labelStyle}>To</label>
                      <input type="time" value={slot.to} onChange={e=>updateTimeSlot(i,"to",e.target.value)} style={inputStyle}/>
                    </div>
                    {timeSlots.length > 1 && (
                      <button className="btn" onClick={() => removeTimeSlot(i)} style={{padding:"0.5rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:8,fontSize:"0.85rem",marginBottom:"0"}}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 3 ============ */}
        {step === 3 && (
          <div className="fade-in">
            <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:1,marginBottom:"0.5rem",color:"#1e3a5f"}}>Pricing & Booking Options</h1>
            <p style={{color:"#64748b",marginBottom:"2rem"}}>Toggle on each booking type you want to offer and set your pricing. Ad-hoc is required — all others are optional.</p>

            {BOOKING_TYPES.map(bt => {
              const opt = bookingOptions[bt.key];
              const saving = bt.key !== "adhoc" && bt.key !== "custom" ? getSaving(bt.key) : null;
              return (
                <div key={bt.key} className={`booking-card ${opt.enabled?"active":""}`}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 1.4rem",cursor:bt.key!=="adhoc"?"pointer":"default"}} onClick={() => bt.key!=="adhoc" && updateBookingOption(bt.key,"enabled",!opt.enabled)}>
                    <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
                      <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${opt.enabled?"#84CC16":"#bfdbfe"}`,background:opt.enabled?"#84CC16":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {opt.enabled && <span style={{color:"#1e3a5f",fontSize:"0.7rem",fontWeight:900}}>✓</span>}
                      </div>
                      <div>
                        <div style={{fontWeight:700,color:"#1e3a5f",fontSize:"0.95rem"}}>{bt.label} {bt.key==="adhoc" && <span style={{fontSize:"0.7rem",background:"#1e3a5f",color:"white",padding:"2px 8px",borderRadius:999,marginLeft:6}}>Required</span>}</div>
                        <div style={{fontSize:"0.8rem",color:"#64748b"}}>{bt.desc}</div>
                      </div>
                    </div>
                    {opt.enabled && opt.price && bt.key !== "custom" && (
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",color:"#84CC16",letterSpacing:1}}>${opt.price}</div>
                        {saving && <div style={{fontSize:"0.75rem",color:"#F97316",fontWeight:600}}>Save ${saving}</div>}
                      </div>
                    )}
                  </div>

                  {opt.enabled && (
                    <div style={{padding:"0 1.4rem 1.4rem",borderTop:"1px solid #f1f5f9"}}>
                      <div style={{paddingTop:"1rem",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                        <div>
                          <label style={labelStyle}>{bt.key==="custom"?"Price (AUD)":"Price (AUD)"}</label>
                          <input value={opt.price} onChange={e=>updateBookingOption(bt.key,"price",e.target.value)} placeholder="e.g. 75" style={inputStyle}/>
                        </div>
                        {bt.key !== "adhoc" && bt.key !== "custom" && (
                          <div>
                            <label style={labelStyle}>Sessions Included</label>
                            <input value={opt.sessions} onChange={e=>updateBookingOption(bt.key,"sessions",e.target.value)} placeholder="e.g. 10" style={inputStyle}/>
                          </div>
                        )}
                        {bt.key === "custom" && (
                          <>
                            <div>
                              <label style={labelStyle}>Number of Sessions</label>
                              <input value={opt.customSessions||""} onChange={e=>updateBookingOption(bt.key,"customSessions",e.target.value)} placeholder="e.g. 6" style={inputStyle}/>
                            </div>
                            <div>
                              <label style={labelStyle}>Over How Many Weeks</label>
                              <input value={opt.customWeeks||""} onChange={e=>updateBookingOption(bt.key,"customWeeks",e.target.value)} placeholder="e.g. 3" style={inputStyle}/>
                            </div>
                          </>
                        )}
                        <div>
                          <label style={labelStyle}>Billing</label>
                          <select value={opt.billing} onChange={e=>updateBookingOption(bt.key,"billing",e.target.value)} style={inputStyle}>
                            {["Per session","Weekly","Fortnightly","Monthly","Upfront"].map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Cancellation Policy</label>
                        <input value={opt.cancellation} onChange={e=>updateBookingOption(bt.key,"cancellation",e.target.value)} placeholder="e.g. 24 hours notice required for full refund" style={inputStyle}/>
                      </div>
                      {bt.key !== "adhoc" && bt.key !== "custom" && getAdHocPrice() > 0 && (
                        <div style={{marginTop:"0.8rem",padding:"0.6rem 1rem",background:"rgba(132,204,22,0.08)",borderRadius:8,border:"1px solid rgba(132,204,22,0.2)",fontSize:"0.82rem",color:"#4d7c0f"}}>
                          💡 vs ad-hoc rate of ${(getAdHocPrice() * parseFloat(opt.sessions || "0")).toFixed(0)} for {opt.sessions} sessions
                          {saving ? ` — student saves $${saving}` : " — no saving vs ad-hoc"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ADDITIONAL DISCOUNTS */}
            <div style={{...cardStyle, marginTop:"2rem"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Additional Discounts</div>
              <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                {[
                  { enabled:earlyBird, setEnabled:setEarlyBird, label:"Early Bird Discount", desc:"Discount for bookings made X days in advance",
                    fields:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginTop:"0.8rem"}}>
                      <div><label style={labelStyle}>Days in Advance</label><input value={earlyBirdDays} onChange={e=>setEarlyBirdDays(e.target.value)} placeholder="e.g. 7" style={inputStyle}/></div>
                      <div><label style={labelStyle}>Discount %</label><input value={earlyBirdDiscount} onChange={e=>setEarlyBirdDiscount(e.target.value)} placeholder="e.g. 10" style={inputStyle}/></div>
                    </div> },
                  { enabled:groupDiscount, setEnabled:setGroupDiscount, label:"Group Discount", desc:"Lower per-person rate when 2+ students book together",
                    fields:<div style={{marginTop:"0.8rem"}}><label style={labelStyle}>Discount %</label><input value={groupDiscountPct} onChange={e=>setGroupDiscountPct(e.target.value)} placeholder="e.g. 10" style={{...inputStyle,maxWidth:200}}/></div> },
                  { enabled:concessionRate, setEnabled:setConcessionRate, label:"Concession Rate", desc:"Discounted rate for students, pension or health care card holders",
                    fields:<div style={{marginTop:"0.8rem"}}><label style={labelStyle}>Discount %</label><input value={concessionDiscount} onChange={e=>setConcessionDiscount(e.target.value)} placeholder="e.g. 15" style={{...inputStyle,maxWidth:200}}/></div> },
                  { enabled:siblingDiscount, setEnabled:setSiblingDiscount, label:"Sibling Discount", desc:"Discount for second child from same family",
                    fields:<div style={{marginTop:"0.8rem"}}><label style={labelStyle}>Discount %</label><input value={siblingDiscountPct} onChange={e=>setSiblingDiscountPct(e.target.value)} placeholder="e.g. 10" style={{...inputStyle,maxWidth:200}}/></div> },
                ].map(({enabled,setEnabled,label,desc,fields}) => (
                  <div key={label} style={{padding:"1rem",background:"#f8faff",borderRadius:12,border:`1px solid ${enabled?"#84CC16":"#dbeafe"}`}}>
                    <label style={{display:"flex",alignItems:"flex-start",gap:"0.8rem",cursor:"pointer"}}>
                      <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} style={{width:16,height:16,accentColor:"#84CC16",marginTop:2}}/>
                      <div>
                        <div style={{fontWeight:700,color:"#1e3a5f",fontSize:"0.9rem"}}>{label}</div>
                        <div style={{fontSize:"0.8rem",color:"#64748b"}}>{desc}</div>
                      </div>
                    </label>
                    {enabled && fields}
                  </div>
                ))}
              </div>
            </div>

            {/* PAYMENT */}
            <div style={cardStyle}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Payment Settings</div>
              <div style={{marginBottom:"1.2rem"}}>
                <label style={labelStyle}>Payment Methods Accepted</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginTop:"0.4rem"}}>
                  {["Cash","Bank Transfer","Card (Stripe)","PayPal","PayID","Other"].map(m => (
                    <button key={m} className={`toggle-chip ${paymentMethods.includes(m)?"active":""}`} onClick={() => togglePaymentMethod(m)}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Payment Due</label>
                <select value={paymentTiming} onChange={e=>setPaymentTiming(e.target.value)} style={{...inputStyle,maxWidth:300}}>
                  {["Before session","After session","Weekly","Monthly","Upfront for packages"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* NAV BUTTONS */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"2rem",paddingTop:"1.5rem",borderTop:"1px solid #dbeafe"}}>
          <button className="btn" onClick={() => step > 1 ? setStep(s => s-1) : router.push("/")}
            style={{padding:"0.85rem 2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontWeight:600,fontSize:"0.95rem"}}>
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          <div style={{fontSize:"0.85rem",color:"#94a3b8"}}>Step {step} of 3</div>
          {step < 3 ? (
            <button className="btn" onClick={() => setStep(s => s+1)}
              style={{padding:"0.85rem 2rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.95rem"}}>
              Next Step →
            </button>
          ) : (
            <button className="btn" onClick={handleSubmit}
              style={{padding:"0.85rem 2rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.95rem"}}>
              Submit Listing 🎉
            </button>
          )}
        </div>
      </div>
    </>
  );
}
