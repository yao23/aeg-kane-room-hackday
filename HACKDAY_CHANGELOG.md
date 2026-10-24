# Hack Day change log — October 24, 2026

GitHub public repository created: 2026-10-24T18:58:25Z.

Local Git repository initialized: 2026-10-24T18:58:20.555540+00:00. All commit timestamps are ordinary Git/GitHub timestamps; none are altered, backdated, spoofed, or manufactured. Earlier concepts and prototype work are disclosed in PRIOR_ART.md.

## Initial runnable milestone

- Added native Node 24 HTTP application, persistent JSON store, community feed, and a public synthetic discussion.
- Added original CSS, visible UNVERIFIED labels, independent-support disclaimer, and honest prior-work documentation.
- No prior code, assets, or Git history imported.
- Validation and subsequent functionality are recorded in later entries.

Initial validation: HTTP 200 for homepage, synthetic public thread, and health endpoint using a temporary store.

## Community discussion workflow

- Added server-rendered question preview and publishing, persistent public thread links, guest identities, and replies from a second builder.
- Added input limits, matching-Origin protection, HttpOnly guest cookies, strict CSP, and escaping for every public text field.
- Added normal HTTP integration tests covering the two-builder journey, persistence, preview, and safety boundaries.

## Outcomes and escalation

- Added original-guest-only worked / failed / not_applicable / needs_kane_team reporting with required context and a visible timeline.
- Preserved explicit outcomes when later replies arrive. Escalations are community flags, not official support requests.
- Validation: six HTTP integration tests pass, including every supported outcome, other-guest rejection, persistence, and synthetic-fixture restrictions.

## Browser-found form submission fix

- Actual browser preview failed with HTTP 403 under `Referrer-Policy: no-referrer`; the form's Origin did not match the room.
- Changed only the referrer policy to `same-origin`, preserving the strict matching-Origin check.
- Repeated the browser journey successfully: preview → publish → reply → worked outcome. Before/after screenshots are preserved separately from Kane evidence.
- This issue was discovered by browser verification before Kane ran. It is not attributed to Kane CLI.

## Kane CLI critical-path integration

- Added deterministic read-only community-thread test and separate optional synthetic publishing flow.
- Added a headless agent runner preserving raw NDJSON, stderr, command, target, version, source snapshot, commit, dirty state, CLI exit, and final run_end. Every attempt gets a new directory.
- Explicitly scopes Kane context to synthetic local app content and excludes earlier pilot interaction.
- Actual Kane results follow only after execution.

## First actual Kane attempt: test configuration failure

- Kane CLI 0.9.0 exited 2 before browser execution: YAML `target: desktop` is invalid; its frontmatter schema requires `chrome` for web tests.
- No run_end was emitted. This is a test-format failure, not an app failure or a completed browser test.
- Preserved attempt `evidence/latest/run-20261024T190200Z-AIDpAR/` (ignored local raw evidence). Changed only the two tests' target field to `chrome`, then reran the same stable flow.

## Stable Kane flow passed; strengthened completion checks

- Corrected test at `146fa18` completed with CLI exit 0, five passed run_end events, and passed test_md_done (5/5 file sections). Actual attempt: `run-20261024T190213Z-oYzp8W`.
- The agent → Kane → agent → rerun loop was actually exercised for a test-format repair. No Kane-discovered product fix is claimed.
- Real output showed one run_end per file section. Strengthened the runner to require every run_end to pass and a passed test_md_done, preventing partial results or an earlier failure from being hidden. Added synthetic stub-only regression cases for these completion boundaries.
