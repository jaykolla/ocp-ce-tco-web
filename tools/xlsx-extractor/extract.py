#!/usr/bin/env python3
"""
OCP CE TCO v1.11 XLSX Extractor — correct column offsets from inspection.
All Power/Cooling/Data sheets: col 1 = labels, col 2+ = values.
Weather sheet: row 6 = zone IDs (col 2+), rows 7+ = hourly data.
"""

import zipfile, json, re, os, hashlib
from xml.etree import ElementTree as ET
from datetime import datetime, timezone

WB = '/Users/jaykolla/Desktop/Claude_Files/TCO_Calculator_OCP_DC/OCP CE TCO tool v1.11/OCP CE TCO tool v1.11.xlsx'
OUT_SEED = '/Users/jaykolla/Desktop/Claude_Files/TCO_Calculator_OCP_DC/ocp-ce-tco-web/packages/seed-data/src/generated'
OUT_FIX  = '/Users/jaykolla/Desktop/Claude_Files/TCO_Calculator_OCP_DC/ocp-ce-tco-web/packages/test-fixtures/scenarios'

os.makedirs(OUT_SEED, exist_ok=True)
os.makedirs(OUT_FIX, exist_ok=True)

def emit(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f'  ✓ {os.path.basename(path)}')

with open(WB, 'rb') as f:
    sha = hashlib.sha256(f.read()).hexdigest()
print(f'Source SHA-256: {sha}')
NOW = datetime.now(timezone.utc).isoformat()

z = zipfile.ZipFile(WB)
NS = {'ss': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}

# Shared strings
shared = []
with z.open('xl/sharedStrings.xml') as f:
    root = ET.parse(f).getroot()
for si in root.findall('ss:si', NS):
    shared.append(''.join(p.text or '' for p in si.findall('.//ss:t', NS)))
print(f'Shared strings: {len(shared)}')

# Sheet map
rels = ET.parse(z.open('xl/_rels/workbook.xml.rels')).getroot()
id_to = {r.get('Id'): 'xl/' + r.get('Target','') for r in rels}
wb = ET.parse(z.open('xl/workbook.xml')).getroot()
smap = {}
for s in wb.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
    rid = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id','')
    smap[s.get('name')] = id_to.get(rid,'')
print(f'Sheets: {list(smap.keys())}')

def col_idx(letters):
    i = 0
    for ch in letters:
        i = i * 26 + (ord(ch) - 64)
    return i - 1

def load_sheet(name):
    path = smap.get(name,'')
    if not path or path not in z.namelist(): return []
    root = ET.parse(z.open(path)).getroot()
    rows = []
    for row_el in root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        r_idx = int(row_el.get('r',1)) - 1
        while len(rows) <= r_idx: rows.append([])
        for c_el in row_el.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            ref = c_el.get('r','')
            m = re.match(r'([A-Z]+)(\d+)', ref)
            if not m: continue
            ci = col_idx(m.group(1))
            while len(rows[r_idx]) <= ci: rows[r_idx].append(None)
            t = c_el.get('t','')
            v_el = c_el.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            v = v_el.text if v_el is not None else None
            if v is None: continue
            if t == 's': rows[r_idx][ci] = shared[int(v)] if int(v) < len(shared) else None
            else:
                try: rows[r_idx][ci] = float(v) if '.' in v else int(v)
                except: rows[r_idx][ci] = v
    return rows

def cell(sheet, r, c, default=None):
    try: return sheet[r][c]
    except: return default

def find_row(sheet, label, col=1, start=0):
    for r in range(start, len(sheet)):
        if str(cell(sheet, r, col) or '').strip() == label:
            return r
    return -1

