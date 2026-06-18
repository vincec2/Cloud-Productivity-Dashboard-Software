// src/components/Focus100Panel.tsx
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Focus100Data, Focus100Task } from "../types/global";

export interface Focus100PanelProps {
  focus100: Focus100Data;
  onChange: (next: Focus100Data) => Promise<void> | void;
}

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

const FOCUS100_GOAL_DAYS = 100;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateToLocalMidnight(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function diffDays(fromDate: string, toDate: string) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(
    (dateToLocalMidnight(toDate) - dateToLocalMidnight(fromDate)) / msPerDay
  );
}

function addDays(dateString: string, amount: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day + amount);
  return localDateString(date);
}

function resetTaskChecks(tasks: Focus100Task[]) {
  return tasks.map((task) => ({ ...task, completed: false }));
}

export function Focus100Panel({ focus100, onChange }: Focus100PanelProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const today = useMemo(() => localDateString(), []);
  const yesterday = useMemo(() => addDays(today, -1), [today]);

  const lastClockInDate = focus100.lastClockInDate ?? today;
  const daysSinceClockIn = focus100.started
    ? diffDays(lastClockInDate, today)
    : 0;

  const needsClockIn =
    focus100.started && !focus100.finishedAt && daysSinceClockIn === 1;

  const missedClockIn =
    focus100.started && !focus100.finishedAt && daysSinceClockIn > 1;

  const progressPercent = Math.min(
    100,
    (focus100.streakDays / FOCUS100_GOAL_DAYS) * 100
  );

  useEffect(() => {
    if (!missedClockIn) return;

    void onChange({
      ...focus100,
      startDate: today,
      lastClockInDate: today,
      lastConfirmedFocusDate: null,
      streakDays: 0,
      finishedAt: null,
      restartCount: (focus100.restartCount ?? 0) + 1,
      lastMessage:
        "What are you doing? You missed your daily clock-in, so Focus 100 restarted.",
      tasks: resetTaskChecks(focus100.tasks)
    });
  }, [focus100, missedClockIn, onChange, today]);

  function startChallenge() {
    void onChange({
      ...focus100,
      started: true,
      startDate: today,
      lastClockInDate: today,
      lastConfirmedFocusDate: null,
      streakDays: 0,
      finishedAt: null,
      lastMessage: "Focus 100 started. No ending it now.",
      tasks: focus100.tasks ?? []
    });
  }

  function startNewChallenge() {
    void onChange({
      ...focus100,
      started: true,
      startDate: today,
      lastClockInDate: today,
      lastConfirmedFocusDate: null,
      streakDays: 0,
      finishedAt: null,
      restartCount: 0,
      lastMessage: "New Focus 100 challenge started. Lock in again.",
      tasks: resetTaskChecks(focus100.tasks)
    });
  }

  function handleFocusedYesterday() {
    const nextStreakDays = Math.min(
      focus100.streakDays + 1,
      FOCUS100_GOAL_DAYS
    );

    const finishedAt = nextStreakDays >= FOCUS100_GOAL_DAYS ? today : null;

    void onChange({
      ...focus100,
      lastClockInDate: today,
      lastConfirmedFocusDate: yesterday,
      streakDays: nextStreakDays,
      finishedAt,
      lastMessage: finishedAt
        ? "You completed Focus 100. Actually locked in."
        : `Good. Day ${nextStreakDays} confirmed. Keep going.`,
      tasks: resetTaskChecks(focus100.tasks)
    });
  }

  function handleNotFocusedYesterday() {
    void onChange({
      ...focus100,
      startDate: today,
      lastClockInDate: today,
      lastConfirmedFocusDate: null,
      streakDays: 0,
      finishedAt: null,
      restartCount: (focus100.restartCount ?? 0) + 1,
      lastMessage: "What are you doing? Focus 100 restarted.",
      tasks: resetTaskChecks(focus100.tasks)
    });
  }

  function handleAddFocusTask(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    const newTask: Focus100Task = {
      id: generateId(),
      title: trimmed,
      completed: false
    };

    void onChange({
      ...focus100,
      tasks: [...focus100.tasks, newTask]
    });

    setNewTaskTitle("");
  }

  function toggleFocusTask(taskId: string) {
    void onChange({
      ...focus100,
      tasks: focus100.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    });
  }

  function deleteFocusTask(taskId: string) {
    void onChange({
      ...focus100,
      tasks: focus100.tasks.filter((task) => task.id !== taskId)
    });
  }

  function renameFocusTask(
    taskId: string,
    oldTitle: string,
    el: HTMLSpanElement
  ) {
    const trimmed = el.innerText.trim();

    if (!trimmed || trimmed === oldTitle) {
      el.innerText = oldTitle;
      return;
    }

    void onChange({
      ...focus100,
      tasks: focus100.tasks.map((task) =>
        task.id === taskId ? { ...task, title: trimmed } : task
      )
    });
  }

  if (!focus100.started) {
    return (
      <div className="focus100-panel">
        <h2 className="colourChange">Focus 100</h2>
        <div className="focus100-card focus100-start-card">
          <p>
            This starts a 100-day focus challenge. Once you start, there is no
            end button. Every day you must clock in and confirm whether you
            focused for the previous day.
          </p>
          <button
            type="button"
            className="focus100-primary-button"
            onClick={startChallenge}
          >
            Start Focus 100
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="focus100-panel">
      <h2 className="colourChange">Focus 100</h2>

      {focus100.lastMessage && (
        <div className="focus100-message">{focus100.lastMessage}</div>
      )}

      {needsClockIn && (
        <div className="focus100-card focus100-checkin-card">
          <h3>Daily clock-in</h3>
          <p>Did you focus the whole day yesterday?</p>
          <div className="focus100-button-row">
            <button
              type="button"
              className="focus100-primary-button"
              onClick={handleFocusedYesterday}
            >
              Yes
            </button>
            <button
              type="button"
              className="focus100-danger-button"
              onClick={handleNotFocusedYesterday}
            >
              No
            </button>
          </div>
        </div>
      )}

      <div className="focus100-card">
        <div className="focus100-stats">
          <div>
            <span className="focus100-stat-number">{focus100.streakDays}</span>
            <span className="focus100-stat-label">/ {FOCUS100_GOAL_DAYS} days</span>
          </div>
          <div className="focus100-small-text">
            Started: {focus100.startDate ?? "—"}
            <br />
            Restarts: {focus100.restartCount ?? 0}
          </div>
        </div>

        <div className="focus100-progress-track">
          <div
            className="focus100-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {focus100.finishedAt && (
          <div className="focus100-finished-box">
            <p className="focus100-finished-text">
              Completed on {focus100.finishedAt}. You made it through all{" "}
              {FOCUS100_GOAL_DAYS} days.
            </p>

            <button
              type="button"
              className="focus100-primary-button"
              onClick={startNewChallenge}
            >
              Start another Focus 100
            </button>
          </div>
        )}
      </div>

      <div className="focus100-card">
        <h3>Productive task list</h3>
        <form className="focus100-form" onSubmit={handleAddFocusTask}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add something productive"
            className="focus100-input"
          />
          <button
            type="submit"
            className="focus100-add-button"
            disabled={!newTaskTitle.trim()}
          >
            Add
          </button>
        </form>

        {focus100.tasks.length === 0 ? (
          <p className="focus100-small-text">
            Add tasks like study, apply to jobs, clean, code, workout, read, or
            anything else that counts as productive.
          </p>
        ) : (
          <ul className="focus100-task-list">
            {focus100.tasks.map((task) => (
              <li key={task.id} className="focus100-task-item">
                <label className="focus100-task-left">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleFocusTask(task.id)}
                  />
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      renameFocusTask(task.id, task.title, e.currentTarget)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        e.currentTarget.innerText = task.title;
                        e.currentTarget.blur();
                      }
                    }}
                    className={
                      task.completed
                        ? "focus100-task-title focus100-task-title--completed"
                        : "focus100-task-title"
                    }
                  >
                    {task.title}
                  </span>
                </label>
                <button
                  type="button"
                  className="focus100-delete-button"
                  onClick={() => deleteFocusTask(task.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
