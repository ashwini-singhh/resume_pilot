import json
import urllib.request
import os
import sys

# Ensure relative imports work
sys.path.append(".")

from prompts.system import get_prompt_user_profile_generation

def call_openrouter(prompt):
    api_key = "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"
    model = "openai/gpt-oss-20b:free"
    base_url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1
    }
    
    req = urllib.request.Request(base_url, data=json.dumps(data).encode(), headers=headers)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def test():
    # A messier resume with hidden location and lots of noise
    messy_resume = """
    Random Header Info
    Profile: I am a coder.
    Ashwini Singh
    9140284764
    Email: ashwinisingh8official@gmail.com
    Address: Lucknow, UP, IN
    ---
    Objective: To get a job.
    
    Jobs are cool.
    I worked at TechCorp.
    Lucknow, India | Software Engineer
    Jan 22 to present
    * built stuff.
    * did things.
    """
    
    system_prompt = get_prompt_user_profile_generation()
    prompt = f"{system_prompt}\n\nRAW RESUME TO PARSE:\n{messy_resume}"
    
    print("--- Calling OpenRouter with MESSY resume ---")
    try:
        res = call_openrouter(prompt)
        content = res['choices'][0]['message']['content']
        print(content)
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
