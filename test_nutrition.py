import requests, sys, json, pprint
BASE = 'http://127.0.0.1:8000/api'
EMAIL = 'lucasjaluu@gmail.com'
PWD = 'Lucas1802'

def login_or_register():
    res = requests.post(f'{BASE}/auth/login', json={'email': EMAIL, 'password': PWD})
    if res.status_code == 200:
        return res.json()['access_token']
    print('Login failed, trying register...', res.status_code)
    # attempt register
    r2 = requests.post(f'{BASE}/auth/register', json={'nome': 'Lucas', 'email': EMAIL, 'password': PWD})
    print('Register status', r2.status_code)
    res = requests.post(f'{BASE}/auth/login', json={'email': EMAIL, 'password': PWD})
    if res.status_code != 200:
        print('Login still failed', res.status_code, res.text)
        sys.exit(1)
    return res.json()['access_token']

token = login_or_register()
print('Token obtained:', token[:20], '...')
headers = {'Authorization': f'Bearer {token}'}

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
meal_payload = {
    'items': [{'name': 'Apple', 'grams': 150, 'carbs': 20}],
    'carbs_total': 20
}
res = requests.post(f'{BASE}/nutrition/meals', json=meal_payload, headers=headers)
print('\nPOST /meals =>', res.status_code)
print(res.text[:400])

# 5. List meal logs
res = requests.get(f'{BASE}/nutrition/meals', headers=headers)
print('\nGET /meals =>', res.status_code)
print(res.text[:400])