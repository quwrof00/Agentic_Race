import os
import requests
from dotenv import load_dotenv

load_dotenv()

models = [
    "openai/gpt-oss-120b",
    "groq/compound-mini",
    "qwen/qwen3.8-27b"
]

api_key = os.getenv("GROQ_API_KEY")

# Create a prompt that is roughly 2500 tokens (10000 characters)
prompt_text = "word " * 2500

for model in models:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt_text}],
        "max_tokens": 500
    }
    res = requests.post(
        'https://api.groq.com/openai/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json=payload
    )
    if res.status_code == 200:
        print(f"{model}: SUCCESS")
    else:
        print(f"{model}: ERROR {res.status_code} - {res.text}")