# All Power/Cooling/Data sheets: labels in col 1, values in col 2+
def extract_block(sheet, header_row, labels, label_col=1):
    names = []
    for c in range(label_col+1, 40):
        n = str(cell(sheet, header_row, c) or '').strip()
        if n: names.append((n, c))
        elif c > label_col+5: break

    items = []
    for name, col in names:
        entry = {'name': name, '_type': str(cell(sheet, header_row, label_col) or '')}
        check = header_row + 1
        found = 0
        while check < header_row + len(labels) + 8 and found < len(labels):
            lbl = str(cell(sheet, check, label_col) or '').strip()
            if lbl in labels:
                slug = re.sub(r'[^a-z0-9]+', '_', lbl.lower()).strip('_')
                entry[slug] = cell(sheet, check, col)
                found += 1
            if lbl == '<<Show/Hide': break
            check += 1
        items.append(entry)
    return items

PROV = lambda sheet, row: {
    'source': f'OCP CE TCO v1.11 {sheet}',
    'sourceCells': [f'{sheet}!row{row+1}'],
    'extractedAt': NOW, 'sha256': sha
}

# ── POWER ─────────────────────────────────────────────────────────────────────
print('\nExtracting Power...')
pwr = load_sheet('Power')
POWER_TYPES = ['TX', 'Genset', 'SWB', 'UPS', 'Chiller']
POWER_LABELS = ['Capacity', 'Fixed area', 'Proportional area', 'Fixed cost',
                'Proportional cost', 'Proportional losses', 'COP',
                'Heat rejection to air-side', 'Heat rejection to liquid-side',
                'Fixed water usage', 'Proportional water usage']

power_equipment, power_configs = [], []
for r in range(len(pwr)):
    v1 = str(cell(pwr, r, 1) or '').strip()
    if v1 == 'Power':
        names = [(str(cell(pwr, r, c) or '').strip(), c)
                 for c in range(2, 20) if str(cell(pwr, r, c) or '').strip()]
        eq_rows = {}
        for nr in range(r+1, min(r+10, len(pwr))):
            lbl = str(cell(pwr, nr, 1) or '').strip()
            if lbl in POWER_TYPES + ['Tcws', 'Tapp']: eq_rows[lbl] = nr
        for name, col in names:
            power_configs.append({
                'id': f'power-config-{re.sub(r"[^a-z0-9]+","-",name.lower())}',
                'version': 1, 'name': name,
                'tx':      cell(pwr, eq_rows.get('TX',    r), col),
                'genset':  cell(pwr, eq_rows.get('Genset',r), col),
                'swb':     cell(pwr, eq_rows.get('SWB',   r), col),
                'ups':     cell(pwr, eq_rows.get('UPS',   r), col),
                'chiller': cell(pwr, eq_rows.get('Chiller',r), col),
                'provenance': PROV('Power', r),
            })
    if v1 in POWER_TYPES:
        # Is this from the Library section (not Configurator)?
        prev = str(cell(pwr, r-1, 1) or '').strip()
        if prev in ('Power Library', '') or prev not in ('Power', *POWER_TYPES):
            for it in extract_block(pwr, r, POWER_LABELS):
                power_equipment.append({
                    'id': f'power-{it["_type"]}-{it["name"]}'.lower().replace(' ','_'),
                    'version': 1, 'name': it['name'], 'category': 'power',
                    'type': it['_type'], 'status': 'published', 'provenance': PROV('Power', r),
                    'capacityKw': it.get('capacity'), 'fixedAreaM2': it.get('fixed_area'),
                    'proportionalAreaM2PerKw': it.get('proportional_area'),
                    'fixedCost': it.get('fixed_cost'), 'proportionalCostPerKw': it.get('proportional_cost'),
                    'proportionalLoss': it.get('proportional_losses'), 'cop': it.get('cop'),
                    'heatToAirFraction': it.get('heat_rejection_to_air_side'),
                    'heatToLiquidFraction': it.get('heat_rejection_to_liquid_side'),
                    'fixedWaterLph': it.get('fixed_water_usage'),
                    'proportionalWaterLPerKwh': it.get('proportional_water_usage'),
                })

