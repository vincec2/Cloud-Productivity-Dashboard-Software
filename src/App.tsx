// src/App.tsx
import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import "./App.css";
import type { AppData, Project, Task, TaskStatus, AppSettings } from "./types/global";
import { SettingsModal } from "./components/SettingsModal";
import { ProjectList } from "./components/ProjectList";
import { TaskPanel } from "./components/TaskPanel";
import { CountdownTimer } from "./components/CountdownTimer";


const emptyData: AppData = { projects: [] };

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // load data from Electron on startup
  useEffect(() => {
    (async () => {
      try {
        const loaded = await window.api.loadData();
        const safe = loaded ?? emptyData;
        setData(safe);

        if (safe.projects?.length && !selectedProjectId) {
          setSelectedProjectId(safe.projects[0].id);
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
      await window.api.saveData(updated);
      setData(updated);
    } catch (e) {
      console.error(e);
      setError("Failed to save data.");
    }
  }

  const projects = data.projects;
  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ?? null;
  const tasks: Task[] = selectedProject ? selectedProject.tasks : [];

  // const totalProjects = projects.length;
  // const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);

  const settings: AppSettings = data.settings ?? {};

  const backgroundImagePath = settings.backgroundImagePath ?? null;
  const backgroundImageDataUrl = settings.backgroundImageDataUrl ?? null;

  const fontColor = settings.fontColor ?? "#ffffff"; // or whichever default you like


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
    pomodoroCyclesBeforeLongBreak
  ].join("-");

  // Wallpaper: dynamic background image; layout in CSS (.app-background)
  const backgroundStyle: CSSProperties = backgroundImageDataUrl
    ? {
        backgroundImage: `url("${backgroundImageDataUrl}")`,
      }
    : {};

  useEffect(() => {
    // this will be used by the .colourChange CSS class
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

    const newProject: Project = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      tasks: []
    };

    const updated: AppData = {
      ...data,
      projects: [...projects, newProject]
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

    const updated: AppData = {
      ...data,
      projects: projects.filter((p) => p.id !== projectId)
    };

    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }

    await persist(updated);
  }

  function updateProjectTasks(
    projectId: string,
    updater: (tasks: Task[]) => Task[]
  ): AppData {
    const updatedProjects = projects.map((p) => {
      if (p.id !== projectId) return p;
      const newTasks = updater(p.tasks);
      return {
        ...p,
        tasks: newTasks
      };
    });

    return {
      ...data,
      projects: updatedProjects
    };
  }

  async function handleAddTask(name: string) {
    if (!selectedProjectId || !name.trim()) return;

    setSavingTask(true);
    setError(null);

    const newTask: Task = {
      id: generateId(),
      title: name.trim(),
      status: "todo"
    };

    const updated = updateProjectTasks(selectedProjectId, (tasks) => [
      ...tasks,
      newTask
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

    const updated = updateProjectTasks(selectedProjectId, (tasks) =>
      tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    await persist(updated);
  }

  async function handleDeleteTask(taskId: string) {
    if (!selectedProjectId) return;
    setError(null);

    const updated = updateProjectTasks(selectedProjectId, (tasks) =>
      tasks.filter((t) => t.id !== taskId)
    );

    await persist(updated);
  }

  // Rename a project
  async function handleRenameProject(projectId: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return; // ignore empty

    setError(null);

    const updatedProjects = projects.map(p =>
      p.id === projectId ? { ...p, name: trimmed } : p
    );

    const updated: AppData = {
      ...data,
      projects: updatedProjects
    };

    await persist(updated);
  }

  // Rename a task (for the currently selected project)
  async function handleRenameTask(taskId: string, newTitle: string) {
    if (!selectedProjectId) return;

    const trimmed = newTitle.trim();
    if (!trimmed) return; // ignore empty

    setError(null);

    const updated = updateProjectTasks(selectedProjectId, tasks =>
      tasks.map(t =>
        t.id === taskId ? { ...t, title: trimmed } : t
      )
    );

    await persist(updated);
  }

  // SETTINGS actions
  function updateSettings(partial: Partial<AppSettings>) {
    const newSettings: AppSettings = {
      ...settings,
      ...partial
    };

    const updated: AppData = {
      ...data,
      settings: newSettings
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
        backgroundImageDataUrl: result.dataUrl
      });
    } catch (e) {
      console.error(e);
      setError("Failed to choose background image.");
    }
  }

  async function handleClearBackground() {
    updateSettings({
      backgroundImagePath: null,
      backgroundImageDataUrl: null
    });
  }

  async function handleChooseAlarmSound() {
    try {
      const result = await window.api.chooseAlarmSound();
      // Expecting same shape as chooseBackground: { canceled, filePath, dataUrl }
      if (result.canceled || !result.filePath || !result.dataUrl) return;

      updateSettings({
        alarmSoundPath: result.filePath,
        alarmSoundDataUrl: result.dataUrl
      });
    } catch (e) {
      console.error(e);
      setError("Failed to choose alarm sound.");
    }
  }

  async function handleClearAlarmSound() {
    updateSettings({
      alarmSoundPath: null,
      alarmSoundDataUrl: null
    });
  }


  if (loading) {
    return <p className="app-loading">Loading…</p>;
  }

  return (
    <div className="app-background" style={backgroundStyle}>
      {/* inner content container – fully opaque, just sits on top of wallpaper */}
      <div className="app-inner">
        <header className="app-header">
          <div>
            <h1 className="colourChange">Cloud Productivity Dashboard</h1>
          </div>

          {/* Settings button (opens modal) */}
          <div className="app-settings-row">
            <button type="button" onClick={() => setSettingsOpen(true)}>
              Settings…
            </button>
          </div>
        </header>

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
            <TaskPanel
              project={selectedProject}
              tasks={tasks}
              savingTask={savingTask}
              onAddTask={handleAddTask}
              onChangeStatus={handleStatusChange}
              onDeleteTask={handleDeleteTask}
              onRenameTask={handleRenameTask} 
            />
          </section>
        </div>

        {/* Settings Modal */}
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
