path = "app/(shell)/tms/trips/page.tsx"
with open(path) as f:
    c = f.read()

old_fn = '''  function toggleOrderLink(tripId: string, orderId: string) {
    setTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const already = t.order_ids.includes(orderId);
      return { ...t, order_ids: already ? t.order_ids.filter(o => o !== orderId) : [...t.order_ids, orderId] };
    }));
  }'''

new_fn = '''  async function toggleOrderLink(tripId: string, orderId: string) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const already = trip.order_ids.includes(orderId);
    const newIds = already ? trip.order_ids.filter(o => o !== orderId) : [...trip.order_ids, orderId];
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, order_ids: newIds } : t));
    await fetch(`/api/tms/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: newIds }),
    });
  }'''

if old_fn in c:
    c = c.replace(old_fn, new_fn)
    print("Fixed toggleOrderLink")
else:
    print("Pattern not found")

with open(path, "w") as f:
    f.write(c)
print("Done")
