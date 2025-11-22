// src/components/ProjectList.tsx
import { useState, type FormEvent } from "react";
import type { Project } from "../types/global";

function isProjectCompleted(project: Project): boolean {
  return project.tasks.length > 0 && project.tasks.every((t) => t.status === "done");
}

function formatDate(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  savingProject: boolean;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => Promise<void> | void;
  onDeleteProject: (id: string) => Promise<void> | void;
  onRenameProject: (id: string, newName: string) => Promise<void> | void;
}

export function ProjectList({
  projects,
  selectedProjectId,
  savingProject,
  onSelectProject,
  onAddProject,
  onDeleteProject,
  onRenameProject
}: ProjectListProps) {
  const [newName, setNewName] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await onAddProject(newName);
    setNewName("");
  }

  async function commitProjectName(
    projectId: string,
    oldName: string,
    el: HTMLSpanElement
  ) {
    const text = el.innerText.trim();

    if (!text || text === oldName) {
      // revert DOM text if empty or unchanged
      el.innerText = oldName;
      return;
    }

    await onRenameProject(projectId, text);
  }

  return (
    <>
      <h2>Projects</h2>
      <form onSubmit={handleSubmit} className="projectlist-form">
        <input
          type="text"
          placeholder="New project name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="projectlist-input"
        />
        <button
          type="submit"
          disabled={savingProject || !newName.trim()}
          className="projectlist-addbutton"
        >
          {savingProject ? "Adding..." : "Add Project"}
        </button>
      </form>

      {projects.length === 0 ? (
        <p>No projects yet. Add one above ✧</p>
      ) : (
        <ul className="projectlist-list">
          {projects.map((p) => {
            const completed = isProjectCompleted(p);
            const isSelected = p.id === selectedProjectId;

            const selectButtonClass =
              "projectlist-selectbutton" +
              (isSelected
                ? " projectlist-selectbutton--selected"
                : completed
                ? " projectlist-selectbutton--completed"
                : "");

            return (
              <li key={p.id} className="projectlist-item">
                <button
                  type="button"
                  onClick={() => onSelectProject(p.id)}
                  className={selectButtonClass}
                >
                  <div>
                    <div>
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => {
                          void commitProjectName(p.id, p.name, e.currentTarget);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur(); // triggers onBlur -> commit
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            e.currentTarget.innerText = p.name; // revert
                            e.currentTarget.blur();
                          }
                        }}
                        className="projectlist-name"
                      >
                        {p.name}
                      </span>{" "}
                      {completed && (
                        <span className="projectlist-badge">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <small>({formatDate(p.createdAt)})</small>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteProject(p.id)}
                  className="projectlist-deletebutton"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
