# HeelsUp — PWA Icons Directory

This directory contains Progressive Web App (PWA) icons for HeelsUp.

## Required Icons

Generate these icons from the HeelsUp logo (`/logo.png`). All icons should be
square PNG files with the HeelsUp rose/gold brand color background.

| Filename       | Size    | Purpose            |
|----------------|---------|--------------------|
| icon-72.png    | 72×72   | Android Chrome     |
| icon-96.png    | 96×96   | Android Chrome     |
| icon-128.png   | 128×128 | Chrome Web Store   |
| icon-144.png   | 144×144 | Android Chrome     |
| icon-152.png   | 152×152 | iOS Safari         |
| icon-192.png   | 192×192 | Android Chrome (required) |
| icon-384.png   | 384×384 | Android Chrome     |
| icon-512.png   | 512×512 | Android Chrome (required) |

## How to Generate

Use a tool like https://realfavicongenerator.net/ or run:

```bash
# Using ImageMagick:
for size in 72 96 128 144 152 192 384 512; do
  convert logo.png -resize ${size}x${size} img/icon-${size}.png
done
```

## Current Status

⚠️ Icons not yet generated — PWA install will fall back to `logo.png`.
The manifest.json includes `/logo.png` as a fallback until proper icons are added.
