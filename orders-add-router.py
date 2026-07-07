with open("app/(shell)/tms/orders/page.tsx") as f:
    c = f.read()

# Add useRouter import
c = c.replace(
    'import { useState, useEffect, useCallback } from "react";',
    'import { useState, useEffect, useCallback } from "react";\nimport { useRouter } from "next/navigation";'
)

# Add router hook
c = c.replace(
    'export default function TMSOrders() {\n  const [orders, setOrders] = useState<Order[]>([]);',
    'export default function TMSOrders() {\n  const router = useRouter();\n  const [orders, setOrders] = useState<Order[]>([]);'
)

# Make reference clickable
c = c.replace(
    '<td style={{ padding: "9px 12px", fontWeight: 600, color: "#175CD3" }}>{order.reference}</td>',
    '<td style={{ padding: "9px 12px", fontWeight: 600, color: "#175CD3", cursor: "pointer" }} onClick={() => router.push(`/tms/orders/${order.id}`)}>{order.reference}</td>'
)

with open("app/(shell)/tms/orders/page.tsx", "w") as f:
    f.write(c)
print("Done")
