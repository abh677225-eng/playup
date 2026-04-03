"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Suspense } from "react";

type User = { id: string; email: string; first_name?: string; last_name?: string } | null;
type Listing = {
  id: string; lesson_title: string; activity_type: string; price: number;
  session_duration: string; lesson_type: string; status: string; created_at: string;
  suburbs: string; photo_url: string; booking_mode: string;
};
type Event = {
  id: string; title: string; sport: string; date: string; time: string;
  location: string; suburb: string; spots_total: number; spots_filled: number;
  status: string; created_at: string; cost: string;
};
type Booking = {
  id: string; listing_id: string; student_name: string; student_email: string;
  date: string; start_time: string; end_time: string; status: string;
  attended: string; payment_status: string; created_at: string;
  listing?: { lesson_title: string; activity_type: string; price: number };
};
type EventRequest = {
  id: string; event_id: string; requester_id: string; requester_name: string; status: string; created_at: string;
  message?: string;
  event?: { title: string; sport: string; date: string };
};

const fmt12 = (t: string) => { if (!t) return ""; const [h,m]=t.split(":"); const hour=parseInt(h); return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`; };
const fmtDate = (d: string) => new Date(d+"T00:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});
const getDuration = (d: string) => ({"30":"30 min","45":"45 min","60":"1 hr","90":"1.5 hr","120":"2 hr"}[d]||d);

const STATUS_STYLE: Record<string,{bg:string;color:string;border:string}> = {
  confirmed:{bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  pending:  {bg:"#FFF7ED",color:"#F97316",border:"#FED7AA"},
  cancelled:{bg:"#FEF2F2",color:"#dc2626",border:"#FECACA"},
  approved: {bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  rejected: {bg:"#FEF2F2",color:"#dc2626",border:"#FECACA"},
  paid:     {bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  unpaid:   {bg:"#FFF7ED",color:"#F97316",border:"#FED7AA"},
  yes:      {bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  no:       {bg:"#FFF7ED",color:"#F97316",border:"#FED7AA"},
  calendar_instant:{bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  calendar_approval:{bg:"#EFF6FF",color:"#1e40af",border:"#bfdbfe"},
  request_approval:{bg:"#FFF7ED",color:"#F97316",border:"#FED7AA"},
  enquiry:  {bg:"#f8faff",color:"#64748b",border:"#dbeafe"},
};
function Chip({ label, status }: { label: string; status: string }) {
  const s = STATUS_STYLE[status]||{bg:"#f1f5f9",color:"#64748b",border:"#dbeafe"};
  return <span style={{fontSize:"0.68rem",fontWeight:700,padding:"0.2rem 0.55rem",borderRadius:999,background:s.bg,color:s.color,border:`1px solid ${s.border}`,textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>;
}

const BOOKING_MODE_LABELS: Record<string,string> = {
  calendar_instant:"⚡ Instant",
  calendar_approval:"📅 Approval",
  request_approval:"📩 Request",
  enquiry:"💬 Enquiry",
};

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<"provider"|"organiser">(searchParams.get("role") as any || "provider");
  const [activeSection, setActiveSection] = useState(searchParams.get("section") || "listings");
  const [toast, setToast] = useState("");

  // Provider data
  const [listings, setListings] = useState<Listing[]>([]);
  const [providerBookings, setProviderBookings] = useState<Booking[]>([]);
  const [bookingTab, setBookingTab] = useState<"upcoming"|"past"|"cancelled">("upcoming");
  const [loadingData, setLoadingData] = useState(false);

  // Organiser data
  const [events, setEvents] = useState<Event[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [requestActionLoading, setRequestActionLoading] = useState<string|null>(null);

  // Stats
  const [stats, setStats] = useState({ listings:0, pendingBookings:0, upcomingBookings:0, unpaidCount:0, activeEvents:0, pendingRequests:0 });

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      const meta = session.user.user_metadata || {};
      setUser({ id:session.user.id, email:session.user.email!, first_name:meta.first_name||"", last_name:meta.last_name||"" });
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e,session) => { if (!session?.user) router.push("/"); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user]);
  useEffect(() => { if (user) loadSection(); }, [user, activeRole, activeSection]);

  const loadAll = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const [lRes, bRes, eRes, erRes] = await Promise.all([
      supabase.from("listings").select("id,status").eq("user_id", user.id),
      supabase.from("bookings").select("id,date,status,attended,payment_status").eq("provider_id", user.id),
      supabase.from("events").select("id,status").eq("host_id", user.id),
      supabase.from("event_requests").select("id,status,event_id").eq("event_id","00000000-0000-0000-0000-000000000000"), // placeholder
    ]);
    const eventIds = (eRes.data||[]).map(e=>e.id);
    let pendingReqs = 0;
    if (eventIds.length > 0) {
      const { data: reqData } = await supabase.from("event_requests").select("id").in("event_id", eventIds).eq("status","pending");
      pendingReqs = reqData?.length || 0;
    }
    const bData = bRes.data || [];
    setStats({
      listings: (lRes.data||[]).filter(l=>l.status==="approved").length,
      pendingBookings: bData.filter(b=>b.status==="confirmed"&&b.attended==="pending"&&b.date>=today).length,
      upcomingBookings: bData.filter(b=>b.status==="confirmed"&&b.date>=today).length,
      unpaidCount: bData.filter(b=>b.payment_status==="unpaid"&&b.date<today).length,
      activeEvents: (eRes.data||[]).filter(e=>e.status==="approved").length,
      pendingRequests: pendingReqs,
    });
  };

  const loadSection = async () => {
    if (!user) return;
    setLoadingData(true);
    if (activeRole === "provider") {
      if (activeSection === "listings" || activeSection === "bookings") {
        const { data } = await supabase.from("listings").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
        setListings(data||[]);
      }
      if (activeSection === "bookings") {
        const { data } = await supabase.from("bookings").select("*").eq("provider_id",user.id).order("date",{ascending:true});
        if (data) {
          const enriched = await Promise.all(data.map(async b=>{
            const { data: l } = await supabase.from("listings").select("lesson_title,activity_type,price").eq("id",b.listing_id).single();
            return { ...b, listing:l||undefined };
          }));
          setProviderBookings(enriched);
        }
      }
    } else {
      const { data: evData } = await supabase.from("events").select("*").eq("host_id",user.id).order("created_at",{ascending:false});
      setEvents(evData||[]);
      if (evData && evData.length > 0) {
        const ids = evData.map(e=>e.id);
        const { data: reqData } = await supabase.from("event_requests").select("*").in("event_id",ids).order("created_at",{ascending:true});
        if (reqData) {
          const enriched = await Promise.all(reqData.map(async r=>{
            const ev = evData.find(e=>e.id===r.event_id);
            return { ...r, event: ev ? { title:ev.title, sport:ev.sport, date:ev.date } : undefined };
          }));
          setEventRequests(enriched);
        }
      }
    }
    setLoadingData(false);
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await supabase.from("listings").delete().eq("id",id);
    setListings(prev=>prev.filter(l=>l.id!==id));
    showToast("Listing deleted.");
  };

  const handleCancelEvent = async (id: string) => {
    if (!confirm("Cancel this event?")) return;
    await supabase.from("events").update({status:"cancelled"}).eq("id",id);
    setEvents(prev=>prev.map(e=>e.id===id?{...e,status:"cancelled"}:e));
    showToast("Event cancelled.");
  };

  const handleRequestAction = async (reqId: string, requesterId: string, eventId: string, action: "approved"|"rejected") => {
    setRequestActionLoading(reqId);
    const req = eventRequests.find(r=>r.id===reqId);
    if (!req || req.status !== "pending") { setRequestActionLoading(null); return; }
    setEventRequests(prev=>prev.map(r=>r.id===reqId?{...r,status:action}:r));
    if (action==="approved") setEvents(prev=>prev.map(e=>e.id===eventId?{...e,spots_filled:e.spots_filled+1}:e));
    try {
      await supabase.from("event_requests").update({status:action}).eq("id",reqId);
      if (action==="approved") {
        const ev = events.find(e=>e.id===eventId);
        await supabase.from("events").update({spots_filled:(ev?.spots_filled||0)+1}).eq("id",eventId);
      }
      const notifyMsg = action==="approved"
        ? `Great news! Your request to join has been approved. See you there! 🎉`
        : `Thanks for your interest. Unfortunately your request wasn't approved this time.`;
      await supabase.from("messages").insert({ listing_id:eventId, sender_id:user!.id, receiver_id:requesterId, message:notifyMsg, read:false });
      showToast(action==="approved"?"✅ Approved — player notified!":"❌ Rejected — player notified.");
    } catch { showToast("Something went wrong."); }
    finally { setRequestActionLoading(null); }
  };

  const today = new Date().toISOString().split("T")[0];
  const displayName = user ? (user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.email.split("@")[0]) : "";
  const initials = user?.first_name ? `${user.first_name[0]}${user.last_name?.[0]||""}`.toUpperCase() : user?.email?.[0]?.toUpperCase()||"?";

  const getSuburbs = (json: string) => { try { return JSON.parse(json); } catch { return []; } };

  const thStyle: React.CSSProperties = { padding:"0.6rem 0.8rem",fontSize:"0.72rem",fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"#94a3b8",textAlign:"left",borderBottom:"2px solid #f1f5f9",whiteSpace:"nowrap",background:"#f8faff" };
  const tdStyle: React.CSSProperties = { padding:"0.75rem 0.8rem",fontSize:"0.83rem",color:"#475569",borderBottom:"1px solid #f8faff",verticalAlign:"middle" };
  const cardStyle: React.CSSProperties = { background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"1.5rem",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)" };

  // Booking filters
  const filteredBookings = providerBookings.filter(b=>{
    if (bookingTab==="upcoming") return b.status==="confirmed"&&b.date>=today;
    if (bookingTab==="past") return b.date<today&&b.status!=="cancelled";
    return b.status==="cancelled";
  });

  const navTo = (section: string) => {
    setActiveSection(section);
    window.history.replaceState(null,"",`/dashboard?role=${activeRole}&section=${section}`);
  };
  const switchRole = (role: "provider"|"organiser") => {
    setActiveRole(role);
    const defaultSection = role==="provider"?"listings":"events";
    setActiveSection(defaultSection);
    window.history.replaceState(null,"",`/dashboard?role=${role}&section=${defaultSection}`);
  };

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;font-family:'DM Sans',sans-serif;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
    </>
  );

  // --- PROVIDER SECTIONS ---
  const renderListings = () => (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.8rem"}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.2rem"}}>My Lesson Listings</h2>
          <p style={{fontSize:"0.82rem",color:"#64748b"}}>{listings.length} listing{listings.length!==1?"s":""}</p>
        </div>
        <button onClick={()=>router.push("/provider/create")} style={{padding:"0.6rem 1.2rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>+ New Listing</button>
      </div>
      {loadingData ? <Spinner/> : listings.length===0 ? (
        <Empty icon="📋" title="No listings yet" subtitle="List your lessons and reach learners across Australia." action="Create a Listing" onAction={()=>router.push("/provider/create")}/>
      ) : listings.map(l=>{
        const suburbs = getSuburbs(l.suburbs);
        return (
          <div key={l.id} style={cardStyle}>
            <div style={{display:"flex",gap:"1rem",alignItems:"flex-start"}}>
              {l.photo_url?<img src={l.photo_url} alt="" style={{width:52,height:52,borderRadius:10,objectFit:"cover",border:"1px solid #dbeafe",flexShrink:0}}/>
              :<div style={{width:52,height:52,borderRadius:10,background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0}}>📚</div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:"0.92rem",color:"#1e3a5f"}}>{l.lesson_title}</span>
                  <Chip label={l.status} status={l.status}/>
                  <Chip label={BOOKING_MODE_LABELS[l.booking_mode]||l.booking_mode} status={l.booking_mode||"enquiry"}/>
                </div>
                <div style={{fontSize:"0.8rem",color:"#64748b",marginBottom:"0.3rem"}}>{l.activity_type} · ${l.price}/session · {getDuration(l.session_duration)} · {l.lesson_type}</div>
                <div style={{fontSize:"0.74rem",color:"#94a3b8"}}>📍 {suburbs.slice(0,3).map((s:any)=>s.name).join(", ")}{suburbs.length>3?` +${suburbs.length-3} more`:""}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:"0.5rem",marginTop:"1rem",paddingTop:"0.9rem",borderTop:"1px solid #f1f5f9",flexWrap:"wrap"}}>
              <button onClick={()=>router.push(`/listings/${l.id}`)} style={{padding:"0.4rem 0.9rem",background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe",borderRadius:999,fontWeight:600,fontSize:"0.75rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>👁️ View</button>
              <button onClick={()=>router.push("/profile?section=calendar")} style={{padding:"0.4rem 0.9rem",background:"#EAF3DE",color:"#27500A",border:"1px solid #97C459",borderRadius:999,fontWeight:600,fontSize:"0.75rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>📅 Calendar</button>
              <button onClick={()=>handleDeleteListing(l.id)} style={{padding:"0.4rem 0.9rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:600,fontSize:"0.75rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🗑️ Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderProviderBookings = () => {
    const upCount = providerBookings.filter(b=>b.status==="confirmed"&&b.date>=today).length;
    const pastCount = providerBookings.filter(b=>b.date<today&&b.status!=="cancelled").length;
    const cancelCount = providerBookings.filter(b=>b.status==="cancelled").length;
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.8rem"}}>
          <div>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.2rem"}}>Student Bookings</h2>
            <p style={{fontSize:"0.82rem",color:"#64748b"}}>Bookings made for your lessons.</p>
          </div>
          <div style={{display:"flex",gap:"0.5rem"}}>
            <button onClick={()=>router.push("/attendance")} style={{padding:"0.55rem 1rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.8rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>✅ Attendance Manager →</button>
            <button onClick={()=>router.push("/profile?section=calendar")} style={{padding:"0.55rem 1rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.8rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>📅 Calendar</button>
          </div>
        </div>

        {/* Attendance summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.8rem",marginBottom:"1.2rem"}}>
          {[[`${stats.upcomingBookings}`,"📅","Upcoming","confirmed sessions"],[`${stats.unpaidCount}`,"💳","Unpaid","past sessions"],[`${stats.pendingBookings}`,"⏳","Pending","attendance to mark"]].map(([val,icon,label,sub])=>(
            <div key={label} style={{background:"white",borderRadius:12,padding:"1rem",border:"1px solid #dbeafe",textAlign:"center"}}>
              <div style={{fontSize:"1.1rem"}}>{icon}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",color:"#1e3a5f",letterSpacing:1,lineHeight:1.1}}>{val}</div>
              <div style={{fontSize:"0.72rem",color:"#64748b",marginTop:"0.2rem"}}>{label} · {sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",background:"white",border:"1px solid #dbeafe",borderRadius:12,padding:"0.35rem",marginBottom:"1rem",width:"fit-content",gap:"0.3rem"}}>
          {([["upcoming","📅 Upcoming",upCount],["past","🕓 Past",pastCount],["cancelled","❌ Cancelled",cancelCount]] as const).map(([tab,label,count])=>(
            <button key={tab} onClick={()=>setBookingTab(tab)}
              style={{padding:"0.45rem 1rem",borderRadius:9,fontWeight:600,fontSize:"0.8rem",cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif",
                background:bookingTab===tab?"#1e3a5f":"transparent",color:bookingTab===tab?"#84CC16":"#64748b",
                display:"flex",alignItems:"center",gap:"0.4rem"}}>
              {label}
              <span style={{fontSize:"0.65rem",fontWeight:700,padding:"0.1rem 0.4rem",borderRadius:999,background:bookingTab===tab?"rgba(132,204,22,0.2)":"#f1f5f9",color:bookingTab===tab?"#84CC16":"#94a3b8"}}>{count}</span>
            </button>
          ))}
        </div>

        {loadingData ? <Spinner/> : filteredBookings.length===0 ? (
          <div style={{...cardStyle,textAlign:"center",padding:"2.5rem",color:"#94a3b8",fontSize:"0.85rem"}}>No {bookingTab} bookings.</div>
        ) : (
          <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Student</th>
                    <th style={thStyle}>Lesson</th>
                    <th style={thStyle}>Booking</th>
                    <th style={thStyle}>Attendance</th>
                    <th style={thStyle}>Payment</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(b=>(
                    <tr key={b.id} onMouseEnter={e=>(e.currentTarget.style.background="#f8faff")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} style={{transition:"background 0.15s"}}>
                      <td style={{...tdStyle,fontWeight:600,color:"#1e3a5f",whiteSpace:"nowrap"}}>{fmtDate(b.date)}</td>
                      <td style={{...tdStyle,whiteSpace:"nowrap"}}>{fmt12(b.start_time)}</td>
                      <td style={tdStyle}>
                        <div style={{fontWeight:600,color:"#1e3a5f"}}>{b.student_name}</div>
                        <div style={{fontSize:"0.72rem",color:"#94a3b8"}}>{b.student_email}</div>
                      </td>
                      <td style={{...tdStyle,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.listing?.lesson_title||"—"}</td>
                      <td style={tdStyle}><Chip label={b.status} status={b.status}/></td>
                      <td style={tdStyle}>{b.attended==="yes"?<Chip label="Attended" status="yes"/>:b.attended==="no"?<Chip label="No-show" status="no"/>:<span style={{fontSize:"0.75rem",color:"#94a3b8"}}>Pending</span>}</td>
                      <td style={tdStyle}><Chip label={b.payment_status} status={b.payment_status}/></td>
                      <td style={{...tdStyle,whiteSpace:"nowrap"}}>
                        <button onClick={()=>router.push("/attendance")} style={{fontSize:"0.72rem",color:"#84CC16",background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>Manage →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- ORGANISER SECTIONS ---
  const renderEvents = () => (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.8rem"}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.2rem"}}>My Events</h2>
          <p style={{fontSize:"0.82rem",color:"#64748b"}}>{events.length} event{events.length!==1?"s":""}</p>
        </div>
        <button onClick={()=>router.push("/events/create")} style={{padding:"0.6rem 1.2rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.82rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>+ New Event</button>
      </div>
      {loadingData ? <Spinner/> : events.length===0 ? (
        <Empty icon="⚽" title="No events yet" subtitle="Post a community event and find players." action="Create an Event" onAction={()=>router.push("/events/create")}/>
      ) : events.map(ev=>(
        <div key={ev.id} style={cardStyle}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"1rem",marginBottom:"0.8rem",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:"0.92rem",color:"#1e3a5f"}}>{ev.title}</span>
                <Chip label={ev.status} status={ev.status}/>
              </div>
              <div style={{fontSize:"0.8rem",color:"#64748b",marginBottom:"0.2rem"}}>{ev.sport} · {ev.location}, {ev.suburb}</div>
              <div style={{fontSize:"0.74rem",color:"#94a3b8"}}>📅 {ev.date} at {ev.time} · 👥 {ev.spots_filled}/{ev.spots_total} spots approved · {ev.cost==="Free"?"🎉 Free":`💰 ${ev.cost}`}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"0.5rem",paddingTop:"0.9rem",borderTop:"1px solid #f1f5f9",flexWrap:"wrap"}}>
            <button onClick={()=>router.push(`/events/${ev.id}`)} style={{padding:"0.4rem 0.9rem",background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe",borderRadius:999,fontWeight:600,fontSize:"0.75rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>👁️ View & Manage</button>
            {ev.status!=="cancelled"&&ev.status!=="closed"&&<button onClick={()=>handleCancelEvent(ev.id)} style={{padding:"0.4rem 0.9rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:600,fontSize:"0.75rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>❌ Cancel</button>}
          </div>
        </div>
      ))}
    </div>
  );

  const renderRequests = () => {
    const pending = eventRequests.filter(r=>r.status==="pending");
    const actioned = eventRequests.filter(r=>r.status!=="pending");
    return (
      <div>
        <div style={{marginBottom:"1.5rem"}}>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.2rem"}}>Join Requests</h2>
          <p style={{fontSize:"0.82rem",color:"#64748b"}}>{pending.length} pending · {actioned.length} actioned</p>
        </div>
        {loadingData ? <Spinner/> : eventRequests.length===0 ? (
          <div style={{...cardStyle,textAlign:"center",padding:"2.5rem",color:"#94a3b8",fontSize:"0.85rem"}}>No requests yet.</div>
        ) : (
          <>
            {/* PENDING */}
            {pending.length>0&&(
              <>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:1,color:"#F97316",marginBottom:"0.7rem"}}>⏳ Pending ({pending.length})</div>
                <div style={{...cardStyle,padding:0,overflow:"hidden",marginBottom:"1.2rem"}}>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Player</th>
                          <th style={thStyle}>Event</th>
                          <th style={thStyle}>Sport</th>
                          <th style={thStyle}>Date</th>
                          <th style={thStyle}>Message</th>
                          <th style={thStyle}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map(r=>{
                          const isActioning = requestActionLoading===r.id;
                          return (
                            <tr key={r.id} onMouseEnter={e=>(e.currentTarget.style.background="#f8faff")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} style={{transition:"background 0.15s"}}>
                              <td style={{...tdStyle,fontWeight:600,color:"#1e3a5f",whiteSpace:"nowrap"}}>{r.requester_name}</td>
                              <td style={{...tdStyle,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.event?.title||"—"}</td>
                              <td style={tdStyle}>{r.event?.sport||"—"}</td>
                              <td style={{...tdStyle,whiteSpace:"nowrap"}}>{r.event?.date?fmtDate(r.event.date):"—"}</td>
                              <td style={{...tdStyle,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis"}}>{r.message||<span style={{color:"#94a3b8",fontStyle:"italic"}}>No message</span>}</td>
                              <td style={{...tdStyle,whiteSpace:"nowrap"}}>
                                <div style={{display:"flex",gap:"0.4rem"}}>
                                  <button onClick={()=>handleRequestAction(r.id,r.requester_id||"",r.event_id,"approved")} disabled={!!isActioning}
                                    style={{padding:"0.35rem 0.8rem",background:"#EAF3DE",color:"#27500A",border:"1px solid #97C459",borderRadius:999,fontWeight:700,fontSize:"0.72rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",opacity:isActioning?0.6:1}}>
                                    {isActioning?"...":"✅ Approve"}
                                  </button>
                                  <button onClick={()=>handleRequestAction(r.id,r.requester_id||"",r.event_id,"rejected")} disabled={!!isActioning}
                                    style={{padding:"0.35rem 0.8rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:700,fontSize:"0.72rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",opacity:isActioning?0.6:1}}>
                                    {isActioning?"...":"❌ Reject"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ACTIONED */}
            {actioned.length>0&&(
              <>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:1,color:"#64748b",marginBottom:"0.7rem"}}>📋 Actioned ({actioned.length})</div>
                <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Player</th>
                          <th style={thStyle}>Event</th>
                          <th style={thStyle}>Sport</th>
                          <th style={thStyle}>Date</th>
                          <th style={thStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actioned.map(r=>(
                          <tr key={r.id} onMouseEnter={e=>(e.currentTarget.style.background="#f8faff")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} style={{transition:"background 0.15s"}}>
                            <td style={{...tdStyle,fontWeight:600,color:"#1e3a5f",whiteSpace:"nowrap"}}>{r.requester_name}</td>
                            <td style={{...tdStyle,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.event?.title||"—"}</td>
                            <td style={tdStyle}>{r.event?.sport||"—"}</td>
                            <td style={{...tdStyle,whiteSpace:"nowrap"}}>{r.event?.date?fmtDate(r.event.date):"—"}</td>
                            <td style={tdStyle}><Chip label={r.status} status={r.status}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const providerSections: { id: string; icon: string; label: string; badge?: number }[] = [
    { id:"listings", icon:"📋", label:"My Listings" },
    { id:"bookings", icon:"📅", label:"Student Bookings" },
  ];
  const organiserSections: { id: string; icon: string; label: string; badge?: number }[] = [
    { id:"events",   icon:"⚽", label:"My Events" },
    { id:"requests", icon:"📩", label:"Join Requests", badge: stats.pendingRequests },
  ];
  const currentSections = activeRole==="provider" ? providerSections : organiserSections;

  const sectionMap: Record<string,React.ReactNode> = {
    listings: renderListings(),
    bookings: renderProviderBookings(),
    events: renderEvents(),
    requests: renderRequests(),
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        .nav-item{display:flex;align-items:center;gap:0.7rem;padding:0.7rem 1rem;border-radius:10px;cursor:pointer;transition:all 0.15s;font-size:0.88rem;font-weight:500;color:#64748b;border:none;background:none;width:100%;text-align:left;font-family:'DM Sans',sans-serif;}
        .nav-item:hover{background:#f0f9ff;color:#1e3a5f;}
        .nav-item.active{background:#1e3a5f;color:#84CC16;font-weight:700;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 2rem",background:"white",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 8px rgba(30,58,95,0.06)",position:"sticky",top:0,zIndex:100}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f"}}>Provider Dashboard</div>
        <div style={{display:"flex",gap:"0.6rem"}}>
          <button className="btn" onClick={()=>router.push("/profile")} style={{padding:"0.4rem 1rem",border:"1px solid #dbeafe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>👤 Profile</button>
          <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.4rem 1rem",border:"1px solid #dbeafe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>← PlayUp</button>
        </div>
      </nav>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"2rem 1.5rem",display:"grid",gridTemplateColumns:"220px 1fr",gap:"1.5rem",alignItems:"start"}}>

        {/* LEFT PANE */}
        <div style={{position:"sticky",top:"5rem"}}>
          {/* User card */}
          <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"1rem 1.2rem",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"0.8rem"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",color:"#84CC16",flexShrink:0}}>{initials}</div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"0.88rem",color:"#1e3a5f",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{displayName}</div>
                <div style={{fontSize:"0.7rem",color:"#94a3b8"}}>Provider Dashboard</div>
              </div>
            </div>
            {/* Role switcher */}
            <div style={{display:"flex",gap:"0.4rem"}}>
              {([["provider","📋 Provider"],["organiser","⚽ Organiser"]] as const).map(([role,label])=>(
                <button key={role} onClick={()=>switchRole(role)}
                  style={{flex:1,padding:"0.4rem 0.4rem",borderRadius:8,fontWeight:600,fontSize:"0.75rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                    background:activeRole===role?"#1e3a5f":"#f8faff",color:activeRole===role?"#84CC16":"#64748b",border:`1px solid ${activeRole===role?"#1e3a5f":"#dbeafe"}`}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats mini */}
          {activeRole==="provider"&&(
            <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"0.8rem",marginBottom:"1rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
              {[[stats.listings,"📋","Live listings"],[stats.upcomingBookings,"📅","Upcoming"],[stats.unpaidCount,"💳","Unpaid"],[stats.pendingBookings,"⏳","To mark"]].map(([val,icon,label])=>(
                <div key={label as string} style={{textAlign:"center",padding:"0.5rem",background:"#f8faff",borderRadius:8,border:"1px solid #dbeafe"}}>
                  <div style={{fontSize:"0.9rem"}}>{icon}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:"#1e3a5f",letterSpacing:1}}>{val}</div>
                  <div style={{fontSize:"0.62rem",color:"#94a3b8"}}>{label}</div>
                </div>
              ))}
            </div>
          )}
          {activeRole==="organiser"&&(
            <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"0.8rem",marginBottom:"1rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
              {[[stats.activeEvents,"⚽","Active events"],[stats.pendingRequests,"📩","Pending reqs"]].map(([val,icon,label])=>(
                <div key={label as string} style={{textAlign:"center",padding:"0.5rem",background:"#f8faff",borderRadius:8,border:"1px solid #dbeafe"}}>
                  <div style={{fontSize:"0.9rem"}}>{icon}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",color:"#1e3a5f",letterSpacing:1}}>{val}</div>
                  <div style={{fontSize:"0.62rem",color:"#94a3b8"}}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Nav */}
          <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"0.5rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
            {currentSections.map(s=>(
              <button key={s.id} className={`nav-item ${activeSection===s.id?"active":""}`} onClick={()=>navTo(s.id)}>
                <span>{s.icon}</span>
                <span style={{flex:1}}>{s.label}</span>
                {s.badge&&s.badge>0&&<span style={{background:"#EF4444",color:"white",fontSize:"0.65rem",fontWeight:700,padding:"1px 6px",borderRadius:999,minWidth:18,textAlign:"center"}}>{s.badge}</span>}
              </button>
            ))}
            <div style={{height:1,background:"#f1f5f9",margin:"0.4rem 0.3rem"}}/>
            <button className="nav-item" onClick={()=>router.push("/attendance")}>
              <span>✅</span><span>Attendance Manager</span>
            </button>
            <button className="nav-item" onClick={()=>router.push("/profile?section=calendar")}>
              <span>📅</span><span>Booking Calendar</span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div key={`${activeRole}-${activeSection}`} style={{animation:"fadeIn 0.25s ease"}}>
          {sectionMap[activeSection]}
        </div>
      </div>

      {toast&&<div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}

function Spinner() {
  return <div style={{textAlign:"center",padding:"3rem"}}><div style={{width:28,height:28,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/></div>;
}
function Empty({ icon,title,subtitle,action,onAction }: { icon:string;title:string;subtitle:string;action:string;onAction:()=>void }) {
  return (
    <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"3rem",textAlign:"center",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
      <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>{icon}</div>
      <div style={{fontWeight:700,color:"#1e3a5f",fontSize:"1rem",marginBottom:"0.4rem"}}>{title}</div>
      <div style={{fontSize:"0.85rem",color:"#64748b",marginBottom:"1.5rem"}}>{subtitle}</div>
      <button onClick={onAction} style={{padding:"0.6rem 1.5rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{action} →</button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F0F7FF"}}><div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%"}}/></div>}>
      <DashboardInner/>
    </Suspense>
  );
}
