export const dynamic = "force-dynamic";
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type User = { id: string; email: string } | null;
type Conversation = {
  id: string;
  listing_id: string;
  seeker_id: string;
  provider_id: string;
  last_message: string;
  last_message_at: string;
  listing?: { lesson_title: string; activity_type: string; provider_name: string };
  other_party?: { email: string };
  unread_count?: number;
};
type Message = {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read: boolean;
};

export default function Messages() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      setUser({ id: session.user.id, email: session.user.email! });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { router.push("/"); return; }
      setUser({ id: session.user.id, email: session.user.email! });
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const enriched = await Promise.all(data.map(async (conv) => {
      const { data: listing } = await supabase.from("listings").select("lesson_title,activity_type,provider_name").eq("id", conv.listing_id).single();
      const otherId = conv.seeker_id === user.id ? conv.provider_id : conv.seeker_id;
      const { count } = await supabase.from("messages").select("id", { count: "exact" }).eq("listing_id", conv.listing_id).eq("receiver_id", user.id).eq("read", false);
      return { ...conv, listing: listing || undefined, unread_count: count || 0 };
    }));

    setConversations(enriched);
    setLoading(false);

    const convId = searchParams.get("conv");
    if (convId) {
      const target = enriched.find(c => c.id === convId);
      if (target) selectConversation(target);
    }
  }, [user, searchParams]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setLoadingMessages(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("listing_id", conv.listing_id)
      .or(`sender_id.eq.${conv.seeker_id},sender_id.eq.${conv.provider_id}`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoadingMessages(false);
    // Mark as read
    if (user) {
      await supabase.from("messages").update({ read: true }).eq("listing_id", conv.listing_id).eq("receiver_id", user.id).eq("read", false);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedConv || sending) return;
    setSending(true);
    const receiverId = selectedConv.seeker_id === user.id ? selectedConv.provider_id : selectedConv.seeker_id;
    const { data, error } = await supabase.from("messages").insert({
      listing_id: selectedConv.listing_id,
      sender_id: user.id,
      receiver_id: receiverId,
      message: newMessage.trim(),
      read: false,
    }).select().single();
    if (!error && data) {
      setMessages(prev => [...prev, data]);
      await supabase.from("conversations").update({ last_message: newMessage.trim(), last_message_at: new Date().toISOString() }).eq("id", selectedConv.id);
    }
    setNewMessage("");
    setSending(false);
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString("en-AU", { hour:"2-digit", minute:"2-digit" });
    return date.toLocaleDateString("en-AU", { day:"numeric", month:"short" });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const inputStyle: React.CSSProperties = { background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:999, padding:"0.6rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif", flex:1 };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;height:100vh;overflow:hidden;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        .conv-item{padding:12px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background 0.15s;display:flex;align-items:flex-start;gap:10px;}
        .conv-item:hover{background:#f8faff;}
        .conv-item.active{background:#EAF3DE;border-left:3px solid #84CC16;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .msg-bubble{animation:fadeIn 0.2s ease;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#dbeafe;border-radius:2px;}
      `}</style>

      <div style={{display:"flex",flexDirection:"column",height:"100vh"}}>

        {/* NAV */}
        <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 2rem",background:"white",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 8px rgba(30,58,95,0.06)",flexShrink:0}}>
          <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:2,cursor:"pointer"}}><span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span></div>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
            <span style={{fontSize:"0.9rem",color:"#64748b",fontWeight:600}}>💬 Messages</span>
            {totalUnread > 0 && <span style={{background:"#EF4444",color:"white",fontSize:"0.7rem",fontWeight:700,padding:"1px 6px",borderRadius:999,minWidth:18,textAlign:"center"}}>{totalUnread}</span>}
          </div>
          <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.4rem 1rem",border:"1px solid #bfdbfe",borderRadius:999,background:"white",color:"#1e3a5f",fontSize:"0.82rem",fontWeight:600}}>← Back to PlayUp</button>
        </nav>

        {/* MAIN */}
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",flex:1,overflow:"hidden"}}>

          {/* CONVERSATION LIST */}
          <div style={{background:"white",borderRight:"1px solid #dbeafe",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"1rem",borderBottom:"1px solid #f1f5f9"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1,color:"#1e3a5f"}}>Conversations</div>
              <div style={{fontSize:"0.78rem",color:"#64748b",marginTop:"0.2rem"}}>{conversations.length} thread{conversations.length!==1?"s":""}</div>
            </div>
            <div style={{overflowY:"auto",flex:1}}>
              {loading ? (
                <div style={{textAlign:"center",padding:"2rem",color:"#64748b"}}>
                  <div style={{width:28,height:28,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 0.8rem"}}/>
                  <div style={{fontSize:"0.82rem"}}>Loading...</div>
                </div>
              ) : conversations.length === 0 ? (
                <div style={{textAlign:"center",padding:"2rem",color:"#64748b"}}>
                  <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>💬</div>
                  <div style={{fontSize:"0.88rem",fontWeight:600,color:"#1e3a5f",marginBottom:"0.3rem"}}>No messages yet</div>
                  <div style={{fontSize:"0.78rem"}}>Enquire on a lesson to start a conversation</div>
                  <button className="btn" onClick={()=>router.push("/")} style={{marginTop:"1rem",padding:"0.4rem 1rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontSize:"0.78rem",fontWeight:700}}>Browse Lessons</button>
                </div>
              ) : conversations.map(conv => {
                const isActive = selectedConv?.id === conv.id;
                const isMe = conv.seeker_id === user?.id;
                const initials = (conv.listing?.provider_name || "?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase();
                return (
                  <div key={conv.id} className={`conv-item ${isActive?"active":""}`} onClick={()=>selectConversation(conv)}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:isActive?"#1e3a5f":"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.82rem",fontWeight:700,color:isActive?"#84CC16":"#27500A",flexShrink:0,border:`2px solid ${isActive?"#84CC16":"#97C459"}`}}>
                      {initials}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.2rem"}}>
                        <div style={{fontSize:"0.85rem",fontWeight:700,color:"#1e3a5f",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:150}}>{conv.listing?.provider_name || "Provider"}</div>
                        <div style={{fontSize:"0.7rem",color:"#94a3b8",flexShrink:0,marginLeft:4}}>{formatTime(conv.last_message_at)}</div>
                      </div>
                      <div style={{fontSize:"0.75rem",color:"#84CC16",fontWeight:600,marginBottom:"0.2rem"}}>{conv.listing?.activity_type} · {conv.listing?.lesson_title?.slice(0,30)}{(conv.listing?.lesson_title?.length||0)>30?"...":""}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{fontSize:"0.75rem",color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:160}}>{conv.last_message}</div>
                        {(conv.unread_count||0) > 0 && <span style={{background:"#EF4444",color:"white",fontSize:"0.65rem",fontWeight:700,padding:"1px 5px",borderRadius:999,minWidth:16,textAlign:"center",flexShrink:0,marginLeft:4}}>{conv.unread_count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHAT AREA */}
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden",background:"#F0F7FF"}}>
            {!selectedConv ? (
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"1rem",color:"#64748b"}}>
                <div style={{fontSize:"3rem"}}>💬</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",color:"#1e3a5f",letterSpacing:1}}>Select a Conversation</div>
                <div style={{fontSize:"0.88rem"}}>Choose a conversation from the left to start chatting</div>
              </div>
            ) : (
              <>
                {/* CHAT HEADER */}
                <div style={{background:"white",padding:"1rem 1.5rem",borderBottom:"1px solid #dbeafe",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",color:"#84CC16",flexShrink:0}}>
                    {(selectedConv.listing?.provider_name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:"#1e3a5f",fontSize:"0.95rem"}}>{selectedConv.listing?.provider_name}</div>
                    <div style={{fontSize:"0.78rem",color:"#64748b"}}>{selectedConv.listing?.activity_type} · {selectedConv.listing?.lesson_title}</div>
                  </div>
                  <button className="btn" onClick={()=>router.push(`/listings/${selectedConv.listing_id}`)} style={{padding:"0.4rem 0.9rem",background:"#EAF3DE",color:"#27500A",border:"1px solid #97C459",borderRadius:999,fontSize:"0.75rem",fontWeight:600}}>View Listing →</button>
                </div>

                {/* MESSAGES */}
                <div style={{flex:1,overflowY:"auto",padding:"1.5rem",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {loadingMessages ? (
                    <div style={{textAlign:"center",padding:"2rem",color:"#64748b"}}>
                      <div style={{width:28,height:28,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{textAlign:"center",padding:"2rem",color:"#64748b",fontSize:"0.85rem"}}>No messages yet — send the first one!</div>
                  ) : messages.map((msg, i) => {
                    const isMe = msg.sender_id === user?.id;
                    const showTime = i === 0 || new Date(msg.created_at).getTime() - new Date(messages[i-1].created_at).getTime() > 300000;
                    return (
                      <div key={msg.id} className="msg-bubble">
                        {showTime && <div style={{textAlign:"center",fontSize:"0.7rem",color:"#94a3b8",margin:"0.5rem 0"}}>{formatTime(msg.created_at)}</div>}
                        <div style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}>
                          <div style={{maxWidth:"70%",background:isMe?"#1e3a5f":"white",color:isMe?"white":"#1e3a5f",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"0.7rem 1rem",fontSize:"0.9rem",lineHeight:1.5,border:isMe?"none":"1px solid #dbeafe",boxShadow:isMe?"none":"0 1px 4px rgba(30,58,95,0.06)"}}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef}/>
                </div>

                {/* INPUT */}
                <div style={{padding:"1rem 1.5rem",background:"white",borderTop:"1px solid #dbeafe",flexShrink:0}}>
                  <div style={{display:"flex",gap:"0.6rem",alignItems:"center"}}>
                    <input value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Type a message..." style={inputStyle}/>
                    <button className="btn" onClick={sendMessage} disabled={sending||!newMessage.trim()}
                      style={{padding:"0.6rem 1.4rem",background:sending||!newMessage.trim()?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.88rem",opacity:sending||!newMessage.trim()?0.7:1,flexShrink:0}}>
                      {sending?"...":"Send"}
                    </button>
                  </div>
                  <div style={{fontSize:"0.72rem",color:"#94a3b8",marginTop:"0.4rem"}}>Press Enter to send</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
