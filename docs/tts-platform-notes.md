# TTS Platform Notes (Android, iOS, Web)

This document summarizes the current text-to-speech (TTS) situation, costs, and platform constraints.

## 1) Current Status
- **Android**: Native TTS with word-boundary callbacks implemented. Accurate word/line sync is possible.
- **iOS**: Not implemented yet. iOS native module required to get word-level callbacks.
- **Web**: No reliable word-boundary callbacks in browsers. Heuristic sync only, or use cloud TTS.

## 2) Why iOS Needs a Mac
- iOS builds require **Xcode**, which only runs on macOS.
- Expo's `prebuild` creates the native iOS project (`ios/`), which you must compile with Xcode.

In order to make the TTS work on iOS, get access to a Mac:
1. Run `npx expo prebuild` to create `ios/`.
2. Add a native iOS TTS module using `AVSpeechSynthesizer` callbacks.
3. Build and run via Xcode.
4. Word-level sync works on iOS.

## 3) Cloud TTS (Cross-Platform Option)
Cloud TTS provides precise timestamps and works on all platforms but costs per character.

### Google Cloud Text-to-Speech (pricing reference, approx INR)
- Standard/WaveNet: **~INR 360 per 1M chars** (4M free/month)
- Neural2: **~INR 1,440 per 1M chars** (1M free/month)

### AWS Polly (first 12 months, approx INR)
- Standard: **5M chars/month free**, then **~INR 360 per 1M**
- Neural: **1M chars/month free**, then **~INR 1,440 per 1M**

### Azure Speech (free tier)
- Neural: **0.5M chars/month free** (paid rates vary by region)

## 4) Practical Usage Mapping (Detailed)
**Rule of thumb:** 1 page ~= 2,000-3,000 characters (varies by font/spacing).

### A) Per-page character ranges
- **Short page**: 1,500-2,000 chars
- **Typical page**: 2,000-3,000 chars
- **Dense page**: 3,000-4,000 chars

### B) Daily usage -> Monthly characters (approx)
Assume 25 reading days/month.
- **5 pages/day**: ~250k-500k chars/month
- **10 pages/day**: ~500k-1.0M chars/month
- **20 pages/day**: ~1.0M-2.0M chars/month
- **30 pages/day**: ~1.5M-3.0M chars/month
- **50 pages/day**: ~2.5M-5.0M chars/month

### C) Free tier coverage (pages/month)
Using 2,500 chars/page as a typical average:
- **Google Standard (4M free)**: ~1,600 pages/month
- **Google Neural2 (1M free)**: ~400 pages/month
- **AWS Standard (5M free)**: ~2,000 pages/month (first 12 months)
- **AWS Neural (1M free)**: ~400 pages/month (first 12 months)
- **Azure Neural (0.5M free)**: ~200 pages/month

### D) Example: small pilot usage
20 students, 10 pages/day, 25 days/month:
- 20 * 10 * 25 = 5,000 pages/month
- 5,000 * 2,500 chars/page ~= **12.5M chars/month**
- Costs (beyond free tier):
  - Standard voices: ~INR 4,500/month (12.5 * 360)
  - Neural2 voices: ~INR 18,000/month (12.5 * 1,440)

### E) Example: moderate usage
100 students, 10 pages/day, 25 days/month:
- 100 * 10 * 25 = 25,000 pages/month
- 25,000 * 2,500 chars/page ~= **62.5M chars/month**
- Costs (beyond free tier):
  - Standard voices: ~INR 22,500/month
  - Neural2 voices: ~INR 90,000/month
