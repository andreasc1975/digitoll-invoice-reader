# Digitoll Invoice Reader

Läser av fakturor med Claude AI och extraherar tulldata för Digitoll-deklarationer.

## Stack
- **Next.js 15** (App Router, React 19)
- **Supabase** (Postgres + Storage)
- **Anthropic Claude** (vision/PDF-extraktion)
- **Vercel** (rekommenderat hosting)

---

## 1. Supabase-setup

1. Skapa ett nytt projekt på [supabase.com](https://supabase.com)
2. Gå till **SQL Editor** och kör innehållet i `supabase/schema.sql`
3. Notera dina nycklar under **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Anthropic API-nyckel

1. Gå till [console.anthropic.com](https://console.anthropic.com)
2. Skapa en API-nyckel → `ANTHROPIC_API_KEY`

---

## 3. Lokal utveckling

```bash
# Klona / ladda ner projektet
cd digitoll-invoice-reader

# Installera beroenden
npm install

# Kopiera env-filen och fyll i dina nycklar
cp .env.local.example .env.local
# Redigera .env.local med dina värden

# Starta dev-servern
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000)

---

## 4. Deploy på Vercel (rekommenderat)

```bash
# Installera Vercel CLI
npm i -g vercel

# Deploya (följ promptarna)
vercel
```

Eller koppla GitHub-repot direkt i [vercel.com](https://vercel.com) — Vercel känner igen Next.js automatiskt.

Lägg till dina **Environment Variables** under **Project → Settings → Environment Variables** i Vercel-dashboarden.

---

## Projektstruktur

```
app/
  page.tsx                  # Huvud-UI (invoice list + form)
  layout.tsx                # Root layout (light mode)
  globals.css               # Design system
  api/
    invoices/
      route.ts              # GET lista, POST skapa + ladda upp
      [id]/route.ts         # PATCH uppdatera fält, POST exportera
    extract/
      route.ts              # POST → Claude AI-extraktion
lib/
  supabase.ts               # Supabase-klienter
  fields.ts                 # Fältdefinitioner, calcCompletion, buildDigitollJSON
supabase/
  schema.sql                # Databas-schema (kör i Supabase SQL Editor)
```

---

## Databastabeller

| Tabell | Beskrivning |
|--------|-------------|
| `invoices` | En rad per uppladdad faktura |
| `invoice_fields` | Extraherade fältvärden (AI + manuella) |
| `exports` | Sparar varje Digitoll-export som JSONB |

---

## Filformat som stöds

- PDF (rekommenderat – bäst OCR-resultat)
- PNG, JPG/JPEG

---

## Nästa steg

- Lägg till Supabase Auth för flerbrukarstöd
- Aktivera Row Level Security (RLS) i `schema.sql`
- Konfigurera en custom domän i Vercel
