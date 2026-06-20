// src/types/global.d.ts

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;

  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string | null; // ISO date string, used for sync tombstones
}

export interface Project {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string | null; // ISO date string, used for sync tombstones
  tasks: Task[];
}

export interface Focus100Task {
  id: string;
  title: string;
  completed: boolean;

  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string | null; // ISO date string, used for sync tombstones
}

export interface Focus100Data {
  started: boolean;
  startDate: string | null; // local YYYY-MM-DD
  lastClockInDate: string | null; // local YYYY-MM-DD
  lastConfirmedFocusDate: string | null; // local YYYY-MM-DD
  streakDays: number;
  tasks: Focus100Task[];
  finishedAt?: string | null; // local YYYY-MM-DD
  restartCount?: number;
  lastMessage?: string | null;

  updatedAt?: string; // ISO date string
}

export interface AppSettings {
  // Absolute path to the chosen image (for display in Settings)
  backgroundImagePath?: string | null;
  // Data URL for the image (actually used by CSS)
  backgroundImageDataUrl?: string | null;

  // Pomodoro timer settings
  usePomodoro?: boolean;
  pomodoroWorkMinutes?: number;
  pomodoroShortBreakMinutes?: number;
  pomodoroLongBreakMinutes?: number;
  pomodoroCyclesBeforeLongBreak?: number;

  alarmSoundPath?: string | null;
  alarmSoundDataUrl?: string | null;

  fontColor?: string | null;

  updatedAt?: string; // ISO date string
}

export interface AppData {
  projects: Project[];
  settings?: AppSettings;
  focus100?: Focus100Data;

  dataUpdatedAt?: string; // latest local data change
  lastSyncedAt?: string; // latest successful Firebase sync
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