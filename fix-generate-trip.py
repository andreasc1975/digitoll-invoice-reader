import os

path = "app/(shell)/tms/trips/page.tsx"
with open(path) as f:
    c = f.read()

# Find and replace the generateTrip function
old_fn = '  function generateTrip(): Trip {'
new_fn = '''  const DRIVERS = [
    { name: "Lars Eriksson",     contact: "+46 70 123 45 67" },
    { name: "Bjørn Hansen",      contact: "+47 91 234 56 78" },
    { name: "Mikael Lindqvist",  contact: "+46 73 345 67 89" },
    { name: "Ole Pedersen",      contact: "+47 98 456 78 90" },
    { name: "Stefan Johansson",  contact: "+46 76 567 89 01" },
    { name: "Knut Andersen",     contact: "+47 90 678 90 12" },
    { name: "Anders Nilsson",    contact: "+46 70 789 01 23" },
    { name: "Erik Christiansen", contact: "+47 92 890 12 34" },
    { name: "Per Magnusson",     contact: "+46 72 901 23 45" },
    { name: "Tor Olsen",         contact: "+47 93 012 34 56" },
  ];
  const CROSSINGS_FOR: Record<string, string> = {
    "Oslo": "Svinesund (E6)", "Bergen": "Svinesund (E6)",
    "Stavanger": "Svinesund (E6)", "Drammen": "Svinesund (E6)",
    "Kristiansand": "Ørje (E18)", "Trondheim": "Storlien (E14)",
    "Tromsø": "Björnfjell / Riksgransen (E10)",
  };
  const NAT_FOR: Record<string, string> = {
    "Gothenburg": "SE", "Stockholm": "SE", "Malmö": "SE",
    "Helsingborg": "SE", "Norrköping": "SE", "Copenhagen": "DK",
  };

  function generateTrip(): Trip {'''

if old_fn in c:
    c = c.replace(old_fn, new_fn, 1)
    print("Added DRIVERS constant")
else:
    print("generateTrip not found")
    exit()

# Now find the return statement inside generateTrip and add customs fields
# Look for the closing of the return object
old_return_end = '''      order_ids: [],
      digitoll_id: null,
      cms_id: null,
    };'''

new_return_end = '''      order_ids: [],
      digitoll_id: null,
      cms_id: null,
      vehicle_reg_no:          RESOURCES[Math.floor(Math.random() * RESOURCES.length)],
      vehicle_nationality:     NAT_FOR[fromCity] ?? "SE",
      driver_name:             DRIVERS[Math.floor(Math.random() * DRIVERS.length)].name,
      driver_contact:          DRIVERS[Math.floor(Math.random() * DRIVERS.length)].contact,
      customs_place:           CROSSINGS_FOR[toCity] ?? "Svinesund (E6)",
      customs_place_eta_date:  new Date((dep.getTime() + arr.getTime()) / 2).toISOString().slice(0, 10),
      customs_place_eta_time:  new Date((dep.getTime() + arr.getTime()) / 2).toISOString().slice(11, 16),
      means_of_transport_code: "31",
      transport_mode:          "Road",
      customs_representative:  null,
    };'''

if old_return_end in c:
    c = c.replace(old_return_end, new_return_end, 1)
    print("Added customs fields to return")
else:
    print("Return pattern not found — trying alternative")
    # Show context around cms_id: null
    idx = c.find('cms_id: null,\n    };')
    if idx >= 0:
        print(repr(c[idx-100:idx+50]))

with open(path, "w") as f:
    f.write(c)
print("Done")
