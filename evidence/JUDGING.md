# Hack Day judging record — October 24, 2026

Repository: https://github.com/yao23/aeg-kane-room-hackday

GitHub reports public repository creation at **2026-10-24T18:58:25Z** (11:58:25 AM America/Los_Angeles). This fresh repository has one root history and ordinary Git timestamps. It contains no earlier Git history. Prior concepts and the earlier prototype are disclosed in [PRIOR_ART.md](../PRIOR_ART.md).

## What is implemented

A dependency-free Node 24 app with a public community feed; a clearly SYNTHETIC seeded discussion; question preview and publication; persistent public threads; replies; environment/source context; reply counts and update timestamps; original-guest-only outcomes and Needs Kane Team escalation flags; visible UNVERIFIED labels and independent-support notices.

The app is running locally at http://127.0.0.1:3000 during this work session. `npm start` recreates that setup. No new public deployment is claimed; the earlier live pilot is a separate project.

## Automated application and runner checks

`npm test`: **7 tests passed; 0 failed**. Node **v24.14.1**, npm **11.12.0**. Latest run followed the runner completion-check change at commit `ac54466` (the same source change was tested immediately before commit).

The checks cover: two distinct guests previewing/publishing/replying; persistence after server restart; every outcome and escalation state; other-guest rejection; preservation of outcome timelines after later replies; synthetic-fixture ownership restrictions; malformed storage; HTML escaping for questions/replies/outcomes; matching-Origin protection and input size limits; runner exit preservation and complete-file requirements.

The runner test uses an explicitly synthetic CLI stub in a temporary directory. Its output is **not Kane execution evidence** and is never included in the real run records.

## Actual Kane CLI results

Exact version: **0.9.0**. All real runs used `--agent --headless`, target http://127.0.0.1:3000, and explicit synthetic-only local/global context. Commands, commit IDs, original test snapshots, NDJSON and stderr logs are preserved under `evidence/latest/` locally.

| Attempt | Tested commit | Result | Actual exit | Completed sections |
| --- | --- | --- | --- | --- |
| Initial community thread | `d8fcce5` | FAIL: invalid frontmatter target | 2 | 0; no run_end |
| Corrected community thread | `146fa18` | PASS | 0 | 5/5, all run_end passed |
| Optional question publication | `ac54466` | PASS | 0 | 5/5, all run_end passed |

Completed actual attempt directories:

- `evidence/latest/run-20261024T190200Z-AIDpAR/`
- `evidence/latest/run-20261024T190213Z-oYzp8W/`
- `evidence/latest/run-20261024T190512Z-eyVDM8/`

See [kane-results.json](kane-results.json) for reviewed safe projections, exact Git commit IDs, commands, final completion, raw-file SHA-256 digests, and working-tree status at run start. [kane-events.ndjson](kane-events.ndjson) contains selected real run_end / test_md_done fields only. They are labeled projections, not raw output. Auth/context/session fields and dashboard share URLs are intentionally omitted.

The stable flow checks the banner, community feed, seeded public question, actual question body, replies, status, outcome section, and independent/not-official-support disclaimer. A completed file requires a passed `test_md_done`, all run_end results passed, and CLI exit 0. Raw NDJSON, stderr, source snapshots, and command metadata are preserved. The stable attempt's derived `result.json` was rechecked with the strengthened parser after its run; its raw NDJSON was not changed.

## Agent → Kane → agent loop: actually exercised

The initial real CLI run rejected `target: desktop` before browser execution. The agent read the failure and absent final event, classified it as **test configuration**, changed only the two frontmatter targets to `chrome`, committed `146fa18`, and reran the same stable file. That rerun passed all five sections and exited 0.

This is a genuine test-format repair loop. It is **not a claim that Kane found and fixed a product defect**. Kane's actual multi-section output also motivated stricter runner completion checks; the existing actual stable output passed those stricter checks. See [AGENT_KANE_LOOP.md](../docs/AGENT_KANE_LOOP.md).

## Independent browser verification

Actual in-app browser verification found a preview Origin rejection before Kane ran. Commit `e4cf9f7` changes only the referrer policy to `same-origin`. The same browser then successfully previewed, published, replied, saved a worked outcome, and demonstrated a synthetic escalation flag. [Before/after screenshots and scope](browser/README.md) preserve that evidence. Separate guests were verified by HTTP integration tests; the browser walkthrough used one guest. No real issue was escalated or sent to Kane staff.

## Limits and judging readiness

- Local demo is functional; use [docs/DEMO.md](../docs/DEMO.md) for the walkthrough. No application blocker remains for a local judging demo.
- Public hosting is not set up. If judging requires a public URL, deployment with HTTPS and persistent disk remains to be arranged.
- Guest identities are unverified and cookie-bound. This is a single-process JSON-store demo without production moderation, spam prevention, or recovery of lost guest controls.
- Needs Kane Team is a visible community flag; it does not notify the team. No official guidance or staff response is implied.
- Earlier live-pilot observations are owner-reported issue types, not evidence of adoption in this fresh app. All seeded and automated browser activity here is SYNTHETIC.

Reused/inherited: the earlier community-room concept and product brief. No earlier implementation code, visual assets, real attendee content, or Git history was imported. No commit date was modified or manufactured.
