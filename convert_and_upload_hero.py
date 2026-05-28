import os
import requests
from PIL import Image
import pillow_avif

# Read env variables from .env.local
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

# Find the generated image path
generated_img_path = r"C:\Users\91971\.gemini\antigravity\brain\76d57c4a-cfc9-47e9-82c5-a8c634217066\services_hero_indian_counselor_1779972404980.png"
local_avif_dir = "public/assets/images/hero"
local_avif_path = os.path.join(local_avif_dir, "services_hero_counselor.avif")

def main():
    if not os.path.exists(generated_img_path):
        print(f"Error: Generated image not found at {generated_img_path}")
        return

    # 1. Convert PNG to AVIF locally
    print("Converting PNG to AVIF locally...")
    os.makedirs(local_avif_dir, exist_ok=True)
    try:
        with Image.open(generated_img_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.save(local_avif_path, "AVIF")
        print(f"Converted and saved to {local_avif_path}")
    except Exception as e:
        print(f"Failed to convert PNG to AVIF: {e}")
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Skipping Supabase upload (credentials missing in .env.local)")
        return

    # 2. Upload AVIF to Supabase Storage
    print("Uploading to Supabase Storage...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    # Path inside the bucket
    storage_path = "hero/services_hero_counselor.avif"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/media-assets/{storage_path}"
    
    with open(local_avif_path, "rb") as f:
        avif_bytes = f.read()

    # Attempt to upload with x-upsert header to overwrite if it exists
    up_res = requests.post(
        upload_url,
        headers={**headers, "Content-Type": "image/avif", "x-upsert": "true"},
        data=avif_bytes
    )
    
    if up_res.status_code not in (200, 201):
        print(f"Failed to upload to storage bucket (Status {up_res.status_code}). Details: {up_res.text}")
        return
        
    print("Uploaded successfully to storage bucket!")
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/media-assets/{storage_path}"
    print(f"Public URL: {public_url}")

    # 3. Update media_assets table in Supabase
    print("Updating media_assets table...")
    # First check if services_hero exists
    check_url = f"{SUPABASE_URL}/rest/v1/media_assets?media_key=eq.services_hero"
    check_res = requests.get(check_url, headers=headers)
    
    if check_res.status_code != 200:
        print(f"Error checking media_assets table (Status {check_res.status_code})")
        return
        
    exists = len(check_res.json()) > 0
    payload = {
        "media_key": "services_hero",
        "title": "Services Hero Indian Counselor",
        "image_url": public_url,
        "section_type": "hero",
        "is_active": True,
        "alt_text": "Indian medical admission counselor helping student and parent"
    }

    if exists:
        update_url = f"{SUPABASE_URL}/rest/v1/media_assets?media_key=eq.services_hero"
        upd_res = requests.patch(update_url, headers={**headers, "Prefer": "return=minimal"}, json=payload)
        if upd_res.status_code in (200, 204):
            print("Successfully updated existing services_hero in media_assets table!")
        else:
            print(f"Failed to update services_hero (Status {upd_res.status_code}). Details: {upd_res.text}")
    else:
        insert_url = f"{SUPABASE_URL}/rest/v1/media_assets"
        ins_res = requests.post(insert_url, headers={**headers, "Prefer": "return=minimal"}, json=payload)
        if ins_res.status_code in (200, 201, 204):
            print("Successfully inserted new services_hero in media_assets table!")
        else:
            print(f"Failed to insert services_hero (Status {ins_res.status_code}). Details: {ins_res.text}")

if __name__ == "__main__":
    main()
