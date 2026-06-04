"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const MaritechLogo = () => (
  <svg width="155" height="31,5" viewBox="0 0 209 43" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.248 32.1L4.114 18.466V32.1H0V11.224H5.168L10.744 25.98L16.32 11.224H21.386V32.1H17.272V18.466L12.206 32.1H9.248ZM32.626 32.1V31.284C32.376 31.534 31.906 31.777 31.215 32.015C30.524 32.253 29.759 32.372 28.92 32.372C28.15 32.372 27.424 32.264 26.744 32.049C26.064 31.834 25.469 31.516 24.959 31.097C24.449 30.677 24.047 30.162 23.752 29.55C23.457 28.938 23.31 28.235 23.31 27.442C23.31 26.717 23.457 26.054 23.752 25.453C24.047 24.853 24.46 24.343 24.993 23.923C25.526 23.503 26.149 23.175 26.863 22.937C27.577 22.699 28.353 22.58 29.192 22.58C29.849 22.58 30.507 22.67 31.164 22.852C31.821 23.033 32.309 23.237 32.626 23.464V22.342C32.626 21.685 32.428 21.129 32.031 20.676C31.634 20.223 31.017 19.996 30.178 19.996C29.566 19.996 29.078 20.121 28.716 20.37C28.353 20.62 28.093 20.97 27.934 21.424H23.922C24.035 20.744 24.268 20.109 24.619 19.52C24.97 18.93 25.424 18.415 25.979 17.973C26.534 17.531 27.175 17.185 27.9 16.936C28.625 16.686 29.419 16.562 30.28 16.562C32.32 16.562 33.895 17.078 35.006 18.109C36.116 19.14 36.672 20.574 36.672 22.41V32.1H32.626ZM32.626 26.864C32.558 26.66 32.433 26.479 32.252 26.32C32.071 26.161 31.855 26.02 31.606 25.895C31.356 25.77 31.085 25.68 30.79 25.623C30.495 25.566 30.2 25.538 29.906 25.538C29.566 25.538 29.237 25.572 28.92 25.64C28.603 25.708 28.314 25.821 28.053 25.98C27.793 26.139 27.588 26.337 27.441 26.575C27.294 26.813 27.22 27.091 27.22 27.408C27.22 27.748 27.294 28.031 27.441 28.258C27.588 28.485 27.792 28.678 28.053 28.836C28.313 28.995 28.603 29.108 28.92 29.176C29.237 29.244 29.566 29.278 29.906 29.278C30.201 29.278 30.496 29.25 30.79 29.193C31.085 29.136 31.357 29.051 31.606 28.938C31.856 28.825 32.071 28.688 32.252 28.53C32.433 28.371 32.558 28.19 32.626 27.986V26.864ZM48.32 21.05C48.025 20.869 47.697 20.738 47.334 20.659C46.971 20.579 46.597 20.54 46.212 20.54C45.509 20.54 44.892 20.721 44.359 21.084C43.826 21.447 43.481 21.979 43.322 22.682V32.1H39.106V16.902H43.322V18.398C43.639 17.854 44.104 17.412 44.716 17.072C45.328 16.732 45.996 16.562 46.722 16.562C47.107 16.562 47.442 16.59 47.725 16.647C48.008 16.704 48.207 16.766 48.32 16.834V21.05ZM54.222 32.1H50.006V16.902H54.222V32.1ZM54.63 12.516C54.63 13.241 54.38 13.825 53.882 14.267C53.383 14.709 52.794 14.93 52.114 14.93C51.457 14.93 50.879 14.709 50.38 14.267C49.881 13.825 49.632 13.241 49.632 12.516C49.632 11.813 49.882 11.241 50.38 10.799C50.879 10.357 51.457 10.136 52.114 10.136C52.794 10.136 53.384 10.357 53.882 10.799C54.381 11.241 54.63 11.813 54.63 12.516ZM57.812 20.302H55.5V16.902H57.812V12.788H61.994V16.902H65.326V20.302H61.994V26.966C61.994 27.578 62.147 28.02 62.453 28.292C62.759 28.564 63.184 28.7 63.728 28.7C64.045 28.7 64.368 28.655 64.697 28.564C65.026 28.474 65.315 28.36 65.564 28.224V31.93C65.269 32.089 64.884 32.208 64.408 32.287C63.932 32.367 63.411 32.406 62.844 32.406C61.303 32.406 60.079 32.015 59.172 31.233C58.265 30.451 57.812 29.21 57.812 27.51V20.302ZM80.782 27.136C80.532 28.746 79.83 30.032 78.674 30.995C77.518 31.958 75.988 32.44 74.084 32.44C72.974 32.44 71.964 32.247 71.058 31.862C70.151 31.477 69.375 30.932 68.729 30.23C68.083 29.527 67.579 28.694 67.216 27.731C66.853 26.768 66.672 25.697 66.672 24.518C66.672 23.362 66.853 22.302 67.216 21.339C67.579 20.376 68.083 19.537 68.729 18.823C69.375 18.109 70.151 17.553 71.058 17.157C71.965 16.76 72.939 16.562 73.982 16.562C75.115 16.562 76.107 16.749 76.957 17.123C77.807 17.497 78.521 18.013 79.099 18.67C79.677 19.327 80.119 20.12 80.425 21.05C80.731 21.98 80.884 23 80.884 24.11V25.402H70.752C70.797 25.969 70.905 26.479 71.075 26.932C71.245 27.385 71.472 27.771 71.755 28.088C72.038 28.405 72.378 28.643 72.775 28.802C73.172 28.961 73.608 29.04 74.084 29.04C74.787 29.04 75.387 28.881 75.886 28.564C76.385 28.247 76.713 27.771 76.872 27.136H80.782ZM74.016 19.962C73.608 19.962 73.234 20.03 72.894 20.166C72.554 20.302 72.248 20.489 71.976 20.727C71.704 20.965 71.472 21.26 71.279 21.611C71.086 21.962 70.945 22.376 70.854 22.852H76.77C76.747 22.444 76.68 22.064 76.566 21.713C76.453 21.362 76.277 21.056 76.039 20.795C75.801 20.535 75.518 20.33 75.189 20.183C74.86 20.036 74.469 19.962 74.016 19.962ZM81.618 24.518C81.618 23.339 81.799 22.263 82.162 21.288C82.525 20.313 83.029 19.48 83.675 18.789C84.321 18.098 85.092 17.554 85.987 17.157C86.882 16.76 87.863 16.562 88.928 16.562C89.903 16.562 90.77 16.698 91.529 16.97C92.289 17.242 92.957 17.616 93.535 18.092C94.113 18.568 94.572 19.146 94.912 19.826C95.252 20.506 95.479 21.243 95.592 22.036H91.444C91.331 21.446 91.053 20.988 90.611 20.659C90.169 20.33 89.619 20.166 88.962 20.166C88.463 20.166 88.022 20.274 87.636 20.489C87.251 20.704 86.922 20.999 86.65 21.373C86.378 21.747 86.168 22.206 86.021 22.75C85.874 23.294 85.8 23.883 85.8 24.518C85.8 25.153 85.874 25.736 86.021 26.269C86.168 26.802 86.378 27.261 86.65 27.646C86.922 28.031 87.25 28.332 87.636 28.547C88.021 28.762 88.463 28.87 88.962 28.87C89.619 28.87 90.169 28.7 90.611 28.36C91.053 28.02 91.331 27.555 91.444 26.966H95.592C95.479 27.782 95.252 28.524 94.912 29.193C94.572 29.862 94.113 30.434 93.535 30.91C92.957 31.386 92.288 31.76 91.529 32.032C90.769 32.304 89.903 32.44 88.928 32.44C87.863 32.44 86.882 32.247 85.987 31.862C85.092 31.477 84.321 30.932 83.675 30.23C83.029 29.527 82.525 28.694 82.162 27.731C81.799 26.768 81.618 25.697 81.618 24.518ZM97.21 10H101.426V18.296C101.834 17.82 102.401 17.412 103.126 17.072C103.851 16.732 104.645 16.562 105.506 16.562C107.229 16.562 108.555 17.078 109.484 18.109C110.414 19.14 110.878 20.495 110.878 22.172V32.1H106.662V23.056C106.662 22.263 106.458 21.616 106.05 21.118C105.642 20.619 105.019 20.37 104.18 20.37C103.863 20.37 103.557 20.415 103.262 20.506C102.967 20.596 102.695 20.733 102.446 20.914C102.196 21.095 101.981 21.316 101.8 21.577C101.619 21.837 101.494 22.138 101.426 22.478V32.1H97.21V10Z" fill="#003160"/>
    <path d="M118.738 21.662C118.738 20.075 118.988 18.619 119.486 17.293C119.985 15.967 120.665 14.828 121.526 13.876C122.387 12.924 123.413 12.187 124.603 11.666C125.793 11.145 127.079 10.884 128.462 10.884C129.686 10.884 130.797 11.06 131.794 11.411C132.791 11.762 133.653 12.244 134.378 12.856C135.103 13.468 135.698 14.21 136.163 15.083C136.628 15.956 136.962 16.913 137.166 17.956H132.882C132.519 17.004 131.992 16.233 131.301 15.644C130.61 15.054 129.663 14.76 128.462 14.76C127.623 14.76 126.875 14.93 126.218 15.27C125.561 15.61 125 16.092 124.535 16.715C124.07 17.338 123.719 18.069 123.481 18.908C123.243 19.747 123.124 20.665 123.124 21.662C123.124 22.659 123.243 23.577 123.481 24.416C123.719 25.255 124.071 25.98 124.535 26.592C125 27.204 125.561 27.686 126.218 28.037C126.875 28.388 127.623 28.564 128.462 28.564C129.663 28.564 130.61 28.269 131.301 27.68C131.992 27.09 132.519 26.309 132.882 25.334H137.166C136.962 26.399 136.628 27.368 136.163 28.241C135.698 29.114 135.098 29.856 134.361 30.468C133.624 31.08 132.763 31.562 131.777 31.913C130.791 32.264 129.686 32.44 128.462 32.44C127.079 32.44 125.793 32.18 124.603 31.658C123.413 31.137 122.387 30.4 121.526 29.448C120.665 28.496 119.985 27.357 119.486 26.031C118.987 24.705 118.738 23.249 118.738 21.662ZM143.17 32.1H138.954V10H143.17V32.1ZM159.782 24.518C159.782 25.674 159.601 26.739 159.238 27.714C158.875 28.689 158.371 29.527 157.725 30.23C157.079 30.933 156.297 31.477 155.379 31.862C154.461 32.247 153.447 32.44 152.336 32.44C151.226 32.44 150.211 32.247 149.293 31.862C148.375 31.477 147.593 30.932 146.947 30.23C146.301 29.527 145.797 28.689 145.434 27.714C145.071 26.739 144.89 25.674 144.89 24.518C144.89 23.339 145.071 22.268 145.434 21.305C145.797 20.342 146.301 19.503 146.947 18.789C147.593 18.075 148.375 17.525 149.293 17.14C150.211 16.755 151.225 16.562 152.336 16.562C153.446 16.562 154.461 16.755 155.379 17.14C156.297 17.525 157.079 18.075 157.725 18.789C158.371 19.503 158.875 20.342 159.238 21.305C159.601 22.268 159.782 23.339 159.782 24.518ZM155.6 24.518C155.6 23.883 155.532 23.294 155.396 22.75C155.26 22.206 155.05 21.741 154.767 21.356C154.484 20.971 154.138 20.67 153.73 20.455C153.322 20.24 152.857 20.132 152.336 20.132C151.815 20.132 151.35 20.24 150.942 20.455C150.534 20.67 150.188 20.971 149.905 21.356C149.622 21.741 149.412 22.206 149.276 22.75C149.14 23.294 149.072 23.883 149.072 24.518C149.072 25.153 149.14 25.736 149.276 26.269C149.412 26.802 149.622 27.261 149.905 27.646C150.188 28.031 150.534 28.337 150.942 28.564C151.35 28.791 151.815 28.904 152.336 28.904C152.857 28.904 153.322 28.791 153.73 28.564C154.138 28.337 154.484 28.031 154.767 27.646C155.05 27.261 155.26 26.802 155.396 26.269C155.532 25.736 155.6 25.153 155.6 24.518ZM174.932 32.1H170.75V30.706C170.32 31.182 169.753 31.59 169.05 31.93C168.347 32.27 167.554 32.44 166.67 32.44C164.97 32.44 163.655 31.93 162.726 30.91C161.796 29.89 161.332 28.53 161.332 26.83V16.902H165.548V25.98C165.548 26.773 165.746 27.425 166.143 27.935C166.54 28.445 167.157 28.7 167.996 28.7C168.631 28.7 169.203 28.507 169.713 28.122C170.223 27.737 170.557 27.227 170.716 26.592V16.902H174.932V32.1ZM187.396 30.842C187.215 31.046 186.994 31.244 186.733 31.437C186.473 31.63 186.178 31.8 185.849 31.947C185.52 32.094 185.158 32.213 184.761 32.304C184.364 32.394 183.973 32.44 183.588 32.44C182.478 32.44 181.491 32.236 180.63 31.828C179.769 31.42 179.043 30.853 178.454 30.128C177.864 29.403 177.417 28.558 177.111 27.595C176.805 26.632 176.652 25.606 176.652 24.518C176.652 23.408 176.805 22.376 177.111 21.424C177.417 20.472 177.865 19.634 178.454 18.908C179.044 18.183 179.769 17.61 180.63 17.191C181.491 16.771 182.477 16.562 183.588 16.562C183.973 16.562 184.364 16.607 184.761 16.698C185.158 16.788 185.521 16.908 185.849 17.055C186.178 17.202 186.472 17.378 186.733 17.582C186.993 17.786 187.215 17.99 187.396 18.194V10H191.612V32.1H187.396V30.842ZM187.396 22.002C187.146 21.481 186.761 21.056 186.24 20.727C185.719 20.398 185.14 20.234 184.506 20.234C183.939 20.234 183.429 20.347 182.976 20.574C182.523 20.801 182.143 21.101 181.837 21.475C181.531 21.849 181.293 22.297 181.123 22.818C180.953 23.339 180.868 23.906 180.868 24.518C180.868 25.13 180.953 25.697 181.123 26.218C181.293 26.739 181.531 27.187 181.837 27.561C182.143 27.935 182.523 28.23 182.976 28.445C183.429 28.66 183.939 28.768 184.506 28.768C185.141 28.768 185.719 28.604 186.24 28.275C186.761 27.946 187.147 27.521 187.396 27V22.002Z" fill="#003160"/>
    <path d="M194 10H200.288V11.332H197.912V17.368H196.376V11.332H194V10ZM204.572 17.368L202.76 12.556V17.368H201.308V10H203.132L205.1 15.208L207.068 10H208.856V17.368H207.404V12.556L205.616 17.368H204.572Z" fill="#003160"/>
  </svg>
);

