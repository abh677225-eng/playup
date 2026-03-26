"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function HomeClient({ initialListings }: { initialListings: any[] }) {
  const router = useRouter();

  const [dbListings] = useState(initialListings || []);
  const [activeTab, setActiveTab] = useState<"lessons" | "events">("lessons");
  const [searchText, setSearchText] = useState("");
  const [searchPostcode, setSearchPostcode] = useState("");
  const [user, setUser] = useState<any>(null);

  // ✅ Auth (same as before)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ email: session.user.email, id: session.user.id });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(session.user);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ Filtering (same logic simplified)
  const filteredListings = dbListings.filter((l) => {
    const matchText =
      !searchText ||
      l.lesson_title?.toLowerCase().includes(searchText.toLowerCase()) ||
      l.activity_type?.toLowerCase().includes(searchText.toLowerCase());

    const matchLocation =
      !searchPostcode ||
      l.suburbs?.toLowerCase().includes(searchPostcode.toLowerCase());

    return matchText && matchLocation;
  });

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      
      {/* HEADER */}
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        🎯 PlayUp — Find Your Game
      </h1>

      {/* SEARCH */}
      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem" }}>
        <input
          placeholder="Search sport or lesson..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ padding: "0.5rem", flex: 1 }}
        />

        <input
          placeholder="Postcode or suburb"
          value={searchPostcode}
          onChange={(e) => setSearchPostcode(e.target.value)}
          style={{ padding: "0.5rem", flex: 1 }}
        />
      </div>

      {/* USER */}
      {user && (
        <p style={{ marginBottom: "1rem" }}>
          👋 Welcome, {user.email}
        </p>
      )}

      {/* RESULTS */}
      <h2 style={{ marginBottom: "1rem" }}>
        {filteredListings.length} Listings
      </h2>

      {/* LISTINGS GRID */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {filteredListings.map((l) => (
          <div
            key={l.id}
            onClick={() => router.push(`/listings/${l.id}`)}
            style={{
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <h3>{l.lesson_title}</h3>
            <p>{l.activity_type}</p>
            <p>💰 ${l.price}</p>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredListings.length === 0 && (
        <p>No listings found.</p>
      )}
    </div>
  );
}