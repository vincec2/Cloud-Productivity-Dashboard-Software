// src/services/syncService.ts
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  AppData,
  Project,
  Task,
  AppSettings,
} from "../types/global";

const SYNC_SCHEMA_VERSION = 1;
const TOMBSTONE_TTL_MS = 72 * 60 * 60 * 1000;

type SyncableTask = Task & {
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

type SyncableProject = Omit<Project, "tasks"> & {
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  tasks: SyncableTask[];
};

export type SyncableAppData = Omit<AppData, "projects"> & {
  projects: SyncableProject[];
  dataUpdatedAt?: string;
  lastSyncedAt?: string;
};

type RemoteSyncDocument = {
  schemaVersion: number;
  updatedAt: string;
  updatedByDeviceId: string;
  data: SyncableAppData;
};

function nowIso() {
  return new Date().toISOString();
}

function asTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function newerDate(a?: string | null, b?: string | null) {
  return asTime(a) >= asTime(b) ? a ?? null : b ?? null;
}

function isTombstoneExpired(deletedAt?: string | null) {
  if (!deletedAt) return false;
  return Date.now() - asTime(deletedAt) > TOMBSTONE_TTL_MS;
}

function keepNewestByUpdatedAt<T extends { updatedAt?: string }>(
  localItem: T,
  remoteItem: T
): T {
  return asTime(localItem.updatedAt) >= asTime(remoteItem.updatedAt)
    ? localItem
    : remoteItem;
}

function mergeTask(
  localTask: SyncableTask,
  remoteTask: SyncableTask
): SyncableTask {
  const localDeletedAt = localTask.deletedAt ?? null;
  const remoteDeletedAt = remoteTask.deletedAt ?? null;

  // Deleted always wins.
  if (localDeletedAt || remoteDeletedAt) {
    const winningDeletedAt = newerDate(localDeletedAt, remoteDeletedAt);

    const base =
      asTime(localDeletedAt) >= asTime(remoteDeletedAt)
        ? localTask
        : remoteTask;

    return {
      ...base,
      deletedAt: winningDeletedAt,
      updatedAt: newerDate(localTask.updatedAt, remoteTask.updatedAt) ?? nowIso(),
    };
  }

  // Otherwise latest edit wins.
  return keepNewestByUpdatedAt(localTask, remoteTask);
}

function mergeTasks(
  localTasks: SyncableTask[] = [],
  remoteTasks: SyncableTask[] = []
): SyncableTask[] {
  const byId = new Map<string, SyncableTask>();

  for (const task of localTasks) {
    byId.set(task.id, task);
  }

  for (const remoteTask of remoteTasks) {
    const localTask = byId.get(remoteTask.id);

    if (!localTask) {
      byId.set(remoteTask.id, remoteTask);
      continue;
    }

    byId.set(remoteTask.id, mergeTask(localTask, remoteTask));
  }

  return [...byId.values()];
}

function mergeProject(
  localProject: SyncableProject,
  remoteProject: SyncableProject
): SyncableProject {
  const localDeletedAt = localProject.deletedAt ?? null;
  const remoteDeletedAt = remoteProject.deletedAt ?? null;

  // Deleted project always wins.
  if (localDeletedAt || remoteDeletedAt) {
    const winningDeletedAt = newerDate(localDeletedAt, remoteDeletedAt);

    const base =
      asTime(localDeletedAt) >= asTime(remoteDeletedAt)
        ? localProject
        : remoteProject;

    return {
      ...base,
      deletedAt: winningDeletedAt,
      updatedAt:
        newerDate(localProject.updatedAt, remoteProject.updatedAt) ?? nowIso(),
      tasks: mergeTasks(localProject.tasks, remoteProject.tasks).map((task) => ({
        ...task,
        deletedAt: task.deletedAt ?? winningDeletedAt,
        updatedAt: task.updatedAt ?? nowIso(),
      })),
    };
  }

  const newerProject = keepNewestByUpdatedAt(localProject, remoteProject);

  return {
    ...newerProject,
    tasks: mergeTasks(localProject.tasks, remoteProject.tasks),
  };
}

function mergeProjects(
  localProjects: SyncableProject[] = [],
  remoteProjects: SyncableProject[] = []
): SyncableProject[] {
  const byId = new Map<string, SyncableProject>();

  for (const project of localProjects) {
    byId.set(project.id, project);
  }

  for (const remoteProject of remoteProjects) {
    const localProject = byId.get(remoteProject.id);

    if (!localProject) {
      byId.set(remoteProject.id, remoteProject);
      continue;
    }

    byId.set(remoteProject.id, mergeProject(localProject, remoteProject));
  }

  return [...byId.values()];
}

function stripLocalOnlySettings(settings?: AppSettings): AppSettings | undefined {
  if (!settings) return settings;

  const syncableSettings: AppSettings = { ...settings };

  delete syncableSettings.backgroundImagePath;
  delete syncableSettings.backgroundImageDataUrl;
  delete syncableSettings.alarmSoundPath;
  delete syncableSettings.alarmSoundDataUrl;

  return syncableSettings;
}

function restoreLocalOnlySettings(
  mergedSettings: AppSettings | undefined,
  localSettings: AppSettings | undefined
): AppSettings | undefined {
  return {
    ...(mergedSettings ?? {}),
    backgroundImagePath: localSettings?.backgroundImagePath ?? null,
    backgroundImageDataUrl: localSettings?.backgroundImageDataUrl ?? null,
    alarmSoundPath: localSettings?.alarmSoundPath ?? null,
    alarmSoundDataUrl: localSettings?.alarmSoundDataUrl ?? null,
  };
}

export function stampLocalChange(data: AppData): AppData {
  const timestamp = nowIso();

  return {
    ...data,
    dataUpdatedAt: timestamp,
  } as AppData;
}

export function normalizeForSync(data: AppData): SyncableAppData {
  const timestamp = nowIso();

  return {
    ...data,
    dataUpdatedAt: (data as SyncableAppData).dataUpdatedAt ?? timestamp,
    projects: (data.projects ?? []).map((project) => ({
      ...project,
      createdAt: project.createdAt ?? timestamp,
      updatedAt: (project as SyncableProject).updatedAt ?? project.createdAt ?? timestamp,
      deletedAt: (project as SyncableProject).deletedAt ?? null,
      tasks: (project.tasks ?? []).map((task) => ({
        ...task,
        createdAt: (task as SyncableTask).createdAt ?? timestamp,
        updatedAt: (task as SyncableTask).updatedAt ?? timestamp,
        deletedAt: (task as SyncableTask).deletedAt ?? null,
      })),
    })),
  };
}

function removeExpiredTombstones(data: SyncableAppData): SyncableAppData {
  return {
    ...data,
    projects: data.projects
      .filter((project) => !isTombstoneExpired(project.deletedAt))
      .map((project) => ({
        ...project,
        tasks: project.tasks.filter(
          (task) => !isTombstoneExpired(task.deletedAt)
        ),
      })),
  };
}

function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue !== undefined) {
        cleaned[key] = removeUndefinedDeep(nestedValue);
      }
    }

    return cleaned as T;
  }

  return value;
}

