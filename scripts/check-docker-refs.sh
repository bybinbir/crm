#!/usr/bin/env bash
# CI Regression Guard: Prevent Docker reintroduction
# Fails if Docker/container terms found in active operational files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍 CI Regression Guard: Checking for Docker references..."
echo ""

# Define active paths (operational code/docs/config)
ACTIVE_PATHS=(
    "apps/"
    "packages/"
    "scripts/*.sh"
    "compose.*.yaml"
    "Dockerfile*"
    ".github/"
    "docs/DEPLOYMENT.md"
    "docs/LOCAL_SETUP.md"
    "docs/ARCHITECTURE.md"
    "docs/ENVIRONMENT.md"
)

# Define approved archival/vendor paths (allowed to contain Docker refs)
IGNORED_PATHS=(
    "node_modules/"
    "pnpm-lock.yaml"
    "docs/audits/"
    "docs/releases/"
    "docs/CI_GUARDS.md"
    "task_dash.md"
    "*.bundle"
    "scripts/check-docker-refs.sh"
    ".github/workflows/ci.yml"
)

# Search terms (Docker/container ecosystem)
# Use word boundaries to avoid false positives like "truncate" matching "runc"
DOCKER_TERMS="\bdocker\b|\bcontainerd\b|\bcompose\b|\bdockerd\b|docker-compose|\bdockerfile\b|\bpodman\b|\brunc\b|\bbuildkit\b"

# Build git grep command with active paths
cd "$REPO_ROOT"

# Create temporary file for results
TEMP_RESULTS=$(mktemp)
trap "rm -f $TEMP_RESULTS" EXIT

# Search in active paths
for path in "${ACTIVE_PATHS[@]}"; do
    # shellcheck disable=SC2086
    if [ -e "$path" ] || ls $path >/dev/null 2>&1; then
        git grep -inE "$DOCKER_TERMS" -- "$path" 2>/dev/null >> "$TEMP_RESULTS" || true
    fi
done

# Filter out ignored paths
FILTERED_RESULTS=$(mktemp)
trap "rm -f $TEMP_RESULTS $FILTERED_RESULTS" EXIT

if [ -s "$TEMP_RESULTS" ]; then
    while IFS= read -r line; do
        SKIP=0
        for ignored in "${IGNORED_PATHS[@]}"; do
            if [[ "$line" == *"$ignored"* ]]; then
                SKIP=1
                break
            fi
        done
        if [ "$SKIP" -eq 0 ]; then
            echo "$line" >> "$FILTERED_RESULTS"
        fi
    done < "$TEMP_RESULTS"
fi

# Check if any matches found
if [ -s "$FILTERED_RESULTS" ]; then
    echo "❌ REGRESSION DETECTED: Docker references found in active files!"
    echo ""
    echo "Offending files and lines:"
    echo "-------------------------"
    cat "$FILTERED_RESULTS"
    echo ""
    echo "This project uses NATIVE SYSTEMD services, not Docker."
    echo "Docker/container references are not allowed in active operational code."
    echo ""
    echo "If these are legitimate (e.g., documentation about migration),"
    echo "move them to docs/audits/ or docs/releases/ directories."
    echo ""
    exit 1
else
    echo "✅ PASS: No Docker references in active files"
    echo ""
    echo "Checked paths:"
    for path in "${ACTIVE_PATHS[@]}"; do
        echo "  - $path"
    done
    echo ""
    echo "Ignored paths (archival/vendor allowed):"
    for path in "${IGNORED_PATHS[@]}"; do
        echo "  - $path"
    done
    echo ""
    exit 0
fi
