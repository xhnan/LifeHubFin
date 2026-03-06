# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

LifeHubFin is a personal finance management mobile application built with React Native, targeting both Android and iOS platforms. The app helps users track expenses, manage accounts, and visualize financial data.

**Tech Stack:**
- React Native 0.83.1 with React 19.2.0
- TypeScript for type safety
- Node.js >= 20 required
- React Navigation for routing
- Expo-compatible architecture

**Key Features:**
- User authentication with token-based auth
- Book/account management (账本管理)
- Transaction tracking with categories and tags
- Receipt scanning (拍照记账)
- Statistical charts and reports
- Android share sheet integration for image sharing
- In-app version update management

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

### Version Management

```bash
# Bump version (patch: 1.0.35 -> 1.0.36, minor: 1.0.35 -> 1.1.0, major: 1.0.35 -> 2.0.0)
npm run bump:patch
npm run bump:minor
npm run bump:major

# Build release APK
npm run release:patch
npm run release:minor
npm run release:major

# Build and upload (if configured)
npm run publish:patch
npm run publish:minor
npm run publish:major
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

- `App.tsx` - Main application component with authentication flow, navigation setup, and global state management

### Project Structure

```
├── App.tsx                        # Root component with auth & navigation
├── __tests__/                     # Jest test files (App.test.tsx)
├── android/                       # Android native code
│   ├── app/src/main/
│   │   ├── java/com/lifehubfin/
│   │   │   ├── MainApplication.kt           # Main app entry
│   │   │   ├── ImageHandlerModule.kt        # Native module for image handling
│   │   │   ├── ImageHandlerPackage.kt       # Package registration
│   │   │   └── ImageShareReceiver.kt        # Share sheet receiver
│   │   └── AndroidManifest.xml              # App permissions & configuration
│   └── build.gradle             # Android build config (minSdk 24, targetSdk 36)
├── ios/                          # iOS native code
├── src/
│   ├── screens/                  # Screen components
│   │   ├── LoginScreen.tsx                  # User authentication
│   │   ├── DetailScreen.tsx                 # Transaction details (明细)
│   │   ├── ChartScreen.tsx                  # Statistics charts (图表)
│   │   ├── AddScreen.tsx                    # Add transaction (记账)
│   │   ├── DiscoverScreen.tsx               # Discovery features (发现)
│   │   ├── ProfileScreen.tsx                # User profile (我的)
│   │   ├── BookManageScreen.tsx             # Book/account management (账本管理)
│   │   ├── ReceiptScreen.tsx                # Receipt scanning (拍照记账)
│   │   └── TransactionDetailScreen.tsx      # Transaction detail view
│   ├── components/               # Reusable components
│   │   ├── IconifyIcon.tsx                   # Icon component
│   │   ├── MonthPicker.tsx                   # Month selection picker
│   │   ├── DateTimePicker.tsx               # Date/time picker
│   │   ├── UpdateModal.tsx                   # Version update modal
│   │   └── AnimatedSplash.tsx                # Animated splash screen
│   ├── services/                 # Business logic & API calls
│   │   ├── auth.ts                           # Authentication & token management
│   │   ├── book.ts                           # Book/account management
│   │   ├── account.ts                        # Account operations
│   │   ├── transaction.ts                    # Transaction CRUD
│   │   ├── statistics.ts                     # Statistics & reports
│   │   ├── tag.ts                            # Tag management
│   │   ├── navigationService.ts              # Navigation utilities
│   │   ├── versionCheck.ts                   # Version update checking
│   │   ├── updateManager.ts                  # Update download manager
│   │   ├── api.ts                            # API client wrapper
│   │   └── nativeImageHandler.ts             # Android image share handler
│   ├── types/                    # TypeScript type definitions
│   │   └── version.ts                        # Version-related types
│   └── config/                   # Configuration files
│       ├── api.ts                            # API configuration (dev/prod)
│       └── version.ts                        # Version constants
├── babel.config.js              # Babel configuration using @react-native/babel-preset
├── tsconfig.json                # TypeScript config extending @react-native/typescript-config
├── jest.config.js               # Jest test configuration with react-native preset
├── metro.config.js              # Metro bundler configuration
└── .eslintrc.js                 # ESLint extending @react-native
```

### Navigation Structure

The app uses React Navigation with:

- **Tab Navigator** (Bottom tabs): 明细 (Details) | 图表 (Charts) | [记账 (Add)] | 发现 (Discover) | 我的 (Profile)
- **Stack Navigator** (Modal screens):
  - 记账 (Add transaction) - Slide from bottom
  - 账本管理 (Book management) - Slide from right
  - 拍照记账 (Receipt scanning) - Slide from bottom
  - 账单详情 (Transaction detail) - Fade modal

### Configuration Notes

- TypeScript strict mode is enabled via @react-native/typescript-config
- ESLint extends @react-native configuration
- Tests use snapshot testing with ReactTestRenderer
- Metro bundler handles module resolution and transformation
- API automatically switches between dev (http://10.0.2.2:9000) and production (https://api.xhnya.top)

### Android Build Details

- Build Tools: 36.0.0
- Min SDK: 24 (Android 7.0+)
- Target/Compile SDK: 36
- NDK: 27.1.12297006
- Kotlin: 2.1.20

### Key Dependencies

**Core:**
- `react-native-safe-area-context` - Safe area handling for notched devices
- `react-native-screens` - Optimized native screens for navigation

**Navigation:**
- `@react-navigation/native` - Navigation foundation
- `@react-navigation/native-stack` - Stack navigation
- `@react-navigation/bottom-tabs` - Bottom tab navigation

**UI Components:**
- `@react-native-community/datetimepicker` - Native date/time picker
- `react-native-svg` - SVG rendering for charts

**Storage & Utilities:**
- `@react-native-async-storage/async-storage` - Persistent local storage
- `react-native-fs` - File system access
- `react-native-image-picker` - Image selection from gallery/camera
- `react-native-splash-screen` - Splash screen control

### Native Modules

**Android Image Handler (`ImageHandlerModule`):**

Custom native module for handling images shared from Android's share sheet. Features:

- `getLastSharedImage()` - Get the last shared image URI
- `clearSharedImage()` - Clear shared image cache
- `getAllSharedImages()` - Get all shared image URIs
- `saveSharedImage(uri)` - Save image to internal storage
- Event emitter: `ImageShareReceived` - Listen for new shared images

This enables users to share images directly from other apps (gallery, camera, etc.) to LifeHubFin for receipt scanning.

## Development Workflow

When making changes:

1. Ensure Metro bundler is running (`npm start`)
2. Edit files - Fast Refresh automatically updates the app
3. For full reload: Android press `R` twice, iOS press `R` in simulator
4. Dev Menu access: `Ctrl+M` (Windows/Linux) or `Cmd+M` (macOS)

## Authentication Flow

The app uses token-based authentication:

- Tokens are stored using AsyncStorage
- Token expiration is monitored via `navigationService.ts`
- When token expires, user is automatically logged out
- Login screen is shown when no valid token exists

## Version Updates

The app includes automatic version checking:

- Checked on app launch and when returning from background
- Update modal shows available updates with changelog
- Supports both optional and force updates
- Download progress is tracked for large APK files

## Environment Configuration

API endpoints automatically switch based on build type:

- **Development** (`__DEV__ = true`): `http://10.0.2.2:9000` (Android emulator local)
- **Production** (`__DEV__ = false`): `https://api.xhnya.top`

