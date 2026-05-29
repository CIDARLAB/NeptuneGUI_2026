#!/usr/bin/env bash
# Modal deployment steps — run once to set up, then `modal deploy` to update.

set -euo pipefail

# ---------------------------------------------------------------------------
# STEP 1 — Authenticate (one-time)
# ---------------------------------------------------------------------------
# Run this if you haven't authenticated yet:
#   modal token new
#
# Or set env var directly:
#   export MODAL_TOKEN_ID=PLACEHOLDER_MODAL_TOKEN_ID
#   export MODAL_TOKEN_SECRET=PLACEHOLDER_MODAL_TOKEN_SECRET

# ---------------------------------------------------------------------------
# STEP 2 — Create the GitHub secret (one-time)
#
# Modal needs a GitHub PAT to clone the private Neptune_2026 repo
# during the image build. Create a PAT at:
#   https://github.com/settings/tokens  (classic token, `repo` scope is enough)
#
# Then create the Modal secret:
# ---------------------------------------------------------------------------

echo "Creating Modal GitHub secret..."
modal secret create PLACEHOLDER_MODAL_GITHUB_SECRET_NAME \
  GITHUB_TOKEN=PLACEHOLDER_GITHUB_PAT
# Note: The secret name here must match what's in modal_app.py:
#   modal.Secret.from_name("PLACEHOLDER_MODAL_GITHUB_SECRET_NAME")

# ---------------------------------------------------------------------------
# STEP 3 — Deploy
# ---------------------------------------------------------------------------

echo "Deploying Neptune compute service to Modal..."
modal deploy modal_app.py

# Modal will print the endpoint URL after deploy, e.g.:
#   https://cidarlab--neptune-compute-api.modal.run
#
# Copy that URL into deploy/aws.sh as MODAL_COMPUTE_URL.