function makeRemoteSafeData(data: SyncableAppData): SyncableAppData {
  const safeData: SyncableAppData = {
    ...data,
    settings: stripLocalOnlySettings(data.settings),
  };

  return removeUndefinedDeep(safeData);
}

export function mergeAppData(
  localData: AppData,
  remoteData: AppData | null
): SyncableAppData {
  const local = normalizeForSync(localData);

  if (!remoteData) {
    return removeExpiredTombstones(local);
  }

  const remote = normalizeForSync(remoteData);

  const localSettings = local.settings;
  const remoteSettings = remote.settings;

  const useRemoteSettings =
    asTime(remote.dataUpdatedAt) > asTime(local.dataUpdatedAt);

  const merged: SyncableAppData = {
    ...local,
    ...remote,
    projects: mergeProjects(local.projects, remote.projects),
    focus100:
      asTime(remote.dataUpdatedAt) > asTime(local.dataUpdatedAt)
        ? remote.focus100
        : local.focus100,
    settings: restoreLocalOnlySettings(
      useRemoteSettings ? remoteSettings : localSettings,
      localSettings
    ),
    dataUpdatedAt:
      newerDate(local.dataUpdatedAt, remote.dataUpdatedAt) ?? nowIso(),
  };

  return removeExpiredTombstones(merged);
}

export async function syncWithFirebase(
  userId: string,
  localData: AppData,
  deviceId: string
): Promise<SyncableAppData> {
  const syncRef = doc(db, "users", userId, "sync", "current");

  const remoteSnap = await getDoc(syncRef);

  const remoteData = remoteSnap.exists()
    ? (remoteSnap.data() as RemoteSyncDocument).data
    : null;

  const merged = mergeAppData(localData, remoteData);

  await setDoc(
    syncRef,
    {
      schemaVersion: SYNC_SCHEMA_VERSION,
      updatedAt: nowIso(),
      updatedByDeviceId: deviceId,
      data: makeRemoteSafeData(merged),
    } satisfies RemoteSyncDocument,
    { merge: true }
  );

  return {
    ...merged,
    lastSyncedAt: nowIso(),
  };
}