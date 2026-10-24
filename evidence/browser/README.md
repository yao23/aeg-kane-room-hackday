# Browser verification — synthetic local content only

These screenshots were captured from the actual local in-app browser during Hack Day. They contain only synthetic test content and app UI; no credentials, cookies, auth state, private logs, or real attendee posts are included.

- `homepage.png`: original community landing page and honest fixture notice.
- `before-origin-error.png`: actual preview submission rejection before commit `e4cf9f7`.
- `after-browser-outcome.png`: after the referrer-policy fix, preview → publishing → reply → worked outcome succeeded.
- `after-browser-escalation.png`: the same synthetic thread then demonstrated the Needs Kane Team flag and explanatory notice. This is a control demonstration, not a real incident or a report to staff.

The browser journey used one guest browser. Separate-builder capability and owner-only outcome permissions were independently verified by HTTP integration tests using two distinct guest cookies. Kane's read-only thread test and optional publishing test have their own evidence; these screenshots are not represented as Kane output.
