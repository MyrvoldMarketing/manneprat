# Manneprat – Comeback-testen (Lead Magnet Landingsside)

Komplett landingsside for Fredrik Klauset / manneprat.no med en sterk lead magnet rettet mot menn etter brudd: **Comeback-testen** – en 18-spørsmåls selvtest som gir en personlig rapport mot e-post.

## Hva er bygget

- **Hero** med tydelig verdiløfte og levende score-kort
- **Problem-seksjon** som speiler målgruppen (sinne, tomhet, pleasing, savn etter seg selv)
- **Lead magnet: Comeback-testen**
  - 18 spørsmål fordelt på 5 dimensjoner:
    - Emosjonell regulering
    - Selv-identitet
    - Grenser
    - Selvfølelse
    - Retning
  - Auto-advance, progress-bar, tilbake-knapp
  - E-postfangst med GDPR-consent
  - Personlig rapport med: total score (0–100), tier-label, per-dimensjon scores, tolkningstekst per område, 3 personaliserte neste-steg basert på svakeste dimensjoner
  - CTA til gratis 20-min samtale (peker til manneprat.no/11-2)
- **Metode-seksjon** (IFS, bio av Fredrik)
- **Testimonials / Historier**
- **FAQ** (håndterer de vanligste salgs-innvendingene)
- **Footer** med sosiale lenker (Instagram, TikTok, Spotify, YouTube)

## Kjøre lokalt

Ren statisk side – bare åpne `index.html` i nettleseren, eller kjør en enkel server:

```bash
cd manneprat-comeback
python3 -m http.server 5173
# → http://localhost:5173
```

## Filer

- `index.html` – struktur og copy (norsk)
- `styles.css` – maskulin/varm palett, Fraunces (display) + Inter (body)
- `script.js` – quiz-logikk, scoring, rapport-rendering

## Koble opp e-post (viktig neste steg)

I `script.js` finnes en tydelig merket **INTEGRATION POINT** i `emailForm`-handleren. I dag lagres leads bare i `localStorage` (for demo/test). Velg én:

### Alternativ 1: MailerLite (anbefalt for Fredrik)

1. Opprett en gruppe "Comeback-testen" i MailerLite.
2. Lag en automation: Trigger = "joins group" → send rapport-PDF + 7-dagers mailserie.
3. Legg inn API-kall i `script.js`:

```js
await fetch('https://connect.mailerlite.com/api/subscribers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer DIN_API_NØKKEL'
  },
  body: JSON.stringify({
    email,
    fields: { name, comeback_score: result.total, reg: result.dims.reg, /* ... */ },
    groups: ['DIN_GRUPPE_ID']
  })
});
```

**NB:** API-nøkkelen bør ikke ligge i klient-JS i produksjon. Bruk enten MailerLite sitt embed-skjema, eller en liten serverless-funksjon (Netlify/Vercel) som proxy.

### Alternativ 2: Formspree (raskest å teste)

1. Opprett et skjema på formspree.io.
2. Bytt ut `fetch`-linja i `script.js` med endpoint fra Formspree.

### Alternativ 3: Mailchimp / ConvertKit / ActiveCampaign

Samme mønster – alle har REST-endepunkter for subscribe.

## Deploy

Anbefalt: **Netlify** eller **Vercel** (drag-and-drop eller git-kobling). Ingen build-step nødvendig.

```bash
# Netlify CLI
netlify deploy --dir=. --prod
```

## Design-valg

- **Palett**: mørk grunntone (#0e1116) med varm kobber-aksent (#c9814a) – maskulint uten å være hardt.
- **Typografi**: Fraunces (serif, tunge vekter) for overskrifter = autoritet + varme. Inter for brødtekst = lesbarhet.
- **Tonen i copy**: direkte, ærlig, ikke-terapeutisk. Speiler Fredriks faktiske språkbruk fra manneprat.no ("Jeg har vært der", "Dette er ikke terapi").
- **Quiz-UX**: auto-advance etter valg, sticky progress, mulig å gå tilbake, e-postfangst kun etter at brukeren har investert 18 svar (maks commitment → maks conversion).

## Inspirasjon

- Mark Groves / Create the Love – attachment-quiz som capture
- Mark Manson – 2-minutters "life test"
- Tony Robbins DISC
- Menprovement, Order of Man – mannlig målgruppe-tone
- The Art of Manliness "Strenuous Life" assessment
