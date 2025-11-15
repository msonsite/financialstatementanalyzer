// ============================================================================
// DCQ Bikes Financial Dashboard - JavaScript
// ============================================================================

console.log('🚴 DCQ Bikes Dashboard - JavaScript wordt geladen...');

// Check if running from file:// protocol (CORS issues)
if (window.location.protocol === 'file:') {
    console.error('❌ CORS WAARSCHUWING: Dashboard wordt geladen via file:// protocol');
    console.error('⚠️ CSV bestanden kunnen niet geladen worden via file:// vanwege CORS restricties');
    console.error('💡 Oplossing: Gebruik een lokale server:');
    console.error('   - Python: python -m http.server 8000');
    console.error('   - Node.js: npx http-server');
    console.error('   - Open dan: http://localhost:8000/dashboard.html');
    
    // Show error in UI
    document.addEventListener('DOMContentLoaded', function() {
        const statusLog = document.getElementById('statusLog');
        if (statusLog) {
            statusLog.innerHTML = `
                <div class="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-4">
                    <h3 class="text-red-800 font-bold text-lg mb-2">⚠️ CORS Fout Gedetecteerd</h3>
                    <p class="text-red-700 mb-2">Het dashboard kan CSV bestanden niet laden via file:// protocol.</p>
                    <p class="text-red-700 font-semibold mb-2">Oplossing:</p>
                    <ol class="list-decimal list-inside text-red-700 space-y-1 ml-4">
                        <li>Open een terminal in deze map</li>
                        <li>Run: <code class="bg-red-100 px-2 py-1 rounded">python -m http.server 8000</code></li>
                        <li>Open: <code class="bg-red-100 px-2 py-1 rounded">http://localhost:8000/dashboard.html</code></li>
                    </ol>
                </div>
            `;
        }
    });
}

// Configuratie
const CSV_FILES = [
    { year: 2019, path: 'data/csv/tabula-2019-05400291.csv' },
    { year: 2020, path: 'data/csv/tabula-2020-05200471.csv' },
    { year: 2021, path: 'data/csv/tabula-2021-04200022.csv' },
    { year: 2022, path: 'data/csv/tabula-2022-04800567.csv' },
    { year: 2023, path: 'data/csv/tabula-2023-00020958.csv' },
    { year: 2024, path: 'data/csv/tabula-2024-00023744.csv' },
    { year: 2025, path: 'data/csv/tabula-2025-00020874.csv' }
];

// Data opslag
let financialData = {};

// Chart Color Palette - DCQ Brand Colors with variations for distinction
const CHART_COLORS = {
    // Primary DCQ colors
    dcqRed: 'rgb(238, 39, 38)',
    dcqRedLight: 'rgb(255, 99, 98)',
    dcqRedDark: 'rgb(200, 20, 20)',
    dcqBlack: 'rgb(1, 1, 1)',
    dcqBlackLight: 'rgb(60, 60, 60)',
    dcqBlackDark: 'rgb(0, 0, 0)',
    
    // Complementary colors that work with DCQ brand
    orange: 'rgb(255, 140, 0)',
    orangeLight: 'rgb(255, 180, 60)',
    blue: 'rgb(30, 144, 255)',
    blueLight: 'rgb(100, 180, 255)',
    green: 'rgb(34, 197, 94)',
    greenLight: 'rgb(74, 222, 128)',
    purple: 'rgb(147, 51, 234)',
    purpleLight: 'rgb(192, 132, 252)',
    teal: 'rgb(20, 184, 166)',
    tealLight: 'rgb(94, 234, 212)',
    amber: 'rgb(245, 158, 11)',
    amberLight: 'rgb(251, 191, 36)',
    
    // Background colors with opacity
    dcqRedBg: 'rgba(238, 39, 38, 0.1)',
    dcqRedBgMedium: 'rgba(238, 39, 38, 0.4)',
    dcqRedBgStrong: 'rgba(238, 39, 38, 0.6)',
    dcqBlackBg: 'rgba(1, 1, 1, 0.1)',
    dcqBlackBgMedium: 'rgba(1, 1, 1, 0.4)',
    dcqBlackBgStrong: 'rgba(1, 1, 1, 0.6)',
    orangeBg: 'rgba(255, 140, 0, 0.1)',
    orangeBgMedium: 'rgba(255, 140, 0, 0.4)',
    orangeBgStrong: 'rgba(255, 140, 0, 0.6)',
    blueBg: 'rgba(30, 144, 255, 0.1)',
    blueBgMedium: 'rgba(30, 144, 255, 0.4)',
    blueBgStrong: 'rgba(30, 144, 255, 0.6)',
    greenBg: 'rgba(34, 197, 94, 0.1)',
    greenBgMedium: 'rgba(34, 197, 94, 0.4)',
    greenBgStrong: 'rgba(34, 197, 94, 0.6)',
    purpleBg: 'rgba(147, 51, 234, 0.1)',
    purpleBgMedium: 'rgba(147, 51, 234, 0.4)',
    purpleBgStrong: 'rgba(147, 51, 234, 0.6)',
    tealBg: 'rgba(20, 184, 166, 0.1)',
    tealBgMedium: 'rgba(20, 184, 166, 0.4)',
    tealBgStrong: 'rgba(20, 184, 166, 0.6)',
    amberBg: 'rgba(245, 158, 11, 0.1)',
    amberBgMedium: 'rgba(245, 158, 11, 0.4)',
    amberBgStrong: 'rgba(245, 158, 11, 0.6)'
};

// Chart instances
let revenueChart = null;
let profitabilityChart = null;
let assetsChart = null;
let marginsChart = null;
let ratiosChart = null;
let cashFlowChart = null;
let growthChart = null;
let efficiencyChart = null;
let debtChart = null;
let kpiTrendChart = null;

// ============================================================================
// CSV Parsing Functies
// ============================================================================

/**
 * Parse een nummer uit een CSV cel, handel verschillende formaten af
 * Handelt punten als duizendtallen scheidingstekens, komma's als decimalen (Belgisch formaat)
 * BELANGRIJK: De CSV waarden zijn al in volledige EUR bedragen, niet in duizendtallen
 * Dus "23.204" betekent 23.204 EUR (niet 23.204.000 EUR)
 * 
 * @param {string} value - De waarde om te parsen
 * @param {boolean} isFinancialAmount - True als dit een financieel bedrag is, false voor andere waarden zoals aantal werknemers
 */
function parseNumber(value, isFinancialAmount = true) {
    if (!value || value.trim() === '' || value === 'XXXXXXXXXX') return null;
    
    let cleaned = value.toString().trim().replace(/\s/g, '');
    const originalCleaned = cleaned;
    
    // Als het een komma bevat, behandel als decimaal scheidingsteken (Belgisch formaat)
    if (cleaned.includes(',') && cleaned.includes('.')) {
        // Beide komma en punt: neem aan dat punt duizendtallen is, komma is decimaal
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        // Alleen komma: kan duizendtallen of decimaal zijn
        const parts = cleaned.split(',');
        if (parts[1] && parts[1].length > 3) {
            cleaned = cleaned.replace(/,/g, '');
        } else {
            cleaned = cleaned.replace(',', '.');
        }
    } else if (cleaned.includes('.')) {
        // Alleen punt: in Belgische jaarrekeningen is dit een duizendtallen scheidingsteken
        // Bijvoorbeeld: 23.204 = 23,204 EUR (niet 23.204.000 EUR)
        // De CSV waarden zijn al in volledige EUR bedragen
        const parts = cleaned.split('.');
        
        // Als er meerdere punten zijn, zijn het duizendtallen scheidingstekens
        if (parts.length > 2) {
            cleaned = cleaned.replace(/\./g, '');
        }
        // Als er 1 punt is, controleer of het duizendtallen of decimaal is
        else if (parts.length === 2) {
            const beforeDot = parseFloat(parts[0]);
            const afterDot = parts[1];
            
            // Voor financiële bedragen: als het na de punt 3 cijfers heeft, is het waarschijnlijk duizendtallen
            // Bijvoorbeeld: 8.064, 23.204, 340.936
            if (isFinancialAmount) {
                // Als na de punt 3 cijfers staan, is het duizendtallen scheidingsteken
                if (afterDot.length === 3) {
                    cleaned = cleaned.replace('.', ''); // Verwijder punt (duizendtallen scheidingsteken)
                }
                // Als na de punt 1-2 cijfers staan en voor de punt > 1, is het ook waarschijnlijk duizendtallen
                // Bijvoorbeeld: 8.06, 23.20 (afgerond)
                else if (afterDot.length <= 2 && beforeDot > 1) {
                    cleaned = cleaned.replace('.', ''); // Verwijder punt
                }
                // Anders, als voor de punt > 10, is het waarschijnlijk duizendtallen
                else if (!isNaN(beforeDot) && beforeDot > 10) {
                    cleaned = cleaned.replace('.', ''); // Verwijder punt
                }
                // Voor alle andere financiële bedragen, verwijder ook de punt (veilige aanname)
                else {
                    cleaned = cleaned.replace('.', '');
                }
            }
            // Voor niet-financiële waarden (zoals werknemers), behandel als decimaal
            else {
                // Alleen als het duidelijk een decimaal is (bijv. 1.5 werknemers)
                if (beforeDot < 10 && afterDot.length <= 2) {
                    cleaned = cleaned.replace('.', '.'); // Behoud als decimaal
                } else {
                    cleaned = cleaned.replace('.', ''); // Anders, verwijder punt
                }
            }
        }
    }
    
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    
    // BELANGRIJK: De CSV waarden zijn al in volledige EUR bedragen
    // De punt is een duizendtallen scheidingsteken, niet een indicator dat het in duizendtallen is
    // Bijvoorbeeld: "23.204" in CSV = 23.204 EUR (niet 23.204.000 EUR)
    // We vermenigvuldigen NIET met 1000 omdat de waarden al correct zijn
    
    return num;
}

/**
 * Parse CSV regel met correcte quote handling
 */
function parseCSVLine(line) {
    const columns = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            columns.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    columns.push(current.trim()); // Laatste kolom
    return columns;
}

/**
 * Extract financiële data uit CSV content
 * Gebruikt Belgische boekhoudcodes om regelitems te identificeren
 */
// Static variable om boekjaar kolom index te onthouden tussen regels
extractFinancialData.boekjaarColumnIndex = -1;

