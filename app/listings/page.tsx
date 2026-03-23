"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { email: string; id: string } | null;
type Listing = {
  id: string;
  user_id: string;
  provider_name: string;
  activity_type: string;
  lesson_title: string;
  description: string;
  photo_url: string;
  suburbs: string;
  online_available: boolean;
  price: number;
  session_duration: string;
  lesson_type: string;
  status: string;
};

const ACTIVITY_EMOJIS: Record<string,string> = {
  "Tennis":"🎾","Piano":"🎹","Swimming":"🏊","Yoga":"🧘","Guitar":"🎸",
  "Martial Arts":"🥋","Dancing":"💃","Singing":"🎤","Basketball":"🏀",
  "Football (Soccer)":"⚽","Cricket":"🏏","Cooking":"👨‍🍳","Coding & Programming":"💻",
  "Art & Drawing":"🎨","Violin":"🎻","Drums":"🥁","Boxing":"🥊",
  "Golf":"⛳","Cycling":"🚴","Running":"🏃","Default":"📚"
};

export default function ListingDetail() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [listing, setListing] = useState<Listing|null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryMsg, setEnquiryMsg] = useState("");
  const [enquirySent, setEnquirySent] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { email: session.user.email!, id: session.user.id } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email!, id: session.user.id } : null);
    });
    loadListing();
    return () => subscription.unsubscribe();
  }, []);

  const loadListing = async () => {
    const { data, error } = await supabase.from("listings").select("*").eq("id", params.id).single();
    setLoading(false);
    if (error || !data) { setNotFound(true); return; }
    setListing(data);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const handleEnquiry = async () => {
    if (!enquiryMsg.trim() || !user || !listing) return;
    setSending(true);
    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("listing_id", listing.id)
        .eq("seeker_id", user.id)
        .single();

      let convId = existingConv?.id;

      // Create conversation if it doesn't exist
      if (!convId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            listing_id: listing.id,
            seeker_id: user.id,
            provider_id: listing.user_id,
            last_message: enquiryMsg,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (convError) throw convError;
        convId = newConv.id;
      }

      // Save message
      const { error: msgError } = await supabase.from("messages").insert({
        listing_id: listing.id,
        sender_id: user.id,
        receiver_id: listing.user_id,
        message: enquiryMsg,
        read: false,
      });
      if (msgError) throw msgError;

      setEnquirySent(true);
      setShowEnquiry(false);
      showToast("Enquiry sent! The provider will be in touch soon 📧");
    } catch (err) {
      console.error(err);
      showToast("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const getEmoji = (type: string) => ACTIVITY_EMOJIS[type] || ACTIVITY_EMOJIS["Default"];
  const getSuburbs = (json: string) => { try { return JSON.parse(json); } catch { return []; } };
  const getDuration = (d: string) => ({ "30":"30 minutes","45":"45 minutes","60":"1 hour","90":"1.5 hours","120":"2 hours" }[d] || `${d} mins`);

  const inputStyle: React.CSSProperties = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { display:"block", fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:"#64748b", marginBottom:"0.4rem" };

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;font-family:'DM Sans',sans-serif;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"1rem"}}>
        <div style={{fontSize:"3rem"}}>🔍</div>
        <div style={{fontSize:"1.2rem",fontWeight:700,color:"#1e3a5f"}}>Listing not found</div>
        <button onClick={()=>router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
      </div>
    </>
  );

  const suburbs = getSuburbs(listing!.suburbs);

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

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}><span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
        <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.5rem 1.2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"transparent",color:"#1e3a5f",fontSize:"0.85rem"}}>← Back to Listings</button>
      </nav>

      {/* HERO */}
      <div style={{background:"#1e3a5f",padding:"4rem 2.5rem 3rem",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",fontSize:"20vw",top:"-1rem",right:"-1rem",opacity:0.06,pointerEvents:"none"}}>{getEmoji(listing!.activity_type)}</div>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#84CC16",background:"rgba(132,204,22,0.15)",padding:"0.3rem 0.8rem",borderRadius:999,border:"1px solid rgba(132,204,22,0.3)"}}>{listing!.activity_type}</span>
            <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:"rgba(132,204,22,0.15)",color:"#84CC16",border:"1px solid rgba(132,204,22,0.3)"}}>{listing!.lesson_type}</span>
            {listing!.online_available && <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:"rgba(59,130,246,0.2)",color:"#93c5fd",border:"1px solid rgba(59,130,246,0.3)"}}>🌐 Online available</span>}
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2rem,5vw,3.5rem)",lineHeight:1,marginBottom:"1rem",letterSpacing:1,color:"white"}}>{listing!.lesson_title}</h1>
          <div style={{display:"flex",alignItems:"center",gap:"1.5rem",flexWrap:"wrap",fontSize:"0.9rem",color:"#93c5fd"}}>
            <span>👤 {listing!.provider_name}</span>
            <span>📍 {suburbs.map((s: any) => `${s.name}`).join(", ")}</span>
            <span>⏱️ {getDuration(listing!.session_duration)}</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"2.5rem",display:"grid",gridTemplateColumns:"1fr 300px",gap:"2rem",alignItems:"start"}}>

        {/* LEFT */}
        <div style={{animation:"fadeInUp 0.4s ease"}}>

          {/* PHOTO + BIO */}
          <div style={{background:"white",borderRadius:16,padding:"1.8rem",border:"1px solid #dbeafe",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>About These Lessons</h2>
            <div style={{display:"flex",gap:"1.2rem",alignItems:"flex-start"}}>
              {listing!.photo_url ? (
                <img src={listing!.photo_url} alt={listing!.provider_name} style={{width:80,height:80,borderRadius:12,objectFit:"cover",border:"2px solid #84CC16",flexShrink:0}}/>
              ) : (
                <div style={{width:80,height:80,borderRadius:12,background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",flexShrink:0}}>{getEmoji(listing!.activity_type)}</div>
              )}
              <p style={{color:"#475569",lineHeight:1.8,fontSize:"0.95rem"}}>{listing!.description}</p>
            </div>
          </div>

          {/* LESSON DETAILS */}
          <div style={{background:"white",borderRadius:16,padding:"1.8rem",border:"1px solid #dbeafe",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>Lesson Details</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              {[
                ["⏱️","Duration",getDuration(listing!.session_duration)],
                ["👥","Lesson Type",listing!.lesson_type],
                ["💰","Price",`$${listing!.price} per session`],
                ["🌐","Online",listing!.online_available?"Available":"Not available"],
              ].map(([icon,label,value])=>(
                <div key={label} style={{background:"#f8faff",borderRadius:10,padding:"1rem",border:"1px solid #dbeafe"}}>
                  <div style={{fontSize:"1.2rem",marginBottom:"0.3rem"}}>{icon}</div>
                  <div style={{fontSize:"0.75rem",color:"#64748b",textTransform:"uppercase",letterSpacing:0.8,fontWeight:700,marginBottom:"0.2rem"}}>{label}</div>
                  <div style={{fontSize:"0.95rem",fontWeight:600,color:"#1e3a5f"}}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* LOCATIONS */}
          <div style={{background:"white",borderRadius:16,padding:"1.8rem",border:"1px solid #dbeafe",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,marginBottom:"1rem",color:"#1e3a5f"}}>Locations Covered</h2>
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
              {suburbs.map((s: any, i: number)=>(
                <span key={i} style={{display:"inline-flex",alignItems:"center",gap:"0.3rem",background:"#EAF3DE",border:"1px solid #97C459",borderRadius:999,padding:"0.3rem 0.8rem",fontSize:"0.82rem",color:"#27500A",fontWeight:600}}>
                  📍 {s.name} <span style={{fontWeight:400,color:"#4d7c0f"}}>{s.postcode}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — BOOKING CARD */}
        <div style={{position:"sticky",top:"5rem",animation:"fadeInUp 0.4s ease 0.1s both"}}>
          <div style={{background:"white",borderRadius:20,border:"1px solid #dbeafe",overflow:"hidden",boxShadow:"0 4px 20px rgba(30,58,95,0.1)"}}>
            <div style={{background:"#1e3a5f",padding:"1.5rem",borderBottom:"3px solid #84CC16"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.5rem",color:"#84CC16",letterSpacing:1,lineHeight:1}}>${listing!.price}</div>
              <div style={{fontSize:"0.85rem",color:"#93c5fd",marginTop:"0.2rem"}}>per session · {getDuration(listing!.session_duration)}</div>
            </div>
            <div style={{padding:"1.5rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.2rem",paddingBottom:"1.2rem",borderBottom:"1px solid #f1f5f9"}}>
                {listing!.photo_url ? (
                  <img src={listing!.photo_url} alt="" style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid #84CC16",flexShrink:0}}/>
                ) : (
                  <div style={{width:44,height:44,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:"#84CC16",flexShrink:0}}>
                    {listing!.provider_name.split(" ").map((w: string)=>w[0]).join("").slice(0,2)}
                  </div>
                )}
                <div>
                  <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f"}}>{listing!.provider_name}</div>
                  <div style={{fontSize:"0.8rem",color:"#64748b"}}>{listing!.activity_type} provider</div>
                </div>
              </div>

              {enquirySent ? (
                <div style={{background:"rgba(132,204,22,0.1)",border:"1px solid rgba(132,204,22,0.3)",borderRadius:12,padding:"1rem",textAlign:"center",marginBottom:"1rem"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>✅</div>
                  <div style={{fontSize:"0.9rem",color:"#4d7c0f",fontWeight:700}}>Enquiry Sent!</div>
                  <div style={{fontSize:"0.8rem",color:"#64748b",marginTop:"0.2rem"}}>The provider will be in touch soon</div>
                </div>
              ) : (
                <button className="btn" onClick={()=>user?setShowEnquiry(true):router.push("/")}
                  style={{width:"100%",padding:"0.9rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:12,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem"}}>
                  {user?"📧 Send Enquiry":"🔐 Log In to Enquire"}
                </button>
              )}

              {!user&&<p style={{textAlign:"center",fontSize:"0.8rem",color:"#64748b",marginBottom:"1rem"}}><span style={{color:"#84CC16",cursor:"pointer",fontWeight:700}} onClick={()=>router.push("/")}>Sign up free</span> to send an enquiry</p>}

              <div style={{fontSize:"0.78rem",color:"#94a3b8",textAlign:"center",paddingTop:"0.8rem",borderTop:"1px solid #f1f5f9"}}>✓ Free to enquire · No booking fees · In-app messaging</div>
            </div>
          </div>
        </div>
      </div>

      {/* ENQUIRY MODAL */}
      {showEnquiry&&(
        <div onClick={(e)=>{if(e.target===e.currentTarget)setShowEnquiry(false);}} style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",border:"1px solid #bfdbfe",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease",boxShadow:"0 20px 60px rgba(30,58,95,0.15)"}}>
            <button onClick={()=>setShowEnquiry(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#64748b",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>Send Enquiry</h3>
            <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Message {listing!.provider_name} about this lesson</p>
            <div style={{background:"#f8faff",borderRadius:10,padding:"0.8rem 1rem",marginBottom:"1.2rem",border:"1px solid #dbeafe",fontSize:"0.85rem",color:"#475569"}}>
              <strong style={{color:"#1e3a5f"}}>{listing!.lesson_title}</strong><br/>
              <span style={{color:"#64748b"}}>${listing!.price}/session · {getDuration(listing!.session_duration)}</span>
            </div>
            <div style={{marginBottom:"1.2rem"}}>
              <label style={labelStyle}>Your Message</label>
              <textarea value={enquiryMsg} onChange={e=>setEnquiryMsg(e.target.value)}
                placeholder={`Hi ${listing!.provider_name.split(" ")[0]}, I'm interested in your ${listing!.activity_type} lessons. Could you please let me know your availability?`}
                style={{...inputStyle,resize:"vertical",minHeight:120}}/>
            </div>
            <button className="btn" onClick={handleEnquiry} disabled={sending||!enquiryMsg.trim()}
              style={{width:"100%",padding:"0.85rem",background:sending||!enquiryMsg.trim()?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",opacity:sending||!enquiryMsg.trim()?0.7:1}}>
              {sending?"Sending...":"Send Enquiry →"}
            </button>
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,animation:"slideUp 0.3s ease",border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}
