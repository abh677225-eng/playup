"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MessagesClient({ initialConversations, user }: any) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");

  // ✅ Load messages ONLY when needed
  const openConversation = async (conv: any) => {
    setSelected(conv);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("listing_id", conv.listing_id)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  // ✅ Send message (simplified)
  const sendMessage = async () => {
    if (!newMsg.trim() || !selected) return;

    const receiver =
      selected.seeker_id === user.id
        ? selected.provider_id
        : selected.seeker_id;

    const { data } = await supabase
      .from("messages")
      .insert({
        listing_id: selected.listing_id,
        sender_id: user.id,
        receiver_id: receiver,
        message: newMsg,
        read: false,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) => [...prev, data]);
      setNewMsg("");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      
      {/* LEFT: conversations */}
      <div style={{ width: "300px", borderRight: "1px solid #ddd" }}>
        {conversations.map((c: any) => (
          <div
            key={c.id}
            onClick={() => openConversation(c)}
            style={{
              padding: "1rem",
              cursor: "pointer",
              borderBottom: "1px solid #eee",
            }}
          >
            <strong>{c.listings?.provider_name}</strong>
            <div style={{ fontSize: "0.8rem" }}>
              {c.last_message}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT: chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {selected ? (
          <>
            <div style={{ padding: "1rem", borderBottom: "1px solid #ddd" }}>
              Chat with {selected.listings?.provider_name}
            </div>

            <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
              {messages.map((m) => (
                <div key={m.id} style={{ marginBottom: "0.5rem" }}>
                  <b>{m.sender_id === user.id ? "You" : "Them"}:</b> {m.message}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", padding: "1rem" }}>
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                style={{ flex: 1 }}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div style={{ padding: "2rem" }}>
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}