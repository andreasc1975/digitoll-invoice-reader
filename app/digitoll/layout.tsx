"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DigitollLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  const navItems = [
    { href: "/digitoll",          label: "Start",              dot: true },
    { href: "/digitoll/incoming", label: "Incoming Documents", dot: false },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F4F5F7", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 210, background: "#0B1F3A", display: "flex", flexDirection: "column", flexShrink: 0, color: "#fff" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#ff5f57", marginBottom: 10, cursor: "pointer" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "#1a3a5c", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#7eb3e0", flexShrink: 0 }}>MC</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Maritech Cloud™</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>ACCOUNT NAME · DOMAIN</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", padding: "14px 16px 4px", letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>DIGITOLL</div>

        {navItems.map(item => {
          const active = path === item.href || (item.href !== "/digitoll" && path.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "7px 16px",
              color: active ? "#fff" : "rgba(255,255,255,0.55)",
              background: active ? "rgba(255,255,255,0.08)" : "transparent",
              borderLeft: `2px solid ${active ? "#4A9EDB" : "transparent"}`,
              fontSize: 12.5, textDecoration: "none", transition: "all .15s",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#4A9EDB" : "rgba(255,255,255,0.25)", flexShrink: 0 }} />
              {item.label}
            </Link>
          );
        })}

        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", padding: "14px 16px 4px", letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>SYSTEM</div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 16px", color: "rgba(255,255,255,0.55)", fontSize: 12.5, cursor: "pointer" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
          Settings
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ background: "#0B1F3A", height: 50, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer", padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.12)" }}>
            <div>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>Account Name</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Domain Name</div>
            </div>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>▾</span>
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, flex: 1, textAlign: "center" }}>
            Digitoll / {path === "/digitoll" ? "Start" : path === "/digitoll/incoming" ? "Incoming Documents" : ""}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {["＋", "⚙", "🕐", "🔔"].map((icon, i) => (
              <div key={i} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", cursor: "pointer", borderRadius: 5, fontSize: 16 }}>{icon}</div>
            ))}
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer" }}>A</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
