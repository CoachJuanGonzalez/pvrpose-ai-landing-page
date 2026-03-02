#!/usr/bin/env python3
"""
Generate all favicon and social media images for PVRPOSE AI website
"""

from PIL import Image
import os

# Define the source logo file
SOURCE_LOGO = "logos-ai-rez-01.png"
OUTPUT_DIR = "."

# Define all required favicon sizes
FAVICON_SIZES = {
    "favicon-16x16.png": (16, 16),
    "favicon-32x32.png": (32, 32),
    "apple-touch-icon.png": (180, 180),
    "android-chrome-192x192.png": (192, 192),
    "android-chrome-512x512.png": (512, 512),
}

def create_favicon_images():
    """Create all favicon images from source logo"""
    try:
        # Load source logo
        print(f"Loading source logo: {SOURCE_LOGO}")
        source_img = Image.open(SOURCE_LOGO)

        # Convert RGBA to RGB for better compatibility
        if source_img.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', source_img.size, (255, 255, 255))
            background.paste(source_img, mask=source_img.split()[3])  # 3 is the alpha channel
            source_img = background

        # Generate each size
        for filename, size in FAVICON_SIZES.items():
            output_path = os.path.join(OUTPUT_DIR, filename)
            print(f"Creating {filename} at {size[0]}x{size[1]}...")

            # Resize with high-quality resampling
            resized = source_img.resize(size, Image.Resampling.LANCZOS)

            # Save the image
            resized.save(output_path, optimize=True, quality=95)
            print(f"  ✓ Saved: {output_path}")

        # Create multi-resolution favicon.ico (16x16 and 32x32)
        print("\nCreating favicon.ico with multiple resolutions...")
        favicon_16 = source_img.resize((16, 16), Image.Resampling.LANCZOS)
        favicon_32 = source_img.resize((32, 32), Image.Resampling.LANCZOS)

        favicon_path = os.path.join(OUTPUT_DIR, "favicon.ico")
        favicon_16.save(
            favicon_path,
            format='ICO',
            sizes=[(16, 16), (32, 32)],
            append_images=[favicon_32]
        )
        print(f"  ✓ Saved: {favicon_path}")

        # Create Open Graph image (1200x630) for social media
        print("\nCreating og-image.png for social media (1200x630)...")

        # Create canvas with brand gradient background
        og_canvas = Image.new('RGB', (1200, 630), (255, 255, 255))

        # Calculate logo size to fit nicely (maintain aspect ratio)
        # Use 60% of canvas height
        logo_height = int(630 * 0.6)
        aspect_ratio = source_img.width / source_img.height
        logo_width = int(logo_height * aspect_ratio)

        # Resize logo
        logo_resized = source_img.resize((logo_width, logo_height), Image.Resampling.LANCZOS)

        # Center the logo
        x_pos = (1200 - logo_width) // 2
        y_pos = (630 - logo_height) // 2

        og_canvas.paste(logo_resized, (x_pos, y_pos))

        # Save OG image
        og_path = os.path.join(OUTPUT_DIR, "og-image.png")
        og_canvas.save(og_path, optimize=True, quality=95)
        print(f"  ✓ Saved: {og_path}")

        print("\n✅ All favicon images created successfully!")
        print("\nGenerated files:")
        for filename in FAVICON_SIZES.keys():
            print(f"  • {filename}")
        print(f"  • favicon.ico")
        print(f"  • og-image.png")

    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    create_favicon_images()
