#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Télécharge les bibliothèques Live2D et les place dans assets/live2d/libs/
# pour un fonctionnement 100% hors-ligne (pas de CDN au runtime).
#
# Usage (depuis la racine du projet ChatterUI) :
#   bash assets/live2d/download_sdk.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

DEST="assets/live2d/libs"
mkdir -p "$DEST"

echo "📦 Téléchargement des bibliothèques Live2D (3.5 MB)..."

# 1. PixiJS 7  (MIT)
echo "  [1/3] pixi.min.js"
curl -L "https://cdn.jsdelivr.net/npm/pixi.js@7/dist/pixi.min.js" \
     -o "$DEST/pixi.min.js" --silent --show-error

# 2. pixi-live2d-display  (MIT)
echo "  [2/3] pixi-live2d-display.min.js"
curl -L "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js" \
     -o "$DEST/pixi-live2d-display.min.js" --silent --show-error

# 3. Live2D Cubism Core  (Licence SDK Live2D — gratuit non-commercial)
#    En téléchargeant ce fichier, tu acceptes la licence :
#    https://www.live2d.com/en/download/cubism-sdk/release-license/
echo "  [3/3] live2dcubismcore.min.js  (⚠ Licence SDK Live2D)"
curl -L "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js" \
     -o "$DEST/live2dcubismcore.min.js" --silent --show-error

echo ""
echo "✅ Bibliothèques téléchargées dans $DEST/"
ls -lh "$DEST/"
echo ""
echo "ℹ️  Ces fichiers seront bundlés avec l'APK."
echo "   Le viewer Live2D fonctionnera maintenant sans connexion internet."
