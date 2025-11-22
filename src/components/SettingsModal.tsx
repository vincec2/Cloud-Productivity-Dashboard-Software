// src/components/SettingsModal.tsx
import { useState, type CSSProperties, type MouseEvent } from "react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  backgroundImagePath: string | null;
  backgroundImageDataUrl: string | null;
  onChooseBackground: () => Promise<void> | void;
  onClearBackground: () => Promise<void> | void;

  usePomodoro: boolean;
  pomodoroWorkMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroCyclesBeforeLongBreak: number;
  onPomodoroChange: (partial: {
    usePomodoro?: boolean;
    pomodoroWorkMinutes?: number;
    pomodoroShortBreakMinutes?: number;
    pomodoroLongBreakMinutes?: number;
    pomodoroCyclesBeforeLongBreak?: number;
  }) => void;

  alarmSoundPath: string | null;
  onChooseAlarmSound: () => Promise<void> | void;
  onClearAlarmSound: () => Promise<void> | void;

  fontColor: string;
  onFontColorChange: (color: string) => void;
}

export function SettingsModal({
  open,
  onClose,
  backgroundImagePath,
  backgroundImageDataUrl,
  onChooseBackground,
  onClearBackground,
  usePomodoro,
  pomodoroWorkMinutes,
  pomodoroShortBreakMinutes,
  pomodoroLongBreakMinutes,
  pomodoroCyclesBeforeLongBreak,
  onPomodoroChange,
  alarmSoundPath,
  onChooseAlarmSound,
  onClearAlarmSound,
  fontColor,
  onFontColorChange
}: SettingsModalProps) {
  // "tabs": background vs alarm vs pomodoro
  const [activeTab, setActiveTab] = useState<
  "background" | "alarm" | "pomodoro"
>("background");

  if (!open) return null;

  const previewClassName = backgroundImageDataUrl
    ? "settings-preview settings-preview--image"
    : "settings-preview settings-preview--empty";

  const previewStyle: CSSProperties = backgroundImageDataUrl
    ? {
        backgroundImage: `url("${backgroundImageDataUrl}")`
      }
    : {};

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    // only close if the actual backdrop (not children) was clicked
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="settings-backdrop" onClick={handleBackdropClick}>
      <div className="settings-modal">
        <h2>Settings</h2>

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            type="button"
            className={
              "settings-tab-button" +
              (activeTab === "background"
                ? " settings-tab-button--active"
                : "")
            }
            onClick={() => setActiveTab("background")}
          >
            Set background
          </button>

          <button
            type="button"
            className={
              "settings-tab-button" +
              (activeTab === "alarm"
                ? " settings-tab-button--active"
                : "")
            }
            onClick={() => setActiveTab("alarm")}
          >
            Alarm sound
          </button>

          <button
            type="button"
            className={
              "settings-tab-button" +
              (activeTab === "pomodoro"
                ? " settings-tab-button--active"
                : "")
            }
            onClick={() => setActiveTab("pomodoro")}
          >
            Pomodoro settings
          </button>
        </div>

        {/* Background tab content */}
        {activeTab === "background" && (
          <section className="settings-section">
            <h3 className="settings-section-title">Background</h3>
            <p className="settings-body-text">
              Choose a PNG, JPG, or JPEG image to use as the dashboard wallpaper.
            </p>

            <div className="settings-preview-wrapper">
              <div className={previewClassName} style={previewStyle}>
                {!backgroundImageDataUrl && <>No background selected.</>}
              </div>
            </div>

            <div className="settings-buttons-column">
              <button
                type="button"
                onClick={() => void onChooseBackground()}
              >
                Choose background…
              </button>

              {backgroundImagePath && (
                <>
                  <div className="settings-current-file">
                    Current file:
                    <br />
                    {backgroundImagePath}
                  </div>

                  <button
                    type="button"
                    onClick={() => void onClearBackground()}
                  >
                    Clear background
                  </button>
                </>
              )}
            </div>
            <div className="settings-fontcolor">
              <label className="settings-fontcolor-label">
                Font colour
                <input
                  type="color"
                  value={fontColor}
                  onChange={e => onFontColorChange(e.target.value)}
                  className="settings-fontcolor-input"
                />
              </label>
            </div>
          </section>
        )}

        {/* Alarm tab */}
        {activeTab === "alarm" && (
          <section className="settings-section">
            <h3 className="settings-section-title">Alarm sound</h3>
            <p className="settings-body-text">
              Choose an MP3 or WAV file to play whenever the timer reaches 0.
            </p>

            <div className="settings-buttons-column">
              <button
                type="button"
                onClick={() => void onChooseAlarmSound()}
              >
                Choose alarm sound…
              </button>

              {alarmSoundPath && (
                <>
                  <div className="settings-current-file">
                    Current sound:
                    <br />
                    {alarmSoundPath}
                  </div>

                  <button
                    type="button"
                    onClick={() => void onClearAlarmSound()}
                  >
                    Clear alarm sound
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {/* Pomodoro tab content */}
        {activeTab === "pomodoro" && (
          <section className="settings-section settings-section--pomodoro">
            <h3 className="settings-section-title">Pomodoro timer</h3>

            <label className="settings-pomodoro-label">
              <input
                type="checkbox"
                checked={usePomodoro}
                onChange={e =>
                  onPomodoroChange({ usePomodoro: e.target.checked })
                }
              />
              Use Pomodoro mode (work / break cycles)
            </label>

            <div className="settings-pomodoro-grid">
              <label className="settings-pomodoro-input-wrapper">
                Work (minutes)
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={pomodoroWorkMinutes}
                  onChange={e =>
                    onPomodoroChange({
                      pomodoroWorkMinutes: Number(e.target.value) || 0
                    })
                  }
                  className="settings-pomodoro-input"
                />
              </label>

              <label className="settings-pomodoro-input-wrapper">
                Short break (minutes)
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={pomodoroShortBreakMinutes}
                  onChange={e =>
                    onPomodoroChange({
                      pomodoroShortBreakMinutes:
                        Number(e.target.value) || 0
                    })
                  }
                  className="settings-pomodoro-input"
                />
              </label>

              <label className="settings-pomodoro-input-wrapper">
                Long break (minutes)
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={pomodoroLongBreakMinutes}
                  onChange={e =>
                    onPomodoroChange({
                      pomodoroLongBreakMinutes:
                        Number(e.target.value) || 0
                    })
                  }
                  className="settings-pomodoro-input"
                />
              </label>

              <label className="settings-pomodoro-input-wrapper">
                Sessions before long break
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={pomodoroCyclesBeforeLongBreak}
                  onChange={e =>
                    onPomodoroChange({
                      pomodoroCyclesBeforeLongBreak:
                        Number(e.target.value) || 0
                    })
                  }
                  className="settings-pomodoro-input"
                />
              </label>
            </div>
          </section>
        )}

        <div className="settings-footer">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
