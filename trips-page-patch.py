# Run this from your project root:
# python3 trips-page-patch.py

with open("app/(shell)/tms/trips/page.tsx") as f:
    c = f.read()

# 1. Add useRouter import
c = c.replace(
    'import { useState, useEffect, useCallback } from "react";',
    'import { useState, useEffect, useCallback } from "react";\nimport { useRouter } from "next/navigation";'
)

# 2. Add router hook after component opens
c = c.replace(
    'export default function TMSTrips() {\n  const [trips, setTrips] = useState<Trip[]>([]);',
    'export default function TMSTrips() {\n  const router = useRouter();\n  const [trips, setTrips] = useState<Trip[]>([]);'
)

# 3. Make reference cell clickable
c = c.replace(
    '<td style={{ padding: "9px 12px", fontWeight: 600, color: "#175CD3" }}>{trip.reference}</td>',
    '<td style={{ padding: "9px 12px", fontWeight: 600, color: "#175CD3", cursor: "pointer" }} onClick={() => router.push(`/tms/trips/${trip.id}`)}>{trip.reference}</td>'
)

with open("app/(shell)/tms/trips/page.tsx", "w") as f:
    f.write(c)

print("Done! Changes applied.")
