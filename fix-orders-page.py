import os

path = "app/(shell)/tms/orders/page.tsx"
if not os.path.exists(path):
    print(f"Not found: {path}")
    exit()

with open(path) as f:
    c = f.read()

# Remove the broken fragment left by the regex
old_broken = '''  };`;
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, cms_id: cmsId } : o));
    await fetch(`/api/tms/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cms_id: cmsId }),
    });
  }'''

new_clean = '''  };'''

if old_broken in c:
    c = c.replace(old_broken, new_clean)
    print("Fixed broken fragment")
else:
    print("Pattern not found — printing context:")
    idx = c.find('};`;')
    if idx >= 0:
        print(repr(c[idx-50:idx+200]))

with open(path, "w") as f:
    f.write(c)
print("Done")
