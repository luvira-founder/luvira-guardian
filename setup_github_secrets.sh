#!/usr/bin/env bash
# =============================================================================
# setup_github_secrets.sh
#
# Sets all GitHub Actions secrets for luvira-guardian deployment.
#
# Prerequisites:
#   brew install gh
#   gh auth login
#
# Usage:
#   chmod +x setup_github_secrets.sh
#   bash setup_github_secrets.sh
# =============================================================================

set -euo pipefail

REPO="luvira-founder/luvira-guardian"

# ── Helpers ───────────────────────────────────────────────────────────────────
set_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "  [skip] $name (empty)"
    return
  fi
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
  echo "  [ok]   $name"
}

prompt_secret() {
  local name="$1"
  local default="${2:-}"
  local value=""
  if [[ -n "$default" ]]; then
    read -rp "  $name [$default]: " value
    value="${value:-$default}"
  else
    read -rsp "  $name: " value
    echo
  fi
  echo "$value"
}

echo ""
echo "================================================"
echo "  Luvira Guardian — GitHub Secrets Setup"
echo "  Repo: $REPO"
echo "================================================"
echo ""

# ── Infrastructure ────────────────────────────────────────────────────────────
echo "── Infrastructure ───────────────────────────────────────────────────────"

echo "  SSH_PRIVATE_KEY — path to the deploy private key file"
read -rp "  Path to SSH private key [~/.ssh/id_rsa]: " key_path
key_path="${key_path:-$HOME/.ssh/id_rsa}"
if [[ ! -f "$key_path" ]]; then
  echo "ERROR: key file not found: $key_path"
  exit 1
fi
gh secret set SSH_PRIVATE_KEY --repo "$REPO" < "$key_path"
echo "  [ok]   SSH_PRIVATE_KEY"

set_secret "HOST"     "$(prompt_secret HOST     '157.245.14.143')"
set_secret "USERNAME" "$(prompt_secret USERNAME 'luvira_admin')"

# ── Auth0 ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Auth0 ────────────────────────────────────────────────────────────────"
set_secret "AUTH0_DOMAIN"            "$(prompt_secret AUTH0_DOMAIN)"
set_secret "AUTH0_AUDIENCE"          "$(prompt_secret AUTH0_AUDIENCE)"
set_secret "AUTH0_CLIENT_ID"         "$(prompt_secret AUTH0_CLIENT_ID)"
set_secret "AUTH0_CLIENT_SECRET"     "$(prompt_secret AUTH0_CLIENT_SECRET)"
set_secret "AUTH0_ISSUER"            "$(prompt_secret AUTH0_ISSUER)"
set_secret "AUTH0_MGMT_API_AUDIENCE" "$(prompt_secret AUTH0_MGMT_API_AUDIENCE)"

echo ""
echo "── Auth0 Token Vault (optional — press Enter to skip) ───────────────────"
set_secret "AUTH0_TV_CLIENT_ID"     "$(prompt_secret AUTH0_TV_CLIENT_ID)"
set_secret "AUTH0_TV_CLIENT_SECRET" "$(prompt_secret AUTH0_TV_CLIENT_SECRET)"

# ── App config ────────────────────────────────────────────────────────────────
echo ""
echo "── Application ──────────────────────────────────────────────────────────"
set_secret "APP_ENV"           "$(prompt_secret APP_ENV           'production')"
set_secret "APP_BASE_URL"      "$(prompt_secret APP_BASE_URL      'http://157.245.14.143:8000')"
set_secret "FRONTEND_BASE_URL" "$(prompt_secret FRONTEND_BASE_URL 'http://localhost:3000')"
set_secret "LOG_LEVEL"         "$(prompt_secret LOG_LEVEL         'INFO')"

# ── External API URLs ─────────────────────────────────────────────────────────
echo ""
echo "── External API base URLs ───────────────────────────────────────────────"
set_secret "GITLAB_BASE_URL"     "$(prompt_secret GITLAB_BASE_URL     'https://gitlab.com/api/v4')"
set_secret "SLACK_API_BASE_URL"  "$(prompt_secret SLACK_API_BASE_URL  'https://slack.com/api')"
set_secret "GOOGLE_API_BASE_URL" "$(prompt_secret GOOGLE_API_BASE_URL 'https://www.googleapis.com')"

echo ""
echo "================================================"
echo "  Done. Verify at:"
echo "  https://github.com/$REPO/settings/secrets/actions"
echo "================================================"