Configuration is in `src/config/api.ts`

## Android Share Sheet Integration

To handle images shared from other apps:

1. Android manifest declares `ImageShareReceiver` as a broadcast receiver
2. Native module saves shared image to internal storage
3. React Native listens for `ImageShareReceived` events
4. App navigates to `ReceiptScreen` with the shared image URI

## Screen Flow Diagram

```text
LoginScreen (no token)
    ↓ (onLoginSuccess)
TabNavigator (Main Tab Bar)
    ├── DetailScreen (明细)
    ├── ChartScreen (图表)
    ├── AddButton → AddScreen (记账)
    ├── DiscoverScreen (发现)
    └── ProfileScreen (我的)
        ↓
    BookManageScreen (账本管理)
    ReceiptScreen (拍照记账)
    TransactionDetailScreen (账单详情)
```

## Common Tasks

### Adding a New Screen

1. Create screen file in `src/screens/`
2. Add to navigation stack in `App.tsx`
3. Update TypeScript types if needed

### Modifying API Endpoints

- Edit `src/config/api.ts` for base URL configuration
- Edit service files in `src/services/` for specific endpoints
- Types should be defined in `src/types/`

### Testing Native Modules (Android)

1. Make changes to native Kotlin files
2. Run `npm run android` to rebuild
3. Check Metro bundler output for linking errors
4. Use `adb logcat` to view native logs

### Debugging

- Use React Dev Debugger (shake device or Dev Menu → Debug)
- Check `adb logcat` for Android native crashes
- Console logs appear in Metro terminal
- Use React Native Debugger for network inspection
