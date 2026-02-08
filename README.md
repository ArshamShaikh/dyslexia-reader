# Dyslexia Reader

Dyslexia Reader is a mobile assistive reading application built with React Native and Expo.
The app is designed to support learners with dyslexia and reading difficulties by providing text-to-speech reading assistance, visual text tracking, and customizable reading settings.

## Features

- **Text Input**: Type or paste text for reading
- **Text-to-Speech Reading**: Converts text into spoken audio
- **Visual Highlighting**: Guides reading with line-by-line and word highlighting
- **Reading Controls**: Play/pause, skip controls, and speed controls
- **Reading Speed Adjustment**: Customize speech speed
- **Dyslexia-Friendly Fonts**: Improved readability
- **Adjustable Font Size & Spacing**: Personalized reading comfort
- **Saved Texts**: Store reading passages locally
- **Offline Functionality**: Works without internet connection

## Tech Stack

- **React Native** with Expo
- **Programming Language**: JavaScript
- **Text-to-Speech**: Expo Speech API (device-based TTS)
- **Local Storage**: Async Storage
- **Navigation**: React Navigation
- **UI Components**: Custom accessible components
- **Version Control**: Git & GitHub

## Getting Started

### Prerequisites

- Node.js
- npm
- Expo CLI
- Expo Go app (for mobile testing)

### Installation

```bash
npm install
npx expo start
```

## Project Structure

```bash
dyslexia-reader/
|-- App.js
|-- app.json
|-- package.json
|-- README.md
|-- assets/
`-- src/
    |-- components/
    |   |-- HighlightedText.jsx
    |   |-- ReaderControls.jsx
    |   `-- ThemedDialog.jsx
    |-- context/
    |   `-- SettingsContext.js
    |-- screens/
    |   |-- HomeScreen.jsx
    |   |-- ReaderScreen.jsx
    |   `-- SavedScreen.jsx
    |-- services/
    |   |-- ocrService.js
    |   |-- readerSessionService.js
    |   |-- storageService.js
    |   `-- ttsService.js
    |-- theme/
    |   |-- colors.js
    |   `-- typography.js
    `-- utils/
        |-- highlightUtils.js
        |-- ocrCleaner.js
        `-- textParser.js
```
