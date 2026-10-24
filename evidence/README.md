# Actual test evidence

`latest/` contains ignored, immutable attempt directories made by `scripts/kane-check.sh`, including failures. Nothing in that directory is committed automatically. Each run records:

- Kane version, exact command, start URL / target, test source snapshot;
- Git commit and dirty working-tree status;
- raw stdout NDJSON and stderr progress log;
- actual CLI exit code and a parsed `result.json` including the last actual `run_end`;
- any limitations such as an absent final event.

Kane also writes local recordings, screenshots and sealed evidence packs in its output directories / `.testmuai/`; those remain ignored. Review contents before selectively exporting anything. Do not commit credentials, cookies, authentication state, private logs, or copied personal information. Use only synthetic/public-safe test targets. Remote run dashboards may require the owner's Kane account.

The runner never overwrites earlier attempts. A nonzero Kane exit remains that exact shell exit. A zero exit without a valid passed final `run_end` is a runner failure (65), not a pass. The optional publishing smoke test does not gate the stable read-only test.

Reviewed public judging summaries and selected synthetic-only screenshots may be committed separately with exact source attempt and commit references. Browser-found issues must be labeled as browser findings, not Kane findings. No red-to-green loop is claimed without actual evidence.
