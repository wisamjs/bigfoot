#!/usr/bin/env bash
# Makes the home-screen icons and the shared-link preview image from the mascot art
# (docs/brand/mascot.png, 1293×1293, the maroon Bigfoot on its own pale pink). Needs ImageMagick:
# `brew install imagemagick`. Run from the repo root after changing the art: `bash scripts/app-icons.sh`.
set -euo pipefail

SRC=docs/brand/mascot.png
# The page background, --mauve-50 (--surface) in src/app/globals.css; manifest.webmanifest's
# background_color matches it.
BG="#faebf1"

# The art with its pink background flood-filled from the corners to BG, so padding blends into it.
art() {
  magick "$SRC" -fuzz 3% -fill "$BG" \
    -draw "color 0,0 floodfill" -draw "color 1292,0 floodfill" \
    -draw "color 0,1292 floodfill" -draw "color 1292,1292 floodfill" "$@"
}

# Home-screen icon: Bigfoot's head and scarf (the art has no wordmark; the phone shows the name under
# the icon). Padded above the hair so rounded corners don't clip it.
# Opaque: iOS fills transparent areas with black.
icon() {
  art -crop 760x700+278+0 +repage -background "$BG" -gravity south -extent 760x760 \
    -resize "$1x$1" -alpha remove -alpha off -strip "$2"
}
icon 180 src/app/apple-icon.png
icon 192 public/icon-192.png
icon 512 public/icon-512.png

# Shared-link preview: the whole art, centred on BG at 1200×630.
art -resize 630x630 -background "$BG" -gravity center -extent 1200x630 \
  -alpha remove -alpha off -strip src/app/opengraph-image.png
cp src/app/opengraph-image.png src/app/twitter-image.png
