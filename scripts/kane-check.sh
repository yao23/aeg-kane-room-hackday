#!/usr/bin/env bash
# Preserve each attempt. Never turn a red CLI result into a passing shell exit.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
TARGET="${KANE_URL:-http://127.0.0.1:3000}"
TEST_FILE="${KANE_TEST:-kane-tests/community-thread_test.md}"
EVIDENCE_ROOT="${EVIDENCE_DIR:-$ROOT/evidence/latest}"
mkdir -p "$EVIDENCE_ROOT"
RUN_DIR="$(mktemp -d "$EVIDENCE_ROOT/run-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
COMMAND=(kane-cli testmd run "$TEST_FILE" --url "$TARGET" --agent --headless --timeout 240 --max-steps 35 --global-context docs/KANE_CONTEXT.md --local-context docs/KANE_CONTEXT.md)
printf '%q ' "${COMMAND[@]}" > "$RUN_DIR/command.txt"
printf '\n' >> "$RUN_DIR/command.txt"
kane-cli --version > "$RUN_DIR/kane-version.txt"
git rev-parse HEAD > "$RUN_DIR/git-commit.txt"
git status --porcelain > "$RUN_DIR/git-status.txt"
printf '%s\n' "$TARGET" > "$RUN_DIR/target.txt"
printf '%s\n' "$TEST_FILE" > "$RUN_DIR/test.txt"
cp "$TEST_FILE" "$RUN_DIR/test-source.md"
printf 'Running Kane; evidence: %s\n' "$RUN_DIR"
set +e
"${COMMAND[@]}" > "$RUN_DIR/run.ndjson" 2> "$RUN_DIR/progress.log"
CLI_EXIT=$?
set -e
printf '%s\n' "$CLI_EXIT" > "$RUN_DIR/cli-exit-code.txt"
set +e
node scripts/read-kane-result.js "$RUN_DIR" "$CLI_EXIT"
RESULT_EXIT=$?
set -e
if [ "$CLI_EXIT" -ne 0 ]; then
  printf 'Kane failed with exit %s. See %s\n' "$CLI_EXIT" "$RUN_DIR" >&2
  exit "$CLI_EXIT"
fi
if [ "$RESULT_EXIT" -ne 0 ]; then
  printf 'Kane did not produce a trustworthy passing final result. See %s\n' "$RUN_DIR" >&2
  exit "$RESULT_EXIT"
fi
printf 'Kane PASS; final run_end and logs: %s\n' "$RUN_DIR"
