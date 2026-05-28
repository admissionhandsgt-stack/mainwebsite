import os
import requests

def read_env():
    env = {}
    if os.path.exists(".env.local"):
        with open(".env.local", "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        env[parts[0].strip()] = parts[1].strip()
    return env

env = read_env()
SUPABASE_URL = env.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = env.get("SUPABASE_SERVICE_KEY")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Credentials missing")
        return
        
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/media-assets/hero/services_hero_counselor.avif"
    
    # Check if about_hero exists
    check_url = f"{SUPABASE_URL}/rest/v1/media_assets?media_key=eq.about_hero"
    check_res = requests.get(check_url, headers=headers)
    exists = len(check_res.json()) > 0
    
    payload = {
        "media_key": "about_hero",
        "title": "About Hero Counselor",
        "image_url": public_url,
        "section_type": "hero",
        "is_active": True,
        "alt_text": "AdmissionHands Medical Counselor"
    }
    
    if exists:
        update_url = f"{SUPABASE_URL}/rest/v1/media_assets?media_key=eq.about_hero"
        requests.patch(update_url, headers={**headers, "Prefer": "return=minimal"}, json=payload)
        print("Updated about_hero in DB!")
    else:
        insert_url = f"{SUPABASE_URL}/rest/v1/media_assets"
        requests.post(insert_url, headers={**headers, "Prefer": "return=minimal"}, json=payload)
        print("Inserted about_hero in DB!")

if __name__ == "__main__":
    main()
