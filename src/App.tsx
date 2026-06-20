// src/App.tsx
import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import type { User } from "firebase/auth";
import "./App.css";
import type {
  AppData,
  Project,
  Task,
  TaskStatus,
  AppSettings,
  Focus100Data,
} from "./types/global";
import { SettingsModal } from "./components/SettingsModal";
import { ProjectList } from "./components/ProjectList";
import { TaskPanel } from "./components/TaskPanel";
import { CountdownTimer } from "./components/CountdownTimer";
import { Focus100Panel } from "./components/Focus100Panel";
import {
  login,
  register,
  logout,
  observeAuthState,
  sendVerificationEmail,
  refreshUser,
} from "./auth";
import {
  normalizeForSync,
  stampLocalChange,
  syncWithFirebase,
} from "./services/syncService";

type RightPanelTab = "tasks" | "focus100";

function createEmptyFocus100(): Focus100Data {
  return {
    started: false,
    startDate: null,
    lastClockInDate: null,
    lastConfirmedFocusDate: null,
    streakDays: 0,
    tasks: [],
    finishedAt: null,
    restartCount: 0,
    lastMessage: null,
  };
}

const emptyData: AppData = {
  projects: [],
  focus100: createEmptyFocus100(),
};

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem("cpdDeviceId");
  if (existing) return existing;

  const created =
    crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

  localStorage.setItem("cpdDeviceId", created);
  return created;
}

