import re, os

files = [
    "app/(shell)/tms/trips/page.tsx",
    "app/(shell)/tms/orders/page.tsx",
]

for path in files:
    if not os.path.exists(path):
        print(f"Not found: {path}")
        continue

    with open(path) as f:
        c = f.read()

    original = c

    # Remove + Declaration button td cell (trips)
    c = re.sub(
        r'\s*<td[^>]*>\s*\{trip\.cms_id[^}]*\}[^<]*(?:<[^>]+>[^<]*</[^>]+>[^<]*)*\{[^}]*\+ Declaration[^}]*\}[^<]*</td>',
        '',
        c, flags=re.DOTALL
    )

    # Remove + Declaration button td cell (orders)
    c = re.sub(
        r'\s*<td[^>]*>\s*\{order\.cms_id[^}]*\}[^<]*(?:<[^>]+>[^<]*</[^>]+>[^<]*)*\{[^}]*\+ Declaration[^}]*\}[^<]*</td>',
        '',
        c, flags=re.DOTALL
    )

    # Remove CMS ID from column headers array
    c = c.replace('"CMS ID"', '')
    c = c.replace(", \"CMS ID\"", '')
    c = c.replace("\"CMS ID\",", '')

    # Remove createCms function
    c = re.sub(r'\s*async function createCms\([^)]+\)\s*\{[^}]+\}', '', c)

    # Remove cms_id state references if any
    # (cms_id is part of the interface, keep it there but remove UI)

    if c != original:
        with open(path, "w") as f:
            f.write(c)
        print(f"Updated: {path}")
    else:
        print(f"No changes: {path}")