function extractFinancialData(csvText, year) {
    // Reset boekjaar kolom index voor elk nieuw bestand
    extractFinancialData.boekjaarColumnIndex = -1;
    
    const lines = csvText.split('\n');
    const data = {
        year: year,
        // Resultatenrekening - Alle categorieën
        revenue: null,              // Omzet (Code 70)
        costOfGoodsSold: null,      // Handelsgoederen, grondstoffen (Code 60/61)
        grossMargin: null,          // Brutomarge (Code 9900)
        personnelCosts: null,       // Bezoldigingen, sociale lasten (Code 62)
        depreciation: null,         // Afschrijvingen (Code 630)
        inventoryWriteDowns: null,  // Waardeverminderingen voorraden (Code 631/4)
        incomeProvisions: null,     // Voorzieningen resultatenrekening (Code 635/8)
        otherCosts: null,           // Andere bedrijfskosten (Code 640/8)
        restructuringCosts: null,  // Herstructureringskosten (Code 649)
        nonRecurringCosts: null,   // Niet-recurrente bedrijfskosten (Code 66A)
        operatingProfit: null,      // Bedrijfswinst (Code 9901)
        financialIncome: null,      // Financiële opbrengsten (Code 75)
        financialCosts: null,       // Financiële kosten (Code 65)
        profitBeforeTax: null,      // Winst vóór belasting (Code 9903)
        deferredTax: null,          // Uitgestelde belastingen (Code 680/780)
        taxes: null,                // Belastingen op resultaat (Code 67/77)
        netProfit: null,            // Winst boekjaar (Code 9904)
        taxFreeReserves: null,      // Belastingvrije reserves (Code 689/789)
        profitToDistribute: null,   // Te bestemmen winst (Code 9905/9906)
        // Balans - Activa
        totalAssets: null,          // Totaal activa (Code 20/58)
        startupCosts: null,         // Oprichtingskosten (Code 20)
        fixedAssets: null,          // Vaste activa (Code 21/28)
        intangibleAssets: null,     // Immateriële vaste activa (Code 21)
        tangibleAssets: null,       // Materiële vaste activa (Code 22/27)
        financialFixedAssets: null, // Financiële vaste activa (Code 28)
        currentAssets: null,        // Vlottende activa (Code 29/58)
        longTermReceivables: null,  // Vorderingen > 1 jaar (Code 29)
        inventory: null,            // Voorraden (Code 30/36)
        workInProgress: null,        // Bestellingen in uitvoering (Code 37)
        receivables: null,          // Vorderingen <= 1 jaar (Code 40/41)
        tradeReceivables: null,     // Handelsvorderingen (Code 40)
        otherReceivables: null,     // Overige vorderingen (Code 41)
        investments: null,          // Geldbeleggingen (Code 50/53)
        cash: null,                 // Liquide middelen (Code 54/58)
        // Balans - Passiva
        equity: null,               // Eigen vermogen (Code 10/15)
        capital: null,              // Kapitaal/Inbreng (Code 10/11)
        capitalAvailable: null,     // Beschikbaar kapitaal (Code 110)
        capitalUnavailable: null,   // Onbeschikbaar kapitaal (Code 111)
        revaluationReserves: null,  // Herwaarderingsmeerwaarden (Code 12)
        reserves: null,             // Reserves (Code 13)
        unavailableReserves: null, // Onbeschikbare reserves (Code 130/1)
        taxFreeReserves: null,      // Belastingvrije reserves (Code 132)
        availableReserves: null,    // Beschikbare reserves (Code 133)
        retainedEarnings: null,     // Overgedragen winst (Code 14)
        capitalSubsidies: null,     // Kapitaalsubsidies (Code 15)
        provisions: null,          // Voorzieningen (Code 16)
        totalLiabilities: null,    // Totaal passiva (Code 17/49)
        longTermDebt: null,        // Schulden > 1 jaar (Code 17)
        financialDebt: null,       // Financiële schulden (Code 170/4)
        bankDebt: null,            // Kredietinstellingen (Code 172/3)
        currentLiabilities: null,  // Schulden <= 1 jaar (Code 42/48)
        shortTermFinancialDebt: null, // Financiële schulden kort (Code 43)
        tradePayables: null,       // Leveranciers (Code 44)
        taxPayables: null,         // Belastingen te betalen (Code 45)
        salaryPayables: null,       // Bezoldigingen te betalen (Code 454/9)
        prepayments: null,         // Vooruitbetalingen (Code 46)
        otherPayables: null,       // Overige schulden (Code 47/48)
        // Overige
        employees: null,            // Aantal werknemers (Code 100)
        employeeCosts: null         // Personeelskosten totaal (Code 102)
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const columns = parseCSVLine(line);
        
        if (columns.length < 3) continue;
        
        const lineLower = line.toLowerCase();
        
        // Zoek naar codes in kolommen
        let code = null;
        let value = null;
        
        // Code mapping - alle Belgische boekhoudcodes
        const codeMapping = {
            // Resultatenrekening
            '70': 'revenue',
            '60/61': 'costOfGoodsSold',
            '9900': 'grossMargin',
            '62': 'personnelCosts',
            '630': 'depreciation',
            '631/4': 'inventoryWriteDowns',
            '635/8': 'incomeProvisions',
            '640/8': 'otherCosts',
            '649': 'restructuringCosts',
            '66A': 'nonRecurringCosts',
            '9901': 'operatingProfit',
            '75': 'financialIncome',
            '75/76B': 'financialIncome',
            '65': 'financialCosts',
            '65/66B': 'financialCosts',
            '9903': 'profitBeforeTax',
            '67/77': 'taxes',
            '9904': 'netProfit',
            '9905': 'profitToDistribute',
            '9906': 'profitToDistribute',
            // Balans Activa
            '20': 'startupCosts',
            '20/58': 'totalAssets',
            '21/28': 'fixedAssets',
            '21': 'intangibleAssets',
            '22/27': 'tangibleAssets',
            '28': 'financialFixedAssets',
            '29/58': 'currentAssets',
            '29': 'longTermReceivables',
            '30/36': 'inventory',
            '37': 'workInProgress',
            '40/41': 'receivables',
            '40': 'tradeReceivables',
            '41': 'otherReceivables',
            '50/53': 'investments',
            '54/58': 'cash',
            // Balans Passiva
            '10/15': 'equity',
            '10/11': 'capital',
            '110': 'capitalAvailable',
            '111': 'capitalUnavailable',
            '12': 'revaluationReserves',
            '13': 'reserves',
            '130/1': 'unavailableReserves',
            '132': 'taxFreeReserves',
            '133': 'availableReserves',
            '14': 'retainedEarnings',
            '15': 'capitalSubsidies',
            '16': 'provisions',
            '17/49': 'totalLiabilities',
            '17': 'longTermDebt',
            '170/4': 'financialDebt',
            '172/3': 'bankDebt',
            '42/48': 'currentLiabilities',
            '43': 'shortTermFinancialDebt',
            '44': 'tradePayables',
            '45': 'taxPayables',
            '454/9': 'salaryPayables',
            '46': 'prepayments',
            '47/48': 'otherPayables',
            // Overige
            '100': 'employees',
            '102': 'employeeCosts'
        };
        
        // Detecteer header rij om kolom structuur te bepalen
        // Sla de "Boekjaar" kolom index op voor deze CSV structuur
        // Deze wordt gebruikt voor alle volgende regels in deze sectie
        if (lineLower.includes('boekjaar') && !lineLower.includes('vorig')) {
            // Zoek "Boekjaar" kolom index (niet "Vorig boekjaar")
            for (let k = 0; k < columns.length; k++) {
                const colLower = columns[k].toLowerCase();
                if (colLower.includes('boekjaar') && !colLower.includes('vorig')) {
                    extractFinancialData.boekjaarColumnIndex = k;
                    break;
                }
            }
        }
        
        // Gebruik de opgeslagen boekjaar kolom index als beschikbaar
        const boekjaarColumnIndex = extractFinancialData.boekjaarColumnIndex >= 0 
            ? extractFinancialData.boekjaarColumnIndex 
            : -1;
        
        for (let j = 0; j < columns.length; j++) {
            const col = columns[j].trim();
            
            if (codeMapping.hasOwnProperty(col)) {
                code = col;
                let numValue = null;
                
                // BELANGRIJK: In Belgische jaarrekeningen is de structuur meestal:
                // Beschrijving, Sign, Code, [leeg], Boekjaar waarde, Vorig boekjaar waarde
                // Dus als code op index j staat, is waarde meestal op j+2 (sla lege kolom over)
                
                // Strategie 1: Als we de boekjaar kolom index kennen, gebruik die direct
                if (boekjaarColumnIndex >= 0 && boekjaarColumnIndex < columns.length) {
                    const colVal = columns[boekjaarColumnIndex].trim();
                    if (colVal !== '' && colVal !== '(+)/(-)' && !colVal.includes('(')) {
                        const val = parseNumber(colVal, true);
                        if (val !== null && val !== 0 && Math.abs(val) >= 1000) {
                            numValue = val;
                        }
                    }
                }
                
                // Strategie 2: Probeer j+2 (meestal waar de waarde staat na code en lege kolom)
                // Dit is de meest voorkomende structuur: Code op j, lege kolom op j+1, waarde op j+2
                if ((numValue === null || numValue === 0) && j + 2 < columns.length) {
                    const colVal = columns[j + 2].trim();
                    // Skip als het leeg is of een sign indicator
                    if (colVal !== '' && colVal !== '(+)/(-)' && !colVal.includes('(') && !colVal.includes(')')) {
                        const val = parseNumber(colVal, true);
                        // Voor financiële bedragen, accepteren we waarden vanaf 100 EUR
                        // Dit voorkomt dat we zeer kleine getallen gebruiken
                        if (val !== null && val !== 0 && Math.abs(val) >= 100) {
                            numValue = val;
                        }
                    }
                }
                
                // Strategie 3: Probeer j+1 (soms direct na code, zonder lege kolom)
                if ((numValue === null || numValue === 0) && j + 1 < columns.length) {
                    const colVal = columns[j + 1].trim();
                    if (colVal !== '' && colVal !== '(+)/(-)' && !colVal.includes('(') && !colVal.includes(')')) {
                        const val = parseNumber(colVal, true);
                        if (val !== null && val !== 0 && Math.abs(val) >= 1000) {
                            numValue = val;
                        }
                    }
                }
                
                // Strategie 4: Zoek eerste geldige numerieke waarde na de code
                // Maar skip lege strings, sign indicators, en kleine getallen
                if (numValue === null || numValue === 0) {
                    for (let k = j + 1; k < columns.length; k++) {
                        const colVal = columns[k].trim();
                        // Skip lege kolommen, sign indicators, en haakjes
                        if (colVal === '' || colVal === '(+)/(-)' || colVal.includes('(') || colVal.includes(')')) {
                            continue;
                        }
                        
                        const val = parseNumber(colVal, true);
                        // Minimaal 1.000 EUR (na vermenigvuldiging met 1000) om kleine getallen te vermijden
                        // Dit voorkomt dat we "8" of andere kleine waarden gebruiken
                        if (val !== null && val !== 0 && Math.abs(val) >= 1000) {
                            numValue = val;
                            break;
                        }
                    }
                }

                if (numValue !== null && numValue !== 0 && Math.abs(numValue) >= 100) {
                    const fieldName = codeMapping[col];
                    if (fieldName && data.hasOwnProperty(fieldName)) {
                        // Validatie: voor totalen (assets, liabilities, equity), neem de grootste waarde
                        // Voor andere velden, overschrijf alleen als nog niet gezet of als nieuwe waarde veel groter is
                        const isTotalField = ['totalAssets', 'totalLiabilities', 'equity', 'currentAssets', 'currentLiabilities'].includes(fieldName);
                        
                        if (data[fieldName] === null) {
                            data[fieldName] = numValue;
                            // Debug log voor belangrijke velden
                            if (['grossMargin', 'netProfit', 'operatingProfit', 'totalAssets', 'equity'].includes(fieldName)) {
                                const sourceCol = boekjaarColumnIndex >= 0 ? boekjaarColumnIndex : (j + 2);
                                const rawValue = columns[sourceCol] || columns[j + 2] || 'N/A';
                                console.log(`  ✓ ${fieldName}: ${formatNumber(numValue)} (van kolom ${sourceCol}, ruwe waarde: "${rawValue}")`);
                            }
                        } else if (isTotalField) {
                            // Voor totalen, neem altijd de grootste waarde (meestal de correcte)
                            if (Math.abs(numValue) > Math.abs(data[fieldName] || 0)) {
                                console.log(`  ↻ ${fieldName}: ${data[fieldName]} → ${numValue} EUR (grootste waarde gekozen)`);
                                data[fieldName] = numValue;
                            }
                        } else {
                            // Voor andere velden, alleen overschrijf als nieuwe waarde veel groter is
                            // Dit voorkomt dat kleine verkeerde waarden de correcte overschrijven
                            if (Math.abs(numValue) > Math.abs(data[fieldName] || 0) * 1.5) {
                                console.log(`  ↻ ${fieldName}: ${data[fieldName]} → ${numValue} EUR (betere waarde gevonden)`);
                                data[fieldName] = numValue;
                            }
                        }
                    }
                } else if (numValue !== null && numValue !== 0 && Math.abs(numValue) < 100) {
                    // Waarschuwing voor te kleine waarden
                    const fieldName = codeMapping[col];
                    if (fieldName && ['grossMargin', 'netProfit', 'operatingProfit', 'totalAssets', 'equity'].includes(fieldName)) {
                        console.warn(`  ⚠ ${fieldName}: Waarde ${numValue} EUR is te klein, wordt overgeslagen (verwacht minimaal 100 EUR)`);
                    }
                }
                break;
            }
        }

        // Tekst-gebaseerde fallback zoekopdrachten
        // Totaal activa
        if (lineLower.includes('totaal van de activa') && data.totalAssets === null) {
            for (let j = 0; j < columns.length; j++) {
                const val = parseNumber(columns[j], true); // Financieel bedrag
                // Dit zou > 1.000.000 EUR moeten zijn voor een bedrijf
                if (val !== null && val > 1000000) {
                    data.totalAssets = val;
                    break;
                }
            }
        }

        // Eigen vermogen
        if (lineLower.includes('eigen vermogen') && data.equity === null) {
            for (let j = 0; j < columns.length; j++) {
                const val = parseNumber(columns[j], true); // Financieel bedrag
                if (val !== null && val > 0) {
                    data.equity = val;
                    break;
                }
            }
        }

        // Vlottende activa
        if (lineLower.includes('vlottende activa') && data.currentAssets === null) {
            for (let j = 0; j < columns.length; j++) {
                const val = parseNumber(columns[j], true); // Financieel bedrag
                if (val !== null && val > 0) {
                    data.currentAssets = val;
                    break;
                }
            }
        }

        // Voorraden
        if (lineLower.includes('voorraden') && data.inventory === null && lineLower.includes('30')) {
            for (let j = 0; j < columns.length; j++) {
                const val = parseNumber(columns[j], true); // Financieel bedrag
                if (val !== null && val > 0) {
                    data.inventory = val;
                    break;
                }
            }
        }

        // Liquide middelen
        if (lineLower.includes('liquide middelen') && data.cash === null) {
            for (let j = 0; j < columns.length; j++) {
                const val = parseNumber(columns[j], true); // Financieel bedrag
                if (val !== null && val > 0) {
                    data.cash = val;
                    break;
                }
            }
        }

        // Leveranciers
        if (lineLower.includes('leveranciers') && data.tradePayables === null) {
            for (let j = 0; j < columns.length; j++) {
                const val = parseNumber(columns[j], true); // Financieel bedrag
                if (val !== null && val > 0) {
                    data.tradePayables = val;
                    break;
                }
            }
        }

        // Aantal werknemers - gebruik false om te voorkomen dat het als financieel bedrag wordt behandeld
        if (lineLower.includes('gemiddeld aantal werknemers') && data.employees === null) {
            for (let j = 0; j < columns.length; j++) {
                const val = parseNumber(columns[j], false); // false = niet financieel bedrag (geen speciale behandeling)
                if (val !== null && val > 0 && val < 1000) { // Redelijk aantal werknemers
                    data.employees = val;
                    break;
                }
            }
        }
    }

    // Data validatie - controleer op logische consistentie
    validateFinancialData(data);
    
    // Debug logging - toon geëxtraheerde waarden
    console.log(`✅ Data geëxtraheerd voor ${year}:`, {
        grossMargin: data.grossMargin ? `${formatNumber(data.grossMargin)} EUR` : 'N/A',
        netProfit: data.netProfit ? `${formatNumber(data.netProfit)} EUR` : 'N/A',
        totalAssets: data.totalAssets ? `${formatNumber(data.totalAssets)} EUR` : 'N/A',
        equity: data.equity ? `${formatNumber(data.equity)} EUR` : 'N/A'
    });
    
    return data;
}

