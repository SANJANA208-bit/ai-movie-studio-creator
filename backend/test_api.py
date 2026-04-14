import requests
response = requests.post('http://127.0.0.1:8000/api/generate', json={'user_input': 'A heist in space', 'genre': 'None'})
print(response.status_code)
print(response.json())
