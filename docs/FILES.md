# Exact repository file manifest

29 Git-tracked files created for this fresh Hack Day implementation. All paths are relative to the repository root.

- `.gitignore`
- `HACKDAY_CHANGELOG.md`
- `PRIOR_ART.md`
- `README.md`
- `docs/AGENT_KANE_LOOP.md`
- `docs/DEMO.md`
- `docs/FILES.md`
- `docs/KANE_CONTEXT.md`
- `evidence/JUDGING.md`
- `evidence/README.md`
- `evidence/browser/README.md`
- `evidence/browser/after-browser-escalation.png`
- `evidence/browser/after-browser-outcome.png`
- `evidence/browser/before-origin-error.png`
- `evidence/browser/homepage.png`
- `evidence/kane-events.ndjson`
- `evidence/kane-results.json`
- `evidence/latest/.gitkeep`
- `kane-tests/community-thread_test.md`
- `kane-tests/post-question_test.md`
- `package.json`
- `public/style.css`
- `scripts/kane-check.sh`
- `scripts/read-kane-result.js`
- `src/server.js`
- `src/store.js`
- `src/views.js`
- `test/app.test.js`
- `test/runner.test.js`

## Local generated artifacts (intentionally uncommitted)

- `data/room.json`: synthetic demo content and hashed guest ownership; never commit a live store.
- `evidence/latest/run-20261024T190200Z-AIDpAR/`: actual initial test-format failure.
- `evidence/latest/run-20261024T190213Z-oYzp8W/`: actual stable test pass.
- `evidence/latest/run-20261024T190512Z-eyVDM8/`: actual optional publishing pass.

Each attempt contains `command.txt`, `kane-version.txt`, `git-commit.txt`, `git-status.txt`, `target.txt`, `test.txt`, `test-source.md`, `run.ndjson`, `progress.log`, `cli-exit-code.txt`, and `result.json`. The stable run's derived result was rechecked with the strengthened parser; its raw data was unchanged.

Kane-managed recordings/artifacts also exist in ignored `kane-tests/output-community-thread/`, `kane-tests/output-post-question/`, `.testmuai/evidence/`, and the user's local Kane session storage. They are not implementation source, are not included in this public manifest, and must be reviewed before any export. Temporary build and parser-stub test directories are not repository contents.
