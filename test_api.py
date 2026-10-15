import requests

BASE = "http://127.0.0.1:5000/api"

print(requests.get(BASE + "/health").json())
print("Products:", len(requests.get(BASE + "/products").json()))