emit(f'{OUT_SEED}/power-library.json', power_equipment)
emit(f'{OUT_SEED}/power-configurations.json', power_configs)
print(f'  Power equipment: {len(power_equipment)}, configs: {len(power_configs)}')

# ── COOLING ───────────────────────────────────────────────────────────────────
print('Extracting Cooling...')
cool = load_sheet('Cooling')
COOL_TYPES = ['Pump', 'Compressor', 'FreeCooler', 'Fans']
cooling_equipment, cooling_configs = [], []
for r in range(len(cool)):
    v1 = str(cell(cool, r, 1) or '').strip()
    if v1 == 'Cooling':
        names = [(str(cell(cool, r, c) or '').strip(), c)
                 for c in range(2, 20) if str(cell(cool, r, c) or '').strip()]
        eq_rows = {}
        for nr in range(r+1, min(r+10, len(cool))):
            lbl = str(cell(cool, nr, 1) or '').strip()
            if lbl in COOL_TYPES + ['Tcws', 'Tapp']: eq_rows[lbl] = nr
        for name, col in names:
            cooling_configs.append({
                'id': f'cooling-config-{re.sub(r"[^a-z0-9]+","-",name.lower())}',
                'version': 1, 'name': name,
                'pump':       cell(cool, eq_rows.get('Pump', r), col),
                'compressor': cell(cool, eq_rows.get('Compressor', r), col),
                'freeCooler': cell(cool, eq_rows.get('FreeCooler', r), col),
                'fans':       cell(cool, eq_rows.get('Fans', r), col),
                'tcwsCelsius': cell(cool, eq_rows.get('Tcws', r), col),
                'tappCelsius': cell(cool, eq_rows.get('Tapp', r), col),
                'provenance': PROV('Cooling', r),
            })
    if v1 in COOL_TYPES:
        prev = str(cell(cool, r-1, 1) or '').strip()
        if prev in ('Cooling Library', '') or prev not in ('Cooling', *COOL_TYPES):
            for it in extract_block(cool, r, POWER_LABELS):
                cooling_equipment.append({
                    'id': f'cooling-{it["_type"]}-{it["name"]}'.lower().replace(' ','_'),
                    'version': 1, 'name': it['name'], 'category': 'cooling',
                    'type': it['_type'], 'status': 'published', 'provenance': PROV('Cooling', r),
                    'capacityKw': it.get('capacity'), 'fixedAreaM2': it.get('fixed_area'),
                    'proportionalAreaM2PerKw': it.get('proportional_area'),
                    'fixedCost': it.get('fixed_cost'), 'proportionalCostPerKw': it.get('proportional_cost'),
                    'proportionalLoss': it.get('proportional_losses'), 'cop': it.get('cop'),
                    'heatToAirFraction': it.get('heat_rejection_to_air_side'),
                    'heatToLiquidFraction': it.get('heat_rejection_to_liquid_side'),
                    'fixedWaterLph': it.get('fixed_water_usage'),
                    'proportionalWaterLPerKwh': it.get('proportional_water_usage'),
                })

emit(f'{OUT_SEED}/cooling-library.json', cooling_equipment)
emit(f'{OUT_SEED}/cooling-configurations.json', cooling_configs)
print(f'  Cooling equipment: {len(cooling_equipment)}, configs: {len(cooling_configs)}')

# ── WEATHER ───────────────────────────────────────────────────────────────────
print('Extracting Weather...')
wth = load_sheet('weather')
# Row 6 (idx 5): zone IDs in col 2+
# Row 3 (idx 2): temperature categories
# Row 7+ (idx 6+): 8760 hourly values per zone column

zone_id_row = find_row(wth, '0A', col=2, start=0)
if zone_id_row < 0:
    # Alternative: look for first zone-like entry
    for r in range(len(wth)):
        if str(cell(wth, r, 2) or '').strip().startswith('0'):
            zone_id_row = r; break

