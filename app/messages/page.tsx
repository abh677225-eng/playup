import { Suspense } from "react";
import MessagesClient from "./MessagesClient";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "sans-serif",
            color: "#64748b",
          }}
        >
          Loading messages...
        </div>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
