#!/usr/bin/env bash
# Makes the home-screen icons and the shared-link preview image from the mascot art
# (docs/brand/mascot.png, 1254×1254). Needs ImageMagick: `brew install imagemagick`.
# Run from the repo root after changing the art: `bash scripts/app-icons.sh`.
set -euo pipefail

SRC=docs/brand/mascot.png
# The art's background, so padding blends into it.
LAVENDER="#F4EAFE"

# Home-screen icon: Bigfoot from the head and scarf up, no wordmark (unreadable at icon size; the
# phone shows the name under the icon). Padded above the hair so rounded corners don't clip it.
# Opaque: iOS fills transparent areas with black.
icon() {
  magick "$SRC" -crop 680x610+290+0 +repage -background "$LAVENDER" -gravity south -extent 680x680 \
    -resize "$1x$1" -alpha remove -alpha off -strip "$2"
}
icon 180 src/app/apple-icon.png
icon 192 public/icon-192.png
icon 512 public/icon-512.png

# Shared-link preview: the whole art, wordmark included, centred on lavender at 1200×630.
magick "$SRC" -resize 630x630 -background "$LAVENDER" -gravity center -extent 1200x630 \
  -alpha remove -alpha off -strip src/app/opengraph-image.png
cp src/app/opengraph-image.png src/app/twitter-image.png
