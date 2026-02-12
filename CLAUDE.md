# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LifeHubFin is a React Native mobile application targeting both Android and iOS platforms. The project uses:
- React Native 0.83.1 with React 19.2.0
- TypeScript for type safety
- Node.js >= 20 required

## Development Commands

### Running the App
```bash
# Start Metro bundler (required first)
npm start

# Android (run in separate terminal after Metro starts)
npm run android

# iOS (run in separate terminal after Metro starts)
npm run ios
```

### Building & Testing
```bash
# Run tests
npm test

# Run specific test file
npm test -- App.test.tsx

# Lint code
npm run lint
```

### iOS Setup
iOS requires installing CocoaPods dependencies (first time only or after updating native deps):
```bash
bundle install              # First time: install bundler/CocoaPods
bundle exec pod install     # Install pods
```

### Code Quality
```bash
# Linting
npm run lint

# Prettier formatting is configured in .prettierrc.js
```

## Architecture

### Entry Point
- `App.tsx` - Main application component using React functional components with StyleSheet

### Project Structure
```
├── App.tsx              # Root component
├── __tests__/           # Jest test files (App.test.tsx)
├── android/             # Android native code
│   └── build.gradle     # Android build config (minSdk 24, targetSdk 36)
├── ios/                 # iOS native code
├── babel.config.js      # Babel configuration using @react-native/babel-preset
├── tsconfig.json        # TypeScript config extending @react-native/typescript-config
├── jest.config.js       # Jest test configuration with react-native preset
├── metro.config.js      # Metro bundler configuration
└── .eslintrc.js         # ESLint extending @react-native
```

### Configuration Notes
- TypeScript strict mode is enabled via @react-native/typescript-config
- ESLint extends @react-native configuration
- Tests use snapshot testing with ReactTestRenderer
- Metro bundler handles module resolution and transformation

### Android Build Details
- Build Tools: 36.0.0
- Min SDK: 24 (Android 7.0+)
- Target/Compile SDK: 36
- NDK: 27.1.12297006
- Kotlin: 2.1.20

### Key Dependencies
- `react-native-safe-area-context` - Safe area handling for notched devices

## Development Workflow

When making changes:
1. Ensure Metro bundler is running (`npm start`)
2. Edit files - Fast Refresh automatically updates the app
3. For full reload: Android press `R` twice, iOS press `R` in simulator
4. Dev Menu access: `Ctrl+M` (Windows/Linux) or `Cmd+M` (macOS)
