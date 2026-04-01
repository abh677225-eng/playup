"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type User = { id: string; email: string } | null;
type Booking = {
  id: string; listing_id: string; student_id: string; student_name: string;
  student_email: string; date: string; start_time: string; end_time: string;
  status: string; attended: string; payment_status: string;
  payment_amount?: number; notes?: string; created_at: string;
  listing?: { lesson_title: string; activity_type: string; price: number };
};

const fmt12 = (t: string) => { const [h,m] = t.split(":"); const hour=parseInt(h); return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`; };
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-AU", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
const fmtDateShort = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-AU", { weekday:"short", day:"numeric", month:"short" });

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [viewMode, setViewMode] = useState<"daily"|"weekly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [savingId, setSavingId] = useState<string|null>(null);
  const [editingNotes, setEditingNotes] = useState<string|null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState<"all"|"today"|"unpaid">("today");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      setUser({ id: session.user.id, email: session.user.email! });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.push("/");
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("bookings").select("*")
      .eq("provider_id", user.id)
      .neq("status", "cancelled")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    if (data) {
      const enriched = await Promise.all(data.map(async b => {
        const { data: listing } = await supabase.from("listings").select("lesson_title,activity_type,price").eq("id", b.listing_id).single();
        return { ...b, listing: listing || undefined };
      }));
      setBookings(enriched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) loadBookings(); }, [user, loadBookings]);

  // Quick toggle attended
  const toggleAttended = async (booking: Booking) => {
    const next = booking.attended === "yes" ? "no" : booking.attended === "no" ? "pending" : "yes";
    setSavingId(booking.id);
    await supabase.from("bookings").update({ attended: next }).eq("id", booking.id);
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, attended: next } : b));
    setSavingId(null);
    showToast(next === "yes" ? "✅ Marked attended" : next === "no" ? "⚠️ Marked no-show" : "↩️ Reset to pending");
  };

  // Quick toggle payment
  const togglePayment = async (booking: Booking) => {
    const next = booking.payment_status === "paid" ? "unpaid" : "paid";
    setSavingId(booking.id);
    await supabase.from("bookings").update({ payment_status: next }).eq("id", booking.id);
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, payment_status: next } : b));
    setSavingId(null);
    showToast(next === "paid" ? "💰 Marked paid" : "↩️ Marked unpaid");
  };

  // Save notes
  const saveNotes = async (bookingId: string) => {
    setSavingId(bookingId);
    await supabase.from("bookings").update({ notes: notesValue }).eq("id", bookingId);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, notes: notesValue } : b));
    setSavingId(null);
    setEditingNotes(null);
    showToast("📝 Notes saved");
  };

  // Bulk mark all as attended for a date
  const bulkMarkAttended = async (dateBookings: Booking[]) => {
    const toMark = dateBookings.filter(b => b.attended !== "yes");
    if (toMark.length === 0) { showToast("All already marked attended"); return; }
    setSavingId("bulk");
    await Promise.all(toMark.map(b => supabase.from("bookings").update({ attended: "yes" }).eq("id", b.id)));
    setBookings(prev => prev.map(b => toMark.find(t => t.id === b.id) ? { ...b, attended: "yes" } : b));
    setSavingId(null);
    showToast(`✅ ${toMark.length} student${toMark.length===1?"":"s"} marked attended`);
  };

  const today = new Date().toISOString().split("T")[0];

  // Get week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // Filter bookings
  const getFilteredBookings = () => {
    if (filter === "today") return bookings.filter(b => b.date === today);
    if (filter === "unpaid") return bookings.filter(b => b.payment_status === "unpaid");
    return bookings;
  };

  // Get bookings for a specific date
  const getDateBookings = (date: string) => bookings.filter(b => b.date === date);

  // Stats
  const todayBookings = bookings.filter(b => b.date === today);
  const unpaidCount = bookings.filter(b => b.payment_status === "unpaid" && b.date <= today).length;
  const thisWeekBookings = bookings.filter(b => weekDays.includes(b.date));
  const attendedCount = bookings.filter(b => b.attended === "yes").length;

  const attendedColor = (a: string) => a === "yes" ? "#84CC16" : a === "no" ? "#F97316" : "#94a3b8";
  const attendedBg = (a: string) => a === "yes" ? "#EAF3DE" : a === "no" ? "#FFF7ED" : "#f8faff";
  const attendedBorder = (a: string) => a === "yes" ? "#97C459" : a === "no" ? "#FED7AA" : "#dbeafe";
  const attendedLabel = (a: string) => a === "yes" ? "✅ Attended" : a === "no" ? "⚠️ No-show" : "⏳ Pending";

  const BookingRow = ({ booking }: { booking: Booking }) => {
    const isSaving = savingId === booking.id;
    const isEditingThisNote = editingNotes === booking.id;
    return (
      <div style={{background:"white",borderRadius:12,border:"1px solid #dbeafe",padding:"1rem 1.2rem",marginBottom:"0.6rem",borderLeft:`4px solid ${attendedColor(booking.attended)}`}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.8rem",flexWrap:"wrap"}}>
          {/* Student + time */}
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontWeight:700,fontSize:"0.92rem",color:"#1e3a5f"}}>{booking.student_name}</div>
            <div style={{fontSize:"0.75rem",color:"#64748b",marginTop:"0.15rem"}}>
              {fmt12(booking.start_time)} – {fmt12(booking.end_time)} · {booking.listing?.lesson_title||"Lesson"}
            </div>
            {booking.notes && !isEditingThisNote && (
              <div style={{fontSize:"0.72rem",color:"#94a3b8",marginTop:"0.2rem",fontStyle:"italic"}}>📝 {booking.notes}</div>
            )}
          </div>

          {/* Quick action buttons */}
          <div style={{display:"flex",gap:"0.4rem",alignItems:"center",flexWrap:"wrap"}}>
            {/* Attended toggle */}
            <button onClick={()=>toggleAttended(booking)} disabled={isSaving}
              style={{padding:"0.4rem 0.8rem",borderRadius:999,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",border:`1px solid ${attendedBorder(booking.attended)}`,background:attendedBg(booking.attended),color:attendedColor(booking.attended),opacity:isSaving?0.6:1,transition:"all 0.15s"}}>
              {isSaving?"...":attendedLabel(booking.attended)}
            </button>

            {/* Payment toggle */}
            <button onClick={()=>togglePayment(booking)} disabled={isSaving}
              style={{padding:"0.4rem 0.8rem",borderRadius:999,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",
                border:`1px solid ${booking.payment_status==="paid"?"#97C459":"#FED7AA"}`,
                background:booking.payment_status==="paid"?"#EAF3DE":"#FFF7ED",
                color:booking.payment_status==="paid"?"#27500A":"#F97316",
                opacity:isSaving?0.6:1,transition:"all 0.15s"}}>
              {isSaving?"...":booking.payment_status==="paid"?"💰 Paid":"💳 Unpaid"}
            </button>

            {/* Notes button */}
            <button onClick={()=>{ setEditingNotes(isEditingThisNote?null:booking.id); setNotesValue(booking.notes||""); }}
              style={{padding:"0.4rem 0.7rem",borderRadius:999,fontSize:"0.75rem",fontWeight:600,cursor:"pointer",border:"1px solid #dbeafe",background:isEditingThisNote?"#1e3a5f":"white",color:isEditingThisNote?"#84CC16":"#64748b"}}>
              📝
            </button>
          </div>
        </div>

        {/* Inline notes editor */}
        {isEditingThisNote && (
          <div style={{marginTop:"0.7rem",display:"flex",gap:"0.5rem",alignItems:"center"}}>
            <input value={notesValue} onChange={e=>setNotesValue(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&saveNotes(booking.id)}
              placeholder="Add session notes..." autoFocus
              style={{flex:1,background:"#f8faff",border:"1px solid #84CC16",borderRadius:8,padding:"0.5rem 0.8rem",fontSize:"0.82rem",color:"#1e3a5f",outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
            <button onClick={()=>saveNotes(booking.id)} disabled={savingId===booking.id}
              style={{padding:"0.45rem 0.9rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:8,fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>
              Save
            </button>
            <button onClick={()=>setEditingNotes(null)}
              style={{padding:"0.45rem 0.7rem",background:"white",color:"#64748b",border:"1px solid #dbeafe",borderRadius:8,fontSize:"0.78rem",cursor:"pointer"}}>
              ✕
            </button>
          </div>
        )}
      </div>
    );
  };

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
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 2rem",background:"white",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 8px rgba(30,58,95,0.06)",position:"sticky",top:0,zIndex:100}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f"}}>Attendance Manager</div>
        <div style={{display:"flex",gap:"0.6rem"}}>
          <button className="btn" onClick={()=>router.push("/profile?section=calendar")} style={{padding:"0.4rem 1rem",border:"1px solid #dbeafe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>📅 Calendar</button>
          <button className="btn" onClick={()=>router.push("/profile")} style={{padding:"0.4rem 1rem",border:"1px solid #dbeafe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>← Profile</button>
        </div>
      </nav>

      <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem"}}>

        {/* STATS BAR */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.8rem",marginBottom:"1.5rem"}}>
          {[
            ["Today","📅",todayBookings.length,"sessions"],
            ["This Week","🗓",thisWeekBookings.length,"sessions"],
            ["Unpaid","💳",unpaidCount,"sessions"],
            ["Attended","✅",attendedCount,"total"],
          ].map(([label,icon,val,unit])=>(
            <div key={label as string} style={{background:"white",borderRadius:12,padding:"1rem",border:"1px solid #dbeafe",textAlign:"center",boxShadow:"0 2px 8px rgba(30,58,95,0.05)"}}>
              <div style={{fontSize:"1.2rem",marginBottom:"0.2rem"}}>{icon}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"#1e3a5f",letterSpacing:1,lineHeight:1}}>{val}</div>
              <div style={{fontSize:"0.7rem",color:"#64748b",marginTop:"0.2rem"}}>{label} · {unit}</div>
            </div>
          ))}
        </div>

        {/* VIEW TOGGLE + FILTER */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.2rem",flexWrap:"wrap",gap:"0.8rem"}}>
          {/* View mode */}
          <div style={{display:"flex",background:"white",border:"1px solid #dbeafe",borderRadius:10,padding:"0.3rem",gap:"0.3rem"}}>
            {(["daily","weekly"] as const).map(v=>(
              <button key={v} onClick={()=>setViewMode(v)}
                style={{padding:"0.45rem 1.1rem",borderRadius:8,fontWeight:600,fontSize:"0.82rem",cursor:"pointer",border:"none",
                  background:viewMode===v?"#1e3a5f":"transparent",color:viewMode===v?"#84CC16":"#64748b",fontFamily:"'DM Sans',sans-serif"}}>
                {v==="daily"?"📅 Daily":"🗓 Weekly"}
              </button>
            ))}
          </div>

          {/* Quick filter */}
          <div style={{display:"flex",gap:"0.4rem"}}>
            {(["today","unpaid","all"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:"0.4rem 0.9rem",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                  border:`1px solid ${filter===f?"#84CC16":"#dbeafe"}`,background:filter===f?"#EAF3DE":"white",color:filter===f?"#27500A":"#64748b"}}>
                {f==="today"?"📅 Today":f==="unpaid"?"💳 Unpaid":"📋 All"}
              </button>
            ))}
          </div>
        </div>

        {/* ── DAILY VIEW ── */}
        {viewMode === "daily" && (
          <div style={{animation:"fadeIn 0.2s ease"}}>
            {/* Date nav */}
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.2rem",background:"white",borderRadius:12,padding:"0.8rem 1rem",border:"1px solid #dbeafe"}}>
              <button onClick={()=>{ const d=new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split("T")[0]); }}
                style={{padding:"0.4rem 0.8rem",background:"#f8faff",border:"1px solid #dbeafe",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:"0.85rem",color:"#1e3a5f",fontFamily:"'DM Sans',sans-serif"}}>←</button>
              <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
                style={{flex:1,border:"none",background:"transparent",textAlign:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:"#1e3a5f",cursor:"pointer",outline:"none"}}/>
              <button onClick={()=>{ const d=new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split("T")[0]); }}
                style={{padding:"0.4rem 0.8rem",background:"#f8faff",border:"1px solid #dbeafe",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:"0.85rem",color:"#1e3a5f",fontFamily:"'DM Sans',sans-serif"}}>→</button>
              <button onClick={()=>setSelectedDate(today)}
                style={{padding:"0.4rem 0.8rem",background:"#EAF3DE",border:"1px solid #97C459",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:"0.78rem",color:"#27500A",fontFamily:"'DM Sans',sans-serif"}}>Today</button>
            </div>

            {/* Day label */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.8rem"}}>
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:1,color:"#1e3a5f"}}>{fmtDate(selectedDate)}</div>
                <div style={{fontSize:"0.82rem",color:"#64748b"}}>{getDateBookings(selectedDate).length} session{getDateBookings(selectedDate).length!==1?"s":""}</div>
              </div>
              {getDateBookings(selectedDate).length > 0 && (
                <button onClick={()=>bulkMarkAttended(getDateBookings(selectedDate))} disabled={savingId==="bulk"}
                  style={{padding:"0.5rem 1rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.8rem",cursor:"pointer",opacity:savingId==="bulk"?0.6:1,fontFamily:"'DM Sans',sans-serif"}}>
                  {savingId==="bulk"?"Saving...":"✅ Mark All Attended"}
                </button>
              )}
            </div>

            {getDateBookings(selectedDate).length === 0 ? (
              <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"3rem",textAlign:"center",color:"#64748b"}}>
                <div style={{fontSize:"2rem",marginBottom:"0.8rem"}}>📅</div>
                <div style={{fontWeight:600,color:"#1e3a5f",marginBottom:"0.3rem"}}>No sessions on this day</div>
                <div style={{fontSize:"0.85rem"}}>Navigate to another date or add bookings from the calendar.</div>
              </div>
            ) : (
              getDateBookings(selectedDate).map(b => <BookingRow key={b.id} booking={b}/>)
            )}
          </div>
        )}

        {/* ── WEEKLY VIEW ── */}
        {viewMode === "weekly" && (
          <div style={{animation:"fadeIn 0.2s ease"}}>
            {/* Week nav */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.2rem",background:"white",borderRadius:12,padding:"0.8rem 1.2rem",border:"1px solid #dbeafe"}}>
              <button onClick={()=>{ const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); }}
                style={{padding:"0.4rem 0.9rem",background:"#f8faff",border:"1px solid #dbeafe",borderRadius:999,cursor:"pointer",fontWeight:600,fontSize:"0.85rem",color:"#1e3a5f",fontFamily:"'DM Sans',sans-serif"}}>← Prev</button>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:1,color:"#1e3a5f"}}>
                {fmtDateShort(weekDays[0])} – {fmtDateShort(weekDays[6])}
              </div>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <button onClick={()=>setWeekStart(getMonday(new Date()))}
                  style={{padding:"0.4rem 0.8rem",background:"#EAF3DE",border:"1px solid #97C459",borderRadius:999,cursor:"pointer",fontWeight:700,fontSize:"0.78rem",color:"#27500A",fontFamily:"'DM Sans',sans-serif"}}>This Week</button>
                <button onClick={()=>{ const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); }}
                  style={{padding:"0.4rem 0.9rem",background:"#f8faff",border:"1px solid #dbeafe",borderRadius:999,cursor:"pointer",fontWeight:600,fontSize:"0.85rem",color:"#1e3a5f",fontFamily:"'DM Sans',sans-serif"}}>Next →</button>
              </div>
            </div>

            {weekDays.map(date => {
              const dayBookings = getDateBookings(date);
              const isToday = date === today;
              return (
                <div key={date} style={{marginBottom:"1.2rem"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:0.5,color:isToday?"#84CC16":"#1e3a5f"}}>
                        {fmtDateShort(date)}
                        {isToday && <span style={{marginLeft:"0.5rem",fontSize:"0.65rem",fontWeight:700,padding:"0.15rem 0.5rem",borderRadius:999,background:"#84CC16",color:"#1e3a5f",fontFamily:"'DM Sans',sans-serif"}}>TODAY</span>}
                      </div>
                      <span style={{fontSize:"0.75rem",color:"#94a3b8"}}>{dayBookings.length} session{dayBookings.length!==1?"s":""}</span>
                    </div>
                    {dayBookings.length > 0 && (
                      <button onClick={()=>bulkMarkAttended(dayBookings)} disabled={savingId==="bulk"}
                        style={{padding:"0.35rem 0.8rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.72rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",opacity:savingId==="bulk"?0.6:1}}>
                        ✅ All Attended
                      </button>
                    )}
                  </div>
                  {dayBookings.length === 0 ? (
                    <div style={{background:"white",borderRadius:10,border:"1px dashed #e2e8f0",padding:"0.8rem 1rem",fontSize:"0.8rem",color:"#94a3b8",textAlign:"center"}}>No sessions</div>
                  ) : (
                    dayBookings.map(b => <BookingRow key={b.id} booking={b}/>)
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick filter view (today/unpaid/all) - shown only in non-daily/weekly browse mode */}
        {filter !== "today" && viewMode === "daily" && (
          <div style={{marginTop:"1.5rem"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.8rem"}}>
              {filter==="unpaid"?"💳 All Unpaid Sessions":"📋 All Bookings"}
            </div>
            {getFilteredBookings().length === 0 ? (
              <div style={{background:"white",borderRadius:14,border:"1px solid #dbeafe",padding:"2rem",textAlign:"center",color:"#64748b",fontSize:"0.85rem"}}>
                {filter==="unpaid"?"No unpaid sessions — all caught up! 🎉":"No bookings yet."}
              </div>
            ) : getFilteredBookings().map(b => (
              <div key={b.id}>
                <div style={{fontSize:"0.75rem",color:"#94a3b8",fontWeight:600,marginBottom:"0.3rem",marginTop:"0.6rem"}}>{fmtDateShort(b.date)}</div>
                <BookingRow booking={b}/>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div style={{position:"fixed",bottom:"2rem",right:"2rem",background:"#1e3a5f",color:"white",padding:"0.8rem 1.5rem",borderRadius:12,fontWeight:700,fontSize:"0.9rem",zIndex:2000,border:"2px solid #84CC16",animation:"fadeIn 0.2s ease"}}>
          {toast}
        </div>
      )}
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