/**
 * Valideer financiële data op logische consistentie
 */
function validateFinancialData(data) {
    const warnings = [];
    
    // Validatie 1: Totaal activa moet gelijk zijn aan totaal passiva (balans moet kloppen)
    if (data.totalAssets !== null && data.totalLiabilities !== null && data.equity !== null) {
        const calculatedTotal = (data.totalLiabilities || 0) + (data.equity || 0);
        const difference = Math.abs(data.totalAssets - calculatedTotal);
        const tolerance = data.totalAssets * 0.01; // 1% tolerantie voor afrondingsfouten
        if (difference > tolerance) {
            warnings.push(`Balans niet in evenwicht: Activa (${data.totalAssets}) vs Passiva+Eigen Vermogen (${calculatedTotal})`);
        }
    }
    
    // Validatie 2: Vlottende activa + vaste activa ≈ totale activa
    if (data.totalAssets !== null && data.currentAssets !== null && data.fixedAssets !== null) {
        const calculatedAssets = (data.currentAssets || 0) + (data.fixedAssets || 0);
        const difference = Math.abs(data.totalAssets - calculatedAssets);
        const tolerance = data.totalAssets * 0.05; // 5% tolerantie
        if (difference > tolerance && data.totalAssets > 0) {
            warnings.push(`Activa som klopt niet: Totaal (${data.totalAssets}) vs Som delen (${calculatedAssets})`);
        }
    }
    
    // Validatie 3: Netto winst moet logisch zijn t.o.v. brutomarge
    if (data.grossMargin !== null && data.netProfit !== null) {
        if (Math.abs(data.netProfit) > Math.abs(data.grossMargin) * 1.5) {
            warnings.push(`Netto winst (${data.netProfit}) lijkt onlogisch t.o.v. brutomarge (${data.grossMargin})`);
        }
    }
    
    // Validatie 4: Huidige ratio moet redelijk zijn
    if (data.currentAssets !== null && data.currentLiabilities !== null && data.currentLiabilities !== 0) {
        const currentRatio = data.currentAssets / data.currentLiabilities;
        if (currentRatio < 0) {
            warnings.push(`Huidige ratio is negatief: ${currentRatio.toFixed(2)}`);
        }
        if (currentRatio > 10) {
            warnings.push(`Huidige ratio is zeer hoog: ${currentRatio.toFixed(2)} - controleer data`);
        }
    }
    
    // Validatie 5: Controleer of bedragen redelijk zijn voor een fietsenbedrijf
    // We zouden realistische bedragen moeten zien voor een bedrijf
    if (data.totalAssets !== null) {
        if (data.totalAssets < 10000) {
            warnings.push(`Totale activa lijkt te laag: ${formatNumber(data.totalAssets)} - mogelijk parsing fout`);
        }
        if (data.totalAssets > 10000000000) { // 10 miljard
            warnings.push(`Totale activa lijkt te hoog: ${formatNumber(data.totalAssets)} - mogelijk parsing fout`);
        }
    }
    
    // Sla warnings op in data object
    if (warnings.length > 0) {
        data.validationWarnings = warnings;
    }
    
    return warnings.length === 0;
}

/**
 * Laad en parse een CSV bestand
 */
async function loadCSV(csvFile) {
    try {
        console.log(`📂 Laden CSV: ${csvFile.path} voor jaar ${csvFile.year}`);
        const response = await fetch(csvFile.path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('CSV bestand is leeg');
        }
        console.log(`✓ CSV geladen: ${csvFile.path} (${csvText.length} karakters)`);
        const extractedData = extractFinancialData(csvText, csvFile.year);
        
        // Controleer of essentiële data is geëxtraheerd
        const hasEssentialData = extractedData.grossMargin !== null || 
                                  extractedData.totalAssets !== null || 
                                  extractedData.equity !== null;
        
        if (!hasEssentialData) {
            console.warn(`Waarschuwing: Weinig data geëxtraheerd voor ${csvFile.year}`);
            extractedData.dataQuality = 'low';
        } else {
            extractedData.dataQuality = 'good';
        }
        
        return extractedData;
    } catch (error) {
        console.error(`❌ Fout bij laden CSV ${csvFile.path}:`, error);
        
        // Check if it's a CORS error
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            console.error('⚠️ CORS fout gedetecteerd! Open de pagina via een lokale server (bijv. python -m http.server)');
        }
        
        return {
            year: csvFile.year,
            error: error.message,
            dataQuality: 'error'
        };
    }
}

/**
 * Verwerk alle CSV bestanden
 */
async function processAllCSVs() {
    try {
        const statusLog = document.getElementById('statusLog');
        if (!statusLog) {
            console.error('❌ Status log element niet gevonden!');
            return;
        }
        
        statusLog.innerHTML = '';
        console.log('📂 Starten met verwerken van CSV bestanden...');
        
        let successCount = 0;
        let warningCount = 0;
        let errorCount = 0;

    for (const csvFile of CSV_FILES) {
        statusLog.innerHTML += `<div class="flex items-center gap-2">
            <span class="loading-spinner"></span>
            <span>Laden ${csvFile.year}...</span>
        </div>`;
        
        const extractedData = await loadCSV(csvFile);
        if (extractedData && !extractedData.error) {
            financialData[csvFile.year] = extractedData;
            
            // Toon data kwaliteit indicator
            let qualityIcon = '✓';
            let qualityClass = 'text-green-600';
            let qualityText = 'succesvol geparsed';
            
            if (extractedData.dataQuality === 'low') {
                qualityIcon = '⚠';
                qualityClass = 'text-yellow-600';
                qualityText = 'geparsed (weinig data)';
                warningCount++;
            } else if (extractedData.validationWarnings && extractedData.validationWarnings.length > 0) {
                qualityIcon = '⚠';
                qualityClass = 'text-yellow-600';
                qualityText = `geparsed (${extractedData.validationWarnings.length} waarschuwing${extractedData.validationWarnings.length > 1 ? 'en' : ''})`;
                warningCount++;
            } else {
                successCount++;
            }
            
            statusLog.innerHTML += `<div class="${qualityClass} flex items-center gap-2">
                <span>${qualityIcon}</span>
                <span>${csvFile.year} ${qualityText}</span>
            </div>`;
        } else {
            errorCount++;
            statusLog.innerHTML += `<div class="text-red-600 flex items-center gap-2">
                <span>✗</span>
                <span>${csvFile.year} kon niet geladen worden${extractedData?.error ? ': ' + extractedData.error : ''}</span>
            </div>`;
            // Voeg placeholder data toe
            financialData[csvFile.year] = {
                year: csvFile.year,
                error: extractedData?.error || 'Onbekende fout',
                dataQuality: 'error',
                grossMargin: null,
                operatingProfit: null,
                netProfit: null,
                totalAssets: null,
                equity: null,
                currentAssets: null,
                currentLiabilities: null
            };
        }
        
        // Kleine delay voor betere UX
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Samenvatting
    statusLog.innerHTML += `<div class="mt-4 pt-4 border-t border-blue-300">
        <div class="font-semibold text-blue-800">Samenvatting:</div>
        <div class="text-sm space-y-1 mt-2">
            <div class="text-green-600">✓ ${successCount} bestand${successCount !== 1 ? 'en' : ''} succesvol geladen</div>
            ${warningCount > 0 ? `<div class="text-yellow-600">⚠ ${warningCount} bestand${warningCount !== 1 ? 'en' : ''} met waarschuwingen</div>` : ''}
            ${errorCount > 0 ? `<div class="text-red-600">✗ ${errorCount} bestand${errorCount !== 1 ? 'en' : ''} met fouten</div>` : ''}
        </div>
    </div>`;

        // Verberg loading na korte delay, toon dashboard
        setTimeout(() => {
            try {
                const loadingStatus = document.getElementById('loadingStatus');
                const dashboard = document.getElementById('dashboard');
                
                if (loadingStatus) {
                    loadingStatus.classList.add('hidden');
                } else {
                    console.warn('⚠️ Loading status element niet gevonden');
                }
                
                if (dashboard) {
                    dashboard.classList.remove('hidden');
                } else {
                    console.error('❌ Dashboard element niet gevonden!');
                }
                
                // Re-initialize tab navigation after dashboard is shown
                initTabNavigation();
                
                // Render dashboard
                renderDashboard();
                
                // Toon data kwaliteit waarschuwingen als er zijn
                showDataQualityWarnings();
                
                console.log('✅ Dashboard succesvol geladen en gerenderd');
            } catch (error) {
                console.error('❌ Fout bij tonen dashboard:', error);
            }
        }, 500);
    } catch (error) {
        console.error('❌ Fout bij verwerken CSV bestanden:', error);
        const statusLog = document.getElementById('statusLog');
        if (statusLog) {
            statusLog.innerHTML = `<div class="text-red-600 font-bold">Fout: ${error.message}</div>`;
        }
    }
}

/**
 * Toon data kwaliteit waarschuwingen
 */
function showDataQualityWarnings() {
    const warnings = [];
    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    
    years.forEach(year => {
        const data = financialData[year];
        if (data.validationWarnings && data.validationWarnings.length > 0) {
            warnings.push({
                year: year,
                warnings: data.validationWarnings
            });
        }
        if (data.dataQuality === 'low') {
            warnings.push({
                year: year,
                warnings: ['Weinig data geëxtraheerd - controleer CSV bestand']
            });
        }
        if (data.error) {
            warnings.push({
                year: year,
                warnings: [`Fout bij laden: ${data.error}`]
            });
        }
    });
    
    if (warnings.length > 0) {
        const warningHtml = warnings.map(w => `
            <div class="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded mb-2">
                <strong class="text-yellow-800">${w.year}:</strong>
                <ul class="list-disc list-inside text-sm text-yellow-700 mt-1">
                    ${w.warnings.map(msg => `<li>${msg}</li>`).join('')}
                </ul>
            </div>
        `).join('');
        
        // Voeg waarschuwingen toe aan insights sectie
        const insightsDiv = document.getElementById('insights');
        if (insightsDiv) {
            insightsDiv.innerHTML = `
                <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 class="font-semibold text-yellow-800 mb-2">⚠ Data Kwaliteit Waarschuwingen</h3>
                    ${warningHtml}
                </div>
                ${insightsDiv.innerHTML}
            `;
        }
    }
}

// ============================================================================
// Utility Functies
// ============================================================================

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    // Format als EUR bedrag met duizendtallen scheidingstekens
    return new Intl.NumberFormat('nl-BE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        style: 'currency',
        currency: 'EUR'
    }).format(num).replace('EUR', '').trim() + ' EUR';
}

function formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toFixed(1) + '%';
}

function formatRatio(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toFixed(2);
}

// ============================================================================
// Dashboard Rendering
// ============================================================================

