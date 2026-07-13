import os
from openai import OpenAI

api_key = os.getenv("FIREWORKS_API_KEY")
client = OpenAI(
    base_url="https://api.fireworks.ai/inference/v1",
    api_key=api_key,
)

def verify_compute():
    print("--- AMD Compute Verification: EventNetwork AI ---")
    try:
        response = client.chat.completions.create(
            model="accounts/fireworks/models/qwen3p7-plus",
            messages=[{"role": "user", "content": "Verify connection to AMD-backed inference."}]
        )
        print("SUCCESS: Connection to Fireworks API verified.")
        print("Model Response:", response.choices[0].message.content)
    except Exception as e:
        print("ERROR: Connection failed.", str(e))

if __name__ == "__main__":
    verify_compute()