# DCQ Bikes - Financieel Dashboard

Een uitgebreid financieel dashboard voor DCQ Bikes dat automatisch financiële data extract uit CSV bestanden van NBB Consult jaarrekeningen.

## Project Structuur

```
financialstatementanalyzer/
├── index.html          # Hoofd HTML bestand (GitHub Pages entry point)
├── styles.css          # Custom CSS styling
├── app.js              # JavaScript logica en data verwerking
├── .nojekyll           # GitHub Pages configuratie
├── data/
│   ├── csv/            # CSV bestanden met financiële data
│   └── pdfs/           # PDF bestanden (niet gebruikt voor analyse)
└── README.md           # Deze documentatie
```

## Features

- **Automatische CSV Parsing**: Extract financiële data uit Belgische boekhoudformaten
- **Uitgebreide Data Extractie**: 
  - Resultatenrekening (Brutomarge, Bedrijfswinst, Netto Winst)
  - Balans (Activa, Passiva, Eigen Vermogen)
  - Liquiditeit en Solvabiliteit ratio's
- **Interactieve Visualisaties**: 
  - Brutomarge trends
  - Winstgevendheid analyse
  - Activa vs Eigen Vermogen
  - Marge trends
  - Liquiditeit ratio's
- **KPI Berekeningen**: 
  - ROA, ROE
  - Verschillende winstmarges
  - Huidige ratio, Schuld/Eigen Vermogen ratio
- **Inzichten**: Automatische analyse van trends en financiële gezondheid
- **Export Functionaliteit**: JSON en CSV export

## Gebruik

### GitHub Pages (Aanbevolen)

Het dashboard is beschikbaar via GitHub Pages:

1. Push de code naar een GitHub repository
2. Ga naar **Settings** → **Pages** in je GitHub repository
3. Selecteer de branch (meestal `main` of `master`)
4. Het dashboard is beschikbaar op: `https://[username].github.io/financialstatementanalyzer/`

### Lokaal ontwikkelen

Voor lokale ontwikkeling moet je een lokale server gebruiken vanwege CORS restricties:

```bash
# Python 3
python -m http.server 8000

# Of met Node.js (http-server)
npx http-server

# Open dan: http://localhost:8000
```

**Let op**: Open `index.html` niet direct in de browser (file:// protocol) - dit werkt niet vanwege CORS restricties.

## Technologie

- **HTML5**: Semantische structuur
- **Tailwind CSS**: Utility-first CSS framework (via CDN)
- **Chart.js**: Interactieve grafieken (via CDN)
- **Vanilla JavaScript**: Geen frameworks, pure JS

## Data Extractie

Het dashboard gebruikt Belgische boekhoudcodes om data te identificeren:

- `9900`: Brutomarge
- `9901`: Bedrijfswinst
- `9904`: Netto Winst
- `20/58`: Totale Activa
- `10/15`: Eigen Vermogen
- `29/58`: Vlottende Activa
- `42/48`: Vlottende Passiva
- En meer...

## Aanpassen

De CSV parsing logica kan aangepast worden in `app.js` in de functie `extractFinancialData()`. 
Nieuwe codes kunnen toegevoegd worden aan de `knownCodes` array.

## Licentie

Interne tool voor DCQ Bikes.

