# Team Tournament Mobile

Expo React Native client for the `team-tournament-api` backend.

## What It Does

This app connects to the tournament backend and supports:
- authentication with session restore
- dashboard and backend readiness checks
- teams, subteams, and players browse flow
- create, edit, and delete for teams, subteams, and players
- player face enrollment
- face verification / matching
- recent verification history on device
- live camera capture with guide overlay

## Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- NativeWind
- gluestack-ui
- `expo-camera`
- `expo-image-picker`
- `expo-secure-store`

## Project Location

This README is for:
- `C:\Users\Tim\Documents\dev\reactnative\my-expo-app`

The backend is expected to live separately at:
- `C:\Users\Tim\Documents\dev\team-tournament-api`

## Test Runbook

For end-to-end verification steps, use:
- [TESTME.md](c:/Users/Tim/Documents/dev/reactnative/my-expo-app/TESTME.md)

## Prerequisites

Install before running the app:
- Node.js 20+
- `pnpm`
- Expo Go on a physical device, or an Android/iOS simulator
- a running `team-tournament-api` backend

## Install

```powershell
cd C:\Users\Tim\Documents\dev\reactnative\my-expo-app
pnpm install
```

## Environment

Create `.env` in the app root.

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Use the correct backend URL for your target:
- Web / iOS simulator: `http://127.0.0.1:8000`
- Android emulator: `http://10.0.2.2:8000`
- Physical device on the same Wi-Fi: `http://YOUR_PC_LAN_IP:8000`

Example for Expo Go on a real Android device:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.43.199:8000
```

After changing `.env`, restart Expo.

## Run

Start Expo:

```powershell
pnpm start
```

Useful variants:

```powershell
pnpm web
pnpm android
pnpm ios
```

For LAN testing with Expo Go:

```powershell
pnpm start -- --host lan --port 8082
```

If Metro cache causes stale behavior:

```powershell
pnpm start -- --host lan --port 8082 --clear
```

## Backend Requirements

The backend must be running and reachable from the device.

Minimum checks:
- `http://<backend-host>:8000/health`
- `http://<backend-host>:8000/docs`

Required backend capabilities:
- auth routes enabled
- CRUD routes for teams, subteams, and players
- uploads enabled
- face recognition installed if you want enrollment and face match to work

## Expo Go Notes

The app supports Expo Go for development testing.

What works in Expo Go:
- login
- CRUD flows
- image library selection
- live camera capture
- face enrollment upload
- face match verification

Recommended workflow for real-device testing:
1. Keep the backend running on your machine.
2. Put the phone and laptop on the same Wi-Fi.
3. Set `EXPO_PUBLIC_API_BASE_URL` to your machine LAN IP.
4. Start Expo with `--host lan`.
5. Scan the QR code in Expo Go.

## Main App Areas

Top-level tabs:
- `Home`: readiness, quick actions, summary
- `Teams`: team, subteam, and player management
- `Verify`: face match flow
- `Activity`: recent verification history stored locally
- `Profile`: session and logout

## Camera and Biometric Flow

### Enrollment
1. Open a player.
2. Use `Capture with camera` or `Choose from library`.
3. Review the preview.
4. Upload the image.

### Verification
1. Open `Verify`.
2. Capture or select an image.
3. Review the preview.
4. Run face match.
5. Review confidence and result state.

## Quality and Error Handling

The app handles these states explicitly:
- camera permission denied
- media library permission denied
- invalid image
- no face detected
- multiple faces detected
- no match found
- backend unavailable
- slow upload / slow verification
- network failures

## Development Commands

Typecheck:

```powershell
pnpm exec tsc --noEmit
```

Lint and formatting check:

```powershell
pnpm lint
```

Format the codebase:

```powershell
pnpm format
```

## Troubleshooting

### App cannot connect to backend
- confirm `.env` uses the correct host for the current device
- confirm backend container/service is running
- open `/health` in the device browser if using a real phone

### Expo Go opens but camera preview does not work
- fully restart Expo with `--clear`
- confirm camera permission is granted for Expo Go
- confirm you are testing on device, not expecting full native behavior from web

### Face match returns unavailable
- check backend `/health`
- confirm face recognition is installed and available in the backend container

### Login fails
- verify the backend account exists
- verify the backend URL is correct
- check `/api/v1/auth/login` in backend docs

## Current Navigation Structure

Screens currently in the app:
- `LoginScreen`
- `HomeScreen`
- `DashboardScreen`
- `TeamDetailScreen`
- `SubteamDetailScreen`
- `PlayerDetailScreen`
- `FaceMatchScreen`
- `LiveCaptureScreen`
- `ActivityScreen`
- `ProfileScreen`
- create/edit screens for team, subteam, and player

## Notes

- This app currently uses a custom in-app navigation shell with bottom tabs.
- Shared UI primitives are gluestack-backed and styled to match the dark mobile design system.
- Verification history is currently local to the device, not server-backed.

## Next Recommended Work

- front-camera-only lock for biometric capture
- final biometric result polish
- stronger offline and retry behavior
- server-backed activity history if multi-device audit is needed
