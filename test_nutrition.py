import requests, sys, json, pprint
BASE = 'http://127.0.0.1:8000/api'

print('Skipping /nutrition/meals tests for now (endpoint disabled).')
headers = {}

# 1. Food by barcode
a_barcode = '737628064502'
res = requests.get(f'{BASE}/nutrition/foods/{a_barcode}')
print('\n/foods/{barcode} =>', res.status_code)
print(res.text[:400])

# 2. Portions by FDC ID
fdc_id = '11090'
res = requests.get(f'{BASE}/nutrition/portions/fdc/{fdc_id}')
print('\n/portions/fdc/{fdcId} =>', res.status_code)
print(res.text[:400])

# 3. Analyze list
food_items = [{"name": "banana", "grams": 100}, {"name": "rice", "grams": 200}]
res = requests.post(f'{BASE}/nutrition/analyze', json=food_items)
print('\n/analyze =>', res.status_code)
print(res.text[:400])

# 4. Create meal log
# Skipped: endpoint desativado neste release

# 5. List meal logs
# Skipped: endpoint desativado neste release