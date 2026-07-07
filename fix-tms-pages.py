import os

fixes = {
    "app/(shell)/tms/orders/page.tsx": {
        "old": '''  };`;\n    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, cms_id: cmsId } : o));\n    await fetch(`/api/tms/orders/${order.id}`, {\n      method: "PATCH",\n      headers: { "Content-Type": "application/json" },\n      body: JSON.stringify({ cms_id: cmsId }),\n    });\n  }''',
        "new": '''  };'''
    },
    "app/(shell)/tms/trips/page.tsx": {
        "old": '''  };`;\n    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, cms_id: cmsId } : t));\n    await fetch(`/api/tms/trips/${trip.id}`, {\n      method: "PATCH",\n      headers: { "Content-Type": "application/json" },\n      body: JSON.stringify({ cms_id: cmsId }),\n    });\n  }''',
        "new": '''  };'''
    },
}

for path, fix in fixes.items():
    if not os.path.exists(path):
        print(f"Not found: {path}")
        continue
    with open(path) as f:
        c = f.read()
    if fix["old"] in c:
        c = c.replace(fix["old"], fix["new"])
        with open(path, "w") as f:
            f.write(c)
        print(f"Fixed: {path}")
    else:
        # Try to find and show context
        idx = c.find('};`;')
        if idx >= 0:
            print(f"Found '}};\`' at {idx} in {path}, context:")
            print(repr(c[idx:idx+300]))
        else:
            print(f"Pattern not found in {path}")
