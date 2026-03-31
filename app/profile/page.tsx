"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Suspense } from "react";

type User = { id: string; email: string; first_name?: string; last_name?: string } | null;
type Listing = {
  id: string; lesson_title: string; activity_type: string; price: number;
  session_duration: string; lesson_type: string; status: string; created_at: string;
  suburbs: string; photo_url: string;
};
type Event = {
  id: string; title: string; sport: string; date: string; time: string;
  location: string; suburb: string; spots_total: number; spots_filled: number;
  status: string; created_at: string; cost: string;
};
type Conversation = {
  id: string; listing_id: string; last_message: string; last_message_at: string;
  seeker_id: string; provider_id: string;
  listing?: { lesson_title: string; activity_type: string; provider_name: string };
  unread_count?: number;
};
type EventRequest = {
  id: string; event_id: string; status: string; created_at: string;
  event?: { title: string; sport: string; date: string; host_name: string };
};

const SECTIONS = [
  { id: "personal",  icon: "👤", label: "Personal Details" },
  { id: "messages",  icon: "💬", label: "Enquiries & Messages" },
  { id: "listings",  icon: "📋", label: "My Lesson Listings" },
  { id: "events",    icon: "⚽", label: "My Events" },
  { id: "history",   icon: "🕓", label: "Booking History" },
  { id: "settings",  icon: "⚙️", label: "Account Settings" },
];

const STATUS_COLORS: Record<string,string> = { approved:"#84CC16", pending:"#F97316", rejected:"#EF4444", cancelled:"#EF4444", closed:"#64748b" };
const STATUS_BGS: Record<string,string> = { approved:"#EAF3DE", pending:"#FFF7ED", rejected:"#FEF2F2", cancelled:"#FEF2F2", closed:"#f1f5f9" };
const STATUS_BORDERS: Record<string,string> = { approved:"#97C459", pending:"#FED7AA", rejected:"#FECACA", cancelled:"#FECACA", closed:"#dbeafe" };

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,
      background:STATUS_BGS[status]||"#f1f5f9",color:STATUS_COLORS[status]||"#64748b",
      border:`1px solid ${STATUS_BORDERS[status]||"#dbeafe"}`,textTransform:"uppercase"}}>
      {status}
    </span>
  );
}

function ProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User>(null);
  const [activeSection, setActiveSection] = useState(searchParams.get("section") || "personal");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Personal details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Data
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [loadingSection, setLoadingSection] = useState(false);

  // Settings
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      const meta = session.user.user_metadata || {};
      setUser({
        id: session.user.id,
        email: session.user.email!,
        first_name: meta.first_name || "",
        last_name: meta.last_name || "",
      });
      setFirstName(meta.first_name || "");
      setLastName(meta.last_name || "");
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.push("/");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadSectionData(activeSection);
  }, [user, activeSection]);

  const loadSectionData = async (section: string) => {
    if (!user) return;
    setLoadingSection(true);
    if (section === "listings") {
      const { data } = await supabase.from("listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setListings(data || []);
    } else if (section === "events") {
      const { data } = await supabase.from("events").select("*").eq("host_id", user.id).order("created_at", { ascending: false });
      setEvents(data || []);
    } else if (section === "messages") {
      const { data } = await supabase.from("conversations").select("*")
        .or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (data) {
        const enriched = await Promise.all(data.map(async (conv) => {
          const { data: listing } = await supabase.from("listings").select("lesson_title,activity_type,provider_name").eq("id", conv.listing_id).single();
          const { count } = await supabase.from("messages").select("id", { count: "exact" }).eq("listing_id", conv.listing_id).eq("receiver_id", user.id).eq("read", false);
          return { ...conv, listing: listing || undefined, unread_count: count || 0 };
        }));
        setConversations(enriched);
      }
    } else if (section === "history") {
      const { data } = await supabase.from("event_requests").select("*").eq("requester_id", user.id).order("created_at", { ascending: false });
      if (data) {
        const enriched = await Promise.all(data.map(async (req) => {
          const { data: ev } = await supabase.from("events").select("title,sport,date,host_name").eq("id", req.event_id).single();
          return { ...req, event: ev || undefined };
        }));
        setEventRequests(enriched);
      }
    }
    setLoadingSection(false);
  };

  const handleSaveDetails = async () => {
    if (!user) return;
    setSavingDetails(true);
    const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } });
    setSavingDetails(false);
    if (error) showToast("Error saving details");
    else { setUser(prev => prev ? { ...prev, first_name: firstName, last_name: lastName } : prev); showToast("✅ Details saved!"); }
  };

  const handleChangePassword = async () => {
    setPasswordError(""); setPasswordSuccess("");
    if (!newPassword) { setPasswordError("Please enter a new password."); return; }
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match."); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) setPasswordError(error.message);
    else { setPasswordSuccess("Password updated successfully!"); setNewPassword(""); setConfirmPassword(""); }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    await supabase.from("listings").delete().eq("id", id);
    setListings(prev => prev.filter(l => l.id !== id));
    showToast("Listing deleted.");
  };

  const handleCancelEvent = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this event?")) return;
    await supabase.from("events").update({ status: "cancelled" }).eq("id", id);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: "cancelled" } : e));
    showToast("Event cancelled.");
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const diff = Date.now() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const getSuburbs = (json: string) => { try { return JSON.parse(json); } catch { return []; } };
  const getDuration = (d: string) => ({"30":"30 min","45":"45 min","60":"1 hr","90":"1.5 hr","120":"2 hr"}[d] || d);
  const displayName = user ? (user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.email.split("@")[0]) : "";
  const initials = user?.first_name ? `${user.first_name[0]}${user.last_name?.[0]||""}`.toUpperCase() : user?.email?.[0]?.toUpperCase() || "?";

  const inputStyle: React.CSSProperties = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { display:"block", fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:"#64748b", marginBottom:"0.4rem" };
  const cardStyle: React.CSSProperties = { background:"white", borderRadius:14, border:"1px solid #dbeafe", padding:"1.5rem", marginBottom:"1rem", boxShadow:"0 2px 8px rgba(30,58,95,0.05)" };

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;font-family:'DM Sans',sans-serif;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
    </>
  );

  // ── SECTION RENDERERS ──────────────────────────────────────────

  const renderPersonal = () => (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Personal Details</h2>
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>Update your name and account information.</p>
      </div>
      <div style={cardStyle}>
        <div style={{display:"flex",alignItems:"center",gap:"1.2rem",marginBottom:"1.8rem",paddingBottom:"1.5rem",borderBottom:"1px solid #f1f5f9"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"#84CC16",flexShrink:0}}>
            {initials}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:"1.1rem",color:"#1e3a5f"}}>{displayName}</div>
            <div style={{fontSize:"0.85rem",color:"#64748b",marginTop:"0.2rem"}}>{user?.email}</div>
            <div style={{display:"flex",gap:"0.5rem",marginTop:"0.6rem",flexWrap:"wrap"}}>
              {listings.length > 0 && <span style={{fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"#EAF3DE",color:"#27500A",border:"1px solid #97C459"}}>📋 Lesson Provider</span>}
              {events.length > 0 && <span style={{fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe"}}>⚽ Event Organiser</span>}
              <span style={{fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"#f8faff",color:"#64748b",border:"1px solid #dbeafe"}}>🎓 Learner</span>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.2rem"}}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Alex" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Smith" style={inputStyle}/>
          </div>
        </div>
        <div style={{marginBottom:"1.5rem"}}>
          <label style={labelStyle}>Email Address</label>
          <input value={user?.email||""} disabled style={{...inputStyle,opacity:0.6,cursor:"not-allowed"}}/>
          <div style={{fontSize:"0.75rem",color:"#94a3b8",marginTop:"0.4rem"}}>Email cannot be changed. Contact support if needed.</div>
        </div>
        <button onClick={handleSaveDetails} disabled={savingDetails}
          style={{padding:"0.75rem 2rem",background:savingDetails?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.9rem",cursor:"pointer",opacity:savingDetails?0.7:1}}>
          {savingDetails ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );

  const renderMessages = () => (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Enquiries & Messages</h2>
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>{conversations.length} conversation{conversations.length!==1?"s":""}</p>
      </div>
      {loadingSection ? <LoadingSpinner/> : conversations.length === 0 ? (
        <EmptyState icon="💬" title="No conversations yet" subtitle="Enquire on a lesson to start a conversation." action="Browse Lessons" onAction={()=>router.push("/")}/>
      ) : conversations.map(conv => (
        <div key={conv.id} onClick={()=>router.push(`/messages?conv=${conv.id}`)}
          style={{...cardStyle,cursor:"pointer",display:"flex",gap:"1rem",alignItems:"center",transition:"all 0.2s"}}
          onMouseEnter={e=>(e.currentTarget.style.borderColor="#bfdbfe")}
          onMouseLeave={e=>(e.currentTarget.style.borderColor="#dbeafe")}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",color:"#84CC16",flexShrink:0}}>
            {(conv.listing?.provider_name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.2rem"}}>
              <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f"}}>{conv.listing?.provider_name||"Provider"}</div>
              <div style={{fontSize:"0.72rem",color:"#94a3b8",flexShrink:0}}>{formatTime(conv.last_message_at)}</div>
            </div>
            <div style={{fontSize:"0.75rem",color:"#84CC16",fontWeight:600,marginBottom:"0.2rem"}}>{conv.listing?.activity_type} · {conv.listing?.lesson_title}</div>
            <div style={{fontSize:"0.8rem",color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{conv.last_message}</div>
          </div>
          {(conv.unread_count||0)>0 && <span style={{background:"#EF4444",color:"white",fontSize:"0.7rem",fontWeight:700,padding:"2px 7px",borderRadius:999,flexShrink:0}}>{conv.unread_count}</span>}
        </div>
      ))}
      {conversations.length > 0 && (
        <button onClick={()=>router.push("/messages")} style={{width:"100%",padding:"0.75rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:10,fontWeight:700,fontSize:"0.88rem",cursor:"pointer",marginTop:"0.5rem"}}>
          Open Full Messages →
        </button>
      )}
    </div>
  );

  const renderListings = () => (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>My Lesson Listings</h2>
          <p style={{fontSize:"0.85rem",color:"#64748b"}}>{listings.length} listing{listings.length!==1?"s":""}</p>
        </div>
        <button onClick={()=>router.push("/provider/create")}
          style={{padding:"0.6rem 1.2rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
          + New Listing
        </button>
      </div>
      {loadingSection ? <LoadingSpinner/> : listings.length === 0 ? (
        <EmptyState icon="📋" title="No listings yet" subtitle="List your lessons and reach learners across Australia." action="Create a Listing" onAction={()=>router.push("/provider/create")}/>
      ) : listings.map(listing => {
        const suburbs = getSuburbs(listing.suburbs);
        return (
          <div key={listing.id} style={cardStyle}>
            <div style={{display:"flex",gap:"1rem",alignItems:"flex-start"}}>
              {listing.photo_url ? (
                <img src={listing.photo_url} alt="" style={{width:56,height:56,borderRadius:10,objectFit:"cover",border:"1px solid #dbeafe",flexShrink:0}}/>
              ) : (
                <div style={{width:56,height:56,borderRadius:10,background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",flexShrink:0}}>📚</div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:"0.95rem",color:"#1e3a5f"}}>{listing.lesson_title}</span>
                  <StatusBadge status={listing.status}/>
                </div>
                <div style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"0.4rem"}}>
                  {listing.activity_type} · ${listing.price}/session · {getDuration(listing.session_duration)} · {listing.lesson_type}
                </div>
                <div style={{fontSize:"0.75rem",color:"#94a3b8"}}>
                  📍 {suburbs.slice(0,3).map((s:any)=>s.name).join(", ")}{suburbs.length>3?` +${suburbs.length-3} more`:""}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:"0.6rem",marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid #f1f5f9",flexWrap:"wrap"}}>
              <button onClick={()=>router.push(`/listings/${listing.id}`)}
                style={{padding:"0.45rem 1rem",background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                👁️ View Live
              </button>
              <button onClick={()=>handleDeleteListing(listing.id)}
                style={{padding:"0.45rem 1rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                🗑️ Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderEvents = () => (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>My Events</h2>
          <p style={{fontSize:"0.85rem",color:"#64748b"}}>{events.length} event{events.length!==1?"s":""}</p>
        </div>
        <button onClick={()=>router.push("/events/create")}
          style={{padding:"0.6rem 1.2rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
          + New Event
        </button>
      </div>
      {loadingSection ? <LoadingSpinner/> : events.length === 0 ? (
        <EmptyState icon="⚽" title="No events yet" subtitle="Post a community event and find players to join you." action="Create an Event" onAction={()=>router.push("/events/create")}/>
      ) : events.map(ev => (
        <div key={ev.id} style={cardStyle}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"1rem",marginBottom:"0.8rem"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:"0.95rem",color:"#1e3a5f"}}>{ev.title}</span>
                <StatusBadge status={ev.status}/>
              </div>
              <div style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"0.3rem"}}>
                {ev.sport} · {ev.location}, {ev.suburb}
              </div>
              <div style={{fontSize:"0.75rem",color:"#94a3b8"}}>
                📅 {ev.date} at {ev.time} · 👥 {ev.spots_filled}/{ev.spots_total} approved · {ev.cost === "Free" ? "🎉 Free" : `💰 ${ev.cost}`}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:"0.6rem",paddingTop:"1rem",borderTop:"1px solid #f1f5f9",flexWrap:"wrap"}}>
            <button onClick={()=>router.push(`/events/${ev.id}`)}
              style={{padding:"0.45rem 1rem",background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
              👁️ View Event
            </button>
            {ev.status !== "cancelled" && ev.status !== "closed" && (
              <button onClick={()=>handleCancelEvent(ev.id)}
                style={{padding:"0.45rem 1rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                ❌ Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderHistory = () => (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Booking History</h2>
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>Lesson enquiries you've sent and events you've requested to join.</p>
      </div>
      {loadingSection ? <LoadingSpinner/> : (
        <>
          {/* Lesson Enquiries */}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.8rem"}}>📚 Lesson Enquiries</div>
          {conversations.length === 0 ? (
            <div style={{...cardStyle,textAlign:"center",color:"#64748b",fontSize:"0.85rem",padding:"1.5rem"}}>
              No lesson enquiries yet. <span onClick={()=>router.push("/")} style={{color:"#84CC16",cursor:"pointer",fontWeight:700}}>Browse lessons →</span>
            </div>
          ) : conversations.map(conv => (
            <div key={conv.id} onClick={()=>router.push(`/messages?conv=${conv.id}`)}
              style={{...cardStyle,cursor:"pointer",display:"flex",alignItems:"center",gap:"1rem",padding:"1rem 1.2rem"}}
              onMouseEnter={e=>(e.currentTarget.style.borderColor="#bfdbfe")}
              onMouseLeave={e=>(e.currentTarget.style.borderColor="#dbeafe")}>
              <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>📚</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"0.88rem",color:"#1e3a5f",marginBottom:"0.15rem"}}>{conv.listing?.lesson_title||"Lesson"}</div>
                <div style={{fontSize:"0.78rem",color:"#64748b"}}>{conv.listing?.provider_name} · {conv.listing?.activity_type}</div>
              </div>
              <div style={{fontSize:"0.72rem",color:"#94a3b8",flexShrink:0}}>{formatTime(conv.last_message_at)}</div>
            </div>
          ))}

          {/* Event Requests */}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f",margin:"1.5rem 0 0.8rem"}}>⚽ Event Requests</div>
          {eventRequests.length === 0 ? (
            <div style={{...cardStyle,textAlign:"center",color:"#64748b",fontSize:"0.85rem",padding:"1.5rem"}}>
              No event requests yet. <span onClick={()=>router.push("/")} style={{color:"#84CC16",cursor:"pointer",fontWeight:700}}>Browse events →</span>
            </div>
          ) : eventRequests.map(req => (
            <div key={req.id} onClick={()=>router.push(`/events/${req.event_id}`)}
              style={{...cardStyle,cursor:"pointer",display:"flex",alignItems:"center",gap:"1rem",padding:"1rem 1.2rem"}}
              onMouseEnter={e=>(e.currentTarget.style.borderColor="#bfdbfe")}
              onMouseLeave={e=>(e.currentTarget.style.borderColor="#dbeafe")}>
              <div style={{width:40,height:40,borderRadius:10,background:"#f0f9ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>⚽</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"0.88rem",color:"#1e3a5f",marginBottom:"0.15rem"}}>{req.event?.title||"Event"}</div>
                <div style={{fontSize:"0.78rem",color:"#64748b"}}>{req.event?.sport} · Hosted by {req.event?.host_name} · {req.event?.date}</div>
              </div>
              <StatusBadge status={req.status}/>
            </div>
          ))}
        </>
      )}
    </div>
  );

  const renderSettings = () => (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Account Settings</h2>
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>Manage your password and account preferences.</p>
      </div>

      {/* Change Password */}
      <div style={cardStyle}>
        <div style={{fontWeight:700,fontSize:"1rem",color:"#1e3a5f",marginBottom:"0.3rem"}}>🔐 Change Password</div>
        <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.2rem"}}>Choose a strong password of at least 6 characters.</p>
        {passwordError && <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"0.6rem 1rem",marginBottom:"1rem",fontSize:"0.82rem",color:"#dc2626"}}>{passwordError}</div>}
        {passwordSuccess && <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"0.6rem 1rem",marginBottom:"1rem",fontSize:"0.82rem",color:"#16a34a"}}>{passwordSuccess}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.2rem"}}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min. 6 characters" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Type it again" style={inputStyle}/>
          </div>
        </div>
        <button onClick={handleChangePassword} disabled={savingPassword}
          style={{padding:"0.7rem 1.8rem",background:savingPassword?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.88rem",cursor:"pointer",opacity:savingPassword?0.7:1}}>
          {savingPassword ? "Updating..." : "Update Password"}
        </button>
      </div>

      {/* Danger Zone */}
      <div style={{...cardStyle,border:"1px solid #fca5a5",background:"#fff8f8"}}>
        <div style={{fontWeight:700,fontSize:"1rem",color:"#dc2626",marginBottom:"0.3rem"}}>⚠️ Danger Zone</div>
        <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.2rem"}}>Sign out of your account on this device.</p>
        <button onClick={async()=>{ await supabase.auth.signOut(); router.push("/"); }}
          style={{padding:"0.7rem 1.8rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:700,fontSize:"0.88rem",cursor:"pointer"}}>
          Sign Out
        </button>
      </div>
    </div>
  );

  const sectionContent: Record<string, React.ReactNode> = {
    personal: renderPersonal(),
    messages: renderMessages(),
    listings: renderListings(),
    events: renderEvents(),
    history: renderHistory(),
    settings: renderSettings(),
  };

  const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label || "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        .nav-item{display:flex;align-items:center;gap:0.7rem;padding:0.75rem 1rem;border-radius:10px;cursor:pointer;transition:all 0.15s;font-size:0.88rem;font-weight:500;color:#64748b;border:none;background:none;width:100%;text-align:left;font-family:'DM Sans',sans-serif;}
        .nav-item:hover{background:#f0f9ff;color:#1e3a5f;}
        .nav-item.active{background:#1e3a5f;color:#84CC16;font-weight:700;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 2rem",background:"white",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 8px rgba(30,58,95,0.06)",position:"sticky",top:0,zIndex:100}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f"}}>My Profile</div>
        <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.4rem 1rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>← Back to PlayUp</button>
      </nav>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"2rem 1.5rem",display:"grid",gridTemplateColumns:"240px 1fr",gap:"1.5rem",alignItems:"start"}}>

        {/* LEFT PANE */}
        <div style={{position:"sticky",top:"5rem"}}>
          {/* User Card */}
          <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"1.2rem",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem"}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:"#84CC16",flexShrink:0}}>
                {initials}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{displayName}</div>
                <div style={{fontSize:"0.72rem",color:"#94a3b8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"0.6rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
            {SECTIONS.map(s => (
              <button key={s.id} className={`nav-item ${activeSection===s.id?"active":""}`}
                onClick={()=>{ setActiveSection(s.id); window.history.replaceState(null,"",`/profile?section=${s.id}`); }}>
                <span style={{fontSize:"1rem"}}>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div style={{animation:"fadeIn 0.25s ease"}}>
          {sectionContent[activeSection]}
        </div>
      </div>

      {toast && <div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}

function LoadingSpinner() {
  return (
    <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
      <div style={{width:32,height:32,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action, onAction }: { icon:string; title:string; subtitle:string; action:string; onAction:()=>void }) {
  return (
    <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"3rem",textAlign:"center",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
      <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>{icon}</div>
      <div style={{fontWeight:700,color:"#1e3a5f",fontSize:"1rem",marginBottom:"0.4rem"}}>{title}</div>
      <div style={{fontSize:"0.85rem",color:"#64748b",marginBottom:"1.5rem"}}>{subtitle}</div>
      <button onClick={onAction} style={{padding:"0.6rem 1.5rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.85rem",cursor:"pointer"}}>
        {action} →
      </button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F0F7FF"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
    }>
      <ProfileInner/>
    </Suspense>
  );
}
