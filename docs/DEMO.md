# Three-minute judging demo

1. Run `npm start` with Node 24+. Open http://127.0.0.1:3000. Read the Hack Day banner, SYNTHETIC fixture label, and independent-support disclaimer.
2. Open the seeded synthetic public thread. Show its replies, environment/source context, status, and outcome section.
3. As Builder A, open **Ask a question**, use a fictional display name, mark it SYNTHETIC, and provide safe demo text. Preview and publish. Copy the public thread URL.
4. As Builder B, use a separate browser or private window to open that URL and publish a synthetic reply. All replies are UNVERIFIED.
5. Back in Builder A's original browser, reload the public thread and report `worked`, `failed`, or `not_applicable` with a note. Select `needs_kane_team` to demonstrate a community escalation flag. This does not contact Kane staff.
6. Run `bash scripts/kane-check.sh` and inspect the final actual result. Open `evidence/JUDGING.md` for recorded Hack Day evidence and the honest test-configuration repair.

Display names are guest labels, not verified people. Clearing the author browser's cookie loses outcome controls. The synthetic fixture has no owner and cannot be claimed. No auth/session file or real attendee content should be shown in a public demo.

This repository is separate from the earlier live pilot. Its demo is local; no public deployment is claimed. To share the demo, use a reviewed hosting setup with one Node process, persistent disk, HTTPS, preserved Host, `COOKIE_SECURE=1`, and moderation appropriate to its audience. This Hack Day app has no spam prevention or production account system.
