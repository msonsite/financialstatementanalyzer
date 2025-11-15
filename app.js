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

// Chart instances
let revenueChart = null;
let profitabilityChart = null;
let assetsChart = null;
let marginsChart = null;
let ratiosChart = null;
let cashFlowChart = null;

// ============================================================================
// CSV Parsing Functies
// ============================================================================

/**
 * Parse een nummer uit een CSV cel, handel verschillende formaten af
 * Handelt punten als duizendtallen scheidingstekens, komma's als decimalen (Belgisch formaat)
 * BELANGRIJK: Belgische jaarrekeningen gebruiken duizendtallen als eenheid voor financiële bedragen
 * Dus "340.936" betekent 340.936.000 EUR (340 miljoen)
 * 
 * @param {string} value - De waarde om te parsen
 * @param {boolean} isFinancialAmount - True als dit een financieel bedrag is (moet met 1000 vermenigvuldigd), false voor andere waarden zoals aantal werknemers
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
        // Alleen punt: in Belgische jaarrekeningen is dit meestal duizendtallen scheidingsteken
        // Bijvoorbeeld: 340.936 = 340,936 (in duizendtallen) = 340.936.000 EUR
        // Of: 8.064 = 8,064 (in duizendtallen) = 8.064.000 EUR
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
    
    // BELANGRIJK: Belgische jaarrekeningen gebruiken duizendtallen voor financiële bedragen
    // Vermenigvuldig met 1000 om echte EUR bedragen te krijgen
    // Bijvoorbeeld: 340.936 in CSV = 340.936.000 EUR
    // Voor niet-financiële waarden (zoals aantal werknemers), vermenigvuldig NIET
    if (isFinancialAmount) {
        return num * 1000;
    }
    
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
                        // Voor financiële bedragen, accepteren we waarden vanaf 100 EUR (na vermenigvuldiging)
                        // Dit voorkomt dat we zeer kleine getallen gebruiken, maar accepteert wel waarden zoals 8.064.000
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
                // Na vermenigvuldiging met 1000, zou dit > 1.000.000 moeten zijn voor een bedrijf
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

        // Aantal werknemers - NIET vermenigvuldigen met 1000!
        if (lineLower.includes('gemiddeld aantal werknemers') && data.employees === null) {
            for (let j = 0; j < columns.length; j++) {
                const val = parseNumber(columns[j], false); // false = niet financieel bedrag
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
    // Na vermenigvuldiging met 1000 zouden we realistische bedragen moeten zien
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
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
                    backgroundColor: 'rgba(34, 197, 94, 0.6)'
                },
                {
                    label: 'Netto Winst',
                    data: mapDataForChart(years, 'netProfit'),
                    backgroundColor: 'rgba(16, 185, 129, 0.6)'
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
                    backgroundColor: 'rgba(139, 92, 246, 0.6)'
                },
                {
                    label: 'Eigen Vermogen',
                    data: mapDataForChart(years, 'equity'),
                    backgroundColor: 'rgba(236, 72, 153, 0.6)'
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
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true,
                    spanGaps: false
                },
                {
                    label: 'Netto Winstmarge %',
                    data: netMargins,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    spanGaps: false
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
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    spanGaps: false,
                    yAxisID: 'y'
                },
                {
                    label: 'Eigen Vermogen Ratio %',
                    data: equityRatios,
                    borderColor: 'rgb(236, 72, 153)',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    tension: 0.4,
                    spanGaps: false,
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

