"use client";
import { useState, useEffect, useRef } from "react";
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
type Slot = {
  id: string; listing_id: string; date: string; start_time: string;
  end_time: string; status: string; notes?: string;
};
type Booking = {
  id: string; listing_id: string; student_id: string; student_name: string;
  student_email: string; slot_id?: string; date: string; start_time: string;
  end_time: string; status: string; attended: string; payment_status: string;
  payment_amount?: number; notes?: string; created_at: string;
  listing?: { lesson_title: string; activity_type: string; price: number };
};

const SECTIONS = [
  { id:"personal",   icon:"👤", label:"Personal Details" },
  { id:"messages",   icon:"💬", label:"Enquiries & Messages" },
  { id:"listings",   icon:"📋", label:"My Lesson Listings" },
  { id:"calendar",   icon:"📅", label:"Booking Calendar" },
  { id:"attendance", icon:"✅", label:"Attendance & Payments" },
  { id:"events",     icon:"⚽", label:"My Events" },
  { id:"history",    icon:"🕓", label:"Booking History" },
  { id:"settings",   icon:"⚙️", label:"Account Settings" },
];

const STATUS_COLORS: Record<string,string> = { approved:"#84CC16",pending:"#F97316",rejected:"#EF4444",cancelled:"#EF4444",closed:"#64748b",confirmed:"#84CC16",unpaid:"#F97316",paid:"#84CC16",waived:"#64748b" };
const STATUS_BGS: Record<string,string> = { approved:"#EAF3DE",pending:"#FFF7ED",rejected:"#FEF2F2",cancelled:"#FEF2F2",closed:"#f1f5f9",confirmed:"#EAF3DE",unpaid:"#FFF7ED",paid:"#EAF3DE",waived:"#f1f5f9" };
const STATUS_BORDERS: Record<string,string> = { approved:"#97C459",pending:"#FED7AA",rejected:"#FECACA",cancelled:"#FECACA",closed:"#dbeafe",confirmed:"#97C459",unpaid:"#FED7AA",paid:"#97C459",waived:"#dbeafe" };

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,
      background:STATUS_BGS[status]||"#f1f5f9",color:STATUS_COLORS[status]||"#64748b",
      border:`1px solid ${STATUS_BORDERS[status]||"#dbeafe"}`,textTransform:"uppercase"}}>
      {status}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
      <div style={{width:32,height:32,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
    </div>
  );
}

function EmptyState({ icon,title,subtitle,action,onAction }: { icon:string;title:string;subtitle:string;action:string;onAction:()=>void }) {
  return (
    <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"3rem",textAlign:"center",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
      <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>{icon}</div>
      <div style={{fontWeight:700,color:"#1e3a5f",fontSize:"1rem",marginBottom:"0.4rem"}}>{title}</div>
      <div style={{fontSize:"0.85rem",color:"#64748b",marginBottom:"1.5rem"}}>{subtitle}</div>
      <button onClick={onAction} style={{padding:"0.6rem 1.5rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.85rem",cursor:"pointer"}}>{action} →</button>
    </div>
  );
}

function ProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User>(null);
  const [activeSection, setActiveSection] = useState(searchParams.get("section") || "personal");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Personal details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Section data
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [loadingSection, setLoadingSection] = useState(false);

  // Calendar state
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(getMonday(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slotListingId, setSlotListingId] = useState("");
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");
  const [slotStatus, setSlotStatus] = useState<"available"|"blocked">("available");
  const [slotNotes, setSlotNotes] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);

  // Booking creation
  const [bookingListingId, setBookingListingId] = useState("");
  const [bookingStudentName, setBookingStudentName] = useState("");
  const [bookingStudentEmail, setBookingStudentEmail] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingStart, setBookingStart] = useState("09:00");
  const [bookingEnd, setBookingEnd] = useState("10:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [savingBooking, setSavingBooking] = useState(false);

  // Attendance
  const [attendanceBookings, setAttendanceBookings] = useState<Booking[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<"upcoming"|"past"|"all">("upcoming");
  const [editingBooking, setEditingBooking] = useState<string|null>(null);
  const [editAttended, setEditAttended] = useState("");
  const [editPayment, setEditPayment] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingAttendance, setSavingAttendance] = useState(false);

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
      setUser({ id:session.user.id, email:session.user.email!, first_name:meta.first_name||"", last_name:meta.last_name||"" });
      setFirstName(meta.first_name||"");
      setLastName(meta.last_name||"");
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

  useEffect(() => {
    if (user && (activeSection === "calendar")) loadCalendarData();
  }, [calendarWeekStart, activeSection, user]);

  const loadSectionData = async (section: string) => {
    if (!user) return;
    setLoadingSection(true);
    if (section === "listings" || section === "calendar" || section === "attendance") {
      const { data } = await supabase.from("listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setListings(data || []);
      if (section === "calendar") await loadCalendarData();
      if (section === "attendance") await loadAttendanceData();
    } else if (section === "events") {
      const { data } = await supabase.from("events").select("*").eq("host_id", user.id).order("created_at", { ascending: false });
      setEvents(data || []);
    } else if (section === "messages") {
      const { data } = await supabase.from("conversations").select("*").or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`).order("last_message_at", { ascending: false });
      if (data) {
        const enriched = await Promise.all(data.map(async (conv) => {
          const { data: listing } = await supabase.from("listings").select("lesson_title,activity_type,provider_name").eq("id", conv.listing_id).single();
          const { count } = await supabase.from("messages").select("id", { count:"exact" }).eq("listing_id", conv.listing_id).eq("receiver_id", user.id).eq("read", false);
          return { ...conv, listing: listing||undefined, unread_count: count||0 };
        }));
        setConversations(enriched);
      }
    } else if (section === "history") {
      const { data: convData } = await supabase.from("conversations").select("*").or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`).order("last_message_at", { ascending: false });
      if (convData) {
        const enriched = await Promise.all(convData.map(async (conv) => {
          const { data: listing } = await supabase.from("listings").select("lesson_title,activity_type,provider_name").eq("id", conv.listing_id).single();
          return { ...conv, listing: listing||undefined, unread_count: 0 };
        }));
        setConversations(enriched);
      }
      const { data: reqData } = await supabase.from("event_requests").select("*").eq("requester_id", user.id).order("created_at", { ascending: false });
      if (reqData) {
        const enriched = await Promise.all(reqData.map(async (req) => {
          const { data: ev } = await supabase.from("events").select("title,sport,date,host_name").eq("id", req.event_id).single();
          return { ...req, event: ev||undefined };
        }));
        setEventRequests(enriched);
      }
      // Also load student's bookings
      const { data: bData } = await supabase.from("bookings").select("*").eq("student_id", user.id).order("date", { ascending: false });
      if (bData) {
        const enriched = await Promise.all(bData.map(async (b) => {
          const { data: listing } = await supabase.from("listings").select("lesson_title,activity_type,price").eq("id", b.listing_id).single();
          return { ...b, listing: listing||undefined };
        }));
        setAttendanceBookings(enriched);
      }
    }
    setLoadingSection(false);
  };

  const loadCalendarData = async () => {
    if (!user) return;
    const weekEnd = new Date(calendarWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startStr = calendarWeekStart.toISOString().split("T")[0];
    const endStr = weekEnd.toISOString().split("T")[0];
    const [slotsRes, bookingsRes] = await Promise.all([
      supabase.from("availability_slots").select("*").eq("provider_id", user.id).gte("date", startStr).lte("date", endStr).order("date").order("start_time"),
      supabase.from("bookings").select("*").eq("provider_id", user.id).gte("date", startStr).lte("date", endStr).order("date").order("start_time"),
    ]);
    setSlots(slotsRes.data || []);
    setBookings(bookingsRes.data || []);
  };

  const loadAttendanceData = async () => {
    if (!user) return;
    const { data } = await supabase.from("bookings").select("*").eq("provider_id", user.id).order("date", { ascending: false });
    if (data) {
      const enriched = await Promise.all(data.map(async (b) => {
        const { data: listing } = await supabase.from("listings").select("lesson_title,activity_type,price").eq("id", b.listing_id).single();
        return { ...b, listing: listing||undefined };
      }));
      setAttendanceBookings(enriched);
    }
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

  const handleSaveSlot = async () => {
    if (!user || !slotListingId || !selectedDate) return;
    setSavingSlot(true);
    const { error } = await supabase.from("availability_slots").insert({
      listing_id: slotListingId, provider_id: user.id,
      date: selectedDate, start_time: slotStart, end_time: slotEnd,
      status: slotStatus, notes: slotNotes.trim() || null,
    });
    setSavingSlot(false);
    if (error) { showToast("Error saving slot: " + error.message); return; }
    showToast(slotStatus === "available" ? "✅ Available slot added!" : "🚫 Date blocked!");
    setShowSlotModal(false);
    setSlotNotes(""); setSlotStatus("available");
    await loadCalendarData();
  };

  const handleDeleteSlot = async (slotId: string) => {
    await supabase.from("availability_slots").delete().eq("id", slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));
    showToast("Slot removed.");
  };

  const handleSaveBooking = async () => {
    if (!user || !bookingListingId || !bookingStudentName || !bookingStudentEmail || !bookingDate) return;
    setSavingBooking(true);
    const listing = listings.find(l => l.id === bookingListingId);
    const { error } = await supabase.from("bookings").insert({
      listing_id: bookingListingId, provider_id: user.id,
      student_id: user.id, // placeholder — in future link to actual student account
      student_name: bookingStudentName.trim(),
      student_email: bookingStudentEmail.trim(),
      date: bookingDate, start_time: bookingStart, end_time: bookingEnd,
      status: "confirmed", attended: "pending", payment_status: "unpaid",
      payment_amount: listing?.price || null,
      notes: bookingNotes.trim() || null,
    });
    if (!error) {
      // Notify student via message if they have a conversation
      const { data: conv } = await supabase.from("conversations").select("*")
        .eq("provider_id", user.id).eq("seeker_id", user.id).single().catch(() => ({ data: null }));
      showToast("✅ Booking created!");
      setShowBookingModal(false);
      setBookingStudentName(""); setBookingStudentEmail(""); setBookingDate("");
      setBookingStart("09:00"); setBookingEnd("10:00"); setBookingNotes("");
      await loadCalendarData();
      await loadAttendanceData();
    } else {
      showToast("Error creating booking: " + error.message);
    }
    setSavingBooking(false);
  };

  const handleUpdateAttendance = async (bookingId: string) => {
    setSavingAttendance(true);
    const { error } = await supabase.from("bookings").update({
      attended: editAttended, payment_status: editPayment, notes: editNotes,
    }).eq("id", bookingId);
    setSavingAttendance(false);
    if (error) { showToast("Error saving: " + error.message); return; }
    setAttendanceBookings(prev => prev.map(b => b.id === bookingId ? { ...b, attended: editAttended, payment_status: editPayment, notes: editNotes } : b));
    setEditingBooking(null);
    showToast("✅ Updated!");
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Cancel this booking?")) return;
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    setAttendanceBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b));
    showToast("Booking cancelled.");
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await supabase.from("listings").delete().eq("id", id);
    setListings(prev => prev.filter(l => l.id !== id));
    showToast("Listing deleted.");
  };

  const handleCancelEvent = async (id: string) => {
    if (!confirm("Cancel this event?")) return;
    await supabase.from("events").update({ status:"cancelled" }).eq("id", id);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status:"cancelled" } : e));
    showToast("Event cancelled.");
  };

  const formatTime = (d: string) => {
    const date = new Date(d); const diff = Date.now() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString("en-AU", { hour:"2-digit", minute:"2-digit" });
    return date.toLocaleDateString("en-AU", { day:"numeric", month:"short" });
  };
  const fmt12 = (t: string) => { const [h,m] = t.split(":"); const hour = parseInt(h); return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`; };
  const getSuburbs = (json: string) => { try { return JSON.parse(json); } catch { return []; } };
  const getDuration = (d: string) => ({"30":"30 min","45":"45 min","60":"1 hr","90":"1.5 hr","120":"2 hr"}[d]||d);
  const displayName = user ? (user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.email.split("@")[0]) : "";
  const initials = user?.first_name ? `${user.first_name[0]}${user.last_name?.[0]||""}`.toUpperCase() : user?.email?.[0]?.toUpperCase()||"?";

  const inputStyle: React.CSSProperties = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { display:"block", fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:"#64748b", marginBottom:"0.4rem" };
  const cardStyle: React.CSSProperties = { background:"white", borderRadius:14, border:"1px solid #dbeafe", padding:"1.5rem", marginBottom:"1rem", boxShadow:"0 2px 8px rgba(30,58,95,0.05)" };

  // ── CALENDAR HELPERS ─────────────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(calendarWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getSlotsForDate = (dateStr: string) => slots.filter(s => s.date === dateStr);
  const getBookingsForDate = (dateStr: string) => bookings.filter(b => b.date === dateStr);

  const todayStr = new Date().toISOString().split("T")[0];

  // ── SECTION RENDERERS ────────────────────────────────────────

  const renderPersonal = () => (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Personal Details</h2>
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>Update your name and account information.</p>
      </div>
      <div style={cardStyle}>
        <div style={{display:"flex",alignItems:"center",gap:"1.2rem",marginBottom:"1.8rem",paddingBottom:"1.5rem",borderBottom:"1px solid #f1f5f9"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"#84CC16",flexShrink:0}}>{initials}</div>
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
          <div><label style={labelStyle}>First Name</label><input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Alex" style={inputStyle}/></div>
          <div><label style={labelStyle}>Last Name</label><input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Smith" style={inputStyle}/></div>
        </div>
        <div style={{marginBottom:"1.5rem"}}>
          <label style={labelStyle}>Email Address</label>
          <input value={user?.email||""} disabled style={{...inputStyle,opacity:0.6,cursor:"not-allowed"}}/>
          <div style={{fontSize:"0.75rem",color:"#94a3b8",marginTop:"0.4rem"}}>Email cannot be changed. Contact support if needed.</div>
        </div>
        <button onClick={handleSaveDetails} disabled={savingDetails}
          style={{padding:"0.75rem 2rem",background:savingDetails?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.9rem",cursor:"pointer",opacity:savingDetails?0.7:1}}>
          {savingDetails?"Saving...":"Save Changes"}
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
          style={{...cardStyle,cursor:"pointer",display:"flex",gap:"1rem",alignItems:"center"}}
          onMouseEnter={e=>(e.currentTarget.style.borderColor="#bfdbfe")}
          onMouseLeave={e=>(e.currentTarget.style.borderColor="#dbeafe")}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",color:"#84CC16",flexShrink:0}}>
            {(conv.listing?.provider_name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.2rem"}}>
              <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f"}}>{conv.listing?.provider_name||"Provider"}</div>
              <div style={{fontSize:"0.72rem",color:"#94a3b8"}}>{formatTime(conv.last_message_at)}</div>
            </div>
            <div style={{fontSize:"0.75rem",color:"#84CC16",fontWeight:600,marginBottom:"0.2rem"}}>{conv.listing?.activity_type} · {conv.listing?.lesson_title}</div>
            <div style={{fontSize:"0.8rem",color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{conv.last_message}</div>
          </div>
          {(conv.unread_count||0)>0 && <span style={{background:"#EF4444",color:"white",fontSize:"0.7rem",fontWeight:700,padding:"2px 7px",borderRadius:999}}>{conv.unread_count}</span>}
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
              <button onClick={()=>{ setActiveSection("calendar"); window.history.replaceState(null,"","/profile?section=calendar"); }}
                style={{padding:"0.45rem 1rem",background:"#EAF3DE",color:"#27500A",border:"1px solid #97C459",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                📅 Manage Calendar
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

  const renderCalendar = () => {
    const weekLabel = `${calendarWeekStart.toLocaleDateString("en-AU",{day:"numeric",month:"short"})} – ${weekDays[6].toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}`;
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.8rem"}}>
          <div>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Booking Calendar</h2>
            <p style={{fontSize:"0.85rem",color:"#64748b"}}>Set availability, block dates, and manage bookings.</p>
          </div>
          <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
            <button onClick={()=>setShowBookingModal(true)}
              style={{padding:"0.6rem 1.1rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
              + New Booking
            </button>
            <button onClick={()=>{ setSelectedDate(todayStr); setShowSlotModal(true); }}
              style={{padding:"0.6rem 1.1rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
              + Add Slot
            </button>
          </div>
        </div>

        {listings.length === 0 ? (
          <EmptyState icon="📅" title="No listings yet" subtitle="Create a lesson listing first to manage your calendar." action="Create a Listing" onAction={()=>router.push("/provider/create")}/>
        ) : (
          <>
            {/* Week Navigator */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",background:"white",borderRadius:12,padding:"0.8rem 1.2rem",border:"1px solid #dbeafe"}}>
              <button onClick={()=>{ const d=new Date(calendarWeekStart); d.setDate(d.getDate()-7); setCalendarWeekStart(d); }}
                style={{padding:"0.4rem 0.9rem",background:"#f8faff",border:"1px solid #dbeafe",borderRadius:999,cursor:"pointer",fontWeight:600,color:"#1e3a5f",fontSize:"0.85rem"}}>← Prev</button>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f"}}>{weekLabel}</div>
              <button onClick={()=>{ const d=new Date(calendarWeekStart); d.setDate(d.getDate()+7); setCalendarWeekStart(d); }}
                style={{padding:"0.4rem 0.9rem",background:"#f8faff",border:"1px solid #dbeafe",borderRadius:999,cursor:"pointer",fontWeight:600,color:"#1e3a5f",fontSize:"0.85rem"}}>Next →</button>
            </div>

            {/* Legend */}
            <div style={{display:"flex",gap:"1rem",marginBottom:"1rem",flexWrap:"wrap"}}>
              {[["#EAF3DE","#97C459","Available slot"],["#fef2f2","#fca5a5","Blocked"],["#EFF6FF","#bfdbfe","Booking"]].map(([bg,border,label])=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:"0.4rem",fontSize:"0.78rem",color:"#64748b"}}>
                  <div style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${border}`}}/>
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"0.5rem"}}>
              {weekDays.map(day => {
                const dateStr = day.toISOString().split("T")[0];
                const isToday = dateStr === todayStr;
                const daySlots = getSlotsForDate(dateStr);
                const dayBookings = getBookingsForDate(dateStr);
                return (
                  <div key={dateStr} style={{background:"white",borderRadius:12,border:`2px solid ${isToday?"#84CC16":"#dbeafe"}`,overflow:"hidden",minHeight:140}}>
                    {/* Day Header */}
                    <div style={{padding:"0.5rem",background:isToday?"#1e3a5f":"#f8faff",borderBottom:"1px solid #dbeafe",textAlign:"center"}}>
                      <div style={{fontSize:"0.7rem",fontWeight:700,color:isToday?"#84CC16":"#94a3b8",textTransform:"uppercase"}}>
                        {day.toLocaleDateString("en-AU",{weekday:"short"})}
                      </div>
                      <div style={{fontSize:"1rem",fontWeight:700,color:isToday?"white":"#1e3a5f"}}>
                        {day.getDate()}
                      </div>
                    </div>
                    {/* Slots & Bookings */}
                    <div style={{padding:"0.4rem",display:"flex",flexDirection:"column",gap:"0.3rem"}}>
                      {daySlots.map(slot => (
                        <div key={slot.id}
                          style={{fontSize:"0.68rem",padding:"0.3rem 0.5rem",borderRadius:6,
                            background:slot.status==="available"?"#EAF3DE":"#fef2f2",
                            border:`1px solid ${slot.status==="available"?"#97C459":"#fca5a5"}`,
                            color:slot.status==="available"?"#27500A":"#dc2626",
                            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontWeight:600}}>{fmt12(slot.start_time)}</span>
                          <button onClick={()=>handleDeleteSlot(slot.id)}
                            style={{background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:"0.7rem",padding:0,lineHeight:1}}>✕</button>
                        </div>
                      ))}
                      {dayBookings.map(booking => (
                        <div key={booking.id}
                          style={{fontSize:"0.68rem",padding:"0.3rem 0.5rem",borderRadius:6,
                            background:"#EFF6FF",border:"1px solid #bfdbfe",color:"#1e40af",cursor:"pointer"}}
                          onClick={()=>{ setActiveSection("attendance"); window.history.replaceState(null,"","/profile?section=attendance"); }}>
                          <div style={{fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{booking.student_name}</div>
                          <div>{fmt12(booking.start_time)}</div>
                        </div>
                      ))}
                      {daySlots.length === 0 && dayBookings.length === 0 && (
                        <div onClick={()=>{ setSelectedDate(dateStr); setShowSlotModal(true); }}
                          style={{fontSize:"0.68rem",color:"#cbd5e1",textAlign:"center",padding:"0.5rem",cursor:"pointer",borderRadius:6,border:"1px dashed #e2e8f0"}}>
                          + Add
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ADD SLOT MODAL */}
        {showSlotModal && (
          <div onClick={e=>{if(e.target===e.currentTarget)setShowSlotModal(false);}} style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
            <div style={{background:"white",borderRadius:20,padding:"2rem",width:"90%",maxWidth:440,position:"relative",boxShadow:"0 20px 60px rgba(30,58,95,0.15)"}}>
              <button onClick={()=>setShowSlotModal(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",fontSize:"1.2rem",cursor:"pointer",color:"#64748b"}}>✕</button>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"1.2rem"}}>Add Slot / Block Date</h3>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Listing</label>
                <select value={slotListingId} onChange={e=>setSlotListingId(e.target.value)} style={inputStyle}>
                  <option value="">Select a listing...</option>
                  {listings.filter(l=>l.status==="approved").map(l=><option key={l.id} value={l.id}>{l.lesson_title}</option>)}
                </select>
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Date</label>
                <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={inputStyle}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div><label style={labelStyle}>Start Time</label><input type="time" value={slotStart} onChange={e=>setSlotStart(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>End Time</label><input type="time" value={slotEnd} onChange={e=>setSlotEnd(e.target.value)} style={inputStyle}/></div>
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Type</label>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  {(["available","blocked"] as const).map(s=>(
                    <button key={s} onClick={()=>setSlotStatus(s)}
                      style={{flex:1,padding:"0.6rem",borderRadius:10,fontWeight:700,fontSize:"0.85rem",cursor:"pointer",
                        background:slotStatus===s?(s==="available"?"#EAF3DE":"#fef2f2"):"white",
                        color:slotStatus===s?(s==="available"?"#27500A":"#dc2626"):"#64748b",
                        border:`1px solid ${slotStatus===s?(s==="available"?"#97C459":"#fca5a5"):"#dbeafe"}`}}>
                      {s==="available"?"✅ Available":"🚫 Blocked"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:"1.2rem"}}>
                <label style={labelStyle}>Notes (optional)</label>
                <input value={slotNotes} onChange={e=>setSlotNotes(e.target.value)} placeholder="e.g. Court 3" style={inputStyle}/>
              </div>
              <button onClick={handleSaveSlot} disabled={savingSlot||!slotListingId||!selectedDate}
                style={{width:"100%",padding:"0.85rem",background:savingSlot?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"0.95rem",cursor:"pointer",opacity:(savingSlot||!slotListingId||!selectedDate)?0.7:1}}>
                {savingSlot?"Saving...":"Save Slot"}
              </button>
            </div>
          </div>
        )}

        {/* CREATE BOOKING MODAL */}
        {showBookingModal && (
          <div onClick={e=>{if(e.target===e.currentTarget)setShowBookingModal(false);}} style={{position:"fixed",inset:0,background:"rgba(30,58,95,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
            <div style={{background:"white",borderRadius:20,padding:"2rem",width:"90%",maxWidth:480,position:"relative",boxShadow:"0 20px 60px rgba(30,58,95,0.15)",maxHeight:"90vh",overflowY:"auto"}}>
              <button onClick={()=>setShowBookingModal(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",fontSize:"1.2rem",cursor:"pointer",color:"#64748b"}}>✕</button>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"1.2rem"}}>Create Booking</h3>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Listing *</label>
                <select value={bookingListingId} onChange={e=>setBookingListingId(e.target.value)} style={inputStyle}>
                  <option value="">Select a listing...</option>
                  {listings.filter(l=>l.status==="approved").map(l=><option key={l.id} value={l.id}>{l.lesson_title}</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div><label style={labelStyle}>Student Name *</label><input value={bookingStudentName} onChange={e=>setBookingStudentName(e.target.value)} placeholder="Alex Smith" style={inputStyle}/></div>
                <div><label style={labelStyle}>Student Email *</label><input type="email" value={bookingStudentEmail} onChange={e=>setBookingStudentEmail(e.target.value)} placeholder="alex@email.com" style={inputStyle}/></div>
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>Date *</label>
                <input type="date" value={bookingDate} onChange={e=>setBookingDate(e.target.value)} style={inputStyle}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div><label style={labelStyle}>Start Time</label><input type="time" value={bookingStart} onChange={e=>setBookingStart(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>End Time</label><input type="time" value={bookingEnd} onChange={e=>setBookingEnd(e.target.value)} style={inputStyle}/></div>
              </div>
              <div style={{marginBottom:"1.2rem"}}>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea value={bookingNotes} onChange={e=>setBookingNotes(e.target.value)} placeholder="Any notes about this session..." style={{...inputStyle,resize:"vertical",minHeight:80}}/>
              </div>
              <button onClick={handleSaveBooking} disabled={savingBooking||!bookingListingId||!bookingStudentName||!bookingStudentEmail||!bookingDate}
                style={{width:"100%",padding:"0.85rem",background:savingBooking?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"0.95rem",cursor:"pointer",opacity:(savingBooking||!bookingListingId||!bookingStudentName||!bookingStudentEmail||!bookingDate)?0.7:1}}>
                {savingBooking?"Creating...":"Create Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAttendance = () => {
    const today = new Date().toISOString().split("T")[0];
    const filteredBookings = attendanceBookings.filter(b => {
      if (attendanceFilter === "upcoming") return b.date >= today && b.status === "confirmed";
      if (attendanceFilter === "past") return b.date < today || b.status === "cancelled";
      return true;
    });

    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.8rem"}}>
          <div>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Attendance & Payments</h2>
            <p style={{fontSize:"0.85rem",color:"#64748b"}}>Track sessions, mark attendance, and log payments.</p>
          </div>
          <button onClick={()=>{ setShowBookingModal(true); setActiveSection("calendar"); window.history.replaceState(null,"","/profile?section=calendar"); }}
            style={{padding:"0.6rem 1.1rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
            + New Booking
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.2rem",background:"white",borderRadius:12,padding:"0.4rem",border:"1px solid #dbeafe",width:"fit-content"}}>
          {(["upcoming","past","all"] as const).map(f=>(
            <button key={f} onClick={()=>setAttendanceFilter(f)}
              style={{padding:"0.45rem 1rem",borderRadius:8,fontWeight:600,fontSize:"0.82rem",cursor:"pointer",border:"none",
                background:attendanceFilter===f?"#1e3a5f":"transparent",color:attendanceFilter===f?"#84CC16":"#64748b",textTransform:"capitalize"}}>
              {f==="upcoming"?"📅 Upcoming":f==="past"?"🕓 Past":"📋 All"}
            </button>
          ))}
        </div>

        {loadingSection ? <LoadingSpinner/> : filteredBookings.length === 0 ? (
          <EmptyState icon="✅" title="No bookings yet" subtitle="Create a booking from the calendar to start tracking attendance." action="Go to Calendar" onAction={()=>{ setActiveSection("calendar"); window.history.replaceState(null,"","/profile?section=calendar"); }}/>
        ) : filteredBookings.map(booking => {
          const isEditing = editingBooking === booking.id;
          const isPast = booking.date < today;
          return (
            <div key={booking.id} style={{...cardStyle,borderLeft:`4px solid ${booking.status==="cancelled"?"#EF4444":booking.attended==="yes"?"#84CC16":booking.attended==="no"?"#F97316":"#dbeafe"}`}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"1rem",marginBottom:"0.8rem"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:"0.95rem",color:"#1e3a5f"}}>{booking.student_name}</span>
                    <StatusBadge status={booking.status}/>
                    {booking.attended !== "pending" && (
                      <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,
                        background:booking.attended==="yes"?"#EAF3DE":"#FFF7ED",
                        color:booking.attended==="yes"?"#27500A":"#F97316",
                        border:`1px solid ${booking.attended==="yes"?"#97C459":"#FED7AA"}`}}>
                        {booking.attended==="yes"?"✅ Attended":"⚠️ No-show"}
                      </span>
                    )}
                    <StatusBadge status={booking.payment_status}/>
                  </div>
                  <div style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"0.2rem"}}>
                    {booking.listing?.lesson_title||"Lesson"} · {booking.listing?.activity_type}
                  </div>
                  <div style={{fontSize:"0.78rem",color:"#94a3b8"}}>
                    📅 {new Date(booking.date).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"})} · {fmt12(booking.start_time)} – {fmt12(booking.end_time)}
                  </div>
                  <div style={{fontSize:"0.78rem",color:"#94a3b8"}}>✉️ {booking.student_email}</div>
                  {booking.notes && <div style={{fontSize:"0.78rem",color:"#64748b",marginTop:"0.3rem",fontStyle:"italic"}}>📝 {booking.notes}</div>}
                  {booking.payment_amount && <div style={{fontSize:"0.78rem",color:"#64748b",marginTop:"0.2rem"}}>💰 ${booking.payment_amount}</div>}
                </div>
              </div>

              {/* Edit form */}
              {isEditing ? (
                <div style={{background:"#f8faff",borderRadius:10,padding:"1rem",border:"1px solid #dbeafe",marginTop:"0.8rem"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.8rem",marginBottom:"0.8rem"}}>
                    <div>
                      <label style={labelStyle}>Attendance</label>
                      <select value={editAttended} onChange={e=>setEditAttended(e.target.value)} style={inputStyle}>
                        <option value="pending">Pending</option>
                        <option value="yes">✅ Attended</option>
                        <option value="no">⚠️ No-show</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Payment</label>
                      <select value={editPayment} onChange={e=>setEditPayment(e.target.value)} style={inputStyle}>
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">✅ Paid</option>
                        <option value="waived">Waived</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Notes</label>
                      <input value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Session notes..." style={inputStyle}/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"0.6rem"}}>
                    <button onClick={()=>handleUpdateAttendance(booking.id)} disabled={savingAttendance}
                      style={{padding:"0.5rem 1.2rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",cursor:"pointer",opacity:savingAttendance?0.7:1}}>
                      {savingAttendance?"Saving...":"✅ Save"}
                    </button>
                    <button onClick={()=>setEditingBooking(null)}
                      style={{padding:"0.5rem 1.2rem",background:"white",color:"#64748b",border:"1px solid #dbeafe",borderRadius:999,fontWeight:600,fontSize:"0.82rem",cursor:"pointer"}}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",gap:"0.6rem",paddingTop:"0.8rem",borderTop:"1px solid #f1f5f9",flexWrap:"wrap"}}>
                  {booking.status !== "cancelled" && (
                    <button onClick={()=>{ setEditingBooking(booking.id); setEditAttended(booking.attended); setEditPayment(booking.payment_status); setEditNotes(booking.notes||""); }}
                      style={{padding:"0.4rem 0.9rem",background:"#EAF3DE",color:"#27500A",border:"1px solid #97C459",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                      ✏️ Update
                    </button>
                  )}
                  {booking.status === "confirmed" && (
                    <button onClick={()=>handleCancelBooking(booking.id)}
                      style={{padding:"0.4rem 0.9rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                      ❌ Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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
              <div style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"0.3rem"}}>{ev.sport} · {ev.location}, {ev.suburb}</div>
              <div style={{fontSize:"0.75rem",color:"#94a3b8"}}>📅 {ev.date} at {ev.time} · 👥 {ev.spots_filled}/{ev.spots_total} approved · {ev.cost==="Free"?"🎉 Free":`💰 ${ev.cost}`}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"0.6rem",paddingTop:"1rem",borderTop:"1px solid #f1f5f9",flexWrap:"wrap"}}>
            <button onClick={()=>router.push(`/events/${ev.id}`)}
              style={{padding:"0.45rem 1rem",background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
              👁️ View Event
            </button>
            {ev.status!=="cancelled"&&ev.status!=="closed"&&(
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
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>Your lesson enquiries, confirmed sessions, and event requests.</p>
      </div>
      {loadingSection ? <LoadingSpinner/> : (
        <>
          {/* Confirmed lesson bookings */}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.8rem"}}>📅 My Lesson Sessions</div>
          {attendanceBookings.length === 0 ? (
            <div style={{...cardStyle,textAlign:"center",color:"#64748b",fontSize:"0.85rem",padding:"1.5rem"}}>No booked sessions yet.</div>
          ) : attendanceBookings.map(b => (
            <div key={b.id} style={{...cardStyle,padding:"1rem 1.2rem",display:"flex",alignItems:"center",gap:"1rem"}}>
              <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>📚</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"0.88rem",color:"#1e3a5f",marginBottom:"0.15rem"}}>{b.listing?.lesson_title||"Lesson"}</div>
                <div style={{fontSize:"0.78rem",color:"#64748b"}}>📅 {new Date(b.date).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})} · {fmt12(b.start_time)}</div>
              </div>
              <div style={{display:"flex",gap:"0.4rem",flexDirection:"column",alignItems:"flex-end"}}>
                <StatusBadge status={b.status}/>
                {b.attended!=="pending"&&<StatusBadge status={b.attended==="yes"?"approved":"pending"}/>}
              </div>
            </div>
          ))}

          {/* Lesson Enquiries */}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f",margin:"1.5rem 0 0.8rem"}}>💬 Lesson Enquiries</div>
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
              <div style={{fontSize:"0.72rem",color:"#94a3b8"}}>{formatTime(conv.last_message_at)}</div>
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
      <div style={cardStyle}>
        <div style={{fontWeight:700,fontSize:"1rem",color:"#1e3a5f",marginBottom:"0.3rem"}}>🔐 Change Password</div>
        <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.2rem"}}>Choose a strong password of at least 6 characters.</p>
        {passwordError&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"0.6rem 1rem",marginBottom:"1rem",fontSize:"0.82rem",color:"#dc2626"}}>{passwordError}</div>}
        {passwordSuccess&&<div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"0.6rem 1rem",marginBottom:"1rem",fontSize:"0.82rem",color:"#16a34a"}}>{passwordSuccess}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.2rem"}}>
          <div><label style={labelStyle}>New Password</label><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min. 6 characters" style={inputStyle}/></div>
          <div><label style={labelStyle}>Confirm Password</label><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Type it again" style={inputStyle}/></div>
        </div>
        <button onClick={handleChangePassword} disabled={savingPassword}
          style={{padding:"0.7rem 1.8rem",background:savingPassword?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.88rem",cursor:"pointer",opacity:savingPassword?0.7:1}}>
          {savingPassword?"Updating...":"Update Password"}
        </button>
      </div>
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

  const sectionContent: Record<string,React.ReactNode> = {
    personal: renderPersonal(),
    messages: renderMessages(),
    listings: renderListings(),
    calendar: renderCalendar(),
    attendance: renderAttendance(),
    events: renderEvents(),
    history: renderHistory(),
    settings: renderSettings(),
  };

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;font-family:'DM Sans',sans-serif;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
    </>
  );

  const navTo = (id: string) => { setActiveSection(id); window.history.replaceState(null,"",`/profile?section=${id}`); };

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
        .nav-divider{height:1px;background:#f1f5f9;margin:0.4rem 0.5rem;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

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
          <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"1.2rem",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem"}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:"#84CC16",flexShrink:0}}>{initials}</div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{displayName}</div>
                <div style={{fontSize:"0.72rem",color:"#94a3b8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.email}</div>
              </div>
            </div>
          </div>

          <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"0.6rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
            {/* General */}
            <div style={{fontSize:"0.68rem",fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",padding:"0.5rem 0.8rem 0.3rem"}}>General</div>
            {["personal","messages","history","settings"].map(id => {
              const s = SECTIONS.find(x=>x.id===id)!;
              return <button key={id} className={`nav-item ${activeSection===id?"active":""}`} onClick={()=>navTo(id)}><span>{s.icon}</span><span>{s.label}</span></button>;
            })}
            {/* Provider */}
            <div style={{fontSize:"0.68rem",fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",padding:"0.8rem 0.8rem 0.3rem",marginTop:"0.2rem"}}>Lesson Provider</div>
            {["listings","calendar","attendance"].map(id => {
              const s = SECTIONS.find(x=>x.id===id)!;
              return <button key={id} className={`nav-item ${activeSection===id?"active":""}`} onClick={()=>navTo(id)}><span>{s.icon}</span><span>{s.label}</span></button>;
            })}
            {/* Events */}
            <div style={{fontSize:"0.68rem",fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",padding:"0.8rem 0.8rem 0.3rem",marginTop:"0.2rem"}}>Event Organiser</div>
            <button className={`nav-item ${activeSection==="events"?"active":""}`} onClick={()=>navTo("events")}><span>⚽</span><span>My Events</span></button>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div key={activeSection} style={{animation:"fadeIn 0.25s ease"}}>
          {sectionContent[activeSection]}
        </div>
      </div>

      {toast && <div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0,0,0,0);
  return date;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F0F7FF"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%"}}/>
      </div>
    }>
      <ProfileInner/>
    </Suspense>
  );
}
