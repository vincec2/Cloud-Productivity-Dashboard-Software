# Cloud Productivity Dashboard

A local-first desktop app for managing projects, tasks, and focus time — built with **Electron + React + TypeScript** and packaged as a Windows `.exe`. All data is stored in a single JSON file on disk (no servers, no cloud, no login).
You can download the latest Windows installerfrom the
[Releases page](https://github.com/vincec2/Cloud-Proudctivity-Dashboard-Software/releases/latest)

---

## Features

### Projects & Tasks
- Create multiple projects.
- Each project contains tasks.
- Tasks have a status:
  - `To do`
  - `In progress`
  - `Done`
- A project is automatically marked **Completed** when **all of its tasks are `Done`**.
- Inline editing:
  - Click on a project name to rename it directly.
  - Click on a task title to edit it directly.
- Deleting:
  - Delete individual tasks.
  - Delete entire projects.

### Layout & UI
- Two-column layout:
  - **Left:** Projects list (scrollable).
  - **Right:** Tasks for the selected project (scrollable).
- “Add Project” and “Add Task” bars are **sticky** at the top of their panels so they remain visible when you scroll.
- Custom wallpaper background that fills the entire window.
- Dynamically changeable font colour for any elements tagged with `className="colourChange"`.

### Timer (Countdown + Pomodoro)
- **Classic countdown mode:**
  - Editable `HH:MM:SS` directly in the UI (no separate input field).
  - You can click the hours/minutes/seconds to edit when the timer is not running and Pomodoro mode is off.
  - Buttons: **Start / Restart**, **Pause**, **Resume**, **Reset**.
  - When the countdown reaches `00:00:00`, it stays at 0 (no auto-restart) and can be restarted manually.
- **Pomodoro mode:**
  - Configurable work / short break / long break durations.
  - Configurable number of work sessions before a long break.
  - Timer automatically cycles: Work → Short Break → Work → … → Long Break → Work…
  - Simple break popup:
    - When a work session ends and a break starts, a **Break time** popup appears.
    - You can dismiss it by clicking **Got it** or by clicking outside the popup.
- **Alarm sound:**
  - Optional audio alarm that plays whenever the timer reaches 0, in both classic and Pomodoro modes.
  - Custom MP3/WAV file can be chosen in Settings.

### Settings Modal
Accessible via the **Settings…** button in the header. It’s a modal with three tabs:

1. **Set background**
   - Choose a PNG/JPG/JPEG image as wallpaper.
   - Preview of the current wallpaper.
   - Clear background option.
   - **Font colour**:
     - Colour wheel picker.
     - Applies to all elements with `className="colourChange"` using a CSS variable.

2. **Alarm sound**
   - Choose an MP3 or WAV file.
   - Displays the current sound path.
   - Option to clear the alarm sound.

3. **Pomodoro settings**
   - Toggle **Use Pomodoro mode** on/off.
   - Configure:
     - Work duration (minutes)
     - Short break duration (minutes)
     - Long break duration (minutes)
     - Number of work sessions before a long break
