# Kane Room — Hack Day Edition

Built during Kane CLI Hack Day on October 24, 2026.

Kane Room is a lightweight community help space where builders can ask Kane questions, share troubleshooting experience, report outcomes, and validate critical flows with Kane CLI.

## Hack Day scope and prior work

The broader AEG Commons / Kane Room concept and an earlier prototype existed before Hack Day.

Prior prototype: https://github.com/yao23/aeg-commons-kane-room

Live community prototype: https://kane.liyao13.chatgpt.site/

This repository is the separate Hack Day implementation and contains work performed during the event, including new Hack Day community functionality, Kane CLI integration, the agent/Kane feedback loop, and judging evidence.

We intentionally preserve this distinction rather than presenting prior work as new Hack Day code.

## Quick start

Requires Node 24+. No dependencies or install step.

```sh
npm start
# Open http://127.0.0.1:3000
npm test
```

Use `PORT`, `HOST`, and `DATA_DIR` to configure the server. The default bind address is loopback. Store files live in ignored `data/`; use one server process per store. Do not delete a store containing community content to reset a demo.

## Architecture

Native Node HTTP server, server-rendered HTML, plain CSS, and a JSON file persisted by atomic rename. Synthetic data is created only when the store does not exist. No prior repository history or implementation code was imported. See [PRIOR_ART.md](PRIOR_ART.md).

## Community workflow

Builder A opens **Ask a question**, supplies public-safe environment/source context, previews, and publishes. Builder B opens the same public thread URL and posts a reply. The community feed shows reply counts, status, and last update. The browser receives a random HttpOnly guest cookie; only its hash is stored with a question. Display names are unverified and are not accounts. Builder A uses that same guest browser to report `worked`, `failed`, or `not_applicable`, or flag `needs_kane_team`. Outcome notes preserve the timeline. Other browsers cannot change those states. Escalation is a public flag only; it does not send a notification to Kane staff. Clearing the guest cookie loses access to author controls. The seeded fixture is read-only for outcomes; create a new synthetic question to demonstrate author controls.

Provenance is separate from source/evidence and is always **unverified**. Question, reply, and outcome forms default to `contributorType: human`, `submissionPath: web`. The optional selector can declare an agent report, shown as **Agent (self-declared) · UNVERIFIED · Web submission**. Selecting a synthetic sample or the existing synthetic checkbox stores `synthetic/test`; the checkbox takes precedence. Nothing infers identity from User-Agent, prose, browser behavior, or posted content. Submitted path/verification fields cannot override the server's assignment.

Explicit synthetic fixtures use `synthetic/test`. Older unmarked records render **Human · UNVERIFIED · Legacy/Web submission**; explicitly synthetic legacy records remain synthetic, including the known seeded reply. Outcomes carry their own declaration, independent of the question or its source. `agentProvenance()` in `src/provenance.js` supplies fixed `agent/agent/unverified` metadata for a future server-controlled agent route after that route's own access checks; no agent endpoint or identity verification is added here.

## Kane CLI testing

With the app running in another terminal:

```sh
bash scripts/kane-check.sh
# Target override, if needed:
KANE_URL=http://127.0.0.1:3000 bash scripts/kane-check.sh
# Optional writing smoke (creates explicitly SYNTHETIC public content):
KANE_TEST=kane-tests/post-question_test.md bash scripts/kane-check.sh
```

Requires an authenticated Kane CLI and Chrome. The stable `_test.md` checks the synthetic public thread, discussion, status, and independent-support disclaimer in `--agent --headless` mode. The optional publishing smoke is tracked separately and does not block submission. Syntax follows the [Kane CLI testmd reference](https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/testmd/overview.md). **Actual Hack Day results with Kane CLI 0.9.0: stable community flow PASS; optional publishing flow PASS**, each with CLI exit 0 and 5/5 completed sections. The initial invalid-frontmatter attempt is also preserved. See [the judging record](evidence/JUDGING.md) for exact tested commits and limits.

## Agent/Kane feedback loop

See [docs/AGENT_KANE_LOOP.md](docs/AGENT_KANE_LOOP.md) for the coding agent → Kane → inspect final result → classify → smallest justified change → rerun loop, including the actual frontmatter-format failure and repair. This is a test-configuration repair, not a Kane-discovered product bug.

## Evidence

See [evidence/JUDGING.md](evidence/JUDGING.md) for actual results and limitations, [evidence/README.md](evidence/README.md) for raw evidence paths and hygiene, and [docs/DEMO.md](docs/DEMO.md) for a judging walkthrough. Generated raw output remains ignored; only reviewed synthetic-only screenshots and safe event projections are public.

## Privacy/safety

All community content is UNVERIFIED. Independent Hack Day community project. Not official Kane support. Never paste secrets, credentials, private logs, or personal information. Posted commands are plain text and never executed. Mutations require a matching Origin; guest cookies use SameSite=Strict. Set `COOKIE_SECURE=1` when serving behind HTTPS (the externally visible Host must be preserved). Untrusted text is HTML-escaped; the browser uses a restrictive content security policy.

## Known limitations

Single-process Hack Day demo. No official Kane team integration, support SLA, production moderation, account recovery, or verified authority. No public deployment is included. No spam controls, production moderation, pagination, or automated official escalation. Guest identity is a demo capability, not verified identity. JSON persistence is single-process only and needs a persistent disk; in-memory state is not rolled back after a disk-write failure. The local demo remains usable for judging.

## Live pilot observations

The earlier live pilot encountered questions about iOS app testing and missing OpenAI event credits, according to the project owner's Hack Day brief. These are examples of issue types, not adoption metrics or verified technical findings. No attendee names, private information, or real posts were copied into this app. The new repository's fixture is explicitly SYNTHETIC.

## Hack Day change log

See [HACKDAY_CHANGELOG.md](HACKDAY_CHANGELOG.md) and the [exact file manifest](docs/FILES.md). Commit timestamps are ordinary current Git/GitHub timestamps and are not altered.
