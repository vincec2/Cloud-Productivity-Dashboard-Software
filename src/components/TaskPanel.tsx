// src/components/TaskPanel.tsx
import { useState, type FormEvent } from "react";
import type { Project, Task, TaskStatus } from "../types/global";

export interface TaskPanelProps {
  project: Project | null;
  tasks: Task[];
  savingTask: boolean;
  onAddTask: (name: string) => Promise<void> | void;
  onChangeStatus: (taskId: string, status: TaskStatus) => Promise<void> | void;
  onDeleteTask: (taskId: string) => Promise<void> | void;
  onRenameTask: (taskId: string, newTitle: string) => Promise<void> | void;
}

export function TaskPanel({
  project,
  tasks,
  savingTask,
  onAddTask,
  onChangeStatus,
  onDeleteTask,
  onRenameTask
}: TaskPanelProps) {
  const [newTaskName, setNewTaskName] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    await onAddTask(newTaskName);
    setNewTaskName("");
  }

  async function commitTaskTitle(
    taskId: string,
    oldTitle: string,
    el: HTMLSpanElement
  ) {
    const text = el.innerText.trim();

    if (!text || text === oldTitle) {
      el.innerText = oldTitle;
      return;
    }

    await onRenameTask(taskId, text);
  }

  return (
    <>
      <h2>
        Tasks{" "}
        {project && (
          <span className="taskpanel-heading-sub">
            for <strong>{project.name}</strong>
          </span>
        )}
      </h2>

      {!project && <p>Select a project to see its tasks.</p>}

      {project && (
        <>
          <form onSubmit={handleSubmit} className="taskpanel-form">
            <input
              type="text"
              placeholder="New task name"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="taskpanel-input"
            />
            <button
              type="submit"
              disabled={savingTask || !newTaskName.trim()}
              className="taskpanel-addbutton"
            >
              {savingTask ? "Adding..." : "Add Task"}
            </button>
          </form>

          {tasks.length === 0 ? (
            <p>No tasks yet. Add one above ✧</p>
          ) : (
            <ul className="taskpanel-list">
              {tasks.map((t) => (
                <li key={t.id} className="taskpanel-item">
                  <div>
                    <div>
                      <strong>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => {
                            void commitTaskTitle(t.id, t.title, e.currentTarget);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur(); // triggers commit
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              e.currentTarget.innerText = t.title; // revert
                              e.currentTarget.blur();
                            }
                          }}
                          className="taskpanel-title-editable"
                        >
                          {t.title}
                        </span>
                      </strong>
                    </div>
                  </div>

                  <div className="taskpanel-right">
                    <select
                      value={t.status}
                      onChange={(e) =>
                        onChangeStatus(t.id, e.target.value as TaskStatus)
                      }
                    >
                      <option value="todo">To do</option>
                      <option value="in-progress">In progress</option>
                      <option value="done">Done</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => onDeleteTask(t.id)}
                      className="taskpanel-deletebutton"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
