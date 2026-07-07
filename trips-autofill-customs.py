import os

path = "app/(shell)/tms/trips/page.tsx"
if not os.path.exists(path):
    print(f"Not found: {path}")
    exit()

with open(path) as f:
    c = f.read()

# Find generateTrip function and extend it with customs data
old_generate_return = '''    return {
      id,
      reference: `TR-${num}`,
      tags: TAGS[Math.floor(Math.random() * TAGS.length)],
      status: "Active",
      departure: dep.toISOString().slice(0, 16).replace("T", " "),
      arrival: arr.toISOString().slice(0, 16).replace("T", " "),
      from: fromCity,
      to: toCity,
      trip_status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      customs_status: Math.random() > 0.2 ? "Cleared" : "Pending",
      packages: pkgs,
      gross_weight: Math.floor(pkgs * 80 + Math.random() * 500),
      loading_meters: Math.round((1 + Math.random() * 8) * 10) / 10,
      resource: RESOURCES[Math.floor(Math.random() * RESOURCES.length)],
      order_ids: [],
      digitoll_id: null,
      cms_id: null,
    };'''

new_generate_return = '''    const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
    const driver   = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
    const crossing = CROSSINGS_FOR[toCity] ?? CROSSINGS[Math.floor(Math.random() * CROSSINGS.length)];
    const motCode  = fromCity === "Copenhagen" || fromCity === "Malmö" ? "31" : "31";
    // ETA at customs = halfway between dep and arr
    const customsEta = new Date((dep.getTime() + arr.getTime()) / 2);

    return {
      id,
      reference: `TR-${num}`,
      tags: TAGS[Math.floor(Math.random() * TAGS.length)],
      status: "Active",
      departure: dep.toISOString().slice(0, 16).replace("T", " "),
      arrival: arr.toISOString().slice(0, 16).replace("T", " "),
      from: fromCity,
      to: toCity,
      trip_status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      customs_status: Math.random() > 0.2 ? "Cleared" : "Pending",
      packages: pkgs,
      gross_weight: Math.floor(pkgs * 80 + Math.random() * 500),
      loading_meters: Math.round((1 + Math.random() * 8) * 10) / 10,
      resource,
      order_ids: [],
      digitoll_id: null,
      cms_id: null,
      // Customs fields — auto-filled
      vehicle_reg_no:          resource,
      vehicle_nationality:     NAT_FOR[fromCity] ?? "SE",
      driver_name:             driver.name,
      driver_contact:          driver.contact,
      customs_place:           crossing,
      customs_place_eta_date:  customsEta.toISOString().slice(0, 10),
      customs_place_eta_time:  customsEta.toISOString().slice(11, 16),
      means_of_transport_code: motCode,
      transport_mode:          "Road",
      customs_representative:  null,
    };'''

if old_generate_return in c:
    c = c.replace(old_generate_return, new_generate_return)
    print("generateTrip return updated")
else:
    print("generateTrip return pattern not found")

# Add constants before generateTrip function
old_generate_fn = '  function generateTrip(): Trip {'
new_constants = '''  const DRIVERS = [
    { name: "Lars Eriksson",      contact: "+46 70 123 45 67" },
    { name: "Bjørn Hansen",       contact: "+47 91 234 56 78" },
    { name: "Mikael Lindqvist",   contact: "+46 73 345 67 89" },
    { name: "Ole Pedersen",       contact: "+47 98 456 78 90" },
    { name: "Stefan Johansson",   contact: "+46 76 567 89 01" },
    { name: "Knut Andersen",      contact: "+47 90 678 90 12" },
    { name: "Anders Nilsson",     contact: "+46 70 789 01 23" },
    { name: "Erik Christiansen",  contact: "+47 92 890 12 34" },
    { name: "Per Magnusson",      contact: "+46 72 901 23 45" },
    { name: "Tor Olsen",          contact: "+47 93 012 34 56" },
  ];
  const CROSSINGS: string[] = [
    "Svinesund (E6)", "Ørje (E18)", "Magnormoen (rv. 2)",
    "Storlien (E14)", "Björnfjell / Riksgransen (E10)", "Storskog (E105)",
  ];
  const CROSSINGS_FOR: Record<string, string> = {
    "Oslo":         "Svinesund (E6)",
    "Bergen":       "Svinesund (E6)",
    "Trondheim":    "Storlien (E14)",
    "Stavanger":    "Svinesund (E6)",
    "Kristiansand": "Ørje (E18)",
    "Drammen":      "Svinesund (E6)",
  };
  const NAT_FOR: Record<string, string> = {
    "Gothenburg":  "SE", "Stockholm": "SE", "Malmö": "SE",
    "Helsingborg": "SE", "Norrköping": "SE",
    "Copenhagen":  "DK",
  };

  function generateTrip(): Trip {'''

if old_generate_fn in c:
    c = c.replace(old_generate_fn, new_constants)
    print("Constants added")
else:
    print("generateTrip function header not found")

# Also add customs fields to Trip interface
old_trip_iface = '''interface Trip {
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
}'''

new_trip_iface = '''interface Trip {
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
}'''

if old_trip_iface in c:
    c = c.replace(old_trip_iface, new_trip_iface)
    print("Trip interface updated")
else:
    print("Trip interface pattern not found")

with open(path, "w") as f:
    f.write(c)
print("Done")
