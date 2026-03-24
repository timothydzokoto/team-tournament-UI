# TESTME

Mobile test runbook for `Team Tournament Mobile`.

## Scope

This file explains how to test the Expo mobile client against the `team-tournament-api` backend.

Project:
- `C:\Users\Tim\Documents\dev\reactnative\my-expo-app`

Backend:
- `C:\Users\Tim\Documents\dev\team-tournament-api`

## Test Targets

Test these areas:
- authentication and session restore
- dashboard and readiness cards
- teams, subteams, and players flows
- create, edit, and delete actions
- player face enrollment
- face verification / matching
- activity history
- live camera capture in Expo Go

## Prerequisites

Before testing:
- backend is running
- backend health is reachable
- at least one valid backend user exists
- Expo app dependencies are installed
- Expo Go is installed on the test phone if using a real device
- phone and laptop are on the same Wi-Fi for LAN testing

## Backend Sanity Check

Confirm the backend first.

Open in browser:
- `http://localhost:8000/health`
- `http://localhost:8000/docs`

Expected:
- health endpoint responds successfully
- docs load successfully
- if biometric testing is required, health shows face recognition as available

## Frontend Environment

Set `.env` in the app root.

### Web / iOS simulator
```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

### Android emulator
```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

### Real device on LAN
```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_LAN_IP:8000
```

Example:
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.43.199:8000
```

Restart Expo after any `.env` change.

## Start The App

From the Expo app directory:

```powershell
cd C:\Users\Tim\Documents\dev\reactnative\my-expo-app
pnpm start -- --host lan --port 8082
```

If the app behaves strangely due to cache:

```powershell
pnpm start -- --host lan --port 8082 --clear
```

## Test Modes

Use one or more of these:
- Expo Go on Android phone
- Expo web
- Android emulator
- iOS simulator

Important:
- biometric camera testing should be done on Expo Go or native simulator/device
- web is useful for general CRUD and layout testing, not final camera validation

## Smoke Test Order

Recommended order:
1. login
2. verify dashboard readiness
3. browse teams
4. browse subteams
5. browse players
6. create team
7. create subteam
8. create player
9. edit records
10. delete one test record
11. enroll a face image
12. run face match
13. verify activity history

## Authentication Tests

### Test login success
1. Open the app.
2. Enter a valid username and password.
3. Submit.

Expected:
- login succeeds
- app enters authenticated shell
- bottom tabs are visible
- no raw backend error shown

### Test login failure
1. Enter invalid credentials.
2. Submit.

Expected:
- login stays on login screen
- readable error message is shown
- app does not enter authenticated screens

### Test session restore
1. Log in successfully.
2. Reload the app.

Expected:
- session restores automatically
- user does not need to log in again immediately

## Dashboard Tests

### Test readiness cards
1. Open `Home`.
2. Review readiness and summary sections.

Expected:
- backend health info is visible
- service readiness reflects the backend state
- face recognition status matches backend `/health`

### Test quick actions
1. Use the dashboard quick actions.

Expected:
- `Teams` opens correctly
- `Verify` opens correctly

## Teams / Subteams / Players Tests

### Browse flow
1. Open `Teams`.
2. Open a team.
3. Open a subteam.
4. Open a player.

Expected:
- data loads without blank screens
- loading and empty states are readable
- detail screens show the correct records

### Search flow
1. Search teams.
2. Search subteams.
3. Search players.

Expected:
- results filter correctly
- empty-state messaging is clear when no results match

## Create / Edit / Delete Tests

### Create team
1. Open `Teams`.
2. Tap `New team`.
3. Submit a valid form.

Expected:
- success feedback appears
- team detail opens
- list refresh shows the new team

### Create subteam
1. Open a team.
2. Tap `New subteam`.
3. Submit valid data.

Expected:
- success feedback appears
- subteam detail opens
- parent list refreshes

### Create player
1. Open a subteam.
2. Tap `New player`.
3. Submit valid data.

Expected:
- success feedback appears
- player detail opens
- roster refreshes

### Edit flows
Repeat edit tests for:
- team
- subteam
- player

Expected:
- values update successfully
- success feedback appears
- parent screens reflect changes

### Delete flows
Repeat delete tests for:
- player
- subteam
- team

Expected:
- confirmation is required
- delete completes successfully
- app returns to a valid screen
- parent list refreshes

## Face Enrollment Tests

### Enroll using library
1. Open a player.
2. Tap `Choose from library`.
3. Select an image with one clear face.
4. Review preview.
5. Upload.

Expected:
- preview appears
- upload succeeds
- player detail refreshes
- face image is shown on the player profile

### Enroll using live camera
1. Open a player.
2. Tap `Capture with camera`.
3. Verify live preview appears.
4. Verify the guide cutout and oval align.
5. Capture an image.
6. Upload the previewed image.

Expected:
- live camera preview works
- overlay is visible and aligned
- captured image returns to preview
- upload succeeds
- player profile shows the enrolled face image

### Enrollment negative cases
Test when possible:
- no face image
- multiple faces
- invalid image
- weak network

Expected:
- readable guidance is shown
- retry path is available
- no silent failure

## Face Match Tests

### Match using enrolled face
1. Open `Verify`.
2. Capture or choose an image matching an enrolled player.
3. Run face match.

Expected:
- result shows matched player
- confidence is displayed
- result interpretation is shown
- activity history records the attempt

### No match
1. Use a non-matching face image.
2. Run face match.

Expected:
- no-match state is shown clearly
- user sees retry guidance
- history records the no-match result

### No face / multiple faces
Use images that should trigger these cases.

Expected:
- app shows the specific backend-driven result message
- retry guidance reflects the actual error

### Service unavailable
If backend face recognition is disabled intentionally:
- readiness card should show unavailable
- face match should fail clearly with service guidance

## Activity Tests

1. Run several verification attempts.
2. Open `Activity`.

Expected:
- recent verification entries appear
- matched/no-match/error states are distinguishable
- matched player links open player detail when available

## Profile Tests

1. Open `Profile`.
2. Review session info.
3. Log out.

Expected:
- session details are visible
- logout succeeds
- app returns to login screen

## UI / UX Checks

Check these on both small and larger screens if possible:
- text remains readable
- cards have enough contrast
- buttons remain visible and tappable
- back button works reliably
- bottom navigation works and preserves state
- live camera controls remain on screen

## Expo Go Camera Checks

When testing camera on Expo Go:
- confirm camera permission was granted
- confirm live preview is visible before capture
- confirm captured image returns to preview card
- confirm front/rear toggle works if exposed

If camera preview fails:
1. restart Expo with `--clear`
2. reopen Expo Go
3. verify permission in phone settings

## Pass Criteria

Minimum pass for this app:
- can log in successfully
- can browse teams, subteams, and players
- can create at least one test record
- can enroll a face image on a player
- can run face match successfully
- can handle at least one failure state cleanly
- can view activity history
- can log out cleanly

## Useful Commands

Typecheck:

```powershell
pnpm exec tsc --noEmit
```

Lint:

```powershell
pnpm lint
```

Format:

```powershell
pnpm format
```

## Notes

- Verification history is currently local to the device.
- Final camera QA should be done on a real device, not only web.
- If Expo Go behaves inconsistently, clear Metro cache and reload the app fully.
