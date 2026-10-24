---
mode: testing
target: chrome
url: http://127.0.0.1:3000
---

# Optional synthetic question publishing smoke test

## Open the question form
On the homepage click "Ask a question". Verify that "Ask a Kane question" is visible.

## Enter public-safe synthetic data
Set Question title to "SYNTHETIC: Kane publishing smoke test". Set Display name to "Synthetic Kane tester". Set "What happened? What did you expect?" to "SYNTHETIC safe test content. Expected to preview and publish a public question. This is not a real support request." Set Environment to "SYNTHETIC desktop browser test". Set Source / reproduction context to "SYNTHETIC test fixture; no real logs". Check "This question is SYNTHETIC demo/test content".

## Preview before publishing
Click "Preview question". Verify that "PREVIEW" and the title "SYNTHETIC: Kane publishing smoke test" are visible. Verify "SYNTHETIC" and "UNVERIFIED" are visible.

## Publish and verify the public thread
Click "Publish question". Verify the public thread heading "SYNTHETIC: Kane publishing smoke test" is visible. Verify the question body is visible and the status is "Unanswered". Verify "Discussion / replies" is present.

## Verify the question in the community feed
Click "Community". Verify that "SYNTHETIC: Kane publishing smoke test" appears in the community discussions. Do not create additional posts, reply, or update outcomes.
