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

### Design — 8/10

The first screen is coherent, responsive, and leads from replay to action to
live rule change, with usable fallback and real endings. Strongest evidence:
36 production browser checks; desktop/mobile M8 screenshots; literal
`JUDGING.md`. Weakness: the desktop page is information-dense and the Designer
control is below the central hero content. Highest-impact changes: open the
video on replay/table causality; use a tight thumbnail crop; demonstrate the
90-second path without repository explanation.

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

The requested thumbnail and first 20 seconds do not yet exist, so a complete
first-impression review is impossible.

From `/judge` alone: after five seconds it reads as a polished digital board;
after ten seconds the Script & Replay column suggests source drives play; after
twenty seconds the action inspector makes the running-program idea credible.
It appears intended for tabletop designers and groups testing house rules. The
memorable visual is Azure Gate connected to a source-driven rotating room. The
main doubt is whether the rule change is live or staged. First friction is the
dense three-column desktop scan and, on mobile, the long scroll from table to
Designer. GPT-5.6 becomes meaningful only once its validated source and later
trigger are shown. I would continue because the replay/takeover controls are
specific and no login blocks testing.

Exactly five changes ranked by first-impression impact:

1. Make the video’s first action advance a replay cell while table and trace change.
2. Use a 3:2 thumbnail crop centered on Azure Gate, one source cell, and “A tabletop that rewrites itself.”
3. Show GPT-5.6 source commit and the resulting room rotation within the first minute.
4. State the target user/problem in one author-voice sentence before technical detail.
5. Record the literal path at normal speed and remove pauses that push the hero moment beyond 90 seconds.

## D. Browser-agent judge path

Automated clean desktop/mobile production runs passed all 36 steps, including
fallback, cancellation, reset, both endings, multiplayer convergence,
reconnect, and fork, with no console-breaking errors. M6 separately recorded a
9,764 ms bounded live Luna-plus-Designer hero path. The M9 exact-candidate live
repeat and human screenshot/timing pass remain pending; therefore this audit is
**NOT YET FINAL**.

