import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Distribute rate limit buckets across different models to maximize TPM throughput
BASELINE_MODEL = "openai/gpt-oss-20b"
STRUCTURED_MODEL = "qwen/qwen3.6-27b"
JUDGE_MODEL = "qwen/qwen3.8-27b"
