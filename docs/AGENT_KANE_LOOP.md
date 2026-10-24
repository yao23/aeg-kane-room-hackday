# Coding agent ↔ Kane feedback loop

The coding agent implements the smallest useful change and runs the committed stable flow:

```sh
npm test
# In another terminal: npm start
bash scripts/kane-check.sh
```

1. Read the recorded CLI exit, NDJSON, stderr progress log, and last actual `run_end` in the newest `evidence/latest/run-*/` directory. A started process or partial checkpoint is not a completed test. Missing `run_end` is a failure to verify.
2. Classify the observed failure from evidence:
   - **Product:** the app's actual behavior violates the intended user journey. Fix only the demonstrated app defect; retain the assertion.
   - **Test:** the test format, selector, or expectation is wrong. Correct the test while retaining the intended user journey.
   - **Environment:** credentials, credits, Chrome, connectivity, permissions, or the local server are unavailable. Record the concrete blocker. Never relabel this as a product success.
3. Make the smallest justified change. Commit it with ordinary timestamps and a truthful message. Do not alter old commits or test results.
4. Rerun the same stable flow. Each attempt gets its own directory, test-source snapshot, commit reference, raw output, and actual exit. Compare before/after, including any limitations. Optional publishing results remain separate.
5. Claim PASS only with CLI exit 0 and a parsed final `run_end` with status `passed`, every other run_end passing, and a passed `test_md_done` file completion. Preserve failed attempts even when a later attempt passes. A loop that fixes test configuration is a **test repair**, not a Kane-discovered product fix.

## Actual exercise during Hack Day

The first run at commit `d8fcce5` produced exit 2: Kane 0.9.0 rejected YAML `target: desktop`, requiring `chrome`. It emitted `stream_start` but no `run_end`. The agent read both stderr and the missing-final-event result, classified the failure as **test configuration**, changed only the target in both markdown tests, committed `146fa18`, and reran the same community-thread test. Actual final results are recorded in [the judging record](../evidence/JUDGING.md).

Separately, pre-Kane browser verification found a same-origin form failure. Commit `e4cf9f7` changes `Referrer-Policy` to `same-origin`. Browser preview → publish → reply → outcome then succeeded. That is browser-found evidence, not a Kane-discovered product bug.

No issue was planted, no timestamps were altered, no synthetic CLI parser test output is used as judging evidence, and no production or official Kane guidance is inferred from these runs.

## Evidence hygiene

Only synthetic content was submitted in the local browser tests. The runner overrides global/local Kane context with `docs/KANE_CONTEXT.md` to keep the test scope explicit. Raw Kane outputs, cached replay data, cookies, auth state, and evidence packs remain ignored. Review selected excerpts and screenshots before committing public judging records. Do not run `git add -f` on raw directories.
