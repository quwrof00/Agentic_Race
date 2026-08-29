import os, httpx
from dotenv import load_dotenv

load_dotenv()
try:
    r = httpx.get('https://api.groq.com/openai/v1/models', headers={'Authorization': f"Bearer {os.getenv('GROQ_API_KEY')}"})
    if r.status_code == 200:
        for m in r.json().get('data', []):
            print(m['id'])
    else:
        print(f"Error: {r.status_code} {r.text}")
except Exception as e:
    print(f"Exception: {e}")