function renderKeyMetrics() {
    const years = Object.keys(financialData).map(Number).sort((a, b) => b - a);
    if (years.length === 0) return;

    const latest = financialData[years[0]];
    
    const revenueText = latest.grossMargin !== null ? formatNumber(latest.grossMargin) : 'N/A';
    const profitText = latest.netProfit !== null ? formatNumber(latest.netProfit) : 'N/A';
    const assetsText = latest.totalAssets !== null ? formatNumber(latest.totalAssets) : 'N/A';
    
    document.getElementById('metricRevenue').textContent = revenueText;
    const revenueSr = document.getElementById('metricRevenue-sr');
    if (revenueSr) revenueSr.textContent = latest.grossMargin !== null ? `${revenueText} euro` : 'Niet beschikbaar';
    
    document.getElementById('metricProfit').textContent = profitText;
    const profitSr = document.getElementById('metricProfit-sr');
    if (profitSr) profitSr.textContent = latest.netProfit !== null ? `${profitText} euro` : 'Niet beschikbaar';
    
    document.getElementById('metricAssets').textContent = assetsText;
    const assetsSr = document.getElementById('metricAssets-sr');
    if (assetsSr) assetsSr.textContent = latest.totalAssets !== null ? `${assetsText} euro` : 'Niet beschikbaar';
    
    const equityRatio = latest.totalAssets && latest.equity 
        ? (latest.equity / latest.totalAssets * 100) 
        : null;
    const equityRatioText = equityRatio !== null ? formatPercent(equityRatio) : 'N/A';
    document.getElementById('metricEquityRatio').textContent = equityRatioText;
    const equityRatioSr = document.getElementById('metricEquityRatio-sr');
    if (equityRatioSr) equityRatioSr.textContent = equityRatio !== null ? `${equityRatioText}` : 'Niet beschikbaar';
}