function nowIso() {
  return new Date().toISOString();
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeAppData(loaded: AppData | null | undefined): AppData {
  const focus100Defaults = createEmptyFocus100();

  return {
    projects: loaded?.projects ?? [],
    settings: loaded?.settings,
    focus100: {
      ...focus100Defaults,
      ...(loaded?.focus100 ?? {}),
      tasks: loaded?.focus100?.tasks ?? [],
    },
    dataUpdatedAt: loaded?.dataUpdatedAt,
    lastSyncedAt: loaded?.lastSyncedAt,
  };
}

function shouldOpenFocus100Tab(focus100: Focus100Data) {
  const today = localDateString();

  return (
    focus100.started &&
    !focus100.finishedAt &&
    !!focus100.lastClockInDate &&
    focus100.lastClockInDate !== today
  );
}

function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("tasks");

  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [deviceId] = useState(() => getOrCreateDeviceId());

  useEffect(() => {
    const unsubscribe = observeAuthState((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // load data from Electron on startup
  useEffect(() => {
    (async () => {
      try {
        const loaded = await window.api.loadData();
        const safe = normalizeAppData(loaded);
        const syncReady = normalizeForSync(safe);

        setData(syncReady);

        const visibleProjects = syncReady.projects.filter((p) => !p.deletedAt);

        if (visibleProjects.length && !selectedProjectId) {
          setSelectedProjectId(visibleProjects[0].id);
        }

        if (syncReady.focus100 && shouldOpenFocus100Tab(syncReady.focus100)) {
          setRightPanelTab("focus100");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load data file.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(updated: AppData) {
    try {
      const stamped = stampLocalChange(updated);
      await window.api.saveData(stamped);
      setData(stamped);
    } catch (e) {
      console.error(e);
      setError("Failed to save data.");
    }
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSyncMessage(null);

    try {
      if (authMode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }

      setEmail("");
      setPassword("");
      setSyncMessage(
        authMode === "register"
          ? "Account created. Check your email to verify before syncing."
          : "Logged in."
      );
    } catch (e) {
      console.error(e);
      setError("Authentication failed.");
    }
  }

  async function handleResendVerificationEmail() {
    if (!user) return;

    setError(null);
    setSyncMessage(null);

    try {
      await sendVerificationEmail(user);
      setSyncMessage("Verification email sent. Check your inbox.");
    } catch (e) {
      console.error(e);
      setError("Failed to send verification email.");
    }
  }

  async function handleRefreshVerificationStatus() {
    if (!user) return;

    setError(null);
    setSyncMessage(null);

    try {
      const refreshedUser = await refreshUser(user);
      setUser(refreshedUser);

      if (refreshedUser?.emailVerified) {
        setSyncMessage("Email verified. You can sync now.");
      } else {
        setSyncMessage("Email is still not verified.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to refresh verification status.");
    }
  }

  async function runSync() {
    if (!user) {
      setSyncMessage("Log in before syncing.");
      return;
    }

    if (!user.emailVerified) {
      setSyncMessage("Please verify your email before syncing.");
      return;
    }

    await user.getIdToken(true);

    setSyncing(true);
    setSyncMessage("Syncing...");
    setError(null);

    try {
      const merged = await syncWithFirebase(user.uid, data, deviceId);
      await window.api.saveData(merged);
      setData(merged);
      setSyncMessage("Synced.");

      const visibleProjects = merged.projects.filter((p) => !p.deletedAt);

      if (
        selectedProjectId &&
        !visibleProjects.some((p) => p.id === selectedProjectId)
      ) {
        setSelectedProjectId(visibleProjects[0]?.id ?? null);
      } else if (!selectedProjectId && visibleProjects.length > 0) {
        setSelectedProjectId(visibleProjects[0].id);
      }
    } catch (e) {
      console.error(e);
      setSyncMessage("Sync failed. Local data is still saved.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncNow() {
    await runSync();
  }

  useEffect(() => {
    if (loading || authLoading || !user) return;

    void runSync();

    // only auto-sync when login/startup state finishes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, authLoading, user?.uid]);

  const projects = data.projects.filter((p) => !p.deletedAt);
  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ?? null;
  const tasks: Task[] = selectedProject
    ? selectedProject.tasks.filter((t) => !t.deletedAt)
    : [];

  const focus100: Focus100Data = data.focus100 ?? createEmptyFocus100();

  const settings: AppSettings = data.settings ?? {};

  const backgroundImagePath = settings.backgroundImagePath ?? null;
  const backgroundImageDataUrl = settings.backgroundImageDataUrl ?? null;

  const fontColor = settings.fontColor ?? "#ffffff";

  const alarmSoundPath = settings.alarmSoundPath ?? null;
  const alarmSoundDataUrl = settings.alarmSoundDataUrl ?? null;

  // Pomodoro settings with defaults
  const usePomodoro = settings.usePomodoro ?? false;
  const pomodoroWorkMinutes = settings.pomodoroWorkMinutes ?? 25;
  const pomodoroShortBreakMinutes =
    settings.pomodoroShortBreakMinutes ?? 5;
  const pomodoroLongBreakMinutes =
    settings.pomodoroLongBreakMinutes ?? 15;
  const pomodoroCyclesBeforeLongBreak =
    settings.pomodoroCyclesBeforeLongBreak ?? 4;

  const pomodoroWorkSeconds = pomodoroWorkMinutes * 60;
  const pomodoroShortBreakSeconds = pomodoroShortBreakMinutes * 60;
  const pomodoroLongBreakSeconds = pomodoroLongBreakMinutes * 60;

  const timerKey = [
    usePomodoro ? "P" : "C",
    pomodoroWorkSeconds,
    pomodoroShortBreakSeconds,
    pomodoroLongBreakSeconds,
    pomodoroCyclesBeforeLongBreak,
  ].join("-");

  const backgroundStyle: CSSProperties = backgroundImageDataUrl
    ? {
        backgroundImage: `url("${backgroundImageDataUrl}")`,
      }
    : {};

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cpd-font-color",
      fontColor
    );
  }, [fontColor]);

  function handleFontColorChange(color: string) {
    updateSettings({ fontColor: color });
  }

  async function handleAddProject(name: string) {
    if (!name.trim()) return;

    setSavingProject(true);
    setError(null);

    const createdAt = nowIso();

    const newProject: Project = {
      id: generateId(),
      name: name.trim(),
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      tasks: [],
    };

    const updated: AppData = {
      ...data,
      projects: [...data.projects, newProject],
    };

    try {
      await persist(updated);
      setSelectedProjectId(newProject.id);
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    setError(null);

    const deletedAt = nowIso();

    const updated: AppData = {
      ...data,
      projects: data.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              deletedAt,
              updatedAt: deletedAt,
              tasks: p.tasks.map((t) => ({
                ...t,
                deletedAt: t.deletedAt ?? deletedAt,
                updatedAt: deletedAt,
              })),
            }
          : p
      ),
    };

    if (selectedProjectId === projectId) {
      const nextVisibleProject = updated.projects.find(
        (p) => !p.deletedAt && p.id !== projectId
      );
      setSelectedProjectId(nextVisibleProject?.id ?? null);
    }

    await persist(updated);
  }

  function updateProjectTasks(
    projectId: string,
    updater: (tasks: Task[]) => Task[]
  ): AppData {
    const updatedAt = nowIso();

    const updatedProjects = data.projects.map((p) => {
      if (p.id !== projectId) return p;

      const newTasks = updater(p.tasks);

      return {
        ...p,
        updatedAt,
        tasks: newTasks,
      };
    });

    return {
      ...data,
      projects: updatedProjects,
    };
  }

  async function handleAddTask(name: string) {
    if (!selectedProjectId || !name.trim()) return;

    setSavingTask(true);
    setError(null);

    const createdAt = nowIso();

    const newTask: Task = {
      id: generateId(),
      title: name.trim(),
      status: "todo",
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    };

    const updated = updateProjectTasks(selectedProjectId, (tasks) => [
      ...tasks,
      newTask,
    ]);

    try {
      await persist(updated);
    } finally {
      setSavingTask(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    if (!selectedProjectId) return;
    setError(null);

    const updatedAt = nowIso();

    const updated = updateProjectTasks(selectedProjectId, (tasks) =>
      tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt } : t
      )
    );

    await persist(updated);
  }

  async function handleDeleteTask(taskId: string) {
    if (!selectedProjectId) return;
    setError(null);

    const deletedAt = nowIso();

    const updated = updateProjectTasks(selectedProjectId, (tasks) =>
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              deletedAt,
              updatedAt: deletedAt,
            }
          : t
      )
    );

    await persist(updated);
  }

  async function handleRenameProject(projectId: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setError(null);

    const updatedAt = nowIso();

    const updatedProjects = data.projects.map((p) =>
      p.id === projectId
        ? { ...p, name: trimmed, updatedAt }
        : p
    );

    const updated: AppData = {
      ...data,
      projects: updatedProjects,
    };

    await persist(updated);
  }

  async function handleRenameTask(taskId: string, newTitle: string) {
    if (!selectedProjectId) return;

    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setError(null);

    const updatedAt = nowIso();

    const updated = updateProjectTasks(selectedProjectId, (tasks) =>
      tasks.map((t) =>
        t.id === taskId ? { ...t, title: trimmed, updatedAt } : t
      )
    );

    await persist(updated);
  }

  async function handleFocus100Change(nextFocus100: Focus100Data) {
    const updatedAt = nowIso();

    const updated: AppData = {
      ...data,
      focus100: {
        ...nextFocus100,
        updatedAt,
        tasks: nextFocus100.tasks.map((task) => ({
          ...task,
          updatedAt: task.updatedAt ?? updatedAt,
          deletedAt: task.deletedAt ?? null,
        })),
      },
    };

    await persist(updated);
  }

  // SETTINGS actions
  function updateSettings(partial: Partial<AppSettings>) {
    const newSettings: AppSettings = {
      ...settings,
      ...partial,
      updatedAt: nowIso(),
    };

    const updated: AppData = {
      ...data,
      settings: newSettings,
    };

    void persist(updated);
  }

  function handlePomodoroSettingsChange(
    partial: Partial<AppSettings>
  ) {
    updateSettings(partial);
  }

  async function handleChooseBackground() {
    try {
      const result = await window.api.chooseBackground();
      if (result.canceled || !result.filePath || !result.dataUrl) return;

      updateSettings({
        backgroundImagePath: result.filePath,
        backgroundImageDataUrl: result.dataUrl,
      });
    } catch (e) {
      console.error(e);
      setError("Failed to choose background image.");
    }
  }

  async function handleClearBackground() {
    updateSettings({
      backgroundImagePath: null,
      backgroundImageDataUrl: null,
    });
  }

  async function handleChooseAlarmSound() {
    try {
      const result = await window.api.chooseAlarmSound();
      if (result.canceled || !result.filePath || !result.dataUrl) return;

      updateSettings({
        alarmSoundPath: result.filePath,
        alarmSoundDataUrl: result.dataUrl,
      });
    } catch (e) {
      console.error(e);
      setError("Failed to choose alarm sound.");
    }
  }

  async function handleClearAlarmSound() {
    updateSettings({
      alarmSoundPath: null,
      alarmSoundDataUrl: null,
    });
  }

  if (loading) {
    return <p className="app-loading">Loading…</p>;
  }

  return (
    <div className="app-background" style={backgroundStyle}>
      <div className="app-inner">
        <header className="app-header">
          <div>
            <h1 className="colourChange">Cloud Productivity Dashboard</h1>
          </div>

          <div className="app-settings-row">
            {authLoading ? (
              <span className="colourChange">Checking login...</span>
            ) : user ? (
              <>
                <span className="colourChange">
                  Logged in as {user.email}
                </span>

                {!user.emailVerified && (
                  <>
                    <span className="colourChange">
                      Email not verified
                    </span>

                    <button
                      type="button"
                      onClick={handleResendVerificationEmail}
                    >
                      Resend verification
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshVerificationStatus}
                    >
                      I verified
                    </button>
                  </>
                )}

                {data.lastSyncedAt && (
                  <span className="colourChange">
                    Last synced: {new Date(data.lastSyncedAt).toLocaleString()}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing || !user.emailVerified}
                >
                  {syncing ? "Syncing..." : "Sync now"}
                </button>

                <button type="button" onClick={() => logout()}>
                  Log out
                </button>
              </>
            ) : (
              <form onSubmit={handleAuthSubmit}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button type="submit">
                  {authMode === "login" ? "Log in" : "Register"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAuthMode(authMode === "login" ? "register" : "login")
                  }
                >
                  {authMode === "login" ? "Need account?" : "Have account?"}
                </button>
              </form>
            )}

            <button type="button" onClick={() => setSettingsOpen(true)}>
              Settings…
            </button>
          </div>
        </header>

        {syncMessage && (
          <p className="colourChange app-sync-message">{syncMessage}</p>
        )}

        <CountdownTimer
          key={timerKey}
          usePomodoro={usePomodoro}
          pomodoroWorkSeconds={pomodoroWorkSeconds}
          pomodoroShortBreakSeconds={pomodoroShortBreakSeconds}
          pomodoroLongBreakSeconds={pomodoroLongBreakSeconds}
          pomodoroCyclesBeforeLongBreak={pomodoroCyclesBeforeLongBreak}
          alarmSoundDataUrl={alarmSoundDataUrl}
        />

        {error && <p className="app-error">{error}</p>}

        <div className="app-main-grid">
          <section className="scroll-panel app-scroll-section">
            <ProjectList
              projects={projects}
              selectedProjectId={selectedProjectId}
              savingProject={savingProject}
              onSelectProject={setSelectedProjectId}
              onAddProject={handleAddProject}
              onDeleteProject={handleDeleteProject}
              onRenameProject={handleRenameProject}
            />
          </section>

          <section className="scroll-panel app-scroll-section">
            <div className="taskpanel-tabs">
              <button
                type="button"
                className={
                  rightPanelTab === "tasks"
                    ? "taskpanel-tab-button taskpanel-tab-button--active"
                    : "taskpanel-tab-button"
                }
                onClick={() => setRightPanelTab("tasks")}
              >
                Tasks
              </button>
              <button
                type="button"
                className={
                  rightPanelTab === "focus100"
                    ? "taskpanel-tab-button taskpanel-tab-button--active"
                    : "taskpanel-tab-button"
                }
                onClick={() => setRightPanelTab("focus100")}
              >
                Focus 100
              </button>
            </div>

            {rightPanelTab === "tasks" ? (
              <TaskPanel
                project={selectedProject}
                tasks={tasks}
                savingTask={savingTask}
                onAddTask={handleAddTask}
                onChangeStatus={handleStatusChange}
                onDeleteTask={handleDeleteTask}
                onRenameTask={handleRenameTask}
              />
            ) : (
              <Focus100Panel
                focus100={focus100}
                onChange={handleFocus100Change}
              />
            )}
          </section>
        </div>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          backgroundImagePath={backgroundImagePath}
          backgroundImageDataUrl={backgroundImageDataUrl}
          onChooseBackground={handleChooseBackground}
          onClearBackground={handleClearBackground}
          usePomodoro={usePomodoro}
          pomodoroWorkMinutes={pomodoroWorkMinutes}
          pomodoroShortBreakMinutes={pomodoroShortBreakMinutes}
          pomodoroLongBreakMinutes={pomodoroLongBreakMinutes}
          pomodoroCyclesBeforeLongBreak={pomodoroCyclesBeforeLongBreak}
          onPomodoroChange={handlePomodoroSettingsChange}
          alarmSoundPath={alarmSoundPath}
          onChooseAlarmSound={handleChooseAlarmSound}
          onClearAlarmSound={handleClearAlarmSound}
          fontColor={fontColor}
          onFontColorChange={handleFontColorChange}
        />
      </div>
    </div>
  );
}

export default App;