import os

path = "app/(shell)/tms/trips/page.tsx"
with open(path) as f:
    c = f.read()

# 1. Add isDomestic state
c = c.replace(
    "  const [createCount, setCreateCount] = useState(1);",
    "  const [createCount, setCreateCount] = useState(1);\n  const [createDomestic, setCreateDomestic] = useState(false);"
)

# 2. Add Norwegian cities for domestic trips
c = c.replace(
    '  const FROMS    = ["Gothenburg", "Stockholm", "Malmö", "Copenhagen", "Helsingborg", "Norrköping"];',
    '  const FROMS    = ["Gothenburg", "Stockholm", "Malmö", "Copenhagen", "Helsingborg", "Norrköping"];\n  const NO_CITIES = ["Oslo", "Bergen", "Trondheim", "Stavanger", "Kristiansand", "Drammen", "Tromsø", "Ålesund", "Fredrikstad", "Sandnes"];'
)

# 3. Update generateTrip to handle domestic
old_gen = '''    const fromCity = FROMS[Math.floor(Math.random() * FROMS.length)];
    const toCity   = TOS[Math.floor(Math.random() * TOS.length)];'''

new_gen = '''    const fromCity = createDomestic
      ? NO_CITIES[Math.floor(Math.random() * NO_CITIES.length)]
      : FROMS[Math.floor(Math.random() * FROMS.length)];
    const toCity = createDomestic
      ? NO_CITIES.filter(c => c !== fromCity)[Math.floor(Math.random() * (NO_CITIES.length - 1))]
      : TOS[Math.floor(Math.random() * TOS.length)];'''

c = c.replace(old_gen, new_gen)

# 4. Set is_domestic in generateTrip return
c = c.replace(
    "      is_domestic:             body.is_domestic ?? false,",
    "      is_domestic:             body.is_domestic ?? false,"
)
# Update generateTrip return to include is_domestic
c = c.replace(
    "      customs_representative:  null,\n    };",
    "      customs_representative:  null,\n      is_domestic:             createDomestic,\n    };"
)

# 5. Add domestic toggle to create modal
old_modal_body = '''            <div style={{ padding: "20px" }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Number of trips to create</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setCreateCount(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#344054" }}>−</button>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#101828", minWidth: 32, textAlign: "center" as const }}>{createCount}</span>
                <button onClick={() => setCreateCount(c => Math.min(50, c + 1))} style={{ width: 32, height: 32, borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#344054" }}>+</button>
              </div>
            </div>'''

new_modal_body = '''            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Number of trips to create</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setCreateCount(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#344054" }}>−</button>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#101828", minWidth: 32, textAlign: "center" as const }}>{createCount}</span>
                  <button onClick={() => setCreateCount(c => Math.min(50, c + 1))} style={{ width: 32, height: 32, borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#344054" }}>+</button>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #F2F4F7", paddingTop: 16 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Route type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { val: false, label: "Utrikes", icon: "public", desc: "SE/DK → NO" },
                    { val: true,  label: "Inrikes",  icon: "home",   desc: "Innen Norge" },
                  ].map(({ val, label, icon, desc }) => (
                    <button key={String(val)} onClick={() => setCreateDomestic(val)}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 2, border: `2px solid ${createDomestic === val ? "#446BF9" : "#E4E7EC"}`, background: createDomestic === val ? "#EEF4FF" : "#fff", cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 14, color: createDomestic === val ? "#446BF9" : "#98A2B3" }}>{icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: createDomestic === val ? "#446BF9" : "#344054" }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "#98A2B3" }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>'''

if old_modal_body in c:
    c = c.replace(old_modal_body, new_modal_body)
    print("Modal updated")
else:
    print("Modal pattern not found")

with open(path, "w") as f:
    f.write(c)
print("Done")
