# Cloud Productivity Dashboard - Windows Only

A local-first desktop app for managing projects, tasks, focus time, and productivity habits — built with **Electron + React + TypeScript** and packaged as a Windows `.exe`.

Cloud Productivity Dashboard is designed to work **offline first**. Your data is saved locally on your computer in the app's user data folder. Optional Firebase sync can be used to sync your projects, tasks, Focus100 data, and settings between devices.

You can download the latest Windows installer from the
[Releases page](https://github.com/vincec2/Cloud-Productivity-Dashboard-Software/releases/latest)

---

## Features

### Local-First Data Storage

- The app works offline.
- Data is saved locally on your computer.
- Internet is only required for logging in, verifying your email, and syncing.
- If sync fails, your local data is still preserved.

### Optional Firebase Sync

Cloud Productivity Dashboard supports optional account-based sync using Firebase.

- Register or log in with email and password.
- Email verification is required before syncing (check spam for verification link).
- Sync can be run manually with **Sync now**.
- The app also attempts to auto-sync when the app starts and the user is logged in.
- Sync data is stored in Firestore under the signed-in user's account.
- Each user can only access their own sync data through Firestore security rules.

Sync behaviour:

- New projects and tasks are added during sync.
- Matching projects and tasks are merged by ID.
- If the same item is edited on multiple devices, the latest edit wins.
- Deleted items win over edited items.
- Deleted records are kept temporarily as sync tombstones and can be purged after 72 hours.

Local-only items:

- Custom wallpaper image files do not sync.
- Custom alarm sound files do not sync.
- Local file paths are device-specific and remain local to each computer.

### Projects & Tasks

- Create multiple projects.
- Each project contains tasks.
- Tasks have a status:
  - `To do`
  - `In progress`
  - `Done`
- A project is automatically marked **Completed** when all of its tasks are `Done`.
- Inline editing:
  - Click on a project name to rename it directly.
  - Click on a task title to edit it directly.
- Deleting:
  - Delete individual tasks.
  - Delete entire projects.

### Layout & UI

- Two-column layout:
  - **Left:** Projects list.
  - **Right:** Tasks or Focus100 panel.
- “Add Project” and “Add Task” bars are sticky at the top of their panels.
- Scrollable project and task panels.
- Custom wallpaper background.
- Dynamically changeable font colour for selected UI elements.

### Timer

#### Classic Countdown Mode

- Editable `HH:MM:SS` timer directly in the UI.
- Click the hours, minutes, or seconds to edit when the timer is not running and Pomodoro mode is off.
- Controls:
  - **Start / Restart**
  - **Pause**
  - **Resume**
  - **Reset**
- When the timer reaches `00:00:00`, it stays at 0 and can be restarted manually.

#### Pomodoro Mode

- Configurable work duration.
- Configurable short break duration.
- Configurable long break duration.
- Configurable number of work sessions before a long break.
- Timer automatically cycles:
  - Work → Short Break → Work → Short Break → Long Break
- Break popup appears when a work session ends.
- Break popup can be dismissed by clicking **Got it** or clicking outside the popup.

#### Alarm Sound

- Optional audio alarm when the timer reaches 0.
- Custom MP3/WAV alarm sound can be chosen in Settings.
- Alarm sound files are stored locally and do not sync between devices.

### Focus100

Focus100 is a 100-day productivity challenge built into the app.

- Start a 100-day focus challenge.
- Once started, the challenge cannot be paused or ended manually.
- Missing a daily clock-in restarts the challenge.
- Confirming that you did not focus also restarts the challenge.
- Includes an editable productivity task list.
- Focus100 can be completed and restarted as many times as desired.
- Focus100 data can sync between devices when signed in and verified.

### Settings Modal

Accessible through the **Settings...** button in the header.

Settings tabs include:

1. **Set background**
   - Choose a PNG/JPG/JPEG image as wallpaper.
   - Preview the current wallpaper.
   - Clear the background.
   - Choose a dynamic font colour.

2. **Alarm sound**
   - Choose an MP3 or WAV file.
   - View the current sound path.
   - Clear the alarm sound.

3. **Pomodoro settings**
   - Toggle Pomodoro mode on/off.
   - Configure:
     - Work duration
     - Short break duration
     - Long break duration
     - Number of work sessions before a long break

---

## Sync Notes

Cloud Productivity Dashboard remains usable without an internet connection.

Recommended sync flow:

1. Open the app.
2. Log in or register.
3. Verify your email.
4. Use the app normally.
5. Click **Sync now** when you want to push/pull changes.
6. On another device, log into the same account and allow the app to auto-sync.

Sync is intentionally simple and designed for light personal use, not real-time collaboration.

Conflict rules:

- Latest edit wins.
- Deleted records win.
- Deleted records are retained temporarily so other devices can receive the deletion.

---

## Privacy & Security Notes

- Firebase web API keys are included in the client app as expected for Firebase client applications.
- Database access is controlled through Firebase Authentication and Firestore security rules.
- Email verification is required before syncing.
- Service account keys and Firebase Admin SDK credentials should never be included in the packaged desktop app.
- The Firebase Admin SDK should only be used in trusted backend/server environments.

---

## Tech Stack

- **Electron**
- **React**
- **TypeScript**
- **Vite**
- **Firebase Authentication**
- **Cloud Firestore**

---

## Notes

- Windows only.
- Packaged as a Windows `.exe`.
- App data is stored locally first.
- Firebase is used only for optional account login and sync.
- The app is designed for personal/light use, not multi-user real-time collaboration.