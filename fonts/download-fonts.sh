#!/usr/bin/env bash
# Download Google Fonts required for Typst resume PDF rendering.
# Each family needs: Regular, Bold, Italic, BoldItalic variants.
#
# Usage: ./download-fonts.sh

set -euo pipefail

FONTS_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_URL="https://github.com/google/fonts/raw/main"

declare -A FONT_PATHS=(
  ["Inter"]="ofl/inter"
  ["Merriweather"]="ofl/merriweather"
  ["Roboto"]="ofl/roboto"
  ["OpenSans"]="ofl/opensans"
  ["PlayfairDisplay"]="ofl/playfairdisplay"
  ["SourceSerif4"]="ofl/sourceserif4"
  ["Lato"]="ofl/lato"
  ["Poppins"]="ofl/poppins"
  ["Montserrat"]="ofl/montserrat"
  ["Raleway"]="ofl/raleway"
)

echo "Downloading fonts to $FONTS_DIR..."

for family in "${!FONT_PATHS[@]}"; do
  path="${FONT_PATHS[$family]}"
  dir="$FONTS_DIR/$family"
  mkdir -p "$dir"

  echo "  Downloading $family..."

  # Download variable font (covers all weights/styles)
  for suffix in "" "-Italic"; do
    file="${family}${suffix}-VariableFont_wght.ttf"
    url="$BASE_URL/$path/$file"
    if curl -fsSL -o "$dir/$file" "$url" 2>/dev/null; then
      echo "    ✓ $file"
    else
      # Try static fonts as fallback
      for weight in "Regular" "Bold" "Italic" "BoldItalic"; do
        static_file="${family}-${weight}.ttf"
        static_url="$BASE_URL/$path/static/$static_file"
        if curl -fsSL -o "$dir/$static_file" "$static_url" 2>/dev/null; then
          echo "    ✓ $static_file (static)"
        fi
      done
    fi
  done
done

echo "Done. Fonts downloaded to $FONTS_DIR"