// ── Nav structure ─────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    key: "tms",
    label: "TMS",
    icon: "local_shipping",
    href: "/tms/orders",
    items: [
      { href: "/tms/orders", label: "Orders" },
      { href: "/tms/trips",  label: "Trips" },
    ],
  },
  {
    key: "customs",
    label: "Customs",
    icon: "gavel",
    href: "/customs",
    items: [],
  },
  {
    key: "digitoll",
    label: "Digitoll",
    icon: "receipt_long",
    href: "/digitoll",
    items: [],
  },
  {
    key: "docreader",
    label: "Document Reader",
    icon: "description",
    href: "/digitoll/incoming",
    items: [
      { href: "/digitoll/incoming", label: "Incoming" },
      { href: "/digitoll/settings", label: "Settings" },
    ],
  },
];

const iconStyle = {
  fontFamily: "Material Symbols Rounded",
  fontSize: 22,
  color: "#fff",
  lineHeight: 1,
  userSelect: "none" as const,
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({ tms: true, docreader: true });

  // Auto-expandera aktiv sektion när path ändras
  useEffect(() => {
    NAV_SECTIONS.forEach(section => {
      const active = path === section.href || section.items.some(item => path === item.href || path.startsWith(item.href + "/"));
      if (active && section.items.length > 0) {
        setCollapsedSections(prev => ({ ...prev, [section.key]: false }));
      }
    });
  }, [path]);

  function toggleSection(key: string) {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function isActive(href: string) {
    if (href === "/digitoll") return path === "/digitoll";
    if (href === "/customs")  return path === "/customs";
    // För sektioner med sub-items: matcha exakt eller med trailing slash
    return path === href || path.startsWith(href + "/");
  }

  function pageTitle() {
    if (path === "/tms/orders")        return "TMS / Orders";
    if (path === "/tms/trips")         return "TMS / Trips";
    if (path === "/customs")           return "Customs";
    if (path === "/digitoll")          return "Digitoll / Start";
    if (path === "/digitoll/incoming") return "Document Reader / Incoming";
    if (path === "/digitoll/settings") return "Document Reader / Settings";
    return "";
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#fff", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <div style={{ width: sidebarCollapsed ? 60 : 230, background: "#fff", transition: "width 0.2s ease", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid #E4E7EC", overflow: "hidden" }}>

        {/* Logo bar */}
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", paddingLeft: sidebarCollapsed ? 0 : 16, gap: 10, borderBottom: "1px solid #E4E7EC", flexShrink: 0 }}>
          {sidebarCollapsed ? (
            <div onClick={() => setSidebarCollapsed(false)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.background = "#E4E7EC")}
              onMouseLeave={e => (e.currentTarget.style.background = "#F2F4F7")}
            >
              <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#667085", lineHeight: 1, userSelect: "none" }}>menu</span>
            </div>
          ) : (
            <>
              <div onClick={() => setSidebarCollapsed(true)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#E4E7EC")}
                onMouseLeave={e => (e.currentTarget.style.background = "#F2F4F7")}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="#667085" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <MaritechLogo />
            </>
          )}
        </div>

        {/* Nav sections */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 2px" }}>
          {NAV_SECTIONS.map((section, si) => {
            const sectionCollapsed = collapsedSections[section.key] ?? false;
            const hasItems = section.items.length > 0;
            const sectionActive = isActive(section.href) || section.items.some(item => isActive(item.href));

            return (
              <div key={section.key} style={{ marginBottom: 6 }}>
                {/* Section header */}
                <div className={sectionActive ? "" : "nav-section-header"} style={{ display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "space-between", height: 37, padding: sidebarCollapsed ? "0" : "0 14px", background: sectionActive ? "#DFE5EB" : "transparent", borderRadius: "2px" }}>
                  {sidebarCollapsed ? (
                    <Link href={section.href} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", textDecoration: "none" }}>
                      <span style={{ fontFamily: "Material Icons", fontSize: 16, color: sectionActive ? "#003160" : "#767676", lineHeight: 1, userSelect: "none" }}>{section.icon}</span>
                    </Link>
                  ) : (
                    <>
                      <Link href={section.href} style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", flex: 1, height: "100%" }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 15, color: sectionActive ? "#003160" : "#767676", lineHeight: 1, userSelect: "none" }}>{section.icon}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: sectionActive ? "#003160" : "#767676", textTransform: "uppercase" as const }}>{section.label}</span>
                      </Link>
                      {hasItems && (
                        <span
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSection(section.key); }}
                          className="nav-toggle-icon"
                          style={{ fontFamily: "Material Icons", fontSize: 14, color: "#98A2B3", lineHeight: 1, cursor: "pointer", userSelect: "none", flexShrink: 0, padding: "0 2px", borderRadius: 2 }}
                        >{collapsedSections[section.key] === false || (!collapsedSections[section.key] && collapsedSections[section.key] !== true) ? "remove" : "add"}</span>
                      )}
                    </>
                  )}
                </div>

                {/* Nav items — bara för aktiv sektion */}
                {hasItems && !sectionCollapsed && !sidebarCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
                    {section.items.map((item, idx) => {
                      const active = isActive(item.href);
                      const isLast = idx === section.items.length - 1;
                      return (
                        <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", height: 37, padding: "0 14px", color: sectionActive ? "#003160" : "#767676", fontWeight: active ? 700 : 400, fontSize: 13, textDecoration: "none", background: sectionActive ? "#DFE5EB" : "transparent", borderRadius: isLast ? "0 0 2px 2px" : "0", transition: "background 0.1s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = sectionActive ? "#CDD6E0" : "#F2F4F7"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = sectionActive ? "#DFE5EB" : "transparent"; }}
                        >
                          <span style={{ width: 18, display: "flex", justifyContent: "center", marginRight: 8, flexShrink: 0 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#003160" : "#98A2B3", display: "inline-block" }} />
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Minimized bullets — bara för aktiv sektion */}
                {hasItems && sidebarCollapsed && sectionActive && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
                    {section.items.map((item, idx) => {
                      const active = isActive(item.href);
                      const isLast = idx === section.items.length - 1;
                      return (
                        <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 37, textDecoration: "none", background: "#DFE5EB", borderRadius: isLast ? "0 0 2px 2px" : "0", transition: "background 0.1s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#CDD6E0"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#DFE5EB"; }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#003160" : "#98A2B3", display: "inline-block" }} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <div style={{ background: "#003160", height: 60, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>Account Name</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Domain Name</div>
            </div>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1, userSelect: "none" }}>arrow_drop_down</span>
          </div>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, flex: 1, textAlign: "center" }}>{pageTitle()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: "auto" }}>
            <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 2, transition: "background 0.15s" }}
              onClick={() => window.dispatchEvent(new CustomEvent("digitoll:open-create-menu"))}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={iconStyle}>add</span>
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
            <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 2, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ display: "inline-flex", background: "linear-gradient(135deg, #f0abfc, #fb923c, #facc15)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 22, lineHeight: 1, userSelect: "none", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>auto_awesome</span>
              </span>
            </div>
            {(["history", "settings", "apps"] as const).map(icon => (
              <div key={icon} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 2, transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={iconStyle}>{icon}</span>
              </div>
            ))}
          </div>
        </div>

        <style>{`
        .nav-section-header:hover { background: #F2F4F7 !important; border-radius: 2px; }
        .nav-toggle-icon:hover { color: #003160 !important; }
      `}</style>
      {/* Page content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#fff" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
