with open("app/(shell)/tms/trips/page.tsx") as f:
    c = f.read()

# Remove Digitoll ID column header
c = c.replace('"Digitoll ID", "CMS ID"', '"Digitoll ID"')

# Remove the entire Digitoll ID + CMS ID td cells from the row
# Replace the two last cells with just the Digitoll ID status (read-only, no button)
old_cells = '''                  {/* Digitoll ID */}
                  <td style={{ padding: "9px 12px" }}>
                    {trip.digitoll_id
                      ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>{trip.digitoll_id}</span>
                      : <span style={{ fontSize: 11.5, color: "#98A2B3" }}>—</span>
                    }
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {trip.digitoll_id ? (
                      <span style={{ fontSize: 11.5, color: "#027A48", fontWeight: 500 }}>✓ In Digitoll</span>
                    ) : (
                      <button
                        onClick={() => sendToDigitoll(trip)}
                        disabled={sending === trip.id || linkedOrders.length === 0}
                        title={linkedOrders.length === 0 ? "Add at least one order before sending to Digitoll" : "Send to Digitoll"}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 2,
                          background: linkedOrders.length === 0 ? "#F2F4F7" : "#446BF9",
                          color: linkedOrders.length === 0 ? "#98A2B3" : "#fff",
                          fontSize: 11.5, fontWeight: 700, border: "none",
                          cursor: linkedOrders.length === 0 ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          opacity: sending === trip.id ? 0.6 : 1,
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        {sending === trip.id ? "Sending…" : "→ Digitoll"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {trip.cms_id
                      ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>{trip.cms_id}</span>
                      : <button onClick={() => createCms(trip)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 2, background: "transparent", color: "#667085", fontSize: 11.5, fontWeight: 600, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                          + Declaration
                        </button>
                    }
                  </td>'''

new_cells = '''                  {/* Digitoll ID */}
                  <td style={{ padding: "9px 12px" }}>
                    {trip.digitoll_id
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>
                          <span style={{ fontFamily: "Material Icons", fontSize: 14, lineHeight: 1 }}>check_circle</span>
                          {trip.digitoll_id}
                        </span>
                      : <span style={{ fontSize: 11.5, color: "#98A2B3" }}>—</span>
                    }
                  </td>'''

if old_cells in c:
    c = c.replace(old_cells, new_cells)
    print("Replaced Digitoll/CMS cells")
else:
    print("Pattern not found")

# Remove CMS ID from column headers
c = c.replace(
    '"Reference", "Tags", "From", "To", "Departure", "Arrival", "Trip Status", "Customs", "Orders", "Gross kg", "Load m", "Resource", "Digitoll ID", "CMS ID"',
    '"Reference", "Tags", "From", "To", "Departure", "Arrival", "Trip Status", "Customs", "Orders", "Gross kg", "Load m", "Resource", "Digitoll ID"'
)

with open("app/(shell)/tms/trips/page.tsx", "w") as f:
    f.write(c)
print("Done")