function renderTable() {
    const tableBody = document.getElementById('tableBody');
    const yearFilter = document.getElementById('yearFilter');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Update year filter options
    if (yearFilter) {
        const years = Object.keys(financialData).map(Number).sort((a, b) => b - a);
        yearFilter.innerHTML = '<option value="all">Alle jaren</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year.toString();
            option.textContent = year.toString();
            yearFilter.appendChild(option);
        });
    }

    const years = Object.keys(financialData).map(Number).sort((a, b) => b - a); // Nieuwste eerst

    years.forEach(year => {
        const data = financialData[year];
        const currentRatio = data.currentAssets && data.currentLiabilities && data.currentLiabilities !== 0
            ? (data.currentAssets / data.currentLiabilities)
            : null;

        const row = document.createElement('tr');
        row.className = 'table-row-hover';
        row.setAttribute('data-year', year.toString());
        
        // Add color coding for current ratio
        let ratioClass = 'text-gray-700';
        if (currentRatio !== null) {
            if (currentRatio < 1) ratioClass = 'text-red-600 font-bold';
            else if (currentRatio < 1.5) ratioClass = 'text-yellow-600 font-semibold';
            else ratioClass = 'text-green-600 font-semibold';
        }
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${data.year}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatNumber(data.grossMargin)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatNumber(data.operatingProfit)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${data.netProfit && data.netProfit < 0 ? 'text-red-600' : 'text-green-600'}">${formatNumber(data.netProfit)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatNumber(data.totalAssets)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatNumber(data.equity)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatNumber(data.currentAssets)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatNumber(data.currentLiabilities)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${ratioClass}">${formatRatio(currentRatio)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function renderKPITable() {
    const kpiTableBody = document.getElementById('kpiTableBody');
    kpiTableBody.innerHTML = '';

    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);

    years.forEach(year => {
        const data = financialData[year];
        
        // Bereken KPIs
        const grossMarginPct = data.grossMargin && data.grossMargin !== 0 
            ? (data.grossMargin / (data.grossMargin + (data.personnelCosts || 0)) * 100) 
            : null;
        const operatingMarginPct = data.grossMargin && data.operatingProfit !== null
            ? (data.operatingProfit / data.grossMargin * 100)
            : null;
        const netMarginPct = data.grossMargin && data.netProfit !== null
            ? (data.netProfit / data.grossMargin * 100)
            : null;
        const roa = data.totalAssets && data.netProfit !== null && data.totalAssets !== 0
            ? (data.netProfit / data.totalAssets * 100)
            : null;
        const roe = data.equity && data.netProfit !== null && data.equity !== 0
            ? (data.netProfit / data.equity * 100)
            : null;
        const currentRatio = data.currentAssets && data.currentLiabilities && data.currentLiabilities !== 0
            ? (data.currentAssets / data.currentLiabilities)
            : null;
        const debtToEquity = data.equity && data.totalLiabilities && data.equity !== 0
            ? (data.totalLiabilities / data.equity)
            : null;
        const equityRatio = data.totalAssets && data.equity && data.totalAssets !== 0
            ? (data.equity / data.totalAssets * 100)
            : null;

        const row = document.createElement('tr');
        row.className = 'table-row-hover';
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${data.year}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatPercent(grossMarginPct)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatPercent(operatingMarginPct)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatPercent(netMarginPct)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatPercent(roa)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatPercent(roe)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatRatio(currentRatio)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatRatio(debtToEquity)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatPercent(equityRatio)}</td>
        `;
        kpiTableBody.appendChild(row);
    });
}

function renderInsights() {
    const insightsDiv = document.getElementById('insights');
    if (!insightsDiv) return;
    
    insightsDiv.innerHTML = '';

    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    if (years.length < 2) {
        insightsDiv.innerHTML = '<div class="p-4 bg-gray-50 rounded-lg text-gray-500 text-center">Niet genoeg data voor inzichten. Minimaal 2 jaren nodig.</div>';
        return;
    }

    const insights = [];

    // Brutomarge YoY veranderingen
    for (let i = 1; i < years.length; i++) {
        const currentYear = years[i];
        const prevYear = years[i - 1];
        const currentGM = financialData[currentYear].grossMargin;
        const prevGM = financialData[prevYear].grossMargin;

        if (currentGM && prevGM && prevGM !== 0) {
            const change = ((currentGM - prevGM) / prevGM) * 100;
            const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
            const trendColor = change > 0 ? 'green' : change < 0 ? 'red' : 'blue';
            insights.push(`
                <div class="insight-card p-4 bg-${trendColor}-50 rounded-lg border-l-4 border-${trendColor}-400 expanded">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="font-bold text-${trendColor}-900 mb-1">${trend} Brutomarge Verandering (${prevYear} → ${currentYear})</div>
                            <div class="text-sm text-${trendColor}-700">
                                ${change > 0 ? '+' : ''}${change.toFixed(1)}% verandering 
                                (${formatNumber(prevGM)} → ${formatNumber(currentGM)})
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }
    }

    // Netto winst trends
    const latestYear = years[years.length - 1];
    const latestData = financialData[latestYear];
    const prevYear = years[years.length - 2];
    const prevData = financialData[prevYear];

    if (latestData.netProfit && prevData.netProfit && prevData.netProfit !== 0) {
        const profitChange = ((latestData.netProfit - prevData.netProfit) / Math.abs(prevData.netProfit)) * 100;
        insights.push(`
            <div class="insight-card p-3 bg-green-50 rounded border-l-4 border-green-400">
                <strong>💰 Netto Winst Verandering (${prevYear} → ${latestYear}):</strong> 
                ${profitChange > 0 ? '+' : ''}${profitChange.toFixed(1)}% 
                (${formatNumber(prevData.netProfit)} → ${formatNumber(latestData.netProfit)})
            </div>
        `);
    }

    // Winstgevendheid analyse
    if (latestData.grossMargin && latestData.netProfit && latestData.grossMargin !== 0) {
        const netMargin = (latestData.netProfit / latestData.grossMargin) * 100;
        insights.push(`
            <div class="insight-card p-3 bg-purple-50 rounded border-l-4 border-purple-400">
                <strong>📊 Netto Winstmarge (${latestYear}):</strong> ${netMargin.toFixed(1)}%
            </div>
        `);
    }

    // Eigen vermogen ratio analyse
    if (latestData.totalAssets && latestData.equity && latestData.totalAssets !== 0) {
        const equityRatio = (latestData.equity / latestData.totalAssets) * 100;
        const health = equityRatio > 50 ? 'Sterk' : equityRatio > 30 ? 'Matig' : 'Zwak';
        insights.push(`
            <div class="insight-card p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                <strong>🏦 Eigen Vermogen Ratio (${latestYear}):</strong> ${equityRatio.toFixed(1)}% (${health} financiële positie)
            </div>
        `);
    }

    // Liquiditeit analyse
    if (latestData.currentAssets && latestData.currentLiabilities && latestData.currentLiabilities !== 0) {
        const currentRatio = latestData.currentAssets / latestData.currentLiabilities;
        const liquidity = currentRatio > 2 ? 'Uitstekend' : currentRatio > 1.5 ? 'Goed' : currentRatio > 1 ? 'Voldoende' : 'Zorgwekkend';
        insights.push(`
            <div class="insight-card p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                <strong>💧 Huidige Ratio (${latestYear}):</strong> ${currentRatio.toFixed(2)} (${liquidity})
            </div>
        `);
    }

    // Activa groei
    if (latestData.totalAssets && prevData.totalAssets && prevData.totalAssets !== 0) {
        const assetGrowth = ((latestData.totalAssets - prevData.totalAssets) / prevData.totalAssets) * 100;
        insights.push(`
            <div class="insight-card p-3 bg-indigo-50 rounded border-l-4 border-indigo-400">
                <strong>📈 Totale Activa Groei (${prevYear} → ${latestYear}):</strong> 
                ${assetGrowth > 0 ? '+' : ''}${assetGrowth.toFixed(1)}%
            </div>
        `);
    }

    // Werkkapitaal analyse
    if (latestData.currentAssets && latestData.currentLiabilities) {
        const workingCapital = latestData.currentAssets - latestData.currentLiabilities;
        const trend = workingCapital > 0 ? 'Positief' : 'Negatief';
        const recommendation = workingCapital < 0 
            ? '⚠️ <strong>Aanbeveling:</strong> Negatief werkkapitaal kan liquiditeitsproblemen veroorzaken. Overweeg om voorraden te verminderen of leveranciersbetalingen te verlengen.'
            : workingCapital < (latestData.currentLiabilities * 0.2)
            ? '💡 <strong>Aanbeveling:</strong> Werkkapitaal is laag. Overweeg om liquiditeitsbuffer te verhogen.'
            : '';
        insights.push(`
            <div class="insight-card p-3 bg-teal-50 rounded border-l-4 border-teal-400">
                <strong>💼 Werkkapitaal (${latestYear}):</strong> ${formatNumber(workingCapital)} (${trend})
                ${recommendation ? `<div class="mt-2 text-sm">${recommendation}</div>` : ''}
            </div>
        `);
    }

    // Winstgevendheid trend analyse
    if (years.length >= 3) {
        const recentYears = years.slice(-3);
        const margins = recentYears.map(y => {
            const d = financialData[y];
            return d.grossMargin && d.netProfit && d.grossMargin !== 0 
                ? (d.netProfit / d.grossMargin * 100) 
                : null;
        }).filter(m => m !== null);
        
        if (margins.length >= 2) {
            const trend = margins[margins.length - 1] - margins[0];
            if (trend < -5) {
                insights.push(`
                    <div class="insight-card p-3 bg-red-50 rounded border-l-4 border-red-400">
                        <strong>📉 Dalende Winstgevendheid:</strong> Netto winstmarge daalde met ${Math.abs(trend).toFixed(1)}% over de laatste ${recentYears.length} jaren.
                        <div class="mt-2 text-sm">⚠️ <strong>Aanbeveling:</strong> Analyseer kostenstructuur en overweeg kostenbesparende maatregelen of prijsaanpassingen.</div>
                    </div>
                `);
            } else if (trend > 5) {
                insights.push(`
                    <div class="insight-card p-3 bg-green-50 rounded border-l-4 border-green-400">
                        <strong>📈 Stijgende Winstgevendheid:</strong> Netto winstmarge steeg met ${trend.toFixed(1)}% over de laatste ${recentYears.length} jaren.
                        <div class="mt-2 text-sm">✅ <strong>Positief:</strong> Goede trend! Blijf focussen op efficiëntie en kostenbeheersing.</div>
                    </div>
                `);
            }
        }
    }

    // Liquiditeit waarschuwing
    if (latestData.currentAssets && latestData.currentLiabilities && latestData.currentLiabilities !== 0) {
        const currentRatio = latestData.currentAssets / latestData.currentLiabilities;
        if (currentRatio < 1) {
            insights.push(`
                <div class="insight-card p-3 bg-red-50 rounded border-l-4 border-red-400">
                    <strong>🚨 Liquiditeitswaarschuwing:</strong> Huidige ratio is ${currentRatio.toFixed(2)} (onder 1.0).
                    <div class="mt-2 text-sm">⚠️ <strong>Kritiek:</strong> Bedrijf heeft mogelijk moeite met het betalen van kortlopende schulden. Overweeg dringend: verhoging liquiditeit, verlenging betalingstermijnen, of herfinanciering.</div>
                </div>
            `);
        }
    }

    // Groei analyse
    if (years.length >= 2) {
        const growthRates = [];
        for (let i = 1; i < years.length; i++) {
            const currentYear = years[i];
            const prevYear = years[i - 1];
            const currentGM = financialData[currentYear].grossMargin;
            const prevGM = financialData[prevYear].grossMargin;
            
            if (currentGM && prevGM && prevGM !== 0) {
                const growth = ((currentGM - prevGM) / prevGM) * 100;
                growthRates.push(growth);
            }
        }
        
        if (growthRates.length > 0) {
            const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
            const volatility = Math.sqrt(growthRates.reduce((sum, rate) => sum + Math.pow(rate - avgGrowth, 2), 0) / growthRates.length);
            
            if (avgGrowth > 10) {
                insights.push(`
                    <div class="insight-card p-3 bg-green-50 rounded border-l-4 border-green-400">
                        <strong>🚀 Sterke Groei:</strong> Gemiddelde brutomarge groei van ${avgGrowth.toFixed(1)}% per jaar.
                        <div class="mt-2 text-sm">✅ <strong>Positief:</strong> Blijf investeren in groei en overweeg uitbreiding.</div>
                    </div>
                `);
            } else if (avgGrowth < -5) {
                insights.push(`
                    <div class="insight-card p-3 bg-red-50 rounded border-l-4 border-red-400">
                        <strong>📉 Krimp:</strong> Gemiddelde brutomarge daling van ${Math.abs(avgGrowth).toFixed(1)}% per jaar.
                        <div class="mt-2 text-sm">⚠️ <strong>Aanbeveling:</strong> Analyseer marktomstandigheden en overweeg strategische aanpassingen.</div>
                    </div>
                `);
            }
            
            if (volatility > 20) {
                insights.push(`
                    <div class="insight-card p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                        <strong>📊 Hoge Volatiliteit:</strong> Brutomarge vertoont grote schommelingen (${volatility.toFixed(1)}% standaarddeviatie).
                        <div class="mt-2 text-sm">💡 <strong>Aanbeveling:</strong> Overweeg risicobeheer en stabilisatie van inkomstenstromen.</div>
                    </div>
                `);
            }
        }
    }

    // Debt Analysis
    if (latestData.equity && latestData.totalLiabilities && latestData.equity !== 0) {
        const debtToEquity = latestData.totalLiabilities / latestData.equity;
        if (debtToEquity > 2) {
            insights.push(`
                <div class="insight-card p-3 bg-red-50 rounded border-l-4 border-red-400">
                    <strong>⚠️ Hoge Schuldpositie:</strong> Schuld/Eigen Vermogen ratio is ${debtToEquity.toFixed(2)}.
                    <div class="mt-2 text-sm">⚠️ <strong>Aanbeveling:</strong> Hoge schuld kan risicovol zijn. Overweeg schuldafbouw of herfinanciering.</div>
                </div>
            `);
        } else if (debtToEquity < 0.5) {
            insights.push(`
                <div class="insight-card p-3 bg-green-50 rounded border-l-4 border-green-400">
                    <strong>✅ Lage Schuldpositie:</strong> Schuld/Eigen Vermogen ratio is ${debtToEquity.toFixed(2)}.
                    <div class="mt-2 text-sm">💡 <strong>Mogelijkheid:</strong> Lage schuld geeft ruimte voor strategische investeringen.</div>
                </div>
            `);
        }
    }
    
    // ROE Analysis
    if (latestData.netProfit && latestData.equity && latestData.equity !== 0) {
        const roe = (latestData.netProfit / latestData.equity) * 100;
        if (roe > 15) {
            insights.push(`
                <div class="insight-card p-3 bg-green-50 rounded border-l-4 border-green-400">
                    <strong>⭐ Uitstekend Rendement op Eigen Vermogen:</strong> ROE is ${roe.toFixed(1)}%.
                    <div class="mt-2 text-sm">✅ <strong>Positief:</strong> Zeer efficiënt gebruik van eigen vermogen.</div>
                </div>
            `);
        } else if (roe < 5 && roe > 0) {
            insights.push(`
                <div class="insight-card p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <strong>📊 Laag Rendement op Eigen Vermogen:</strong> ROE is ${roe.toFixed(1)}%.
                    <div class="mt-2 text-sm">💡 <strong>Aanbeveling:</strong> Overweeg manieren om rendement te verbeteren door efficiëntie of groei.</div>
                </div>
            `);
        }
    }
    
    // Asset Efficiency
    if (latestData.grossMargin && latestData.totalAssets && latestData.totalAssets !== 0) {
        const assetTurnover = latestData.grossMargin / latestData.totalAssets;
        if (assetTurnover < 0.5) {
            insights.push(`
                <div class="insight-card p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                    <strong>📉 Lage Asset Efficiëntie:</strong> Asset Turnover is ${assetTurnover.toFixed(2)}.
                    <div class="mt-2 text-sm">💡 <strong>Aanbeveling:</strong> Activa worden niet optimaal gebruikt. Overweeg activa te verkopen of omzet per activa te verhogen.</div>
                </div>
            `);
        } else if (assetTurnover > 1.5) {
            insights.push(`
                <div class="insight-card p-3 bg-green-50 rounded border-l-4 border-green-400">
                    <strong>✅ Hoge Asset Efficiëntie:</strong> Asset Turnover is ${assetTurnover.toFixed(2)}.
                    <div class="mt-2 text-sm">✅ <strong>Positief:</strong> Activa worden efficiënt gebruikt om omzet te genereren.</div>
                </div>
            `);
        }
    }
    
    // Employee Productivity
    if (latestData.grossMargin && latestData.employees && latestData.employees > 0) {
        const revenuePerEmployee = latestData.grossMargin / latestData.employees;
        if (years.length >= 2) {
            const prevRevenuePerEmployee = prevData.grossMargin && prevData.employees && prevData.employees > 0
                ? prevData.grossMargin / prevData.employees
                : null;
            if (prevRevenuePerEmployee) {
                const productivityChange = ((revenuePerEmployee - prevRevenuePerEmployee) / prevRevenuePerEmployee) * 100;
                if (productivityChange > 10) {
                    insights.push(`
                        <div class="insight-card p-3 bg-green-50 rounded border-l-4 border-green-400">
                            <strong>👥 Verbeterde Productiviteit:</strong> Omzet per werknemer steeg met ${productivityChange.toFixed(1)}%.
                            <div class="mt-2 text-sm">✅ <strong>Positief:</strong> Goede trend in personeelsefficiëntie.</div>
                        </div>
                    `);
                } else if (productivityChange < -10) {
                    insights.push(`
                        <div class="insight-card p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                            <strong>👥 Dalende Productiviteit:</strong> Omzet per werknemer daalde met ${Math.abs(productivityChange).toFixed(1)}%.
                            <div class="mt-2 text-sm">💡 <strong>Aanbeveling:</strong> Analyseer personeelsstructuur en overweeg training of optimalisatie.</div>
                        </div>
                    `);
                }
            }
        }
    }
    
    // Cash Position Analysis
    if (latestData.cash !== null && latestData.grossMargin && latestData.grossMargin !== 0) {
        const cashMonths = (latestData.cash / (latestData.grossMargin / 12));
        if (cashMonths < 1) {
            insights.push(`
                <div class="insight-card p-3 bg-red-50 rounded border-l-4 border-red-400">
                    <strong>🚨 Kritieke Cash Positie:</strong> Liquide middelen dekt minder dan 1 maand operationele kosten.
                    <div class="mt-2 text-sm">⚠️ <strong>Kritiek:</strong> Zeer lage cash buffer. Overweeg dringend cash management verbetering.</div>
                </div>
            `);
        } else if (cashMonths > 6) {
            insights.push(`
                <div class="insight-card p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <strong>💰 Sterke Cash Positie:</strong> Liquide middelen dekt ${cashMonths.toFixed(1)} maanden operationele kosten.
                    <div class="mt-2 text-sm">💡 <strong>Mogelijkheid:</strong> Hoge cash buffer geeft ruimte voor investeringen of groei.</div>
                </div>
            `);
        }
    }
    
    // Inventory Analysis
    if (latestData.inventory && latestData.costOfGoodsSold && latestData.costOfGoodsSold !== 0) {
        const inventoryTurnover = latestData.costOfGoodsSold / latestData.inventory;
        const daysInventory = 365 / inventoryTurnover;
        if (daysInventory > 120) {
            insights.push(`
                <div class="insight-card p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                    <strong>📦 Trage Voorraad Omloop:</strong> Voorraad staat gemiddeld ${daysInventory.toFixed(0)} dagen op de plank.
                    <div class="mt-2 text-sm">💡 <strong>Aanbeveling:</strong> Overweeg voorraadoptimalisatie om kapitaal vrij te maken.</div>
                </div>
            `);
        } else if (daysInventory < 30) {
            insights.push(`
                <div class="insight-card p-3 bg-green-50 rounded border-l-4 border-green-400">
                    <strong>✅ Snelle Voorraad Omloop:</strong> Voorraad wordt gemiddeld elke ${daysInventory.toFixed(0)} dagen verkocht.
                    <div class="mt-2 text-sm">✅ <strong>Positief:</strong> Efficiënte voorraadbeheer.</div>
                </div>
            `);
        }
    }
    
    // Comprehensive Financial Health Summary
    if (years.length >= 3) {
        const recentYears = years.slice(-3);
        const allProfitable = recentYears.every(y => {
            const d = financialData[y];
            return d.netProfit && d.netProfit > 0;
        });
        const allPositiveGrowth = recentYears.slice(1).every((y, i) => {
            if (i === 0) return true;
            const current = financialData[y].grossMargin;
            const prev = financialData[recentYears[i - 1]].grossMargin;
            return current && prev && current > prev;
        });
        
        if (allProfitable && allPositiveGrowth) {
            insights.push(`
                <div class="insight-card p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500">
                    <strong class="text-lg">🎉 Uitstekende Financiële Prestaties:</strong>
                    <div class="mt-2 text-sm space-y-1">
                        <div>✅ Winstgevend in alle laatste ${recentYears.length} jaren</div>
                        <div>✅ Consistente groei in brutomarge</div>
                        <div>💡 <strong>Strategie:</strong> Blijf focussen op duurzame groei en efficiëntieverbetering.</div>
                    </div>
                </div>
            `);
        }
    }

    if (insights.length === 0) {
        insightsDiv.innerHTML = '<p class="text-gray-500">Kan geen inzichten berekenen met beschikbare data.</p>';
    } else {
        insightsDiv.innerHTML = insights.join('');
    }
}

// Helper functie om null waarden om te zetten naar null (Chart.js kan hiermee omgaan)
function mapDataForChart(years, field) {
    return years.map(y => {
        const val = financialData[y][field];
        return val !== null && val !== undefined ? val : null;
    });
}

function renderCharts() {
    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    const labels = years.map(y => y.toString());

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Brutomarge',
                data: mapDataForChart(years, 'grossMargin'),
                borderColor: CHART_COLORS.dcqRed,
                backgroundColor: CHART_COLORS.dcqRedBg,
                tension: 0.4,
                fill: true,
                spanGaps: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return value !== null ? formatNumber(value) : 'Geen data';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });

    // Profitability Chart
    const profitabilityCtx = document.getElementById('profitabilityChart').getContext('2d');
    if (profitabilityChart) profitabilityChart.destroy();
    profitabilityChart = new Chart(profitabilityCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Bedrijfswinst',
                    data: mapDataForChart(years, 'operatingProfit'),
                    backgroundColor: CHART_COLORS.dcqRedBgStrong,
                    borderColor: CHART_COLORS.dcqRed,
                    borderWidth: 1
                },
                {
                    label: 'Netto Winst',
                    data: mapDataForChart(years, 'netProfit'),
                    backgroundColor: CHART_COLORS.blueBgStrong,
                    borderColor: CHART_COLORS.blue,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return value !== null ? formatNumber(value) : 'Geen data';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });

    // Assets Chart
    const assetsCtx = document.getElementById('assetsChart').getContext('2d');
    if (assetsChart) assetsChart.destroy();
    assetsChart = new Chart(assetsCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Totale Activa',
                    data: mapDataForChart(years, 'totalAssets'),
                    backgroundColor: CHART_COLORS.dcqRedBgStrong,
                    borderColor: CHART_COLORS.dcqRed,
                    borderWidth: 1
                },
                {
                    label: 'Eigen Vermogen',
                    data: mapDataForChart(years, 'equity'),
                    backgroundColor: CHART_COLORS.dcqBlackBgStrong,
                    borderColor: CHART_COLORS.dcqBlack,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return value !== null ? formatNumber(value) : 'Geen data';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });

    // Margins Chart
    const marginsCtx = document.getElementById('marginsChart').getContext('2d');
    if (marginsChart) marginsChart.destroy();
    
    const operatingMargins = years.map(y => {
        const d = financialData[y];
        return d.grossMargin && d.operatingProfit && d.grossMargin !== 0 
            ? (d.operatingProfit / d.grossMargin * 100) 
            : null;
    });
    const netMargins = years.map(y => {
        const d = financialData[y];
        return d.grossMargin && d.netProfit && d.grossMargin !== 0 
            ? (d.netProfit / d.grossMargin * 100) 
            : null;
    });

    marginsChart = new Chart(marginsCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Bedrijfswinstmarge %',
                    data: operatingMargins,
                    borderColor: CHART_COLORS.dcqRed,
                    backgroundColor: CHART_COLORS.dcqRedBg,
                    tension: 0.4,
                    fill: true,
                    spanGaps: false,
                    borderWidth: 2
                },
                {
                    label: 'Netto Winstmarge %',
                    data: netMargins,
                    borderColor: CHART_COLORS.blue,
                    backgroundColor: CHART_COLORS.blueBg,
                    tension: 0.4,
                    fill: true,
                    spanGaps: false,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return value !== null ? value.toFixed(1) + '%' : 'Geen data';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });

    // Ratios Chart
    const ratiosCtx = document.getElementById('ratiosChart').getContext('2d');
    if (ratiosChart) ratiosChart.destroy();
    
    const currentRatios = years.map(y => {
        const d = financialData[y];
        return d.currentAssets && d.currentLiabilities && d.currentLiabilities !== 0
            ? (d.currentAssets / d.currentLiabilities)
            : null;
    });
    const equityRatios = years.map(y => {
        const d = financialData[y];
        return d.totalAssets && d.equity && d.totalAssets !== 0
            ? (d.equity / d.totalAssets * 100)
            : null;
    });

    ratiosChart = new Chart(ratiosCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Huidige Ratio',
                    data: currentRatios,
                    borderColor: CHART_COLORS.dcqRed,
                    backgroundColor: CHART_COLORS.dcqRedBg,
                    tension: 0.4,
                    spanGaps: false,
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Eigen Vermogen Ratio %',
                    data: equityRatios,
                    borderColor: CHART_COLORS.green,
                    backgroundColor: CHART_COLORS.greenBg,
                    tension: 0.4,
                    spanGaps: false,
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            if (value === null) return 'Geen data';
                            return context.dataset.label.includes('%') 
                                ? value.toFixed(1) + '%' 
                                : value.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

function renderDashboard() {
    renderKeyMetrics();
    renderTable();
    renderKPITable();
    renderInsights();
    renderCharts();
    renderDetailsPanel();
    renderAnalysisPanel();
    renderTrendsCharts();
}

// ============================================================================
// Export Functies
// ============================================================================

function exportToJSON() {
    const dataStr = JSON.stringify(financialData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dcq-bikes-financiele-data.json';
    link.click();
    URL.revokeObjectURL(url);
}

function exportToCSV() {
    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    
    const headers = ['Jaar', 'Brutomarge', 'Bedrijfswinst', 'Netto Winst', 'Totale Activa', 'Eigen Vermogen', 'Vlottende Activa', 'Vlottende Passiva'];
    let csv = headers.join(',') + '\n';
    
    years.forEach(year => {
        const d = financialData[year];
        const row = [
            year,
            d.grossMargin || '',
            d.operatingProfit || '',
            d.netProfit || '',
            d.totalAssets || '',
            d.equity || '',
            d.currentAssets || '',
            d.currentLiabilities || ''
        ];
        csv += row.join(',') + '\n';
    });
    
    const dataBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dcq-bikes-financiele-data.csv';
    link.click();
    URL.revokeObjectURL(url);
}

function exportToPDF() {
    window.print();
}

// ============================================================================
// Tab Navigation
// ============================================================================

function initTabNavigation() {
    try {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        console.log(`🔍 Tab navigatie: ${tabButtons.length} buttons, ${tabPanels.length} panels gevonden`);
        
        if (tabButtons.length === 0) {
            console.warn('⚠️ Geen tab buttons gevonden!');
            return;
        }
        
        if (tabPanels.length === 0) {
            console.warn('⚠️ Geen tab panels gevonden!');
            return;
        }
        
        // Ensure first tab is active on load
        if (tabButtons.length > 0 && tabPanels.length > 0) {
            // Set first button as active
            tabButtons[0].classList.add('active');
            tabButtons[0].setAttribute('aria-selected', 'true');
            
            // Show first panel
            const firstTab = tabButtons[0].getAttribute('data-tab');
            const firstPanel = document.getElementById(`${firstTab}-panel`);
            if (firstPanel) {
                firstPanel.classList.add('active');
                firstPanel.classList.remove('hidden');
            }
            
            // Hide other panels
            tabPanels.forEach(panel => {
                if (panel.id !== `${firstTab}-panel`) {
                    panel.classList.remove('active');
                    panel.classList.add('hidden');
                }
            });
        }
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = button.getAttribute('data-tab');
                if (!targetTab) return;
                
                // Remove active class from all buttons and panels
                tabButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                tabPanels.forEach(panel => {
                    panel.classList.remove('active');
                    panel.classList.add('hidden');
                });
                
                // Add active class to clicked button and corresponding panel
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');
                const targetPanel = document.getElementById(`${targetTab}-panel`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    targetPanel.classList.remove('hidden');
                } else {
                    console.warn(`⚠️ Panel not found: ${targetTab}-panel`);
                }
            });
        });
    } catch (error) {
        console.error('❌ Fout bij initialiseren tab navigatie:', error);
    }
}

