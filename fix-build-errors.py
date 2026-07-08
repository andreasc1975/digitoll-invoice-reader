import os, shutil

# Fix 1: Rename [line-id] folder to [lineId]
old_dir = "app/api/tms/orders/[id]/goods-lines/[line-id]"
new_dir = "app/api/tms/orders/[id]/goods-lines/[lineId]"
if os.path.exists(old_dir):
    shutil.move(old_dir, new_dir)
    print(f"Renamed {old_dir} → {new_dir}")
else:
    print(f"Dir not found: {old_dir}")

# Fix 2: Remove createCms reference from orders page
path2 = "app/(shell)/tms/orders/page.tsx"
with open(path2) as f:
    c = f.read()
# Remove the createCms call if it's still there as a button onClick
c = c.replace('onClick={() => createCms(order)}', 'onClick={() => {}}')
with open(path2, "w") as f:
    f.write(c)
print("Fixed createCms reference in orders page")

# Fix 3: Add missing fields to Trip interface in trips list page
path3 = "app/(shell)/tms/trips/page.tsx"
with open(path3) as f:
    c = f.read()

old_iface = '''interface Trip {
  id: string;
  reference: string;
  tags: string;
  status: string;
  departure: string;
  arrival: string;
  from: string;
  to: string;
  trip_status: string;
  customs_status: string;
  packages: number;
  gross_weight: number;
  loading_meters: number;
  resource: string;
  order_ids: string[];
  digitoll_id: string | null;
  cms_id: string | null;'''

new_iface = '''interface Trip {
  id: string;
  reference: string;
  tags: string;
  status: string;
  departure: string;
  arrival: string;
  from: string;
  to: string;
  trip_status: string;
  customs_status: string;
  packages: number;
  gross_weight: number;
  loading_meters: number;
  resource: string;
  order_ids: string[];
  digitoll_id: string | null;
  cms_id: string | null;
  vehicle_reg_no?: string | null;
  vehicle_nationality?: string | null;
  driver_name?: string | null;
  driver_contact?: string | null;
  customs_place?: string | null;
  customs_place_eta_date?: string | null;
  customs_place_eta_time?: string | null;
  means_of_transport_code?: string | null;
  transport_mode?: string | null;
  customs_representative?: string | null;
  is_domestic?: boolean | null;
  fortolling_type?: string | null;
  external_mrn?: string | null;'''

if old_iface in c:
    c = c.replace(old_iface, new_iface)
    print("Trip interface updated in trips list")
else:
    print("Trip interface pattern not found in trips list")

with open(path3, "w") as f:
    f.write(c)

print("Done")
