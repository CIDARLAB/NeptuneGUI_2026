#!/usr/bin/env bash
# Neptune GUI — Fly.io deployment
# Run once to set up, then `fly deploy` for future updates.
#
# Prerequisites:
#   brew install flyctl   (or curl -L https://fly.io/install.sh | sh)
#   fly auth login

set -euo pipefail

APP_NAME="neptune-gui-cidar"   # must match fly.toml
REGION="iad"       # e.g. iad, lax, lhr
MODAL_URL="https://woo-25824--neptune-compute-api.modal.run"  # from: modal deploy modal_app.py

# ---------------------------------------------------------------------------
# STEP 1 — Create the app (first time only)
# ---------------------------------------------------------------------------
fly apps create "$APP_NAME" 2>/dev/null || echo "App already exists, continuing..."

# ---------------------------------------------------------------------------
# STEP 2 — Create persistent volume for Data/
# ---------------------------------------------------------------------------
fly volumes create neptune_data \
  --app "$APP_NAME" \
  --region "$REGION" \
  --size 5 \
  2>/dev/null || echo "Volume already exists, continuing..."

# ---------------------------------------------------------------------------
# STEP 3 — Set secrets (Modal compute URL)
# ---------------------------------------------------------------------------
fly secrets set \
  --app "$APP_NAME" \
  NEPTUNE_COMPILE_URL="$MODAL_URL"

# ---------------------------------------------------------------------------
# STEP 4 — Deploy
# ---------------------------------------------------------------------------
fly deploy --app "$APP_NAME"

echo ""
echo "Deployed! Your app is at: https://${APP_NAME}.fly.dev"
echo ""
echo "To redeploy after changes: fly deploy"
echo "To view logs:              fly logs"
echo "To open the app:           fly open"
