"use client";
import React, { useState, useEffect, useRef } from "react";

export interface Company {
  id?: string;
  name: string;
  address: string | null;
  city: string | null;
  country_code: string | null;
  post_code: string | null;
  phone_no?: string | null;
  _source?: "db" | "brreg";
  _org_no?: string | null;
}

interface Props {
  label: string;
  required?: boolean;
  value: Company | null;
  onChange: (c: Company | null) => void;
  enableBrreg?: boolean;   // show Brønnøysund tab
  borderColor?: string;
  missing?: boolean;
}

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD",
  borderRadius: 2, fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box" as const,
};

function Spinner() {
  return <div style={{ width: 14, height: 14, border: "2px solid #E4E7EC", borderTopColor: "#446BF9", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />;
}

export function CompanySearch({ label, required, value, onChange, enableBrreg = false, borderColor, missing }: Props) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [tab, setTab]         = useState<"db" | "brreg">("db");
  const [dbResults, setDbResults]         = useState<Company[]>([]);
  const [brregResults, setBrregResults]   = useState<Company[]>([]);
  const [loadingDb, setLoadingDb]         = useState(false);
  const [loadingBrreg, setLoadingBrreg]   = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Search DB
  useEffect(() => {
    if (!open || tab !== "db") return;
    setLoadingDb(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/companies?q=${encodeURIComponent(query)}`);
      if (res.ok) setDbResults(await res.json());
      setLoadingDb(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open, tab]);

  // Search Brreg
  async function searchBrreg() {
    if (!query.trim()) return;
    setLoadingBrreg(true);
    try {
      const isOrgNo = /^\d{9}$/.test(query.trim().replace(/\s/g, ""));
      const url = isOrgNo
        ? `https://data.brreg.no/enhetsregisteret/api/enheter/${query.trim().replace(/\s/g, "")}`
        : `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query.trim())}&size=10`;
      const res = await fetch(url);
      if (!res.ok) { setBrregResults([]); setLoadingBrreg(false); return; }
      const data = await res.json();
      const units = isOrgNo && data.organisasjonsnummer ? [data] : (data._embedded?.enheter ?? []);
      setBrregResults(units.map((u: Record<string, unknown>) => {
        const addr = u.forretningsadresse as Record<string, unknown> | undefined;
        return {
          name: u.navn as string,
          address: (addr?.adresse as string[] | undefined)?.[0] ?? null,
          city: (addr?.poststed as string | undefined) ?? null,
          country_code: (addr?.landkode as string | undefined) ?? null,
          post_code: (addr?.postnummer as string | undefined) ?? null,
          _source: "brreg" as const,
          _org_no: u.organisasjonsnummer as string,
        };
      }));
    } catch { setBrregResults([]); }
    setLoadingBrreg(false);
  }

  function select(c: Company) {
    onChange(c);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  const bc = missing ? "#FDA29B" : borderColor ?? (value ? "#84ADFF" : "#D0D5DD");

  return (
    <div ref={wrapRef} style={{ position: "relative", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".04em" }}>
          {label}{required && <span style={{ color: "#D92D20" }}> *</span>}
        </label>
        {value?._source === "brreg" && (
          <span style={{ fontSize: 10, fontWeight: 600, color: "#027A48", background: "#ECFDF3", padding: "1px 6px", borderRadius: 10 }}>Brreg ✓</span>
        )}
        {value?._source === "db" && (
          <span style={{ fontSize: 10, fontWeight: 600, color: "#175CD3" }}>Database</span>
        )}
      </div>

      {/* Selected value display */}
      <div
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{ border: `1px solid ${bc}`, borderRadius: 2, padding: "7px 36px 7px 12px", fontSize: 13, cursor: "pointer", background: missing ? "#FFF9F9" : "#fff", position: "relative", minHeight: 36 }}
      >
        {value ? (
          <div>
            <div style={{ fontWeight: 600, color: "#101828" }}>{value.name}</div>
            {(value.address || value.city) && (
              <div style={{ fontSize: 11.5, color: "#667085", marginTop: 1 }}>
                {[value.address, value.post_code, value.city, value.country_code].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "#98A2B3" }}>Search company…</span>
        )}
        {value ? (
          <span onClick={clear} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</span>
        ) : (
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontFamily: "Material Icons", fontSize: 16, color: "#98A2B3" }}>search</span>
        )}
      </div>

      {missing && <div style={{ fontSize: 10.5, color: "#D92D20", marginTop: 2 }}>Required — please fill in this field</div>}

      {/* Dropdown */}
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 500, background: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, boxShadow: "0 8px 24px rgba(16,24,40,0.12)", marginTop: 2 }}>
          {/* Tabs */}
          {enableBrreg && (
            <div style={{ display: "flex", borderBottom: "1px solid #E4E7EC" }}>
              {(["db", "brreg"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px", fontSize: 11.5, fontWeight: tab === t ? 700 : 400, color: tab === t ? "#446BF9" : "#667085", background: "transparent", border: "none", borderBottom: tab === t ? "2px solid #446BF9" : "2px solid transparent", cursor: "pointer", fontFamily: "inherit" }}>
                  {t === "db" ? "Your database" : "Brønnøysund"}
                </button>
              ))}
            </div>
          )}

          {/* Search input */}
          <div style={{ padding: "8px 10px", display: "flex", gap: 6 }}>
            <input
              ref={inputRef}
              style={{ ...inp, flex: 1 }}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && tab === "brreg") searchBrreg(); }}
              placeholder={tab === "brreg" ? "Company name or org.no. (9 digits)" : "Search by name…"}
            />
            {tab === "brreg" && (
              <button onClick={searchBrreg} disabled={loadingBrreg} style={{ padding: "0 12px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {loadingBrreg ? "…" : "Search"}
              </button>
            )}
          </div>

          {/* Results */}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {tab === "db" && (
              loadingDb ? (
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, color: "#667085", fontSize: 12.5 }}><Spinner /> Searching…</div>
              ) : dbResults.length === 0 ? (
                <div style={{ padding: "12px 14px", color: "#98A2B3", fontSize: 12.5 }}>No results{query ? ` for "${query}"` : ""}</div>
              ) : dbResults.map(c => (
                <div key={c.id} onClick={() => select({ ...c, _source: "db" })}
                  style={{ padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid #F9FAFB" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#101828" }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "#667085", marginTop: 1 }}>
                    {[c.address, c.post_code, c.city, c.country_code].filter(Boolean).join(", ")}
                  </div>
                </div>
              ))
            )}
            {tab === "brreg" && (
              loadingBrreg ? (
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, color: "#667085", fontSize: 12.5 }}><Spinner /> Searching Brønnøysund…</div>
              ) : brregResults.length === 0 ? (
                <div style={{ padding: "12px 14px", color: "#98A2B3", fontSize: 12.5 }}>Enter a name or org.no. and click Search</div>
              ) : brregResults.map((c, i) => (
                <div key={i} onClick={() => select(c)}
                  style={{ padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid #F9FAFB" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#101828" }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "#667085", marginTop: 1 }}>
                    {[c._org_no, c.address, c.post_code, c.city].filter(Boolean).join(" · ")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
