"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Suspense } from "react";

type User = { id: string; email: string; first_name?: string; last_name?: string } | null;
type Conversation = {
  id: string; listing_id: string; last_message: string; last_message_at: string;
  seeker_id: string; provider_id: string;
  listing?: { lesson_title: string; activity_type: string; provider_name: string };
  unread_count?: number;
};
type Booking = {
  id: string; listing_id: string; date: string; start_time: string; end_time: string;
  status: string; attended: string; payment_status: string; created_at: string;
  listing?: { lesson_title: string; activity_type: string; price: number };
};
type EventRequest = {
  id: string; event_id: string; status: string; created_at: string;
  event?: { title: string; sport: string; date: string; host_name: string; location: string };
};

const SECTIONS = [
  { id:"personal", icon:"👤", label:"Personal Details" },
  { id:"history",  icon:"🕓", label:"Booking History" },
  { id:"messages", icon:"💬", label:"Messages" },
  { id:"settings", icon:"⚙️", label:"Account Settings" },
];

const fmt12 = (t: string) => { if (!t) return ""; const [h,m]=t.split(":"); const hour=parseInt(h); return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`; };
const fmtDate = (d: string) => new Date(d+"T00:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});
const fmtTime = (d: string) => { const date=new Date(d); const diff=Date.now()-date.getTime(); if(diff<3600000) return `${Math.floor(diff/60000)}m ago`; if(diff<86400000) return date.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"}); return date.toLocaleDateString("en-AU",{day:"numeric",month:"short"}); };

const STATUS_STYLE: Record<string,{bg:string;color:string;border:string}> = {
  confirmed:  {bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  pending:    {bg:"#FFF7ED",color:"#F97316",border:"#FED7AA"},
  cancelled:  {bg:"#FEF2F2",color:"#dc2626",border:"#FECACA"},
  approved:   {bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  rejected:   {bg:"#FEF2F2",color:"#dc2626",border:"#FECACA"},
  paid:       {bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  unpaid:     {bg:"#FFF7ED",color:"#F97316",border:"#FED7AA"},
  yes:        {bg:"#EAF3DE",color:"#27500A",border:"#97C459"},
  no:         {bg:"#FFF7ED",color:"#F97316",border:"#FED7AA"},
};
function Chip({ label, status }: { label: string; status: string }) {
  const s = STATUS_STYLE[status] || {bg:"#f1f5f9",color:"#64748b",border:"#dbeafe"};
  return <span style={{fontSize:"0.68rem",fontWeight:700,padding:"0.2rem 0.55rem",borderRadius:999,background:s.bg,color:s.color,border:`1px solid ${s.border}`,textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>;
}

function ProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User>(null);
  const [activeSection, setActiveSection] = useState(searchParams.get("section") || "personal");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [loadingSection, setLoadingSection] = useState(false);
  const [historyTab, setHistoryTab] = useState<"upcoming"|"past"|"cancelled">("upcoming");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  // Provider/organiser detection
  const [hasListings, setHasListings] = useState(false);
  const [hasEvents, setHasEvents] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""),3500); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      const meta = session.user.user_metadata || {};
      setUser({ id:session.user.id, email:session.user.email!, first_name:meta.first_name||"", last_name:meta.last_name||"" });
      setFirstName(meta.first_name||""); setLastName(meta.last_name||"");
      setLoading(false);
      // Check roles
      checkRoles(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e,session) => { if (!session?.user) router.push("/"); });
    return () => subscription.unsubscribe();
  }, []);

  const checkRoles = async (uid: string) => {
    const [l, e] = await Promise.all([
      supabase.from("listings").select("id").eq("user_id", uid).limit(1),
      supabase.from("events").select("id").eq("host_id", uid).limit(1),
    ]);
    setHasListings((l.data?.length||0) > 0);
    setHasEvents((e.data?.length||0) > 0);
  };

  useEffect(() => { if (user) loadSection(activeSection); }, [user, activeSection]);

  const loadSection = async (s: string) => {
    if (!user) return;
    setLoadingSection(true);
    if (s === "messages") {
      const { data } = await supabase.from("conversations").select("*").or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`).order("last_message_at",{ascending:false});
      if (data) {
        const enriched = await Promise.all(data.map(async c => {
          const { data: l } = await supabase.from("listings").select("lesson_title,activity_type,provider_name").eq("id",c.listing_id).single();
          const { count } = await supabase.from("messages").select("id",{count:"exact"}).eq("listing_id",c.listing_id).eq("receiver_id",user.id).eq("read",false);
          return { ...c, listing:l||undefined, unread_count:count||0 };
        }));
        setConversations(enriched);
      }
    } else if (s === "history") {
      // Student bookings only
      const { data: bData } = await supabase.from("bookings").select("*").eq("student_id",user.id).order("date",{ascending:true});
      if (bData) {
        const enriched = await Promise.all(bData.map(async b => {
          const { data: l } = await supabase.from("listings").select("lesson_title,activity_type,price").eq("id",b.listing_id).single();
          return { ...b, listing:l||undefined };
        }));
        setBookings(enriched);
      }
      const { data: eData } = await supabase.from("event_requests").select("*").eq("requester_id",user.id).order("created_at",{ascending:false});
      if (eData) {
        const enriched = await Promise.all(eData.map(async r => {
          const { data: ev } = await supabase.from("events").select("title,sport,date,host_name,location").eq("id",r.event_id).single();
          return { ...r, event:ev||undefined };
        }));
        setEventRequests(enriched);
      }
    }
    setLoadingSection(false);
  };

  const handleSaveDetails = async () => {
    if (!user) return;
    setSavingDetails(true);
    const { error } = await supabase.auth.updateUser({ data:{ first_name:firstName, last_name:lastName } });
    setSavingDetails(false);
    if (error) showToast("Error saving"); else { setUser(prev=>prev?{...prev,first_name:firstName,last_name:lastName}:prev); showToast("✅ Saved!"); }
  };

  const handleChangePassword = async () => {
    setPasswordError(""); setPasswordSuccess("");
    if (!newPassword) { setPasswordError("Enter a new password."); return; }
    if (newPassword.length < 6) { setPasswordError("Min 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match."); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password:newPassword });
    setSavingPassword(false);
    if (error) setPasswordError(error.message);
    else { setPasswordSuccess("Password updated!"); setNewPassword(""); setConfirmPassword(""); }
  };

  const today = new Date().toISOString().split("T")[0];
  const displayName = user ? (user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.email.split("@")[0]) : "";
  const initials = user?.first_name ? `${user.first_name[0]}${user.last_name?.[0]||""}`.toUpperCase() : user?.email?.[0]?.toUpperCase()||"?";

  const inputStyle: React.CSSProperties = { width:"100%",background:"#f8faff",border:"1px solid #bfdbfe",borderRadius:10,padding:"0.7rem 1rem",color:"#1e3a5f",fontSize:"0.9rem",outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { display:"block",fontSize:"0.78rem",fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"#64748b",marginBottom:"0.4rem" };
  const cardStyle: React.CSSProperties = { background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"1.5rem",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)" };

  // --- HISTORY TABLE ---
  const filterBookings = () => {
    if (historyTab==="upcoming") return bookings.filter(b=>b.date>=today&&b.status!=="cancelled");
    if (historyTab==="past") return bookings.filter(b=>b.date<today&&b.status!=="cancelled");
    return bookings.filter(b=>b.status==="cancelled");
  };
  const filterRequests = () => {
    if (historyTab==="upcoming") return eventRequests.filter(r=>r.status!=="rejected"&&(r.event?.date||"9999")>=today);
    if (historyTab==="past") return eventRequests.filter(r=>r.status!=="rejected"&&(r.event?.date||"9999")<today);
    return eventRequests.filter(r=>r.status==="rejected");
  };

  const thStyle: React.CSSProperties = { padding:"0.6rem 0.8rem",fontSize:"0.72rem",fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"#94a3b8",textAlign:"left",borderBottom:"2px solid #f1f5f9",whiteSpace:"nowrap" };
  const tdStyle: React.CSSProperties = { padding:"0.75rem 0.8rem",fontSize:"0.83rem",color:"#475569",borderBottom:"1px solid #f8faff",verticalAlign:"middle" };

  // --- SECTION RENDERERS ---
  const renderPersonal = () => (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Personal Details</h2>
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>Manage your name and account info.</p>
      </div>
      <div style={cardStyle}>
        <div style={{display:"flex",alignItems:"center",gap:"1.2rem",marginBottom:"1.8rem",paddingBottom:"1.5rem",borderBottom:"1px solid #f1f5f9"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"#84CC16",flexShrink:0}}>{initials}</div>
          <div>
            <div style={{fontWeight:700,fontSize:"1.1rem",color:"#1e3a5f"}}>{displayName}</div>
            <div style={{fontSize:"0.85rem",color:"#64748b",marginTop:"0.2rem"}}>{user?.email}</div>
            <div style={{display:"flex",gap:"0.5rem",marginTop:"0.6rem",flexWrap:"wrap"}}>
              <span style={{fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"#f8faff",color:"#64748b",border:"1px solid #dbeafe"}}>🎓 Learner</span>
              {hasListings&&<span style={{fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"#EAF3DE",color:"#27500A",border:"1px solid #97C459"}}>📋 Lesson Provider</span>}
              {hasEvents&&<span style={{fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe"}}>⚽ Event Organiser</span>}
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
          <div style={{fontSize:"0.75rem",color:"#94a3b8",marginTop:"0.4rem"}}>Email cannot be changed.</div>
        </div>
        {(hasListings||hasEvents)&&(
          <div style={{background:"#EFF6FF",border:"1px solid #bfdbfe",borderRadius:10,padding:"0.9rem 1rem",marginBottom:"1.5rem",fontSize:"0.83rem",color:"#1e40af"}}>
            💼 You have a provider account. <span onClick={()=>router.push("/dashboard")} style={{fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Go to your Dashboard →</span>
          </div>
        )}
        <button onClick={handleSaveDetails} disabled={savingDetails}
          style={{padding:"0.75rem 2rem",background:savingDetails?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.9rem",cursor:"pointer",opacity:savingDetails?0.7:1}}>
          {savingDetails?"Saving...":"Save Changes"}
        </button>
      </div>
    </div>
  );

  const renderHistory = () => {
    const filteredBookings = filterBookings();
    const filteredRequests = filterRequests();
    const upcomingCount = bookings.filter(b=>b.date>=today&&b.status!=="cancelled").length + eventRequests.filter(r=>r.status!=="rejected"&&(r.event?.date||"9999")>=today).length;
    const pastCount = bookings.filter(b=>b.date<today&&b.status!=="cancelled").length + eventRequests.filter(r=>r.status!=="rejected"&&(r.event?.date||"9999")<today).length;
    const cancelledCount = bookings.filter(b=>b.status==="cancelled").length + eventRequests.filter(r=>r.status==="rejected").length;

    return (
      <div>
        <div style={{marginBottom:"1.5rem"}}>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Booking History</h2>
          <p style={{fontSize:"0.85rem",color:"#64748b"}}>Your lesson bookings and event requests.</p>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:"0",background:"white",borderRadius:12,border:"1px solid #dbeafe",padding:"0.35rem",marginBottom:"1.2rem",width:"fit-content"}}>
          {([["upcoming","📅 Upcoming",upcomingCount],["past","🕓 Past",pastCount],["cancelled","❌ Cancelled",cancelledCount]] as const).map(([tab,label,count])=>(
            <button key={tab} onClick={()=>setHistoryTab(tab)}
              style={{padding:"0.45rem 1.1rem",borderRadius:9,fontWeight:600,fontSize:"0.82rem",cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif",
                background:historyTab===tab?"#1e3a5f":"transparent",color:historyTab===tab?"#84CC16":"#64748b",
                display:"flex",alignItems:"center",gap:"0.4rem"}}>
              {label}
              <span style={{fontSize:"0.68rem",fontWeight:700,padding:"0.1rem 0.45rem",borderRadius:999,background:historyTab===tab?"rgba(132,204,22,0.2)":"#f1f5f9",color:historyTab===tab?"#84CC16":"#94a3b8"}}>{count}</span>
            </button>
          ))}
        </div>

        {loadingSection ? (
          <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
            <div style={{width:28,height:28,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
          </div>
        ) : (
          <>
            {/* LESSON BOOKINGS TABLE */}
            <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
              <div style={{padding:"1rem 1.2rem",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f"}}>📚 Lesson Bookings</div>
                <span style={{fontSize:"0.75rem",color:"#94a3b8"}}>{filteredBookings.length} record{filteredBookings.length!==1?"s":""}</span>
              </div>
              {filteredBookings.length === 0 ? (
                <div style={{padding:"2rem",textAlign:"center",color:"#94a3b8",fontSize:"0.85rem"}}>
                  {historyTab==="upcoming"?"No upcoming bookings.":`No ${historyTab} bookings.`}
                  {historyTab==="upcoming"&&<span onClick={()=>router.push("/")} style={{color:"#84CC16",cursor:"pointer",fontWeight:700,marginLeft:"0.4rem"}}>Browse lessons →</span>}
                </div>
              ) : (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead style={{background:"#f8faff"}}>
                      <tr>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Time</th>
                        <th style={thStyle}>Lesson</th>
                        <th style={thStyle}>Activity</th>
                        <th style={thStyle}>Booking</th>
                        <th style={thStyle}>Attendance</th>
                        <th style={thStyle}>Payment</th>
                        <th style={thStyle}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map(b=>(
                        <tr key={b.id} style={{transition:"background 0.15s"}}
                          onMouseEnter={e=>(e.currentTarget.style.background="#f8faff")}
                          onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                          <td style={{...tdStyle,fontWeight:600,color:"#1e3a5f",whiteSpace:"nowrap"}}>{fmtDate(b.date)}</td>
                          <td style={{...tdStyle,whiteSpace:"nowrap"}}>{fmt12(b.start_time)}</td>
                          <td style={{...tdStyle,maxWidth:200}}>
                            <div style={{fontWeight:600,color:"#1e3a5f",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.listing?.lesson_title||"Lesson"}</div>
                          </td>
                          <td style={tdStyle}>{b.listing?.activity_type||"—"}</td>
                          <td style={tdStyle}><Chip label={b.status} status={b.status}/></td>
                          <td style={tdStyle}>{b.attended==="yes"?<Chip label="Attended" status="yes"/>:b.attended==="no"?<Chip label="No-show" status="no"/>:<span style={{fontSize:"0.75rem",color:"#94a3b8"}}>Pending</span>}</td>
                          <td style={tdStyle}><Chip label={b.payment_status} status={b.payment_status}/></td>
                          <td style={{...tdStyle,whiteSpace:"nowrap"}}>
                            {b.listing_id&&<button onClick={()=>router.push(`/listings/${b.listing_id}`)} style={{fontSize:"0.72rem",color:"#84CC16",background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>View →</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* EVENT REQUESTS TABLE */}
            <div style={{...cardStyle,padding:0,overflow:"hidden",marginTop:"1rem"}}>
              <div style={{padding:"1rem 1.2rem",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f"}}>⚽ Event Requests</div>
                <span style={{fontSize:"0.75rem",color:"#94a3b8"}}>{filteredRequests.length} record{filteredRequests.length!==1?"s":""}</span>
              </div>
              {filteredRequests.length === 0 ? (
                <div style={{padding:"2rem",textAlign:"center",color:"#94a3b8",fontSize:"0.85rem"}}>
                  {historyTab==="upcoming"?"No upcoming event requests.":`No ${historyTab} event requests.`}
                  {historyTab==="upcoming"&&<span onClick={()=>router.push("/")} style={{color:"#84CC16",cursor:"pointer",fontWeight:700,marginLeft:"0.4rem"}}>Browse events →</span>}
                </div>
              ) : (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead style={{background:"#f8faff"}}>
                      <tr>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Event</th>
                        <th style={thStyle}>Sport</th>
                        <th style={thStyle}>Host</th>
                        <th style={thStyle}>Location</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map(r=>(
                        <tr key={r.id} style={{transition:"background 0.15s"}}
                          onMouseEnter={e=>(e.currentTarget.style.background="#f8faff")}
                          onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                          <td style={{...tdStyle,fontWeight:600,color:"#1e3a5f",whiteSpace:"nowrap"}}>{r.event?.date?fmtDate(r.event.date):"—"}</td>
                          <td style={{...tdStyle,maxWidth:200}}>
                            <div style={{fontWeight:600,color:"#1e3a5f",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.event?.title||"Event"}</div>
                          </td>
                          <td style={tdStyle}>{r.event?.sport||"—"}</td>
                          <td style={tdStyle}>{r.event?.host_name||"—"}</td>
                          <td style={{...tdStyle,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.event?.location||"—"}</td>
                          <td style={tdStyle}><Chip label={r.status} status={r.status}/></td>
                          <td style={{...tdStyle,whiteSpace:"nowrap"}}>
                            <button onClick={()=>router.push(`/events/${r.event_id}`)} style={{fontSize:"0.72rem",color:"#84CC16",background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>View →</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMessages = () => (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Messages</h2>
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>{conversations.length} conversation{conversations.length!==1?"s":""}</p>
      </div>
      {loadingSection ? <div style={{textAlign:"center",padding:"3rem"}}><div style={{width:28,height:28,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/></div>
      : conversations.length === 0 ? (
        <div style={{...cardStyle,textAlign:"center",padding:"3rem"}}>
          <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>💬</div>
          <div style={{fontWeight:700,color:"#1e3a5f",marginBottom:"0.4rem"}}>No messages yet</div>
          <button onClick={()=>router.push("/")} style={{padding:"0.6rem 1.5rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.85rem",cursor:"pointer",marginTop:"0.8rem"}}>Browse Lessons →</button>
        </div>
      ) : (
        <>
          {conversations.map(conv=>(
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
                  <div style={{fontSize:"0.72rem",color:"#94a3b8"}}>{fmtTime(conv.last_message_at)}</div>
                </div>
                <div style={{fontSize:"0.75rem",color:"#84CC16",fontWeight:600,marginBottom:"0.15rem"}}>{conv.listing?.activity_type} · {conv.listing?.lesson_title}</div>
                <div style={{fontSize:"0.8rem",color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{conv.last_message}</div>
              </div>
              {(conv.unread_count||0)>0&&<span style={{background:"#EF4444",color:"white",fontSize:"0.7rem",fontWeight:700,padding:"2px 7px",borderRadius:999}}>{conv.unread_count}</span>}
            </div>
          ))}
          <button onClick={()=>router.push("/messages")} style={{width:"100%",padding:"0.75rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:10,fontWeight:700,fontSize:"0.88rem",cursor:"pointer",marginTop:"0.5rem",fontFamily:"'DM Sans',sans-serif"}}>Open Full Messages →</button>
        </>
      )}
    </div>
  );

  const renderSettings = () => (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Account Settings</h2>
        <p style={{fontSize:"0.85rem",color:"#64748b"}}>Manage your password and account.</p>
      </div>
      <div style={cardStyle}>
        <div style={{fontWeight:700,fontSize:"1rem",color:"#1e3a5f",marginBottom:"0.3rem"}}>🔐 Change Password</div>
        <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.2rem"}}>Minimum 6 characters.</p>
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
        <div style={{fontWeight:700,fontSize:"1rem",color:"#dc2626",marginBottom:"0.3rem"}}>⚠️ Sign Out</div>
        <p style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"1.2rem"}}>Sign out of your account on this device.</p>
        <button onClick={async()=>{ await supabase.auth.signOut(); router.push("/"); }}
          style={{padding:"0.7rem 1.8rem",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:999,fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
          Sign Out
        </button>
      </div>
    </div>
  );

  const sectionMap: Record<string,React.ReactNode> = { personal:renderPersonal(), history:renderHistory(), messages:renderMessages(), settings:renderSettings() };
  const navTo = (id: string) => { setActiveSection(id); window.history.replaceState(null,"",`/profile?section=${id}`); };

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;font-family:'DM Sans',sans-serif;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
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
        .nav-item{display:flex;align-items:center;gap:0.7rem;padding:0.75rem 1rem;border-radius:10px;cursor:pointer;transition:all 0.15s;font-size:0.88rem;font-weight:500;color:#64748b;border:none;background:none;width:100%;text-align:left;font-family:'DM Sans',sans-serif;}
        .nav-item:hover{background:#f0f9ff;color:#1e3a5f;}
        .nav-item.active{background:#1e3a5f;color:#84CC16;font-weight:700;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 2rem",background:"white",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 8px rgba(30,58,95,0.06)",position:"sticky",top:0,zIndex:100}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f"}}>My Profile</div>
        <div style={{display:"flex",gap:"0.6rem"}}>
          {(hasListings||hasEvents)&&<button className="btn" onClick={()=>router.push("/dashboard")} style={{padding:"0.4rem 1rem",border:"1px solid #84CC16",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontSize:"0.82rem",fontWeight:700}}>📊 Dashboard</button>}
          <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.4rem 1rem",border:"1px solid #dbeafe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>← PlayUp</button>
        </div>
      </nav>

      <div style={{maxWidth:960,margin:"0 auto",padding:"2rem 1.5rem",display:"grid",gridTemplateColumns:"220px 1fr",gap:"1.5rem",alignItems:"start"}}>
        <div style={{position:"sticky",top:"5rem"}}>
          <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"1.2rem",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",color:"#84CC16",flexShrink:0}}>{initials}</div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:"#1e3a5f",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{displayName}</div>
                <div style={{fontSize:"0.72rem",color:"#94a3b8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.email}</div>
              </div>
            </div>
          </div>
          <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"0.5rem",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
            {SECTIONS.map(s=>(
              <button key={s.id} className={`nav-item ${activeSection===s.id?"active":""}`} onClick={()=>navTo(s.id)}>
                <span>{s.icon}</span><span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div key={activeSection} style={{animation:"fadeIn 0.25s ease"}}>
          {sectionMap[activeSection]}
        </div>
      </div>

      {toast&&<div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F0F7FF"}}><div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%"}}/></div>}>
      <ProfileInner/>
    </Suspense>
  );
}
