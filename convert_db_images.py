import os
import re
import io
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

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env.local")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

# Tables to search and their image columns
TABLE_COLUMNS = [
    ("deemed_colleges", "image_url"),
    ("pg_colleges", "image_url"),
    ("deemed_universities", "image_url"),
    ("ug_all_colleges", "image_url"),
    ("ug_recommended_colleges", "image_url"),
    ("mbbs_states", "image_url"),
    ("recommended_colleges", "image"),
    ("live_alerts", "image_url"),
    ("media_assets", "image_url"),
    ("pg_branches", "icon_url")
]

def convert_to_avif(image_bytes):
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format="AVIF")
        return out.getvalue()
    except Exception as e:
        print(f"Failed to convert image bytes: {e}")
        return None

def process_table(table, column):
    print(f"\nProcessing table: {table}, column: {column}...")
    
    # Fetch all records
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=id,{column}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code != 200:
        print(f"Table {table} not found or error fetching (Status {res.status_code})")
        return
        
    records = res.json()
    print(f"Found {len(records)} records in {table}")
    
    for r in records:
        img_url = r.get(column)
        if not img_url:
            continue
            
        # Check if already AVIF
        if img_url.lower().endswith(".avif"):
            continue
            
        print(f"Converting image: {img_url}")
        
        # Parse storage bucket and path from URL
        # Format: {supabase_url}/storage/v1/object/public/{bucket}/{path}
        match = re.search(r"/storage/v1/object/public/([^/]+)/(.+)$", img_url)
        if not match:
            # Maybe it's a external image like unsplash or local asset, skip
            print(f"Skipping non-supabase URL: {img_url}")
            continue
            
        bucket = match.group(1)
        path = match.group(2)
        
        # Download old image
        download_url = f"{SUPABASE_URL}/storage/v1/object/authenticated/{bucket}/{path}"
        dl_res = requests.get(download_url, headers=HEADERS)
        if dl_res.status_code != 200:
            print(f"Failed to download {download_url} (Status {dl_res.status_code})")
            continue
            
        # Convert to AVIF
        avif_bytes = convert_to_avif(dl_res.content)
        if not avif_bytes:
            continue
            
        # Prepare new path
        base_path, _ = os.path.splitext(path)
        new_path = f"{base_path}.avif"
        
        # Upload new AVIF image
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{new_path}"
        up_res = requests.post(
            upload_url,
            headers={**HEADERS, "Content-Type": "image/avif"},
            data=avif_bytes
        )
        
        if up_res.status_code not in (200, 201):
            # If already exists, maybe try to overwrite it
            print(f"Upload failed (Status {up_res.status_code}), attempting upsert...")
            # Supabase Storage overwrite header is x-upsert: true
            up_res = requests.post(
                upload_url,
                headers={**HEADERS, "Content-Type": "image/avif", "x-upsert": "true"},
                data=avif_bytes
            )
            if up_res.status_code not in (200, 201):
                print(f"Failed to upload AVIF to {upload_url} (Status {up_res.status_code})")
                continue
                
        # Construct new public URL
        new_public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{new_path}"
        
        # Update database record
        update_url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{r['id']}"
        upd_res = requests.patch(
            update_url,
            headers={**HEADERS, "Prefer": "return=minimal"},
            json={column: new_public_url}
        )
        
        if upd_res.status_code in (200, 204):
            print(f"Updated record {r['id']} with {new_public_url}")
            
            # Delete old image from storage to save space and cleanup
            delete_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}"
            del_res = requests.delete(
                delete_url,
                headers=HEADERS,
                json={"prefixes": [path]}
            )
            if del_res.status_code == 200:
                print(f"Deleted old storage object: {bucket}/{path}")
            else:
                print(f"Warning: Failed to delete old storage object: {bucket}/{path} (Status {del_res.status_code})")
        else:
            print(f"Failed to update record {r['id']} in DB (Status {upd_res.status_code})")

if __name__ == "__main__":
    print("Starting database image conversion to AVIF...")
    for table, column in TABLE_COLUMNS:
        try:
            process_table(table, column)
        except Exception as e:
            print(f"Error processing {table}.{column}: {e}")
    print("\nDatabase image conversion completed successfully!")