# Collect zone IDs from the header row
zone_ids = []
for c in range(2, 50):
    z_id = str(cell(wth, zone_id_row, c) or '').strip()
    if z_id: zone_ids.append((z_id, c))
    elif c > 25: break

# Temperature categories from row 3 (idx 2)
temp_row = find_row(wth, 'Temperature', col=1, start=0)
temp_cats = {col: str(cell(wth, temp_row, col) or '') for _, col in zone_ids} if temp_row >= 0 else {}

# Humidity categories
hum_row = find_row(wth, 'Humidity', col=1, start=0)
hum_cats = {col: str(cell(wth, hum_row, col) or '') for _, col in zone_ids} if hum_row >= 0 else {}

# Reference cities
city_row = find_row(wth, 'City', col=1, start=0)
if city_row < 0: city_row = find_row(wth, 'city', col=1, start=0)
cities = {col: str(cell(wth, city_row, col) or '') for _, col in zone_ids} if city_row >= 0 else {}

# Hourly data starts at row after header
hourly_start = zone_id_row + 1
hourly_data = {col: [] for _, col in zone_ids}
for h in range(8760):
    row_data = wth[hourly_start + h] if hourly_start + h < len(wth) else []
    for _, col in zone_ids:
        v = row_data[col] if col < len(row_data) else None
        hourly_data[col].append(float(v) if isinstance(v, (int, float)) else 0.0)

# Reference city names — look them up from row 3 of the workbook or temperature labels
# Zone IDs map to cities per the user guide table
ZONE_CITY_MAP = {
    '0A': 'Singapore', '0B': 'Riyadh', '1A': 'Miami', '1B': 'Kuwait',
    '2A': 'Houston', '2B': 'Phoenix', '3A': 'Memphis', '3B': 'El Paso',
    '3C': 'San Francisco', '4A': 'St Louis', '4B': 'Albuquerque',
    '4C': 'Salem-McNary', '5A': 'Chicago', '5B': 'Boise', '5C': 'Bremerton',
    '6A': 'Montreal', '6B': 'Helena', '7': 'Duluth', '8': 'Fairbanks',
}
ZONE_TEMP_MAP = {
    '0A': 'Extremely hot', '0B': 'Extremely hot', '1A': 'Very hot', '1B': 'Very hot',
    '2A': 'Hot', '2B': 'Hot', '3A': 'Warm', '3B': 'Warm', '3C': 'Warm',
    '4A': 'Mixed', '4B': 'Mixed', '4C': 'Mixed', '5A': 'Cool', '5B': 'Cool',
    '5C': 'Cool', '6A': 'Cold', '6B': 'Cold', '7': 'Very cold', '8': 'Subarctic/arctic',
}
ZONE_HUM_MAP = {
    '0A': 'Wet', '0B': 'Dry', '1A': 'Wet', '1B': 'Dry', '2A': 'Wet', '2B': 'Dry',
    '3A': 'Wet', '3B': 'Dry', '3C': 'Maritime', '4A': 'Humid', '4B': 'Dry',
    '4C': 'Maritime', '5A': 'Wet', '5B': 'Dry', '5C': 'Maritime',
    '6A': 'Wet', '6B': 'Dry', '7': '-', '8': '-',
}

weather_profiles = []
for zone_id, col in zone_ids:
    weather_profiles.append({
        'zoneId': zone_id,
        'referenceCity': ZONE_CITY_MAP.get(zone_id, zone_id),
        'latitude': 0, 'longitude': 0,
        'temperature': ZONE_TEMP_MAP.get(zone_id, ''),
        'humidity': ZONE_HUM_MAP.get(zone_id, ''),
        'hourlyDryBulbCelsius': hourly_data[col],
        'dataSource': 'PVGIS 5.3 TMY 2005-2013', 'version': '1.11.0',
    })

