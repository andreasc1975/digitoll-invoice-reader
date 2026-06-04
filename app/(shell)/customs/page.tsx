"use client";

export default function CustomsPage() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: "#fff", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: 48, height: 48, borderRadius: 2, background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "Material Icons", fontSize: 24, color: "#98A2B3", lineHeight: 1 }}>gavel</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#344054", marginBottom: 6 }}>Customs</div>
        <div style={{ fontSize: 13, color: "#98A2B3", maxWidth: 320 }}>
          This module is under construction. Customs declaration functionality will be available here in a future release.
        </div>
      </div>
    </div>
  );
}
