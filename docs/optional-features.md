# Optional Features

This document lists lower-priority features that can be implemented later, with:
- `Use case` (why the feature is useful)
- `Implementation` (how to build it in this app)

## 21. Guided reading mode (short chunks)
- Use case: Reduces cognitive load by showing smaller portions of text instead of long continuous passages.
- Implementation:
  - Split input into chunk units (for example, 2 to 4 sentences per chunk or ~80 to 140 words).
  - Render only one chunk at a time in Reader.
  - Add `Next Chunk` and `Previous Chunk` controls.
  - Restrict TTS and highlighting to the active chunk.

## 22. Sentence-by-sentence navigation
- Use case: Helps users who need precise control over pace and re-reading specific sentences.
- Implementation:
  - Parse text into a sentence array.
  - Track `currentSentenceIndex` in Reader state.
  - Add sentence-level previous/next actions.
  - TTS reads one sentence at a time and highlight mapping uses sentence boundaries.

## 23. Repeat line / paragraph
- Use case: Supports revision and confidence by replaying difficult parts instantly.
- Implementation:
  - Keep last active `lineIndex` and `paragraphIndex`.
  - Add `Repeat Line` and/or `Repeat Paragraph` actions.
  - On repeat, restart TTS and highlight from stored indices.

## 24. Track pauses / replays
- Use case: Identifies where readers struggle without judging performance.
- Implementation:
  - Log interaction events locally: `play`, `pause`, `resume`, `rewind`, `repeat`, timestamp, position.
  - Aggregate per session: pause count, replay count, frequent friction points.
  - Save metrics in local storage; later sync optionally to backend.

## 25. Suggest better speed or spacing
- Use case: Gives practical adjustments based on behavior, reducing trial-and-error.
- Implementation:
  - Add lightweight rules over session metrics.
  - Example rules:
    - Frequent pauses/rewinds -> suggest lower speed by `0.05` or `0.1`.
    - Frequent rereads of lines -> suggest higher line spacing.
  - Show one-tap suggestion prompts with accept/dismiss.

## 26. Rule-based personalization (no heavy AI)
- Use case: Adapts defaults over time while remaining inexpensive and transparent.
- Implementation:
  - Maintain a local profile: preferred speed, spacing, font, confidence.
  - Update profile with deterministic rules from behavior trends.
  - Apply new defaults only after repeated evidence.
  - Always allow manual override in settings.

## 31. Reading time tracking
- Use case: Tracks effort and helps users build reading habits.
- Implementation:
  - Start timer on `play`, pause on `pause/stop/background`.
  - Count only active reading time.
  - Store per-session and cumulative totals.

## 32. Session count
- Use case: Measures consistency (how often users engage with reading).
- Implementation:
  - Define a valid session threshold (for example, >= 30 seconds active reading).
  - Increment session count when threshold is met and session ends.
  - Store daily and total counts.

## 33. Progress dashboard (effort-based)
- Use case: Shows non-judgmental progress trends focused on effort, not grades.
- Implementation:
  - Create a dashboard screen from local metrics.
  - Show:
    - Today/week reading time
    - Session counts
    - Most replayed sections (optional)
  - Use neutral language and avoid pressure-oriented scoring.

