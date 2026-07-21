# Release-candidate review results

Date: 2026-07-21

These are conservative self-audits run from the exact prompts in
`docs/10-REVIEW-PROMPTS.md`. They are not represented as independent human
reviews. The final video, thumbnail, private Codex Session ID, entrant
attestation, and Devpost submission did not exist when these audits ran.

## A. Eligibility auditor

Verdict: **INSUFFICIENT EVIDENCE**.

| Result | Requirement | Exact candidate evidence or gap | Smallest corrective action |
|---|---|---|---|
| NOT PROVEN | Entrant is eligible | Official rules exclude specified jurisdictions and conflicts; residence, age, and conflict status are private and not inferable from this repository. | Owner confirms every official eligibility condition before submission. |
| PASS | Uses Codex and GPT-5.6 meaningfully | Dated milestone commits; `src/runtime/**`; `src/worker/ai/**`; live M5/M6 evidence; concrete README collaboration section. | Add the private primary `/feedback` Session ID to Devpost. |
| PASS | New work is distinguished | New repository history and `docs/11-PREEXISTING-WORK-DISCLOSURE.md`; no prior source/assets declared reused. | Owner completes the final attestation checkboxes. |
| PASS | Fits one category | `docs/01-PRODUCT-BRIEF.md` frames a consumer creativity/play app; Apps for Your Life explicitly includes creativity. | Select only Apps for Your Life in Devpost. |
| PASS | Working free project access | `https://boardgamecomputer.com/judge`; no login/BYOK; exact production smoke; 36-check production browser run. | Keep deployment available through judging. |
| PASS | Repository and relevant license | Public HTTPS clone succeeded; `LICENSE` is MIT; setup and frozen validation are documented. | Tag the exact final commit. |
| PASS | English materials and third-party compliance | UI/docs are English; `THIRD_PARTY_NOTICES.md`; 27-dependency license scan; original primitive visuals; generated art cut. | Ensure video/audio and final Devpost text remain English and IP-safe. |
| NOT PROVEN | Public demo video under three minutes with audio | No published video URL, duration, audio review, or timestamps. | Record, publish, and verify the narrated YouTube video in a clean session. |
| NOT PROVEN | Required Codex Session ID | The correct primary ID has not been obtained via `/feedback`. | Owner obtains it from this primary session and stores it only in Devpost/private records. |
| NOT PROVEN | Submission is complete before deadline | No author-voice copy, form screenshot, or Submitted confirmation. | Owner rewrites copy, completes fields, submits, and records redacted confirmation. |

Blockers in priority order: entrant eligibility attestation; public narrated
video; primary Session ID; human-authored submission copy; submitted-status
confirmation; final tag/production equality.

## B. Rubric grader

Candidate score: **33/40** before video and thumbnail evidence.

### Technological Implementation — 9/10

The custom Acorn interpreter, transactional patches, deterministic client
simulation, strict GPT boundary, and Durable Object ordering are genuine and
well tested. Strongest evidence: `src/runtime/**` plus 50 unit tests;
`src/worker/ai/**` and bounded live results; `src/app/shared-room-client.ts`
plus Worker/two-browser rebase tests. Weakness: Codex Session ID and a concise
video proof are still absent. Highest-impact changes: show patch undo/rebase in
the video; add exact Codex evidence; keep the final tag identical to production.

### Design — 9/10

The corrected first screen states the product and objective, makes the board
dominant, exposes one sticky journey action, and leads through persistent
six-stage progress. Play, Change rules, and Program are separate surfaces;
Advanced is collapsed; the Pixel 7 layout uses fixed bottom navigation rather
than a stacked desktop document. Strongest evidence: the before/after audit in
`docs/16-HUMAN-UX-AUDIT.md`, 42 desktop/mobile browser checks, and the literal
`JUDGING.md`. Remaining weakness: visual taste and real-device feel have only an
internal review, not independent human feedback. Highest-impact next step: use
the corrected UI in a normal-speed narrated video and get a physical-device
human pass without adding more product scope.

### Potential Impact — 7/10

The prototype credibly shortens the path from a house-rule idea to a playable
shared test, but there is no user study or external validation. Strongest
evidence: immediate useful checkpoint; live rule enters the running game;
persistent two-browser fork/rebase. Weakness: impact is currently a product
narrative, not measured behavior. Highest-impact changes: make the target user
and time-saving problem explicit in author copy; show a before/after rule idea
in the first minute; avoid unsupported scale claims.

### Quality of the Idea — 9/10

One reversible language unifying replay, human moves, constrained AI actions,
live rules, undo, and multiplayer ordering is distinctive. Strongest evidence:
room-as-program architecture; the visible blue-gate rule trigger; patch-based
fork/rebase. Weakness: the concept could be mistaken for another generated game
demo without a strong opening. Highest-impact changes: lead with “the table is
a running program”; show source and rotation together; name the model boundary
as validation rather than chat.

Single most important pre-submission fix: publish a short narrated video that
shows the live GPT-authored rule visibly changing the still-playable table.

## C. First-impression judge

The requested thumbnail and first 20 seconds still do not exist, so video
first-impression evidence remains incomplete. The application itself received a
separate release-blocking correction recorded in
`docs/16-HUMAN-UX-AUDIT.md`.

From the corrected `/judge` candidate alone, a five-second internal review can
now answer all required questions without scrolling: the statement says it is a
board game that rewrites itself; the exact objective names 2 relics, Gatehouse,
and Threat 10; the single gold CTA says `Next step`; `Change rules` is a
first-level surface; and the HUD/legend identify Mara with a gold `M`. Desktop
no longer opens as a three-column console. Pixel 7 shows the statement,
objective, HUD, full table, persistent progress, sticky CTA, and fixed product
tabs in its initial viewport. The main remaining doubt is still whether the
rule change is genuinely live, which the normal-speed Designer/rotation segment
must prove.

Exactly five remaining changes ranked by first-impression impact:

1. Record the corrected literal path at normal speed and show the live model
   indicator before the rule commits.
2. Show the committed Program cell and Mirror Gallery rotation in the same
   short segment.
3. Use a reviewed crop of the corrected board, objective, and product statement
   for the thumbnail.
4. Obtain one independent physical-device first-impression pass and record only
   concrete findings.
5. Keep author copy focused on the playable outcome before interpreter detail.

## D. Browser-agent judge path

The corrected local candidate passed 42 clean desktop/mobile checks, including
human-first hierarchy, slug-free actions, keyboard focus, mobile navigation,
fallback, cancellation, reset, both endings, multiplayer convergence,
reconnect, and fork, with no console-breaking errors. The prior exact production
candidate completed a real Luna-plus-Designer path in 10,606 ms; the corrected
candidate still requires its post-deploy live repeat. Before/after captures were
visually checked without capability values or credentials. A human
physical-device/timed narration pass remains pending, so this audit remains
**CANDIDATE PASS, HUMAN PASS PENDING**.