// ============================================================================
// Collapsible Insights
// ============================================================================

function initCollapsibleInsights() {
    const toggleBtn = document.getElementById('toggleInsights');
    if (!toggleBtn) return;
    
    let allExpanded = true;
    
    toggleBtn.addEventListener('click', () => {
        const insightCards = document.querySelectorAll('.insight-card');
        allExpanded = !allExpanded;
        
        insightCards.forEach(card => {
            if (allExpanded) {
                card.classList.remove('collapsed');
                card.classList.add('expanded');
            } else {
                card.classList.add('collapsed');
                card.classList.remove('expanded');
            }
        });
        
        const toggleText = document.getElementById('insightsToggleText');
        if (toggleText) {
            toggleText.textContent = allExpanded ? '🔽 Alles uitklappen' : '🔼 Alles inklappen';
        }
    });
}

// ============================================================================
// Search and Filter
// ============================================================================

function initSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const yearFilter = document.getElementById('yearFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterTable(e.target.value);
        });
    }
    
    if (yearFilter) {
        yearFilter.addEventListener('change', (e) => {
            filterTableByYear(e.target.value);
        });
    }
}

function filterTable(searchTerm) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterTableByYear(year) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (year === 'all') {
            row.style.display = '';
        } else {
            const yearCell = row.querySelector('td:first-child');
            if (yearCell && yearCell.textContent.trim() === year) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// ============================================================================
// Details Panel Rendering
// ============================================================================

function renderDetailsPanel() {
    const years = Object.keys(financialData).map(Number).sort((a, b) => b - a);
    if (years.length === 0) return;
    
    const latestYear = years[0];
    const data = financialData[latestYear];
    
    // Income Statement Details
    const incomeDiv = document.getElementById('incomeStatementDetails');
    if (incomeDiv) {
        incomeDiv.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="p-3 bg-blue-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Brutomarge</div>
                    <div class="text-lg font-bold text-blue-900">${formatNumber(data.grossMargin)}</div>
                </div>
                <div class="p-3 bg-green-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Bedrijfswinst</div>
                    <div class="text-lg font-bold text-green-900">${formatNumber(data.operatingProfit)}</div>
                </div>
                <div class="p-3 bg-purple-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Netto Winst</div>
                    <div class="text-lg font-bold text-purple-900">${formatNumber(data.netProfit)}</div>
                </div>
                <div class="p-3 bg-orange-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Personeelskosten</div>
                    <div class="text-lg font-bold text-orange-900">${formatNumber(data.personnelCosts)}</div>
                </div>
                <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Afschrijvingen</div>
                    <div class="text-lg font-bold text-gray-900">${formatNumber(data.depreciation)}</div>
                </div>
                <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Financiële Kosten</div>
                    <div class="text-lg font-bold text-gray-900">${formatNumber(data.financialCosts)}</div>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="text-sm text-gray-600">Boekjaar: <strong>${latestYear}</strong></div>
            </div>
        `;
    }
    
    // Balance Sheet Details
    const balanceDiv = document.getElementById('balanceSheetDetails');
    if (balanceDiv) {
        balanceDiv.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="p-3 bg-purple-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Totale Activa</div>
                    <div class="text-lg font-bold text-purple-900">${formatNumber(data.totalAssets)}</div>
                </div>
                <div class="p-3 bg-pink-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Eigen Vermogen</div>
                    <div class="text-lg font-bold text-pink-900">${formatNumber(data.equity)}</div>
                </div>
                <div class="p-3 bg-indigo-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Vaste Activa</div>
                    <div class="text-lg font-bold text-indigo-900">${formatNumber(data.fixedAssets)}</div>
                </div>
                <div class="p-3 bg-teal-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Vlottende Activa</div>
                    <div class="text-lg font-bold text-teal-900">${formatNumber(data.currentAssets)}</div>
                </div>
                <div class="p-3 bg-yellow-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Voorraden</div>
                    <div class="text-lg font-bold text-yellow-900">${formatNumber(data.inventory)}</div>
                </div>
                <div class="p-3 bg-cyan-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Liquide Middelen</div>
                    <div class="text-lg font-bold text-cyan-900">${formatNumber(data.cash)}</div>
                </div>
                <div class="p-3 bg-red-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Vlottende Passiva</div>
                    <div class="text-lg font-bold text-red-900">${formatNumber(data.currentLiabilities)}</div>
                </div>
                <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="text-xs text-gray-600 mb-1">Leveranciers</div>
                    <div class="text-lg font-bold text-gray-900">${formatNumber(data.tradePayables)}</div>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="text-sm text-gray-600">Boekjaar: <strong>${latestYear}</strong></div>
            </div>
        `;
    }
}

// ============================================================================
// Enhanced Analysis Functions
// ============================================================================

/**
 * Render Financial Health Score
 */
function renderAnalysisPanel() {
    renderHealthScore();
    renderYoYComparison();
    renderEfficiencyMetrics();
    renderDebtAnalysis();
    renderCashFlowAnalysis();
}

/**
 * Calculate and display Financial Health Score
 */
function renderHealthScore() {
    const healthDiv = document.getElementById('healthScore');
    if (!healthDiv) return;
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => b - a);
    if (years.length === 0) return;
    
    const latestYear = years[0];
    const data = financialData[latestYear];
    
    let score = 0;
    let maxScore = 0;
    const factors = [];
    
    // Profitability (25 points)
    maxScore += 25;
    if (data.netProfit && data.netProfit > 0) {
        const netMargin = data.grossMargin ? (data.netProfit / data.grossMargin * 100) : 0;
        if (netMargin > 10) {
            score += 25;
            factors.push({ name: 'Winstgevendheid', score: 25, max: 25, status: 'excellent', text: `Netto marge: ${netMargin.toFixed(1)}% (Uitstekend)` });
        } else if (netMargin > 5) {
            score += 20;
            factors.push({ name: 'Winstgevendheid', score: 20, max: 25, status: 'good', text: `Netto marge: ${netMargin.toFixed(1)}% (Goed)` });
        } else if (netMargin > 0) {
            score += 15;
            factors.push({ name: 'Winstgevendheid', score: 15, max: 25, status: 'fair', text: `Netto marge: ${netMargin.toFixed(1)}% (Redelijk)` });
        } else {
            factors.push({ name: 'Winstgevendheid', score: 0, max: 25, status: 'poor', text: `Netto marge: ${netMargin.toFixed(1)}% (Zorgwekkend)` });
        }
    } else {
        factors.push({ name: 'Winstgevendheid', score: 0, max: 25, status: 'poor', text: 'Geen winst (Zorgwekkend)' });
    }
    
    // Liquidity (25 points)
    maxScore += 25;
    if (data.currentAssets && data.currentLiabilities && data.currentLiabilities !== 0) {
        const currentRatio = data.currentAssets / data.currentLiabilities;
        if (currentRatio > 2) {
            score += 25;
            factors.push({ name: 'Liquiditeit', score: 25, max: 25, status: 'excellent', text: `Huidige ratio: ${currentRatio.toFixed(2)} (Uitstekend)` });
        } else if (currentRatio > 1.5) {
            score += 20;
            factors.push({ name: 'Liquiditeit', score: 20, max: 25, status: 'good', text: `Huidige ratio: ${currentRatio.toFixed(2)} (Goed)` });
        } else if (currentRatio > 1) {
            score += 15;
            factors.push({ name: 'Liquiditeit', score: 15, max: 25, status: 'fair', text: `Huidige ratio: ${currentRatio.toFixed(2)} (Redelijk)` });
        } else {
            score += 5;
            factors.push({ name: 'Liquiditeit', score: 5, max: 25, status: 'poor', text: `Huidige ratio: ${currentRatio.toFixed(2)} (Zorgwekkend)` });
        }
    } else {
        factors.push({ name: 'Liquiditeit', score: 0, max: 25, status: 'poor', text: 'Geen data beschikbaar' });
    }
    
    // Solvency (25 points)
    maxScore += 25;
    if (data.equity && data.totalAssets && data.totalAssets !== 0) {
        const equityRatio = (data.equity / data.totalAssets) * 100;
        if (equityRatio > 50) {
            score += 25;
            factors.push({ name: 'Solvabiliteit', score: 25, max: 25, status: 'excellent', text: `Eigen vermogen ratio: ${equityRatio.toFixed(1)}% (Uitstekend)` });
        } else if (equityRatio > 30) {
            score += 20;
            factors.push({ name: 'Solvabiliteit', score: 20, max: 25, status: 'good', text: `Eigen vermogen ratio: ${equityRatio.toFixed(1)}% (Goed)` });
        } else if (equityRatio > 20) {
            score += 15;
            factors.push({ name: 'Solvabiliteit', score: 15, max: 25, status: 'fair', text: `Eigen vermogen ratio: ${equityRatio.toFixed(1)}% (Redelijk)` });
        } else {
            score += 5;
            factors.push({ name: 'Solvabiliteit', score: 5, max: 25, status: 'poor', text: `Eigen vermogen ratio: ${equityRatio.toFixed(1)}% (Zorgwekkend)` });
        }
    } else {
        factors.push({ name: 'Solvabiliteit', score: 0, max: 25, status: 'poor', text: 'Geen data beschikbaar' });
    }
    
    // Growth (25 points)
    maxScore += 25;
    if (years.length >= 2) {
        const prevYear = years[1];
        const prevData = financialData[prevYear];
        if (data.grossMargin && prevData.grossMargin && prevData.grossMargin !== 0) {
            const growth = ((data.grossMargin - prevData.grossMargin) / prevData.grossMargin) * 100;
            if (growth > 10) {
                score += 25;
                factors.push({ name: 'Groei', score: 25, max: 25, status: 'excellent', text: `Brutomarge groei: +${growth.toFixed(1)}% (Uitstekend)` });
            } else if (growth > 5) {
                score += 20;
                factors.push({ name: 'Groei', score: 20, max: 25, status: 'good', text: `Brutomarge groei: +${growth.toFixed(1)}% (Goed)` });
            } else if (growth > 0) {
                score += 15;
                factors.push({ name: 'Groei', score: 15, max: 25, status: 'fair', text: `Brutomarge groei: +${growth.toFixed(1)}% (Redelijk)` });
            } else {
                score += 5;
                factors.push({ name: 'Groei', score: 5, max: 25, status: 'poor', text: `Brutomarge groei: ${growth.toFixed(1)}% (Zorgwekkend)` });
            }
        } else {
            factors.push({ name: 'Groei', score: 0, max: 25, status: 'poor', text: 'Geen groei data beschikbaar' });
        }
    } else {
        factors.push({ name: 'Groei', score: 0, max: 25, status: 'poor', text: 'Niet genoeg jaren voor groei analyse' });
    }
    
    const percentage = (score / maxScore) * 100;
    let healthStatus = 'Zorgwekkend';
    let healthColor = 'red';
    let healthEmoji = '🔴';
    
    if (percentage >= 80) {
        healthStatus = 'Uitstekend';
        healthColor = 'green';
        healthEmoji = '🟢';
    } else if (percentage >= 60) {
        healthStatus = 'Goed';
        healthColor = 'blue';
        healthEmoji = '🔵';
    } else if (percentage >= 40) {
        healthStatus = 'Redelijk';
        healthColor = 'yellow';
        healthEmoji = '🟡';
    }
    
    let factorsHTML = factors.map(f => {
        const factorPercentage = (f.score / f.max) * 100;
        const statusColors = {
            excellent: 'bg-green-100 text-green-800 border-green-300',
            good: 'bg-blue-100 text-blue-800 border-blue-300',
            fair: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            poor: 'bg-red-100 text-red-800 border-red-300'
        };
        return `
            <div class="p-3 rounded-lg border ${statusColors[f.status]}">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-semibold">${f.name}</span>
                    <span class="text-sm">${f.score}/${f.max}</span>
                </div>
                <div class="text-xs">${f.text}</div>
                <div class="mt-2 bg-gray-200 rounded-full h-2">
                    <div class="bg-${f.status === 'excellent' ? 'green' : f.status === 'good' ? 'blue' : f.status === 'fair' ? 'yellow' : 'red'}-500 h-2 rounded-full" style="width: ${factorPercentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
    
    healthDiv.innerHTML = `
        <div class="text-center mb-6">
            <div class="text-6xl font-bold text-${healthColor}-600 mb-2">${percentage.toFixed(0)}%</div>
            <div class="text-2xl font-semibold text-gray-700">${healthEmoji} ${healthStatus}</div>
            <div class="text-sm text-gray-500 mt-2">Totaal: ${score}/${maxScore} punten</div>
        </div>
        <div class="space-y-3">
            ${factorsHTML}
        </div>
    `;
}

/**
 * Render Year-over-Year Comparison
 */
function renderYoYComparison() {
    const yoyDiv = document.getElementById('yoyComparison');
    if (!yoyDiv) return;
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => b - a);
    if (years.length < 2) {
        yoyDiv.innerHTML = '<p class="text-gray-500">Niet genoeg data voor jaar-op-jaar vergelijking</p>';
        return;
    }
    
    let comparisons = [];
    
    for (let i = 0; i < years.length - 1; i++) {
        const currentYear = years[i];
        const prevYear = years[i + 1];
        const current = financialData[currentYear];
        const prev = financialData[prevYear];
        
        const metrics = [
            { name: 'Brutomarge', current: current.grossMargin, prev: prev.grossMargin },
            { name: 'Bedrijfswinst', current: current.operatingProfit, prev: prev.operatingProfit },
            { name: 'Netto Winst', current: current.netProfit, prev: prev.netProfit },
            { name: 'Totale Activa', current: current.totalAssets, prev: prev.totalAssets },
            { name: 'Eigen Vermogen', current: current.equity, prev: prev.equity }
        ];
        
        let metricsHTML = metrics.map(m => {
            if (!m.current || !m.prev) return '';
            const change = ((m.current - m.prev) / m.prev) * 100;
            const changeColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
            const changeIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
            return `
                <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span class="font-medium">${m.name}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-sm text-gray-600">${formatNumber(m.prev)}</span>
                        <span class="text-sm ${changeColor} font-semibold">${changeIcon} ${change > 0 ? '+' : ''}${change.toFixed(1)}%</span>
                        <span class="text-sm font-semibold">${formatNumber(m.current)}</span>
                    </div>
                </div>
            `;
        }).filter(h => h !== '').join('');
        
        if (metricsHTML) {
            comparisons.push(`
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 class="font-bold text-lg mb-3 text-gray-800">${prevYear} → ${currentYear}</h3>
                    <div class="space-y-1">
                        ${metricsHTML}
                    </div>
                </div>
            `);
        }
    }
    
    yoyDiv.innerHTML = comparisons.join('');
}

/**
 * Render Efficiency Metrics
 */
function renderEfficiencyMetrics() {
    const efficiencyDiv = document.getElementById('efficiencyMetrics');
    if (!efficiencyDiv) return;
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => b - a);
    if (years.length === 0) return;
    
    const latestYear = years[0];
    const data = financialData[latestYear];
    
    const metrics = [];
    
    // Asset Turnover
    if (data.grossMargin && data.totalAssets && data.totalAssets !== 0) {
        const assetTurnover = data.grossMargin / data.totalAssets;
        metrics.push({
            name: 'Asset Turnover',
            value: assetTurnover.toFixed(2),
            description: 'Hoe efficiënt activa worden gebruikt om omzet te genereren',
            good: assetTurnover > 1.0
        });
    }
    
    // Inventory Turnover (if available)
    if (data.costOfGoodsSold && data.inventory && data.inventory !== 0) {
        const inventoryTurnover = data.costOfGoodsSold / data.inventory;
        metrics.push({
            name: 'Voorraad Omloopsnelheid',
            value: inventoryTurnover.toFixed(2),
            description: 'Hoe vaak voorraad per jaar wordt verkocht',
            good: inventoryTurnover > 4
        });
    }
    
    // Employee Productivity
    if (data.grossMargin && data.employees && data.employees > 0) {
        const revenuePerEmployee = data.grossMargin / data.employees;
        metrics.push({
            name: 'Omzet per Werknemer',
            value: formatNumber(revenuePerEmployee),
            description: 'Productiviteit per werknemer',
            good: revenuePerEmployee > 100000
        });
    }
    
    // Days Sales Outstanding (DSO) - estimated
    if (data.tradeReceivables && data.grossMargin && data.grossMargin !== 0) {
        const dso = (data.tradeReceivables / data.grossMargin) * 365;
        metrics.push({
            name: 'Gemiddelde Incassotijd (dagen)',
            value: dso.toFixed(0),
            description: 'Aantal dagen om debiteuren te innen',
            good: dso < 45
        });
    }
    
    let metricsHTML = metrics.map(m => {
        const bgColor = m.good ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200';
        return `
            <div class="p-4 rounded-lg border ${bgColor}">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="font-bold text-gray-900">${m.name}</div>
                        <div class="text-xs text-gray-600 mt-1">${m.description}</div>
                    </div>
                    <div class="text-2xl font-bold text-gray-800">${m.value}</div>
                </div>
            </div>
        `;
    }).join('');
    
    efficiencyDiv.innerHTML = metricsHTML || '<p class="text-gray-500">Geen efficiëntie data beschikbaar</p>';
}

/**
 * Render Debt Analysis
 */
function renderDebtAnalysis() {
    const debtDiv = document.getElementById('debtAnalysis');
    if (!debtDiv) return;
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => b - a);
    if (years.length === 0) return;
    
    const latestYear = years[0];
    const data = financialData[latestYear];
    
    const analyses = [];
    
    // Debt-to-Equity Ratio
    if (data.equity && data.totalLiabilities && data.equity !== 0) {
        const debtToEquity = data.totalLiabilities / data.equity;
        const status = debtToEquity < 0.5 ? 'excellent' : debtToEquity < 1 ? 'good' : debtToEquity < 2 ? 'fair' : 'poor';
        analyses.push({
            name: 'Schuld/Eigen Vermogen',
            value: debtToEquity.toFixed(2),
            status: status,
            description: status === 'excellent' ? 'Zeer lage schuld' : status === 'good' ? 'Lage schuld' : status === 'fair' ? 'Matige schuld' : 'Hoge schuld'
        });
    }
    
    // Debt Ratio
    if (data.totalLiabilities && data.totalAssets && data.totalAssets !== 0) {
        const debtRatio = (data.totalLiabilities / data.totalAssets) * 100;
        const status = debtRatio < 30 ? 'excellent' : debtRatio < 50 ? 'good' : debtRatio < 70 ? 'fair' : 'poor';
        analyses.push({
            name: 'Schuld Ratio',
            value: debtRatio.toFixed(1) + '%',
            status: status,
            description: status === 'excellent' ? 'Zeer solide' : status === 'good' ? 'Solide' : status === 'fair' ? 'Acceptabel' : 'Zorgwekkend'
        });
    }
    
    // Interest Coverage (if financial costs available)
    if (data.operatingProfit && data.financialCosts && data.financialCosts !== 0) {
        const interestCoverage = data.operatingProfit / Math.abs(data.financialCosts);
        const status = interestCoverage > 5 ? 'excellent' : interestCoverage > 3 ? 'good' : interestCoverage > 1.5 ? 'fair' : 'poor';
        analyses.push({
            name: 'Rentedekking',
            value: interestCoverage.toFixed(2) + 'x',
            status: status,
            description: status === 'excellent' ? 'Uitstekende dekking' : status === 'good' ? 'Goede dekking' : status === 'fair' ? 'Voldoende dekking' : 'Onvoldoende dekking'
        });
    }
    
    let analysesHTML = analyses.map(a => {
        const statusColors = {
            excellent: 'bg-green-100 border-green-300 text-green-800',
            good: 'bg-blue-100 border-blue-300 text-blue-800',
            fair: 'bg-yellow-100 border-yellow-300 text-yellow-800',
            poor: 'bg-red-100 border-red-300 text-red-800'
        };
        return `
            <div class="p-4 rounded-lg border ${statusColors[a.status]}">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold">${a.name}</span>
                    <span class="text-xl font-bold">${a.value}</span>
                </div>
                <div class="text-xs">${a.description}</div>
            </div>
        `;
    }).join('');
    
    debtDiv.innerHTML = analysesHTML || '<p class="text-gray-500">Geen schuld data beschikbaar</p>';
}

/**
 * Render Cash Flow Analysis
 */
function renderCashFlowAnalysis() {
    const cashFlowDiv = document.getElementById('cashFlowAnalysis');
    if (!cashFlowDiv) return;
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => b - a);
    if (years.length === 0) return;
    
    const latestYear = years[0];
    const data = financialData[latestYear];
    
    const indicators = [];
    
    // Operating Cash Flow (estimated from net profit + depreciation)
    if (data.netProfit !== null && data.depreciation !== null) {
        const estimatedOCF = data.netProfit + (data.depreciation || 0);
        indicators.push({
            name: 'Geschatte Operationele Cash Flow',
            value: formatNumber(estimatedOCF),
            positive: estimatedOCF > 0
        });
    }
    
    // Cash Position
    if (data.cash !== null) {
        const cashMonths = data.grossMargin && data.grossMargin !== 0 
            ? (data.cash / (data.grossMargin / 12)) 
            : null;
        indicators.push({
            name: 'Liquide Middelen',
            value: formatNumber(data.cash),
            description: cashMonths ? `≈ ${cashMonths.toFixed(1)} maanden operationele kosten` : ''
        });
    }
    
    // Working Capital
    if (data.currentAssets && data.currentLiabilities) {
        const workingCapital = data.currentAssets - data.currentLiabilities;
        indicators.push({
            name: 'Werkkapitaal',
            value: formatNumber(workingCapital),
            positive: workingCapital > 0
        });
    }
    
    // Quick Ratio
    if (data.currentAssets && data.currentLiabilities && data.inventory && data.currentLiabilities !== 0) {
        const quickRatio = (data.currentAssets - data.inventory) / data.currentLiabilities;
        indicators.push({
            name: 'Quick Ratio',
            value: quickRatio.toFixed(2),
            description: quickRatio > 1 ? 'Goede liquiditeit zonder voorraad' : 'Mogelijk liquiditeitsprobleem'
        });
    }
    
    let indicatorsHTML = indicators.map(ind => {
        const bgColor = ind.positive === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
        return `
            <div class="p-4 rounded-lg border ${bgColor}">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-bold text-gray-900">${ind.name}</div>
                        ${ind.description ? `<div class="text-xs text-gray-600 mt-1">${ind.description}</div>` : ''}
                    </div>
                    <div class="text-xl font-bold text-gray-800">${ind.value}</div>
                </div>
            </div>
        `;
    }).join('');
    
    cashFlowDiv.innerHTML = indicatorsHTML || '<p class="text-gray-500">Geen cash flow data beschikbaar</p>';
}

/**
 * Render Trends Charts
 */
function renderTrendsCharts() {
    renderGrowthChart();
    renderEfficiencyChart();
    renderCashFlowTrendChart();
    renderDebtTrendChart();
    renderKPITrendChart();
}

/**
 * Render Growth Chart
 */
function renderGrowthChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    
    if (growthChart) {
        growthChart.destroy();
    }
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    const labels = years.map(y => y.toString());
    
    const revenueData = years.map(y => financialData[y].grossMargin);
    const profitData = years.map(y => financialData[y].netProfit);
    const assetsData = years.map(y => financialData[y].totalAssets);
    
    // Calculate YoY growth rates
    const revenueGrowth = [];
    const profitGrowth = [];
    const assetsGrowth = [];
    
    for (let i = 1; i < years.length; i++) {
        const prevRev = revenueData[i - 1];
        const currRev = revenueData[i];
        revenueGrowth.push(prevRev && currRev && prevRev !== 0 ? ((currRev - prevRev) / prevRev * 100) : null);
        
        const prevProf = profitData[i - 1];
        const currProf = profitData[i];
        profitGrowth.push(prevProf && currProf && prevProf !== 0 ? ((currProf - prevProf) / prevProf * 100) : null);
        
        const prevAssets = assetsData[i - 1];
        const currAssets = assetsData[i];
        assetsGrowth.push(prevAssets && currAssets && prevAssets !== 0 ? ((currAssets - prevAssets) / prevAssets * 100) : null);
    }
    
    const growthLabels = years.slice(1).map(y => y.toString());
    
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: growthLabels,
            datasets: [
                {
                    label: 'Brutomarge Groei %',
                    data: revenueGrowth,
                    borderColor: CHART_COLORS.dcqRed,
                    backgroundColor: CHART_COLORS.dcqRedBg,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Netto Winst Groei %',
                    data: profitGrowth,
                    borderColor: CHART_COLORS.green,
                    backgroundColor: CHART_COLORS.greenBg,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Activa Groei %',
                    data: assetsGrowth,
                    borderColor: CHART_COLORS.blue,
                    backgroundColor: CHART_COLORS.blueBg,
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return value !== null ? context.dataset.label + ': ' + value.toFixed(1) + '%' : 'Geen data';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render Efficiency Chart
 */
function renderEfficiencyChart() {
    const ctx = document.getElementById('efficiencyChart');
    if (!ctx) return;
    
    if (efficiencyChart) {
        efficiencyChart.destroy();
    }
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    const labels = years.map(y => y.toString());
    
    const assetTurnover = years.map(y => {
        const d = financialData[y];
        return d.grossMargin && d.totalAssets && d.totalAssets !== 0 ? (d.grossMargin / d.totalAssets) : null;
    });
    
    const roa = years.map(y => {
        const d = financialData[y];
        return d.netProfit && d.totalAssets && d.totalAssets !== 0 ? (d.netProfit / d.totalAssets * 100) : null;
    });
    
    const roe = years.map(y => {
        const d = financialData[y];
        return d.netProfit && d.equity && d.equity !== 0 ? (d.netProfit / d.equity * 100) : null;
    });
    
    efficiencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Asset Turnover',
                    data: assetTurnover,
                    borderColor: CHART_COLORS.dcqRed,
                    backgroundColor: CHART_COLORS.dcqRedBg,
                    yAxisID: 'y',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'ROA %',
                    data: roa,
                    borderColor: CHART_COLORS.blue,
                    backgroundColor: CHART_COLORS.blueBg,
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'ROE %',
                    data: roe,
                    borderColor: CHART_COLORS.green,
                    backgroundColor: CHART_COLORS.greenBg,
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Asset Turnover' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'ROA/ROE %' },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render Cash Flow Trend Chart
 */
function renderCashFlowTrendChart() {
    const ctx = document.getElementById('cashFlowChart');
    if (!ctx) return;
    
    if (cashFlowChart) {
        cashFlowChart.destroy();
    }
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    const labels = years.map(y => y.toString());
    
    const cash = years.map(y => financialData[y].cash);
    const workingCapital = years.map(y => {
        const d = financialData[y];
        return d.currentAssets && d.currentLiabilities ? (d.currentAssets - d.currentLiabilities) : null;
    });
    const estimatedOCF = years.map(y => {
        const d = financialData[y];
        return d.netProfit !== null && d.depreciation !== null ? (d.netProfit + (d.depreciation || 0)) : null;
    });
    
    cashFlowChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Liquide Middelen',
                    data: cash,
                    backgroundColor: CHART_COLORS.dcqRedBgStrong,
                    borderColor: CHART_COLORS.dcqRed,
                    borderWidth: 2
                },
                {
                    label: 'Werkkapitaal',
                    data: workingCapital,
                    backgroundColor: CHART_COLORS.blueBgStrong,
                    borderColor: CHART_COLORS.blue,
                    borderWidth: 2
                },
                {
                    label: 'Geschatte OCF',
                    data: estimatedOCF,
                    backgroundColor: CHART_COLORS.greenBgStrong,
                    borderColor: CHART_COLORS.green,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Render Debt Trend Chart
 */
function renderDebtTrendChart() {
    const ctx = document.getElementById('debtChart');
    if (!ctx) return;
    
    if (debtChart) {
        debtChart.destroy();
    }
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    const labels = years.map(y => y.toString());
    
    const debtToEquity = years.map(y => {
        const d = financialData[y];
        return d.equity && d.totalLiabilities && d.equity !== 0 ? (d.totalLiabilities / d.equity) : null;
    });
    
    const debtRatio = years.map(y => {
        const d = financialData[y];
        return d.totalLiabilities && d.totalAssets && d.totalAssets !== 0 ? ((d.totalLiabilities / d.totalAssets) * 100) : null;
    });
    
    debtChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Schuld/Eigen Vermogen',
                    data: debtToEquity,
                    borderColor: CHART_COLORS.dcqRed,
                    backgroundColor: CHART_COLORS.dcqRedBg,
                    yAxisID: 'y',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Schuld Ratio %',
                    data: debtRatio,
                    borderColor: CHART_COLORS.orange,
                    backgroundColor: CHART_COLORS.orangeBg,
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Schuld/Eigen Vermogen' },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Schuld Ratio %' },
                    grid: {
                        drawOnChartArea: false,
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render KPI Trend Chart
 */
function renderKPITrendChart() {
    const ctx = document.getElementById('kpiTrendChart');
    if (!ctx) return;
    
    if (kpiTrendChart) {
        kpiTrendChart.destroy();
    }
    
    const years = Object.keys(financialData).map(Number).sort((a, b) => a - b);
    const labels = years.map(y => y.toString());
    
    const grossMarginPct = years.map(y => {
        const d = financialData[y];
        return d.grossMargin && d.grossMargin !== 0 
            ? (d.grossMargin / (d.grossMargin + (d.personnelCosts || 0)) * 100) 
            : null;
    });
    
    const operatingMarginPct = years.map(y => {
        const d = financialData[y];
        return d.grossMargin && d.operatingProfit !== null
            ? (d.operatingProfit / d.grossMargin * 100)
            : null;
    });
    
    const netMarginPct = years.map(y => {
        const d = financialData[y];
        return d.grossMargin && d.netProfit !== null
            ? (d.netProfit / d.grossMargin * 100)
            : null;
    });
    
    kpiTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Brutomarge %',
                    data: grossMarginPct,
                    borderColor: CHART_COLORS.dcqRed,
                    backgroundColor: CHART_COLORS.dcqRedBg,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Bedrijfswinstmarge %',
                    data: operatingMarginPct,
                    borderColor: CHART_COLORS.blue,
                    backgroundColor: CHART_COLORS.blueBg,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Netto Winstmarge %',
                    data: netMarginPct,
                    borderColor: CHART_COLORS.green,
                    backgroundColor: CHART_COLORS.greenBg,
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// ============================================================================
// Event Listeners
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOMContentLoaded event fired - Initialiseren dashboard...');
    
    try {
        // Initialize UI components
        console.log('🔧 Initialiseren UI componenten...');
        initTabNavigation();
        initCollapsibleInsights();
        initSearchAndFilter();
        
        // Export buttons
        const exportJSONBtn = document.getElementById('exportJSONBtn');
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        
        if (exportJSONBtn) {
            exportJSONBtn.addEventListener('click', exportToJSON);
            console.log('✓ Export JSON button gekoppeld');
        } else {
            console.error('❌ Export JSON button niet gevonden!');
        }
        
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', exportToCSV);
            console.log('✓ Export CSV button gekoppeld');
        } else {
            console.error('❌ Export CSV button niet gevonden!');
        }
        
        const exportPDFBtn = document.getElementById('exportPDFBtn');
        if (exportPDFBtn) {
            exportPDFBtn.addEventListener('click', exportToPDF);
            console.log('✓ Export PDF/Print button gekoppeld');
        } else {
            console.error('❌ Export PDF button niet gevonden!');
        }
        
        // Start verwerken CSVs bij pagina laden
        console.log('📊 Starten met verwerken van CSV bestanden...');
        processAllCSVs();
    } catch (error) {
        console.error('❌ Fout bij initialiseren dashboard:', error);
        const statusLog = document.getElementById('statusLog');
        if (statusLog) {
            statusLog.innerHTML = `<div class="text-red-600 font-bold">Fout bij laden: ${error.message}</div>`;
        }
    }
});

// Fallback: als DOMContentLoaded al is gebeurd, direct uitvoeren
if (document.readyState === 'loading') {
    // DOMContentLoaded wordt nog afgevuurd
} else {
    // DOM is al geladen, direct uitvoeren
    console.log('📄 DOM is al geladen - Direct initialiseren...');
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
}

