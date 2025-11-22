// src/types/global.d.ts

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  tasks: Task[];
}

export interface AppSettings {
  // Absolute path to the chosen image (for display in Settings)
  backgroundImagePath?: string | null;
  // Data URL for the image (actually used by CSS)
  backgroundImageDataUrl?: string | null;

  // Pomodoro timer settings
  usePomodoro?: boolean;
  pomodoroWorkMinutes?: number;             // length of a work session
  pomodoroShortBreakMinutes?: number;       // length of a short break
  pomodoroLongBreakMinutes?: number;        // length of a long break
  pomodoroCyclesBeforeLongBreak?: number;   // how many work sessions before a long break

  alarmSoundPath?: string | null;
  alarmSoundDataUrl?: string | null;

  fontColor?: string | null;
}

export interface AppData {
  projects: Project[];
  settings?: AppSettings;
}

declare global {
  interface Window {
    api: {
      loadData: () => Promise<AppData>;
      saveData: (data: AppData) => Promise<{ ok: boolean }>;
      chooseBackground: () => Promise<{
        canceled: boolean;
        filePath: string | null;
        dataUrl: string | null;
      }>;
      chooseAlarmSound: () => Promise<{
        canceled: boolean;
        filePath: string | null;
        dataUrl: string | null;
      }>;
    };
  }
}

export {};
