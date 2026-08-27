"use client";

export default function OfflinePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>You are offline</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>Please check your internet connection and try again.</p>
      <button onClick={() => window.location.reload()} style={{ padding: "0.5rem 1.5rem", borderRadius: "0.375rem", border: "1px solid #ccc", cursor: "pointer", fontSize: "0.875rem" }}>
        Retry
      </button>
    </div>
  );
}
