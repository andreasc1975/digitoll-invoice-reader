"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/sales-order", label: "Sales Order", clickable: true },
  { href: "#",            label: "Invoices",     clickable: false },
  { href: "#",            label: "Factoring",    clickable: false },
  { href: "#",            label: "To accounting",clickable: false },
];

const iS = {
  fontFamily: "Material Symbols Rounded", fontSize: 22, color: "#fff",
  lineHeight: 1, userSelect: "none" as const,
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
};

export function SalesShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!document.querySelector("link[href*='Material+Icons']")) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
      document.head.appendChild(l);
    }
  }, []);

  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  const sa = NAV_ITEMS.some(i => i.clickable && isActive(i.href));

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: collapsed ? 60 : 230, background: "#fff", borderRight: "1px solid #E4E7EC", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", transition: "width 0.2s" }}>
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? 0 : "0 16px", gap: 10, borderBottom: "1px solid #E4E7EC", flexShrink: 0 }}>
          {collapsed ? (
            <div onClick={() => setCollapsed(false)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#667085" }}>menu</span>
            </div>
          ) : (
            <>
              <div onClick={() => setCollapsed(true)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="#667085" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#003160" }}>Maritech Cloud™</span>
            </>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 2px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", height: 37, padding: collapsed ? 0 : "0 14px", background: sa ? "#DFE5EB" : "transparent", borderRadius: 2 }}>
            {collapsed ? (
              <Link href="/sales-order" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", textDecoration: "none" }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16, color: sa ? "#003160" : "#767676" }}>receipt_long</span>
              </Link>
            ) : (
              <Link href="/sales-order" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", flex: 1, height: "100%" }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 15, color: sa ? "#003160" : "#767676" }}>receipt_long</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: sa ? "#003160" : "#767676", textTransform: "uppercase" as const }}>Sales Order</span>
              </Link>
            )}
            {!collapsed && <span style={{ fontFamily: "Material Icons", fontSize: 14, color: "#98A2B3" }}>remove</span>}
          </div>

          {!collapsed && NAV_ITEMS.map((item, idx) => {
            const active = item.clickable && isActive(item.href);
            const isLast = idx === NAV_ITEMS.length - 1;
            return item.clickable ? (
              <Link key={idx} href={item.href}
                style={{ display: "flex", alignItems: "center", height: 37, padding: "0 14px", color: sa ? "#003160" : "#767676", fontWeight: active ? 700 : 400, fontSize: 13, textDecoration: "none", background: sa ? "#DFE5EB" : "transparent", borderRadius: isLast ? "0 0 2px 2px" : 0, transition: "background 0.1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = sa ? "#CDD6E0" : "#F2F4F7"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = sa ? "#DFE5EB" : "transparent"; }}>
                <span style={{ width: 18, display: "flex", justifyContent: "center", marginRight: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#003160" : "#98A2B3", display: "inline-block" }} />
                </span>
                {item.label}
              </Link>
            ) : (
              <div key={idx} style={{ display: "flex", alignItems: "center", height: 37, padding: "0 14px", color: "#C0C8D8", fontSize: 13, cursor: "default" }}>
                <span style={{ width: 18, display: "flex", justifyContent: "center", marginRight: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E4E7EC", display: "inline-block" }} />
                </span>
                {item.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: "#003160", height: 60, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: ".04em", textTransform: "uppercase" as const }}>Account Name</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Domain Name</div>
            </div>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "rgba(255,255,255,0.6)" }}>arrow_drop_down</span>
          </div>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, flex: 1, textAlign: "center" }}>Sales Order</div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: "auto" }}>
            {(["add", "delete_forever"] as const).map(icon => (
              <div key={icon} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 2 }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={iS}>{icon}</span>
              </div>
            ))}
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
            {(["history", "settings", "apps"] as const).map(icon => (
              <div key={icon} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 2 }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={iS}>{icon}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#fff" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
