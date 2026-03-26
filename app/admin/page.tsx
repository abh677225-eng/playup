"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAILS = ["abh677225@gmail.com"];

type Listing = {
  id: string; user_id: string; provider_name: string; activity_type: string;
  lesson_title: string; description: string; photo_url: string; suburbs: string;
  price: number; session_duration: string; lesson_type: string;
  online_available: boolean; status: string; created_at: string;
};

type Event = {
  id: string; host_id: string; host_name: string; title: string; sport: string;
  description: string; location: string; suburb: string; postcode: string;
  date: string; time: string; duration: string; cost: string;
  spots_total: number; spots_filled: number; skill_level: string;
  age_group: string; status: string; created_at: string;
};

type Stats = {
  listings_total: number; listings_pending: number; listings_approved: number; listings_rejected: number;
  events_total: number; events_pending: number; events_approved: number;
  messages: number; conversations: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [section, setSection] = useState<"listings"|"events">("listings");
  const [activeTab, setActiveTab] = useState<"pending"|"approved"|"rejected"|"all">("pending");
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats>({ listings_total:0, listings_pending:0, listings_approved:0, listings_rejected:0, events_total:0, events_pending:0, events_approved:0, messages:0, conversations:0 });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string|null>(null);
  const [toast, setToast] = useState("");
  const [expandedId, setExpandedId] = useState<string|null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [listingsRes, eventsRes, messagesRes, conversationsRes] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.from("messages").select("id", { count: "exact" }),
      supabase.from("conversations").select("id", { count: "exact" }),
    ]);
    const allListings = listingsRes.data || [];
    const allEvents = eventsRes.data || [];
    setListings(allListings);
    setEvents(allEvents);
    setStats({
      listings_total: allListings.length,
      listings_pending: allListings.filter(l => l.status === "pending").length,
      listings_approved: allListings.filter(l => l.status === "approved").length,
      listings_rejected: allListings.filter(l => l.status === "rejected").length,
      events_total: allEvents.length,
      events_pending: allEvents.filter(e => e.status === "pending").length,
      events_approved: allEvents.filter(e => e.status === "approved").length,
      messages: messagesRes.count || 0,
      conversations: conversationsRes.count || 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email || "";
      setUserEmail(email);
      if (ADMIN_EMAILS.includes(email)) { setIsAdmin(true); loadData(); }
      setAuthChecked(true);
    });
  }, [loadData]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const updateListingStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) showToast("Error updating listing");
    else { showToast(status === "approved" ? "✅ Listing approved!" : status === "rejected" ? "❌ Listing rejected" : "↩️ Set to pending"); await loadData(); }
    setActionLoading(null);
  };

  const updateEventStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) showToast("Error updating event");
    else { showToast(status === "approved" ? "✅ Event approved!" : status === "rejected" ? "❌ Event rejected" : "↩️ Set to pending"); await loadData(); }
    setActionLoading(null);
  };

  const getSuburbs = (json: string) => { try { return JSON.parse(json); } catch { return []; } };
  const getDuration = (d: string) => ({"30":"30 min","45":"45 min","60":"1 hr","90":"1.5 hr","120":"2 hr"}[d] || d);
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-AU", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
  const statusColor = (s: string) => ({ pending:"#F97316", approved:"#84CC16", rejected:"#EF4444", cancelled:"#EF4444", closed:"#64748b" }[s] || "#64748b");
  const statusBg = (s: string) => ({ pending:"#FFF7ED", approved:"#EAF3DE", rejected:"#FEF2F2", cancelled:"#FEF2F2", closed:"#f8faff" }[s] || "#f8faff");
  const statusBorder = (s: string) => ({ pending:"#FED7AA", approved:"#97C459", rejected:"#FECACA", cancelled:"#FECACA", closed:"#dbeafe" }[s] || "#dbeafe");

  const filteredListings = listings.filter(l => activeTab === "all" ? true : l.status === activeTab);
  const filteredEvents = events.filter(e => activeTab === "all" ? true : e.status === activeTab);

  if (!authChecked) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;font-family:'DM Sans',sans-serif;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
    </>
  );

  if (authChecked && !userEmail) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"1rem",textAlign:"center",padding:"2rem"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,marginBottom:"0.5rem"}}><span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
        <div style={{fontSize:"1.5rem"}}>🔐</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",color:"#1e3a5f"}}>Login Required</div>
        <p style={{color:"#64748b",maxWidth:320}}>You need to be logged in with an admin account to access this page.</p>
        <button onClick={()=>router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Go to PlayUp & Log In</button>
      </div>
    </>
  );

  if (authChecked && userEmail && !isAdmin) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"1rem",textAlign:"center",padding:"2rem"}}>
        <div style={{fontSize:"3rem"}}>🚫</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",color:"#1e3a5f"}}>Access Denied</div>
        <p style={{color:"#64748b",maxWidth:320}}>Your account <strong>{userEmail}</strong> does not have admin access.</p>
        <button onClick={()=>router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to PlayUp</button>
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
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .listing-card{background:white;border-radius:16px;border:1px solid #dbeafe;overflow:hidden;margin-bottom:1rem;box-shadow:0 2px 8px rgba(30,58,95,0.06);transition:all 0.2s;}
        .listing-card:hover{box-shadow:0 4px 16px rgba(30,58,95,0.1);}
        .action-btn{padding:0.5rem 1.2rem;border-radius:999px;font-size:0.82rem;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;border:none;}
        .tab-btn{padding:0.7rem 1.4rem;font-size:0.88rem;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;background:none;border:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .section-btn{padding:0.6rem 1.4rem;font-size:0.88rem;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;border-radius:999px;transition:all 0.2s;}
      `}</style>

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 2.5rem",background:"white",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 8px rgba(30,58,95,0.06)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
          <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:2,cursor:"pointer"}}><span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
          <div style={{background:"#1e3a5f",color:"#84CC16",fontSize:"0.7rem",fontWeight:700,letterSpacing:1,padding:"0.2rem 0.7rem",borderRadius:999,textTransform:"uppercase"}}>Admin</div>
        </div>
        <div style={{fontSize:"0.82rem",color:"#64748b"}}>Logged in as <strong style={{color:"#1e3a5f"}}>{userEmail}</strong></div>
        <div style={{display:"flex",gap:"0.8rem",alignItems:"center"}}>
          <button className="btn" onClick={loadData} style={{padding:"0.4rem 1rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>↻ Refresh</button>
          <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.4rem 1rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>← PlayUp</button>
          <button className="btn" onClick={handleLogout} style={{padding:"0.4rem 1rem",border:"1px solid #fca5a5",borderRadius:999,background:"#fef2f2",color:"#dc2626",fontSize:"0.82rem",fontWeight:600}}>Log Out</button>
        </div>
      </nav>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"2rem"}}>

        {/* STATS */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"0.8rem",marginBottom:"2rem"}}>
          {[
            ["Listings",stats.listings_total,"#1e3a5f"],
            ["Listings Pending",stats.listings_pending,"#F97316"],
            ["Events Pending",stats.events_pending,"#F97316"],
            ["Messages",stats.messages,"#3B82F6"],
            ["Conversations",stats.conversations,"#8B5CF6"],
          ].map(([label,value,color])=>(
            <div key={label as string} style={{background:"white",borderRadius:12,padding:"1rem",border:"1px solid #dbeafe",textAlign:"center",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",color:color as string,letterSpacing:1,lineHeight:1}}>{value as number}</div>
              <div style={{fontSize:"0.7rem",color:"#64748b",marginTop:"0.3rem",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label as string}</div>
            </div>
          ))}
        </div>

        {/* SECTION SWITCHER */}
        <div style={{display:"flex",gap:"0.8rem",marginBottom:"1.5rem"}}>
          <button className="section-btn" onClick={()=>{setSection("listings");setActiveTab("pending");setExpandedId(null);}}
            style={{background:section==="listings"?"#1e3a5f":"white",color:section==="listings"?"#84CC16":"#64748b",border:`1px solid ${section==="listings"?"#1e3a5f":"#dbeafe"}`}}>
            📋 Listings {stats.listings_pending > 0 && <span style={{background:"#EF4444",color:"white",fontSize:"0.7rem",fontWeight:700,padding:"1px 6px",borderRadius:999,marginLeft:4}}>{stats.listings_pending}</span>}
          </button>
          <button className="section-btn" onClick={()=>{setSection("events");setActiveTab("pending");setExpandedId(null);}}
            style={{background:section==="events"?"#1e3a5f":"white",color:section==="events"?"#84CC16":"#64748b",border:`1px solid ${section==="events"?"#1e3a5f":"#dbeafe"}`}}>
            ⚽ Events {stats.events_pending > 0 && <span style={{background:"#EF4444",color:"white",fontSize:"0.7rem",fontWeight:700,padding:"1px 6px",borderRadius:999,marginLeft:4}}>{stats.events_pending}</span>}
          </button>
        </div>

        {/* LISTINGS SECTION */}
        {section === "listings" && (
          <div style={{background:"white",borderRadius:16,border:"1px solid #dbeafe",overflow:"hidden",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
            <div style={{display:"flex",borderBottom:"1px solid #dbeafe",padding:"0 1rem"}}>
              {([["pending","⏳ Pending",stats.listings_pending],["approved","✅ Approved",stats.listings_approved],["rejected","❌ Rejected",stats.listings_rejected],["all","📋 All",stats.listings_total]] as const).map(([tab,label,count])=>(
                <button key={tab} className="tab-btn" onClick={()=>setActiveTab(tab as any)}
                  style={{color:activeTab===tab?"#1e3a5f":"#64748b",borderBottomColor:activeTab===tab?"#84CC16":"transparent"}}>
                  {label} <span style={{marginLeft:4,background:activeTab===tab?"#EAF3DE":"#f1f5f9",color:activeTab===tab?"#27500A":"#94a3b8",fontSize:"0.72rem",fontWeight:700,padding:"1px 7px",borderRadius:999}}>{count}</span>
                </button>
              ))}
            </div>
            <div style={{padding:"1.2rem"}}>
              {loading ? (
                <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
                  <div style={{width:32,height:32,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 1rem"}}/>Loading...
                </div>
              ) : filteredListings.length === 0 ? (
                <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
                  <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>📭</div>
                  <div style={{fontSize:"1rem",fontWeight:600,color:"#1e3a5f",marginBottom:"0.3rem"}}>No {activeTab==="all"?"":activeTab} listings</div>
                </div>
              ) : filteredListings.map(listing => {
                const suburbs = getSuburbs(listing.suburbs);
                const isExpanded = expandedId === listing.id;
                const isActioning = actionLoading === listing.id;
                return (
                  <div key={listing.id} className="listing-card">
                    <div style={{padding:"1.2rem",display:"flex",alignItems:"flex-start",gap:"1rem",cursor:"pointer"}} onClick={()=>setExpandedId(isExpanded?null:listing.id)}>
                      {listing.photo_url ? (
                        <img src={listing.photo_url} alt="" style={{width:56,height:56,borderRadius:10,objectFit:"cover",border:"1px solid #dbeafe",flexShrink:0}}/>
                      ) : (
                        <div style={{width:56,height:56,borderRadius:10,background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",flexShrink:0}}>
                          {{"Tennis":"🎾","Piano":"🎹","Swimming":"🏊","Yoga":"🧘","Guitar":"🎸","Martial Arts":"🥋"}[listing.activity_type]||"📚"}
                        </div>
                      )}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:"0.95rem",color:"#1e3a5f"}}>{listing.lesson_title}</span>
                          <span style={{fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:statusBg(listing.status),color:statusColor(listing.status),border:`1px solid ${statusBorder(listing.status)}`}}>{listing.status.toUpperCase()}</span>
                        </div>
                        <div style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"0.3rem"}}>
                          <strong style={{color:"#1e3a5f"}}>{listing.provider_name}</strong> · {listing.activity_type} · ${listing.price}/session · {getDuration(listing.session_duration)} · {listing.lesson_type}
                        </div>
                        <div style={{fontSize:"0.78rem",color:"#94a3b8"}}>📍 {suburbs.slice(0,3).map((s:any)=>s.name).join(", ")}{suburbs.length>3?` +${suburbs.length-3} more`:""} · {formatDate(listing.created_at)}</div>
                      </div>
                      <div style={{fontSize:"0.8rem",color:"#94a3b8",flexShrink:0}}>{isExpanded?"▲":"▼"}</div>
                    </div>
                    {isExpanded && (
                      <div style={{borderTop:"1px solid #f1f5f9",padding:"1.2rem",background:"#f8faff"}}>
                        {listing.description && (
                          <div style={{marginBottom:"1rem"}}>
                            <div style={{fontSize:"0.72rem",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:0.8,marginBottom:"0.4rem"}}>Description</div>
                            <p style={{fontSize:"0.88rem",color:"#475569",lineHeight:1.7,background:"white",padding:"0.8rem",borderRadius:8,border:"1px solid #dbeafe"}}>{listing.description}</p>
                          </div>
                        )}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.8rem",marginBottom:"1rem"}}>
                          {[["Activity",listing.activity_type],["Price",`$${listing.price}/session`],["Duration",getDuration(listing.session_duration)],["Type",listing.lesson_type],["Online",listing.online_available?"Yes":"No"],["Suburbs",`${suburbs.length} suburb${suburbs.length===1?"":"s"}`]].map(([label,value])=>(
                            <div key={label} style={{background:"white",borderRadius:8,padding:"0.7rem",border:"1px solid #dbeafe"}}>
                              <div style={{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase",letterSpacing:0.8,fontWeight:700,marginBottom:"0.2rem"}}>{label}</div>
                              <div style={{fontSize:"0.88rem",fontWeight:600,color:"#1e3a5f"}}>{value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{fontSize:"0.7rem",color:"#94a3b8",marginBottom:"1rem"}}>ID: {listing.id}</div>
                        <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
                          {listing.status!=="approved" && <button className="action-btn" onClick={()=>updateListingStatus(listing.id,"approved")} disabled={!!isActioning} style={{background:"#84CC16",color:"#1e3a5f",opacity:isActioning?0.6:1}}>{isActioning?"...":"✅ Approve"}</button>}
                          {listing.status!=="rejected" && <button className="action-btn" onClick={()=>updateListingStatus(listing.id,"rejected")} disabled={!!isActioning} style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",opacity:isActioning?0.6:1}}>{isActioning?"...":"❌ Reject"}</button>}
                          {listing.status!=="pending" && <button className="action-btn" onClick={()=>updateListingStatus(listing.id,"pending")} disabled={!!isActioning} style={{background:"#FFF7ED",color:"#F97316",border:"1px solid #FED7AA",opacity:isActioning?0.6:1}}>{isActioning?"...":"↩️ Set Pending"}</button>}
                          <button className="action-btn" onClick={()=>window.open(`/listings/${listing.id}`,"_blank")} style={{background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe"}}>👁️ View Live</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EVENTS SECTION */}
        {section === "events" && (
          <div style={{background:"white",borderRadius:16,border:"1px solid #dbeafe",overflow:"hidden",boxShadow:"0 2px 8px rgba(30,58,95,0.06)"}}>
            <div style={{display:"flex",borderBottom:"1px solid #dbeafe",padding:"0 1rem"}}>
              {([["pending","⏳ Pending",stats.events_pending],["approved","✅ Approved",stats.events_approved],["all","📋 All",stats.events_total]] as const).map(([tab,label,count])=>(
                <button key={tab} className="tab-btn" onClick={()=>setActiveTab(tab as any)}
                  style={{color:activeTab===tab?"#1e3a5f":"#64748b",borderBottomColor:activeTab===tab?"#84CC16":"transparent"}}>
                  {label} <span style={{marginLeft:4,background:activeTab===tab?"#EAF3DE":"#f1f5f9",color:activeTab===tab?"#27500A":"#94a3b8",fontSize:"0.72rem",fontWeight:700,padding:"1px 7px",borderRadius:999}}>{count}</span>
                </button>
              ))}
            </div>
            <div style={{padding:"1.2rem"}}>
              {loading ? (
                <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
                  <div style={{width:32,height:32,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 1rem"}}/>Loading...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>
                  <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>📭</div>
                  <div style={{fontSize:"1rem",fontWeight:600,color:"#1e3a5f",marginBottom:"0.3rem"}}>No {activeTab==="all"?"":activeTab} events</div>
                </div>
              ) : filteredEvents.map(event => {
                const isExpanded = expandedId === event.id;
                const isActioning = actionLoading === event.id;
                return (
                  <div key={event.id} className="listing-card">
                    <div style={{padding:"1.2rem",display:"flex",alignItems:"flex-start",gap:"1rem",cursor:"pointer"}} onClick={()=>setExpandedId(isExpanded?null:event.id)}>
                      <div style={{width:56,height:56,borderRadius:10,background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",flexShrink:0}}>⚽</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:"0.95rem",color:"#1e3a5f"}}>{event.title}</span>
                          <span style={{fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:999,background:statusBg(event.status),color:statusColor(event.status),border:`1px solid ${statusBorder(event.status)}`}}>{event.status.toUpperCase()}</span>
                        </div>
                        <div style={{fontSize:"0.82rem",color:"#64748b",marginBottom:"0.3rem"}}>
                          <strong style={{color:"#1e3a5f"}}>{event.host_name}</strong> · {event.sport} · {event.suburb} · {event.date} at {event.time}
                        </div>
                        <div style={{fontSize:"0.78rem",color:"#94a3b8"}}>👥 {event.spots_filled}/{event.spots_total} spots · {event.cost} · {formatDate(event.created_at)}</div>
                      </div>
                      <div style={{fontSize:"0.8rem",color:"#94a3b8",flexShrink:0}}>{isExpanded?"▲":"▼"}</div>
                    </div>
                    {isExpanded && (
                      <div style={{borderTop:"1px solid #f1f5f9",padding:"1.2rem",background:"#f8faff"}}>
                        {event.description && (
                          <div style={{marginBottom:"1rem"}}>
                            <div style={{fontSize:"0.72rem",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:0.8,marginBottom:"0.4rem"}}>Description</div>
                            <p style={{fontSize:"0.88rem",color:"#475569",lineHeight:1.7,background:"white",padding:"0.8rem",borderRadius:8,border:"1px solid #dbeafe"}}>{event.description}</p>
                          </div>
                        )}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.8rem",marginBottom:"1rem"}}>
                          {[["Sport",event.sport],["Location",event.location],["Date",event.date],["Time",event.time],["Duration",event.duration],["Cost",event.cost],["Spots",`${event.spots_filled}/${event.spots_total}`],["Skill",event.skill_level],["Age",event.age_group]].map(([label,value])=>(
                            <div key={label} style={{background:"white",borderRadius:8,padding:"0.7rem",border:"1px solid #dbeafe"}}>
                              <div style={{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase",letterSpacing:0.8,fontWeight:700,marginBottom:"0.2rem"}}>{label}</div>
                              <div style={{fontSize:"0.88rem",fontWeight:600,color:"#1e3a5f"}}>{value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{fontSize:"0.7rem",color:"#94a3b8",marginBottom:"1rem"}}>ID: {event.id}</div>
                        <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
                          {event.status!=="approved" && <button className="action-btn" onClick={()=>updateEventStatus(event.id,"approved")} disabled={!!isActioning} style={{background:"#84CC16",color:"#1e3a5f",opacity:isActioning?0.6:1}}>{isActioning?"...":"✅ Approve"}</button>}
                          {event.status!=="rejected" && <button className="action-btn" onClick={()=>updateEventStatus(event.id,"rejected")} disabled={!!isActioning} style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",opacity:isActioning?0.6:1}}>{isActioning?"...":"❌ Reject"}</button>}
                          {event.status!=="pending" && <button className="action-btn" onClick={()=>updateEventStatus(event.id,"pending")} disabled={!!isActioning} style={{background:"#FFF7ED",color:"#F97316",border:"1px solid #FED7AA",opacity:isActioning?0.6:1}}>{isActioning?"...":"↩️ Set Pending"}</button>}
                          <button className="action-btn" onClick={()=>window.open(`/events/${event.id}`,"_blank")} style={{background:"#EFF6FF",color:"#1e40af",border:"1px solid #bfdbfe"}}>👁️ View Live</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {toast && <div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,animation:"slideUp 0.3s ease",border:"2px solid #84CC16"}}>{toast}</div>}
    </>
  );
}
