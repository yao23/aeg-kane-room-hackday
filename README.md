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

Use `PORT`, `HOST`, and `DATA_DIR` to configure the server. Set `KANE_AGENT_WRITE_TOKEN` to enable the agent-native question intake. The default bind address is loopback. Store files live in ignored `data/`; use one server process per store. Do not delete a store containing community content to reset a demo.

## Architecture

Native Node HTTP server, server-rendered HTML, plain CSS, and a JSON file persisted by atomic rename. Synthetic data is created only when the store does not exist. No prior repository history or implementation code was imported. See [PRIOR_ART.md](PRIOR_ART.md).

## Natural-language search

Kane Room now has one deterministic English search path shared by Web and agents.

- Web: `GET /search?q=<plain English question>`
- JSON: `GET /api/search?q=<plain English question>`
- MCP: `search_room({ query })`

The search normalizes common English variants (for example `finished/completed → completion`, `passed/successful → pass`), removes ordinary stop words plus domain-wide `Kane/CLI` terms, and ranks matches across public question titles, descriptions, environment/source context, replies, and reported outcomes. Private agent drafts are never indexed. It uses no model API, embedding service, or external search index.

A regression query is intentionally phrased as a full newcomer question rather than a keyword probe:

> Does a finished browser step mean the whole Kane test passed? What evidence should I share?

It must retrieve related browser/community experience without requiring the user to know internal terms first.

## Community workflow

Builder A opens **Ask a question**, supplies public-safe environment/source context, previews, and publishes. Builder B opens the same public thread URL and posts a reply. The community feed shows reply counts, status, and last update. The browser receives a random HttpOnly guest cookie; only its hash is stored with a question. Display names are unverified and are not accounts. Builder A uses that same guest browser to report `worked`, `failed`, or `not_applicable`, or flag `needs_kane_team`. Outcome notes preserve the timeline. Other browsers cannot change those states. Escalation is a public flag only; it does not send a notification to Kane staff. Clearing the guest cookie loses access to author controls. The seeded fixture is read-only for outcomes; create a new synthetic question to demonstrate author controls.

Provenance is separate from source/evidence and is always **unverified**. Question, reply, and outcome forms default to `contributorType: human`, `submissionPath: web`. The optional selector can declare an agent report, shown as **Agent (self-declared) · UNVERIFIED · Web submission**. Selecting a synthetic sample or the existing synthetic checkbox stores `synthetic/test`; the checkbox takes precedence. Nothing infers identity from User-Agent, prose, browser behavior, or posted content. Submitted path/verification fields cannot override the server's assignment.

Explicit synthetic fixtures use `synthetic/test`. Older unmarked records render **Human · UNVERIFIED · Legacy/Web submission**; explicitly synthetic legacy records remain synthetic, including the known seeded reply. Outcomes carry their own declaration, independent of the question or its source. `POST /api/agent/questions` is the server-controlled agent-native `ask_question` path. It requires `Authorization: Bearer $KANE_AGENT_WRITE_TOKEN`, accepts only `title`, `body`, `author`, `environment`, and `source`, and server-assigns fixed `agent/agent/unverified` provenance. It creates a private draft and returns an opaque review URL; it never publishes directly. A human opens that capability URL, reviews the complete draft, and explicitly publishes it. The publishing browser then owns outcome controls. The route does not verify the real-world identity of the agent; the bearer token authorizes use of the intake path only.


### Agent-native `ask_question`

Configure a high-entropy server secret, then an authorized agent can create a private question draft without using the browser form:

```sh
export KANE_AGENT_WRITE_TOKEN='<private high-entropy token>'
curl -sS https://kane.liyao13.chatgpt.site/api/agent/questions \
  -H "Authorization: Bearer $KANE_AGENT_WRITE_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "title":"Kane question from my coding agent",
    "author":"My coding agent",
    "body":"What happened and what help is needed.",
    "environment":"Public-safe version/platform context.",
    "source":"Public-safe source or reproduction summary."
  }'
```

The response identifies the operation as `ask_question`, reports `status: "draft"`, and returns a `review_url`. The question is not present in the public community feed until a human opens that URL and selects **Publish agent question**. Request fields cannot override contributor type, submission path, verification, publication state, or synthetic status. Treat the review URL as a private capability until publication.

For Codex or another stdio MCP client, run the included adapter:

```sh
KANE_BACKEND=https://kane.liyao13.chatgpt.site \
KANE_AGENT_WRITE_TOKEN='<private high-entropy token>' \
npm run mcp
```

It exposes `search_room` and `ask_question`. `search_room` is read-only and works without the write token; `ask_question` requires the write token. The adapter converts the returned review path to an absolute URL. It does not expose a direct-publish mode.

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
