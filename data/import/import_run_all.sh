#!/bin/bash
# Run all import phases sequentially.
#
# Usage:
#   ./import_run_all.sh                    # Full pipeline (phases 1-4, 6, 8 — skips AI & covers)
#   ./import_run_all.sh --with-ai          # Include Phase 5 (AI enrichment, needs ANTHROPIC_API_KEY)
#   ./import_run_all.sh --with-covers      # Include Phase 7 (cover fetching)
#   ./import_run_all.sh --all              # All phases including AI and covers
#   ./import_run_all.sh --seed             # After merge, push to Supabase
#
# Prerequisites:
#   pip install anthropic    # Only for --with-ai / --all

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WITH_AI=false
WITH_COVERS=false
WITH_SEED=false

for arg in "$@"; do
    case $arg in
        --with-ai) WITH_AI=true ;;
        --with-covers) WITH_COVERS=true ;;
        --all) WITH_AI=true; WITH_COVERS=true ;;
        --seed) WITH_SEED=true ;;
    esac
done

echo "=============================================="
echo "  Marvel Cartographer — Edition Import Pipeline"
echo "=============================================="
echo ""

# Phase 1: Parse & Deduplicate
echo "▶ Phase 1: Parse & Deduplicate"
python3 import_phase1_parse.py
echo ""

# Phase 2: Clean Titles & Map Formats
echo "▶ Phase 2: Clean Titles & Map Formats"
python3 import_phase2_clean.py
echo ""

# Phase 3: Parse Collects into Edition Issues
echo "▶ Phase 3: Parse Collects → Edition Issues"
python3 import_phase3_issues.py
echo ""

# Phase 4: Assign Eras
echo "▶ Phase 4: Assign Eras"
python3 import_phase4_eras.py
echo ""

# Phase 5: AI Enrichment (optional)
if [ "$WITH_AI" = true ]; then
    echo "▶ Phase 5: AI-Generate Synopses & Importance"
    if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
        echo "ERROR: ANTHROPIC_API_KEY not set. Skipping Phase 5."
        echo "Set it with: export ANTHROPIC_API_KEY=your-key"
        # Create a fallback enriched file from phase2 output
        cp phase2_cleaned.json phase5_enriched.json
    else
        python3 import_phase5_ai_enrich.py
    fi
else
    echo "▶ Phase 5: SKIPPED (use --with-ai to enable)"
    # Copy phase2 output as phase5 output with heuristic importance
    python3 -c "
import json
with open('phase2_cleaned.json') as f:
    entries = json.load(f)
for e in entries:
    if not e.get('synopsis'):
        e['synopsis'] = f\"Collects {e.get('issues_collected', 'various issues')}.\"
    if not e.get('importance') or e['importance'] == 'supplemental':
        title = e['title'].lower()
        fmt = e['format']
        if fmt == 'omnibus' and 'vol. 1' in title:
            e['importance'] = 'recommended'
        elif fmt == 'omnibus':
            e['importance'] = 'recommended'
        elif fmt == 'epic_collection':
            e['importance'] = 'recommended'
with open('phase5_enriched.json', 'w') as f:
    json.dump(entries, f, indent=2)
print(f'Created phase5_enriched.json with heuristic enrichment ({len(entries)} entries)')
"
fi
echo ""

# Phase 6: Auto-Generate Connections
echo "▶ Phase 6: Auto-Generate Connections"
python3 import_phase6_connections.py
echo ""

# Phase 7: Fetch Cover Images (optional)
if [ "$WITH_COVERS" = true ]; then
    echo "▶ Phase 7: Fetch Cover Images"
    python3 import_phase7_covers.py
else
    echo "▶ Phase 7: SKIPPED (use --with-covers to enable)"
fi
echo ""

# Phase 8: Merge & Validate
echo "▶ Phase 8: Merge & Validate"
python3 import_phase8_merge.py
echo ""

# Phase 9: Seed to Supabase (optional)
if [ "$WITH_SEED" = true ]; then
    echo "▶ Phase 9: Seed to Supabase"
    cd "$SCRIPT_DIR/.."
    python3 push_to_supabase.py
    cd "$SCRIPT_DIR/../.."
    node scripts/seed-edition-issues.mjs
else
    echo "▶ Phase 9: SKIPPED (use --seed to enable)"
fi

echo ""
echo "=============================================="
echo "  Pipeline Complete!"
echo "=============================================="
echo ""
echo "Review phase8_merge_report.json for full stats."
echo ""
echo "Next steps:"
echo "  1. Review phase1_report.json (dedup stats)"
echo "  2. Review phase3_unparsed.json (unparseable collects)"
echo "  3. Verify: jq '[.[].slug] | group_by(.) | map(select(length > 1))' ../../web/data/collected_editions.json"
echo "  4. Push to Supabase: ./import_run_all.sh --seed"