emit(f'{OUT_SEED}/weather-profiles.json', weather_profiles)
pts = len(weather_profiles[0]['hourlyDryBulbCelsius']) if weather_profiles else 0
print(f'  Weather profiles: {len(weather_profiles)}, hourly points each: {pts}')

# ── DATA LIBRARIES ────────────────────────────────────────────────────────────
print('Extracting Data libraries...')
data = load_sheet('Data')

CHASSIS_LABELS = ['Load', 'Fixed area', 'Proportional area', 'Unit cost (if known)',
                  'Power-based cost estimate', 'Losses (eg. fans, PSUs)', 'COP',
                  'Heat rejection to air-side', 'Height', 'ITE load efficiency (L3)', 'ITE load efficiency (L4)']
CRAH_LABELS = ['Capacity', 'Fixed area', 'Proportional area', 'Fixed cost', 'Proportional cost',
               'Proportional losses', 'COP', 'Heat rejection to air-side']
CDU_LABELS  = ['Capacity', 'Fixed area', 'Proportional area', 'Fixed cost', 'Proportional cost',
               'Proportional losses', 'COP', 'Heat rejection to LT HRU']
RACK_LABELS = ['Load', 'Fixed area', 'Proportional area', 'Unit cost', 'Proportional cost',
               'Losses (eg. fans, PSUs)', 'COP', 'Heat rejection to air-side',
               'ITE load efficiency (L2)', 'ITE load efficiency (L3)', 'ITE load efficiency (L4)']
CLUSTER_LABELS = RACK_LABELS
DATAROOM_LABELS = ['Load', 'Fixed area', 'Proportional area', 'Fixed cost', 'Proportional cost',
                   'Proportional losses', 'COP', 'Heat rejection to LT HRU',
                   'ITE load efficiency (L2)', 'ITE load efficiency (L3)', 'ITE load efficiency (L4)']

chassis_items, crah_items, cdu_items = [], [], []
rack_configs, cluster_configs, dataroom_configs = [], [], []

for r in range(len(data)):
    v1 = str(cell(data, r, 1) or '').strip()

    if v1 == 'Chassis':
        prev = str(cell(data, r-1, 1) or '').strip()
        # Equipment library block (not configurator)
        if 'Rack Equipment Library' in prev or 'Equipment Library' in prev or prev == '':
            for it in extract_block(data, r, CHASSIS_LABELS):
                chassis_items.append({
                    'id': f'chassis-{it["name"]}'.lower().replace(' ','-'),
                    'version': 1, 'category': 'chassis', 'type': 'Chassis',
                    'status': 'published', 'provenance': PROV('Data', r), **it
                })

    if v1 == 'CRAH':
        for it in extract_block(data, r, CRAH_LABELS):
            crah_items.append({'id': f'crah-{it["name"]}'.lower().replace(' ','-'),
                               'version': 1, 'category': 'data-local', 'type': 'CRAH',
                               'status': 'published', 'provenance': PROV('Data', r), **it})

    if v1 == 'CDU':
        for it in extract_block(data, r, CDU_LABELS):
            cdu_items.append({'id': f'cdu-{it["name"]}'.lower().replace(' ','-'),
                              'version': 1, 'category': 'data-local', 'type': 'CDU',
                              'status': 'published', 'provenance': PROV('Data', r), **it})

    if v1 == 'Rack Library':
        names_row = r
        for it in extract_block(data, names_row, RACK_LABELS):
            rack_configs.append({'id': f'rack-{it["name"]}'.lower().replace(' ','-'),
                                 'version': 1, 'provenance': PROV('Data', r), **it})

    if v1 == 'Cluster Library':
        for it in extract_block(data, r, CLUSTER_LABELS):
            cluster_configs.append({'id': f'cluster-{it["name"]}'.lower().replace(' ','-'),
                                    'version': 1, 'provenance': PROV('Data', r), **it})

    if v1 == 'Dataroom Library':
        for it in extract_block(data, r, DATAROOM_LABELS):
            dataroom_configs.append({'id': f'dataroom-{it["name"]}'.lower().replace(' ','-'),
                                     'version': 1, 'provenance': PROV('Data', r), **it})

