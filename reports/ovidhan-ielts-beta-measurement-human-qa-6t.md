# Phase 6T human analytics QA

Status: **HUMAN ANALYTICS QA NOT YET COMPLETE**

Use a clean browser profile and GA DebugView/network inspection without entering personal data.

1. Confirm one entry and one initial weakness-map view per session; redraws must not duplicate either.
2. Exercise all Academic/GT Writing tasks plus Reading, Listening, and Speaking. CTA clicks alone must not emit practice start.
3. Confirm only successful evidence writes emit evidence-created.
4. Confirm Reading/Listening/objective visual probes use `OBJECTIVE`; Writing/Speaking self-review and Task 1 response checks use `LEARNER_SELECTED`.
5. A recommendation view must not emit repair-start; a real repair action must.
6. Complete BETTER, TRY_AGAIN, SAME, objective-correct, and objective-incorrect retries; confirm no score or mastery property.
7. In a later meaningful session confirm `RETURNING`, with no anonymous learner or session identifier as a GA property.
8. Confirm existing Dakho view/click events occur once with `cta_context=IELTS_FREE_BETA`.
9. Confirm every payload excludes writing/repair text, audio, transcript, name, email, phone, free-form response, band score, and criterion score.
10. Block analytics and confirm learner flows still complete.

Do not make major product decisions until at least 7 full days and preferably 100+ entry sessions are observed. Otherwise record **INSUFFICIENT TRAFFIC**.
