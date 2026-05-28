import os
from PIL import Image
import pillow_avif

def convert_to_avif(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                file_path = os.path.join(root, file)
                filename_without_ext = os.path.splitext(file)[0]
                avif_path = os.path.join(root, filename_without_ext + '.avif')
                
                try:
                    with Image.open(file_path) as img:
                        # Convert RGBA to RGB if saving as JPEG or if AVIF has issues
                        if img.mode in ("RGBA", "P"):
                            img = img.convert("RGB")
                        
                        img.save(avif_path, 'AVIF')
                        print(f"Converted {file_path} to {avif_path}")
                    
                    # Delete the original file after successful conversion
                    os.remove(file_path)
                    print(f"Deleted original {file_path}")
                except Exception as e:
                    print(f"Error converting {file_path}: {e}")

if __name__ == "__main__":
    convert_to_avif("public/assets/images")
