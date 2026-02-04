# Dyslexia Reader - Features Roadmap

## ✅ Implemented Features

### Reading Interface
- **Word-by-word highlighting** - Highlights individual words with golden background for better tracking
- **Text-to-Speech (TTS)** - Synchronized audio playback with visual highlighting
- **Adjustable reading speed** - 0.75x, 1.0x, 1.25x speed control
- **Font size adjustment** - 14-26pt for comfortable reading
- **Line spacing control** - 1.2x to 2.0x for reduced crowding
- **Background themes** - Light, blue, and dark modes to reduce eye strain

### Playback Controls
- **Play/Pause button** - Start and pause reading
- **Skip backward** - Go back 5 words
- **Skip forward** - Skip ahead 5 words
- **Variable speed** - Adjust playback speed on-the-fly

---

## 🎯 Recommended Features for Dyslexic Users

### High Priority (Evidence-Based)

#### 1. **Word Spacing & Letter Spacing**
- **Why**: Dyslexic users often struggle with word/letter crowding
- **Implementation**: Add sliders in Settings for letter-spacing and word-spacing
- **Benefit**: Reduces visual crowding and improves tracking

#### 2. **Syllable/Chunk Highlighting**
- **Why**: Breaking words into syllables helps with phonetic processing
- **Implementation**: Parse words into syllables and highlight them sequentially
- **Benefit**: Improves reading fluency and word recognition

#### 3. **Color Overlay Filters**
- **Why**: Many dyslexic users find specific color filters helpful
- **Implementation**: Add blue, yellow, green tinted overlays to reduce visual stress
- **Benefit**: Reduces visual discomfort (Visual Stress/Meares-Irlen Syndrome affects ~50% of dyslexics)

#### 4. **Text-to-Speech Highlighting Sync**
- **Current**: ✅ Already implemented with word-level highlighting
- **Enhancement**: Allow highlighting different text chunks (word, phrase, line)
 - **Note (Accuracy Upgrade)**: For Speechify-level accuracy, use a TTS engine that provides per-word timepoints (native callbacks or cloud TTS). Expo Speech does not provide reliable word timing.

#### 5. **Dictionary/Definition Lookup**
- **Why**: Unknown words create comprehension barriers
- **Implementation**: Double-tap word → show definition popup
- **Benefit**: Improves vocabulary understanding without app switching

---

### Medium Priority (Nice-to-Have)

#### 6. **Bookmarks & Annotations**
- **Why**: Easy way to mark important passages and return to them
- **Implementation**: Long-press to bookmark, add notes
- **Benefit**: Supports comprehension and study habits

#### 7. **Read-Along Mode**
- **Why**: Some users benefit from seeing multiple modes
- **Implementation**: Toggle between sequential highlighting and follow-along highlighting
- **Benefit**: Accommodates different learning preferences

#### 8. **Text Import Options**
- ✅ Manual text input (implemented)
- **Add**: OCR from camera (placeholder exists)
- **Add**: PDF import
- **Add**: Web URL text import

#### 9. **Progress Tracking**
- **Why**: Motivation through progress visualization
- **Implementation**: Show reading progress bar, time spent, words read
- **Benefit**: Gamification for engagement

#### 10. **Font Selection for Dyslexia**
- **Why**: Dyslexia-friendly fonts can reduce letter confusion
- **Implementation**: Add fonts like OpenDyslexic, Comic Sans (proven effective)
- **Benefit**: Reduces letter reversals and confusion

---

### Lower Priority (Future)

- Word prediction/autocomplete
- Multi-language support
- Offline mode
- Cloud sync for saved texts
- Reading statistics & comprehension quizzes
- Voice commands

---

## 🏆 Quick Win Recommendations (Start Here)

1. **Add color overlay filters** (5-10 min feature) - High impact
2. **Implement syllable highlighting** (20-30 min feature) - Good learning curve
3. **Add word dictionary lookup** (30-45 min feature) - Very useful
4. **Improve letter/word spacing controls** (10-15 min feature) - Simple & effective

---

## Implementation Priority Sequence

### Phase 1 (Week 1) - Core Accessibility
- Color overlays
- Letter/word spacing controls
- Font selection (OpenDyslexic)

### Phase 2 (Week 2) - Enhanced Reading
- Dictionary lookup
- Syllable highlighting
- Text import options (OCR, PDF)

### Phase 3 (Week 3+) - Engagement & Tracking
- Bookmarks & annotations
- Progress tracking
- Reading statistics

---

## Accessibility Standards to Follow

- WCAG 2.1 AA compliance
- High contrast modes
- Larger touch targets (min 48x48pt)
- Clear, simple labels
- Haptic feedback for button presses
- Screen reader support
