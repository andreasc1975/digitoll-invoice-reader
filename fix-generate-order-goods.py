import os

path = "app/(shell)/tms/orders/page.tsx"
if not os.path.exists(path):
    print(f"Not found: {path}")
    exit()

with open(path) as f:
    c = f.read()

# After createOrders() saves the orders, seed goods lines for each
old_create = '''  async function createOrders() {
    const newOrders = Array.from({ length: createCount }, generateOrder);
    await Promise.all(newOrders.map(o =>
      fetch("/api/tms/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o),
      })
    ));
    setCreateModal(false);
    setCreateCount(1);
    load();
  }'''

new_create = '''  const GOODS_DATA = [
    { hs: "0302.11.00", desc: "Atlantic salmon, fresh",    origin: "NO" },
    { hs: "0302.13.00", desc: "Atlantic trout, fresh",     origin: "NO" },
    { hs: "0302.14.00", desc: "Halibut, fresh",            origin: "NO" },
    { hs: "0302.19.00", desc: "Cod, fresh",                origin: "NO" },
    { hs: "0302.21.00", desc: "Haddock, fresh",            origin: "NO" },
    { hs: "0302.22.00", desc: "Saithe, fresh",             origin: "NO" },
    { hs: "0302.29.00", desc: "Herring, fresh",            origin: "SE" },
    { hs: "0303.11.00", desc: "Atlantic salmon, frozen",   origin: "NO" },
    { hs: "0303.51.00", desc: "Herring, frozen",           origin: "IS" },
    { hs: "0304.31.00", desc: "Salmon fillet, fresh",      origin: "NO" },
    { hs: "0304.32.00", desc: "Cod fillet, fresh",         origin: "NO" },
    { hs: "0302.61.00", desc: "Mackerel, fresh",           origin: "NO" },
    { hs: "0302.41.00", desc: "Plaice, fresh",             origin: "DK" },
    { hs: "0302.51.00", desc: "Redfish, fresh",            origin: "IS" },
    { hs: "0302.71.00", desc: "Shrimp, fresh",             origin: "NO" },
  ];

  async function createOrders() {
    const newOrders = Array.from({ length: createCount }, generateOrder);
    const results = await Promise.all(newOrders.map(o =>
      fetch("/api/tms/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o),
      }).then(r => r.json())
    ));
    // Seed 3-20 goods lines per new order
    await Promise.all(results.map(async (order: { id: string }) => {
      if (!order.id) return;
      const numLines = 3 + Math.floor(Math.random() * 18);
      const shuffled = [...GOODS_DATA].sort(() => Math.random() - 0.5).slice(0, numLines);
      await Promise.all(shuffled.map((g, i) => {
        const gw = Math.round((20 + Math.random() * 200) * 100) / 100;
        const nw = Math.round(gw * (0.85 + Math.random() * 0.1) * 100) / 100;
        return fetch(`/api/tms/orders/${order.id}/goods-lines`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sort_order: i + 1,
            hs_code: g.hs,
            description: g.desc,
            country_of_origin: g.origin,
            gross_weight: gw,
            net_weight: nw,
            packages: 1 + Math.floor(Math.random() * 5),
            statistical_value: Math.round(gw * (8 + Math.random() * 20) * 100) / 100,
            customs_procedure: Math.random() > 0.2 ? "40 00" : "42 00",
          }),
        });
      }));
    }));
    setCreateModal(false);
    setCreateCount(1);
    load();
  }'''

if old_create in c:
    c = c.replace(old_create, new_create)
    print("createOrders updated")
else:
    print("Pattern not found")

with open(path, "w") as f:
    f.write(c)