emit(f'{OUT_SEED}/chassis-library.json', chassis_items)
emit(f'{OUT_SEED}/crah-library.json', crah_items)
emit(f'{OUT_SEED}/cdu-library.json', cdu_items)
emit(f'{OUT_SEED}/rack-configs.json', rack_configs)
emit(f'{OUT_SEED}/cluster-configs.json', cluster_configs)
emit(f'{OUT_SEED}/dataroom-configs.json', dataroom_configs)
print(f'  Chassis: {len(chassis_items)}, CRAH: {len(crah_items)}, CDU: {len(cdu_items)}')
print(f'  Racks: {len(rack_configs)}, Clusters: {len(cluster_configs)}, Datarooms: {len(dataroom_configs)}')

# ── SCENARIO FIXTURES ─────────────────────────────────────────────────────────
print('Extracting scenario fixtures...')
def col_letter(c):
    s = ''
    c += 1
    while c:
        c, rem = divmod(c-1, 26)
        s = chr(65+rem) + s
    return s

for sname in ['Paris', 'Singapore']:
    ssheet = load_sheet(sname)
    cells = {}
    for ri, row in enumerate(ssheet):
        for ci, val in enumerate(row):
            if val is not None:
                cells[f'{sname}!{col_letter(ci)}{ri+1}'] = val
    emit(f'{OUT_FIX}/baseline-{sname.lower()}.json', {
        'scenario': sname, 'extractedAt': NOW,
        'sourceWorkbookSha256': sha, 'cachedCellValues': cells
    })

# ── MANIFEST ──────────────────────────────────────────────────────────────────
manifest = {
    'modelVersion': 'ocp-ce-tco-1.11-web-1',
    'sourceWorkbookSha256': sha,
    'sourceWorkbookFilename': 'OCP CE TCO tool v1.11.xlsx',
    'extractedAt': NOW,
    'seedDatasetVersions': {'power': '1.11.0', 'cooling': '1.11.0', 'data': '1.11.0', 'weather': '1.11.0'},
    'counts': {
        'powerEquipment': len(power_equipment), 'powerConfigs': len(power_configs),
        'coolingEquipment': len(cooling_equipment), 'coolingConfigs': len(cooling_configs),
        'weatherProfiles': len(weather_profiles), 'chassis': len(chassis_items),
        'crah': len(crah_items), 'cdu': len(cdu_items),
        'rackConfigs': len(rack_configs), 'clusterConfigs': len(cluster_configs),
        'dataroomConfigs': len(dataroom_configs),
    },
    'metricDefinitions': {
        'pueL3': {'formulaId': 'M-PUE-L3-001', 'unit': 'ratio', 'sourceCells': ['Paris!G5']},
        'pueL4': {'formulaId': 'M-PUE-L4-001', 'unit': 'ratio', 'sourceCells': ['Paris!G6']},
        'erf':   {'formulaId': 'M-ERF-001',   'unit': 'ratio', 'sourceCells': ['Paris!G7']},
        'wue':   {'formulaId': 'M-WUE-001',   'unit': 'L/kWh','sourceCells': ['Paris!G8']},
        'cue':   {'formulaId': 'M-CUE-001',   'unit': 'kgCO2e/kWh', 'sourceCells': ['Paris!G9']},
    },
    'assumptions': [
        'A-AREA-70PCT', 'A-CAPEX-PEAK', 'A-OPEX-AVG', 'A-LAND-EXCLUDED', 'A-ITE-EXCLUDED'
    ],
}
emit(f'{OUT_SEED}/manifest.json', manifest)
print('\n✅ Extraction complete.')
print(f'Seed data: {OUT_SEED}')
print(f'Fixtures:  {OUT_FIX}')
