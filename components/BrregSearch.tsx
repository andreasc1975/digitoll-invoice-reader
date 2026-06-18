"use client";
import React, { useState, useRef, useEffect } from "react";

export interface BrregUnit {
  organisasjonsnummer: string;
  navn: string;
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
    landkode?: string;
  };
}

interface Props {
  initialQuery?: string;
  onSelect: (unit: BrregUnit) => void;
  onCancel: () => void;
}

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD",
  borderRadius: 2, fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box" as const,
};

export function BrregSearchModal({ initialQuery = "", onSelect, onCancel }: Props) {
  const [query, setQuery]       = useState(initialQuery);
  const [results, setResults]   = useState<BrregUnit[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQuery) search(initialQuery);
  }, []);

  async function search(q: string) {
    if (!q.trim()) return;
    setLoading(true); setError(null); setSearched(true);
    try {
      const isOrgNo = /^\d{9}$/.test(q.trim().replace(/\s/g, ""));
      const url = isOrgNo
        ? `https://data.brreg.no/enhetsregisteret/api/enheter/${q.trim().replace(/\s/g, "")}`
        : `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(q.trim())}&size=10`;
      const res = await fetch(url);
      if (!res.ok) { setResults([]); setLoading(false); return; }
      const data = await res.json();
      // Single lookup vs list
      if (isOrgNo && data.organisasjonsnummer) {
        setResults([data]);
      } else {
        setResults(data._embedded?.enheter ?? []);
      }
    } catch {
      setError("Kunne ikke nå Brønnøysund. Sjekk internettforbindelsen.");
    }
    setLoading(false);
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.45)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #E4E7EC" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>Brønnøysund Enhetsregisteret</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", marginBottom: 12 }}>Søk etter avsender</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              style={{ ...inp, flex: 1 }}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search(query)}
              placeholder="Firmanavn eller org.nr. (9 siffer)"
            />
            <button
              onClick={() => search(query)}
              disabled={loading}
              style={{ padding: "8px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {loading ? "Søker…" : "Søk"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {error && (
            <div style={{ padding: "12px 22px", color: "#B42318", fontSize: 12.5 }}>{error}</div>
          )}
          {!loading && searched && results.length === 0 && !error && (
            <div style={{ padding: "20px 22px", color: "#98A2B3", fontSize: 12.5, textAlign: "center" }}>Ingen treff — prøv et annet søkeord eller org.nr.</div>
          )}
          {results.map(u => {
            const addr = u.forretningsadresse;
            const addrLine = [addr?.adresse?.[0], addr?.postnummer, addr?.poststed, addr?.landkode].filter(Boolean).join(", ");
            return (
              <div
                key={u.organisasjonsnummer}
                onClick={() => onSelect(u)}
                style={{ padding: "12px 22px", borderBottom: "1px solid #F2F4F7", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{u.navn}</div>
                  <div style={{ fontSize: 11.5, color: "#667085", marginTop: 2 }}>
                    {u.organisasjonsnummer}{addrLine ? ` · ${addrLine}` : ""}
                  </div>
                </div>
                <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#D0D5DD" }}>chevron_right</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "6px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Avbryt</button>
        </div>
      </div>
    </div>
  );
}
