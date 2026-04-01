"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = { email: string; id: string } | null;
type Listing = {
  id: string; user_id: string; provider_name: string; activity_type: string;
  lesson_title: string; description: string; photo_url: string; suburbs: string;
  online_available: boolean; price: number; session_duration: string;
  lesson_type: string; status: string; booking_mode: string;
};
type Slot = { id: string; date: string; start_time: string; end_time: string; status: string; };

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
  const [toast, setToast] = useState("");

  // Enquiry mode state
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryMsg, setEnquiryMsg] = useState("");
  const [enquirySent, setEnquirySent] = useState(false);
  const [sending, setSending] = useState(false);

  // Calendar mode state
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot|null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [bookingMsg, setBookingMsg] = useState("");
  const [bookingSent, setBookingSent] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Request mode state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestPreferredDate, setRequestPreferredDate] = useState("");
  const [requestPreferredTime, setRequestPreferredTime] = useState("");
  const [requestMsg, setRequestMsg] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

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
    if (data.booking_mode === "calendar_instant" || data.booking_mode === "calendar_approval") {
      loadAvailableSlots(data.id);
    }
  };

  const loadAvailableSlots = async (listingId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("availability_slots")
      .select("*").eq("listing_id", listingId).eq("status", "available")
      .gte("date", today).order("date").order("start_time").limit(20);
    setAvailableSlots(data || []);
  };

  // ENQUIRY handler (original flow)
  const handleEnquiry = async () => {
    if (!enquiryMsg.trim() || !user || !listing) return;
    setSending(true);
    try {
      const { data: existingConv } = await supabase.from("conversations").select("*").eq("listing_id", listing.id).eq("seeker_id", user.id).single();
      let convId = existingConv?.id;
      if (!convId) {
        const { data: newConv, error: convError } = await supabase.from("conversations").insert({
          listing_id: listing.id, seeker_id: user.id, provider_id: listing.user_id,
          last_message: enquiryMsg, last_message_at: new Date().toISOString(),
        }).select().single();
        if (convError) throw convError;
        convId = newConv.id;
      }
      await supabase.from("messages").insert({
        listing_id: listing.id, sender_id: user.id, receiver_id: listing.user_id,
        message: enquiryMsg, read: false,
      });
      setEnquirySent(true); setShowEnquiry(false); setEnquiryMsg("");
      showToast("Enquiry sent! The provider will be in touch soon 📧");
    } catch { showToast("Something went wrong. Please try again."); }
    finally { setSending(false); }
  };

  // CALENDAR BOOKING handler
  const handleCalendarBooking = async () => {
    if (!selectedSlot || !user || !listing) return;
    setSending(true);
    try {
      const isInstant = listing.booking_mode === "calendar_instant";
      // Create the booking
      await supabase.from("bookings").insert({
        listing_id: listing.id, provider_id: listing.user_id,
        student_id: user.id, student_name: user.email.split("@")[0],
        student_email: user.email, slot_id: selectedSlot.id,
        date: selectedSlot.date, start_time: selectedSlot.start_time, end_time: selectedSlot.end_time,
        status: isInstant ? "confirmed" : "confirmed",
        attended: "pending", payment_status: "unpaid",
      });
      // Mark slot as booked
      await supabase.from("availability_slots").update({ status: "booked" }).eq("id", selectedSlot.id);
      // Notify provider via message
      const msgText = isInstant
        ? `Hi! I've booked your ${listing.activity_type} session on ${selectedSlot.date} at ${fmt12(selectedSlot.start_time)}.${bookingMsg ? ` Note: ${bookingMsg}` : ""}`
        : `Hi! I'd like to book your ${listing.activity_type} session on ${selectedSlot.date} at ${fmt12(selectedSlot.start_time)} — awaiting your confirmation.${bookingMsg ? ` Note: ${bookingMsg}` : ""}`;
      const { data: existingConv } = await supabase.from("conversations").select("*").eq("listing_id", listing.id).eq("seeker_id", user.id).single();
      let convId = existingConv?.id;
      if (!convId) {
        const { data: newConv } = await supabase.from("conversations").insert({
          listing_id: listing.id, seeker_id: user.id, provider_id: listing.user_id,
          last_message: msgText, last_message_at: new Date().toISOString(),
        }).select().single();
        convId = newConv?.id;
      }
      await supabase.from("messages").insert({
        listing_id: listing.id, sender_id: user.id, receiver_id: listing.user_id,
        message: msgText, read: false,
      });
      setBookingSent(true); setBookingConfirmed(isInstant);
      setShowCalendarModal(false);
      showToast(isInstant ? "✅ Booking confirmed!" : "📅 Booking request sent — awaiting provider approval.");
      await loadAvailableSlots(listing.id);
    } catch { showToast("Something went wrong. Please try again."); }
    finally { setSending(false); }
  };

  // REQUEST handler
  const handleRequest = async () => {
    if (!user || !listing) return;
    setSending(true);
    try {
      const msgText = `Hi! I'd like to book a ${listing.activity_type} session.${requestPreferredDate ? ` Preferred date: ${requestPreferredDate}` : ""}${requestPreferredTime ? ` at ${requestPreferredTime}` : ""}.${requestMsg ? ` ${requestMsg}` : ""}`;
      const { data: existingConv } = await supabase.from("conversations").select("*").eq("listing_id", listing.id).eq("seeker_id", user.id).single();
      let convId = existingConv?.id;
      if (!convId) {
        const { data: newConv } = await supabase.from("conversations").insert({
          listing_id: listing.id, seeker_id: user.id, provider_id: listing.user_id,
          last_message: msgText, last_message_at: new Date().toISOString(),
        }).select().single();
        convId = newConv?.id;
      }
      await supabase.from("messages").insert({
        listing_id: listing.id, sender_id: user.id, receiver_id: listing.user_id,
        message: msgText, read: false,
      });
      setRequestSent(true); setShowRequestModal(false);
      showToast("Booking request sent! The provider will confirm your session 📧");
    } catch { showToast("Something went wrong. Please try again."); }
    finally { setSending(false); }
  };

  const fmt12 = (t: string) => { const [h,m] = t.split(":"); const hour=parseInt(h); return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`; };
  const getEmoji = (type: string) => ACTIVITY_EMOJIS[type] || ACTIVITY_EMOJIS["Default"];
  const getSuburbs = (json: string) => { try { return JSON.parse(json); } catch { return []; } };
  const getDuration = (d: string) => ({"30":"30 minutes","45":"45 minutes","60":"1 hour","90":"1.5 hours","120":"2 hours"}[d] || `${d} mins`);
  const groupSlotsByDate = (slots: Slot[]) => {
    const groups: Record<string, Slot[]> = {};
    slots.forEach(s => { if (!groups[s.date]) groups[s.date] = []; groups[s.date].push(s); });
    return groups;
  };
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-AU", { weekday:"short", day:"numeric", month:"short" });

  const bookingModeLabel = (mode: string) => {
    if (mode === "calendar_instant") return { icon:"⚡", text:"Instant booking available", color:"#84CC16", bg:"#EAF3DE", border:"#97C459" };
    if (mode === "calendar_approval") return { icon:"📅", text:"Book a slot — subject to approval", color:"#3B82F6", bg:"#EFF6FF", border:"#bfdbfe" };
    if (mode === "request_approval") return { icon:"📩", text:"Send a booking request", color:"#F97316", bg:"#FFF7ED", border:"#FED7AA" };
    return { icon:"💬", text:"Send an enquiry", color:"#64748b", bg:"#f8faff", border:"#dbeafe" };
  };

  const inputStyle: React.CSSProperties = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { display:"block", fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:"#64748b", marginBottom:"0.4rem" };
  const cardStyle: React.CSSProperties = { background:"white", borderRadius:16, padding:"1.8rem", border:"1px solid #dbeafe", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(30,58,95,0.06)" };

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
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"#1e3a5f"}}>Listing Not Found</div>
        <button onClick={()=>router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
      </div>
    </>
  );

  const suburbs = getSuburbs(listing!.suburbs);
  const mode = bookingModeLabel(listing!.booking_mode || "enquiry");
  const slotGroups = groupSlotsByDate(availableSlots);
  const isCalendarMode = listing!.booking_mode === "calendar_instant" || listing!.booking_mode === "calendar_approval";
  const isRequestMode = listing!.booking_mode === "request_approval";
  const isEnquiryMode = !listing!.booking_mode || listing!.booking_mode === "enquiry";

  const alreadyActioned = enquirySent || bookingSent || requestSent;

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
        .slot-btn{border-radius:8px;padding:0.5rem 0.8rem;font-size:0.82rem;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;border:1px solid #dbeafe;background:white;color:#1e3a5f;}
        .slot-btn:hover{border-color:#84CC16;background:#EAF3DE;color:#27500A;}
        .slot-btn.selected{border-color:#1e3a5f;background:#1e3a5f;color:#84CC16;}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}><span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
        <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.5rem 1.2rem",border:"1px solid #bfdbfe",borderRadius:999,background:"transparent",color:"#1e3a5f",fontSize:"0.85rem"}}>← Back to Listings</button>
      </nav>

      {/* HERO */}
      <div style={{background:"#1e3a5f",padding:"3rem 2.5rem 2.5rem",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",fontSize:"18vw",top:"-1rem",right:"-1rem",opacity:0.06,pointerEvents:"none"}}>{getEmoji(listing!.activity_type)}</div>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.8rem",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#84CC16",background:"rgba(132,204,22,0.15)",padding:"0.3rem 0.8rem",borderRadius:999,border:"1px solid rgba(132,204,22,0.3)"}}>{listing!.activity_type}</span>
            <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.3rem 0.8rem",borderRadius:999,background:mode.bg,color:mode.color,border:`1px solid ${mode.border}`}}>{mode.icon} {mode.text}</span>
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(1.8rem,4vw,3rem)",lineHeight:1.05,marginBottom:"0.8rem",color:"white"}}>{listing!.lesson_title}</h1>
          <div style={{fontSize:"0.9rem",color:"#93c5fd"}}>with {listing!.provider_name} · {listing!.lesson_type} lessons</div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"2.5rem",display:"grid",gridTemplateColumns:"1fr 300px",gap:"2rem",alignItems:"start"}}>
        <div>
          {/* PROVIDER */}
          <div style={cardStyle}>
            <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1rem"}}>
              {listing!.photo_url ? (
                <img src={listing!.photo_url} alt="" style={{width:72,height:72,borderRadius:12,objectFit:"cover",border:"2px solid #84CC16",flexShrink:0}}/>
              ) : (
                <div style={{width:72,height:72,borderRadius:12,background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",flexShrink:0}}>{getEmoji(listing!.activity_type)}</div>
              )}
              <div>
                <div style={{fontWeight:700,fontSize:"1.05rem",color:"#1e3a5f",marginBottom:"0.2rem"}}>{listing!.provider_name}</div>
                <div style={{fontSize:"0.85rem",color:"#64748b",marginBottom:"0.5rem"}}>{listing!.activity_type} · {listing!.lesson_type} lessons</div>
                {listing!.online_available&&<span style={{fontSize:"0.75rem",background:"#EAF3DE",color:"#27500A",border:"1px solid #97C459",borderRadius:999,padding:"0.2rem 0.6rem",fontWeight:600}}>🌐 Online available</span>}
              </div>
            </div>
            {listing!.description && <div style={{background:"#f8faff",borderRadius:10,padding:"1rem 1.2rem",border:"1px solid #dbeafe"}}><p style={{color:"#475569",lineHeight:1.8,fontSize:"0.95rem",margin:0}}>{listing!.description}</p></div>}
          </div>

          {/* LESSON DETAILS */}
          <div style={cardStyle}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Lesson Details</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.8rem"}}>
              {[["💰","Price",`$${listing!.price} per session`],["⏱️","Duration",getDuration(listing!.session_duration)],["👥","Type",listing!.lesson_type],["🌐","Online",listing!.online_available?"Available":"Not available"]].map(([icon,label,value])=>(
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

          {/* LOCATIONS */}
          <div style={cardStyle}>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,marginBottom:"1.2rem",color:"#1e3a5f"}}>Locations Covered</h2>
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
              {suburbs.map((s:any,i:number)=>(
                <span key={i} style={{display:"inline-flex",alignItems:"center",gap:"0.3rem",background:"#EAF3DE",border:"1px solid #97C459",borderRadius:999,padding:"0.35rem 0.9rem",fontSize:"0.82rem",color:"#27500A",fontWeight:600}}>📍 {s.name} <span style={{fontWeight:400,color:"#4d7c0f"}}>{s.postcode}</span></span>
              ))}
            </div>
            {listing!.online_available&&<div style={{marginTop:"0.8rem",display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.85rem",color:"#475569",background:"#EAF3DE",borderRadius:8,padding:"0.6rem 0.9rem",border:"1px solid #97C459"}}>🌐 <span>This provider also offers <strong style={{color:"#27500A"}}>online lessons</strong></span></div>}
          </div>

          {/* AVAILABLE SLOTS (calendar modes) */}
          {isCalendarMode && (
            <div style={cardStyle}>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,marginBottom:"0.4rem",color:"#1e3a5f"}}>Available Slots</h2>
              <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.2rem"}}>
                {listing!.booking_mode==="calendar_instant" ? "Pick a slot and it's instantly confirmed." : "Pick a slot and the provider will confirm your booking."}
              </p>
              {availableSlots.length === 0 ? (
                <div style={{textAlign:"center",padding:"1.5rem",color:"#64748b",fontSize:"0.85rem",background:"#f8faff",borderRadius:10,border:"1px solid #dbeafe"}}>
                  No available slots right now. Send an enquiry to ask about availability.
                </div>
              ) : (
                Object.entries(slotGroups).map(([date, slots]) => (
                  <div key={date} style={{marginBottom:"1rem"}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:"#1e3a5f",marginBottom:"0.5rem",textTransform:"uppercase",letterSpacing:0.8}}>{formatDate(date)}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
                      {slots.map(slot => (
                        <button key={slot.id} className={`slot-btn ${selectedSlot?.id===slot.id?"selected":""}`}
                          onClick={()=>setSelectedSlot(selectedSlot?.id===slot.id?null:slot)}>
                          {fmt12(slot.start_time)} – {fmt12(slot.end_time)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT — BOOKING CARD */}
        <div style={{position:"sticky",top:"5rem",animation:"fadeInUp 0.4s ease 0.1s both"}}>
          <div style={{background:"white",borderRadius:20,border:"1px solid #dbeafe",overflow:"hidden",boxShadow:"0 4px 20px rgba(30,58,95,0.1)"}}>
            <div style={{background:"#1e3a5f",padding:"1.5rem",borderBottom:"3px solid #84CC16"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.5rem",color:"#84CC16",letterSpacing:1,lineHeight:1}}>${listing!.price}</div>
              <div style={{fontSize:"0.85rem",color:"#93c5fd",marginTop:"0.3rem"}}>per session · {getDuration(listing!.session_duration)}</div>
            </div>
            <div style={{padding:"1.5rem"}}>
              {/* Provider */}
              <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.2rem",paddingBottom:"1.2rem",borderBottom:"1px solid #f1f5f9"}}>
                {listing!.photo_url?(
                  <img src={listing!.photo_url} alt="" style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid #84CC16",flexShrink:0}}/>
                ):(
                  <div style={{width:44,height:44,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",color:"#84CC16",flexShrink:0}}>
                    {listing!.provider_name.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f"}}>{listing!.provider_name}</div>
                  <div style={{fontSize:"0.78rem",color:"#64748b"}}>{listing!.activity_type} · {listing!.lesson_type}</div>
                </div>
              </div>

              {/* Booking mode badge */}
              <div style={{background:mode.bg,border:`1px solid ${mode.border}`,borderRadius:10,padding:"0.6rem 0.9rem",marginBottom:"1.2rem",fontSize:"0.8rem",color:mode.color,fontWeight:600,display:"flex",alignItems:"center",gap:"0.4rem"}}>
                {mode.icon} {mode.text}
              </div>

              {/* Action area */}
              {alreadyActioned ? (
                <div style={{background:"rgba(132,204,22,0.1)",border:"1px solid rgba(132,204,22,0.3)",borderRadius:12,padding:"1rem",textAlign:"center",marginBottom:"1rem"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>{bookingConfirmed?"✅":"📬"}</div>
                  <div style={{fontSize:"0.9rem",color:"#4d7c0f",fontWeight:700}}>
                    {bookingConfirmed?"Booking Confirmed!":bookingSent?"Booking Request Sent!":requestSent?"Request Sent!":"Enquiry Sent!"}
                  </div>
                  <div style={{fontSize:"0.8rem",color:"#64748b",marginTop:"0.2rem"}}>
                    {bookingConfirmed?"Your session is locked in.":"The provider will be in touch soon."}
                  </div>
                </div>
              ) : isCalendarMode ? (
                <>
                  {selectedSlot && (
                    <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:10,padding:"0.7rem 0.9rem",marginBottom:"0.8rem",fontSize:"0.82rem",color:"#27500A",fontWeight:600}}>
                      ✓ {formatDate(selectedSlot.date)} · {fmt12(selectedSlot.start_time)} – {fmt12(selectedSlot.end_time)}
                    </div>
                  )}
                  <button className="btn" onClick={()=>user?(selectedSlot?setShowCalendarModal(true):showToast("Please select a slot first")):router.push("/")}
                    style={{width:"100%",padding:"0.9rem",background:selectedSlot?"#84CC16":"#97C459",color:"#1e3a5f",border:"none",borderRadius:12,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem",opacity:!user||!selectedSlot?0.7:1}}>
                    {!user?"🔐 Log In to Book":!selectedSlot?"Select a Slot First":listing!.booking_mode==="calendar_instant"?"⚡ Book This Slot":"📅 Request This Slot"}
                  </button>
                </>
              ) : isRequestMode ? (
                <button className="btn" onClick={()=>user?setShowRequestModal(true):router.push("/")}
                  style={{width:"100%",padding:"0.9rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:12,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem"}}>
                  {user?"📩 Send Booking Request":"🔐 Log In to Book"}
                </button>
              ) : (
                <button className="btn" onClick={()=>user?setShowEnquiry(true):router.push("/")}
                  style={{width:"100%",padding:"0.9rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:12,fontWeight:700,fontSize:"1rem",marginBottom:"0.8rem"}}>
                  {user?"📧 Send Enquiry":"🔐 Log In to Enquire"}
                </button>
              )}

              {!user&&<p style={{textAlign:"center",fontSize:"0.8rem",color:"#64748b",marginBottom:"1rem"}}><span style={{color:"#84CC16",cursor:"pointer",fontWeight:700}} onClick={()=>router.push("/")}>Sign up free</span> to get started</p>}
              <div style={{fontSize:"0.75rem",color:"#94a3b8",textAlign:"center",paddingTop:"0.8rem",borderTop:"1px solid #f1f5f9",lineHeight:1.6}}>✓ Free to enquire · No booking fees</div>
            </div>
          </div>
        </div>
      </div>

      {/* ENQUIRY MODAL */}
      {showEnquiry&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setShowEnquiry(false);}} style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",border:"1px solid #bfdbfe",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease",boxShadow:"0 20px 60px rgba(30,58,95,0.15)"}}>
            <button onClick={()=>setShowEnquiry(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#64748b",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>Send Enquiry</h3>
            <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Message {listing!.provider_name} about this lesson</p>
            <div style={{background:"#f8faff",borderRadius:10,padding:"0.8rem 1rem",marginBottom:"1.2rem",border:"1px solid #dbeafe",fontSize:"0.85rem"}}>
              <strong style={{color:"#1e3a5f"}}>{listing!.lesson_title}</strong><br/>
              <span style={{color:"#64748b"}}>${listing!.price}/session · {getDuration(listing!.session_duration)} · {listing!.lesson_type}</span>
            </div>
            <div style={{marginBottom:"1.2rem"}}>
              <label style={labelStyle}>Your Message</label>
              <textarea value={enquiryMsg} onChange={e=>setEnquiryMsg(e.target.value)}
                placeholder={`Hi ${listing!.provider_name.split(" ")[0]}, I'm interested in your ${listing!.activity_type} lessons. Could you let me know your availability?`}
                style={{...inputStyle,resize:"vertical",minHeight:120}}/>
            </div>
            <button className="btn" onClick={handleEnquiry} disabled={sending||!enquiryMsg.trim()}
              style={{width:"100%",padding:"0.85rem",background:sending||!enquiryMsg.trim()?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",opacity:sending||!enquiryMsg.trim()?0.7:1}}>
              {sending?"Sending...":"Send Enquiry →"}
            </button>
          </div>
        </div>
      )}

      {/* CALENDAR BOOKING MODAL */}
      {showCalendarModal&&selectedSlot&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setShowCalendarModal(false);}} style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",border:"1px solid #bfdbfe",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease",boxShadow:"0 20px 60px rgba(30,58,95,0.15)"}}>
            <button onClick={()=>setShowCalendarModal(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#64748b",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>
              {listing!.booking_mode==="calendar_instant"?"Confirm Booking":"Request This Slot"}
            </h3>
            <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>
              {listing!.booking_mode==="calendar_instant"?"Your session will be instantly confirmed.":"The provider will review and confirm your booking."}
            </p>
            <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:10,padding:"0.9rem 1rem",marginBottom:"1.2rem"}}>
              <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f",marginBottom:"0.2rem"}}>{listing!.lesson_title}</div>
              <div style={{fontSize:"0.85rem",color:"#27500A"}}>📅 {formatDate(selectedSlot.date)} · {fmt12(selectedSlot.start_time)} – {fmt12(selectedSlot.end_time)}</div>
              <div style={{fontSize:"0.82rem",color:"#4d7c0f",marginTop:"0.2rem"}}>💰 ${listing!.price}</div>
            </div>
            <div style={{marginBottom:"1.2rem"}}>
              <label style={labelStyle}>Message (optional)</label>
              <textarea value={bookingMsg} onChange={e=>setBookingMsg(e.target.value)}
                placeholder={`Hi ${listing!.provider_name.split(" ")[0]}, looking forward to the session!`}
                style={{...inputStyle,resize:"vertical",minHeight:80}}/>
            </div>
            <button className="btn" onClick={handleCalendarBooking} disabled={sending}
              style={{width:"100%",padding:"0.85rem",background:sending?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",opacity:sending?0.7:1}}>
              {sending?"Processing...":listing!.booking_mode==="calendar_instant"?"⚡ Confirm Booking":"📅 Send Request"}
            </button>
          </div>
        </div>
      )}

      {/* REQUEST MODAL */}
      {showRequestModal&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setShowRequestModal(false);}} style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",border:"1px solid #bfdbfe",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",animation:"slideUp 0.3s ease",boxShadow:"0 20px 60px rgba(30,58,95,0.15)"}}>
            <button onClick={()=>setShowRequestModal(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"#64748b",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,marginBottom:"0.3rem",color:"#1e3a5f"}}>Send Booking Request</h3>
            <p style={{color:"#64748b",fontSize:"0.88rem",marginBottom:"1.5rem"}}>Tell {listing!.provider_name.split(" ")[0]} when you'd like to book and they'll confirm.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
              <div>
                <label style={labelStyle}>Preferred Date</label>
                <input type="date" value={requestPreferredDate} onChange={e=>setRequestPreferredDate(e.target.value)} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Preferred Time</label>
                <input type="time" value={requestPreferredTime} onChange={e=>setRequestPreferredTime(e.target.value)} style={inputStyle}/>
              </div>
            </div>
            <div style={{marginBottom:"1.2rem"}}>
              <label style={labelStyle}>Message (optional)</label>
              <textarea value={requestMsg} onChange={e=>setRequestMsg(e.target.value)}
                placeholder={`Hi ${listing!.provider_name.split(" ")[0]}, I'd like to book a ${listing!.activity_type} session...`}
                style={{...inputStyle,resize:"vertical",minHeight:100}}/>
            </div>
            <button className="btn" onClick={handleRequest} disabled={sending}
              style={{width:"100%",padding:"0.85rem",background:sending?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",opacity:sending?0.7:1}}>
              {sending?"Sending...":"Send Booking Request →"}
            </button>
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,animation:"slideUp 0.3s ease",border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}
