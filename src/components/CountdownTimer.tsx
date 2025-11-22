// src/components/CountdownTimer.tsx
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import breakGif from '../assets/images/spongebobbreak.gif';

function splitHMS(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return { hours, minutes, seconds };
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

interface CountdownTimerProps {
  usePomodoro: boolean;
  pomodoroWorkSeconds: number;
  pomodoroShortBreakSeconds: number;
  pomodoroLongBreakSeconds: number;
  pomodoroCyclesBeforeLongBreak: number;
  alarmSoundDataUrl?: string | null;
}

export function CountdownTimer({
  usePomodoro,
  pomodoroWorkSeconds,
  pomodoroShortBreakSeconds,
  pomodoroLongBreakSeconds,
  pomodoroCyclesBeforeLongBreak,
  alarmSoundDataUrl
}: CountdownTimerProps) {
  // Classic countdown state
  const [initialSeconds, setInitialSeconds] = useState(60 * 60); // default 1h
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);

  // Pomodoro state
  const [currentPhase, setCurrentPhase] = useState<
    "idle" | "work" | "shortBreak" | "longBreak"
  >("idle");
  const [completedWorkSessions, setCompletedWorkSessions] = useState(0);
  const [showBreakPopup, setShowBreakPopup] = useState(false);
  const [showWorkPopup, setShowWorkPopup] = useState(false);


  const hoursRef = useRef<HTMLSpanElement | null>(null);
  const minutesRef = useRef<HTMLSpanElement | null>(null);
  const secondsRef = useRef<HTMLSpanElement | null>(null);

  // Choose what to display:
  // - Pomodoro: remaining or next work duration
  // - Normal: remaining or configured initial duration
  let displaySeconds: number;
  if (usePomodoro) {
    displaySeconds =
      remainingSeconds > 0 ? remainingSeconds : pomodoroWorkSeconds;
  } else {
    if (remainingSeconds > 0) {
      // actively counting down or paused mid-way
      displaySeconds = remainingSeconds;
    } else if (!hasStartedOnce) {
      // never actually started yet → show configured initial time
      displaySeconds = initialSeconds;
    } else {
      // finished a run → stay at 0
      displaySeconds = 0;
    }
  }


  const { hours, minutes, seconds } = splitHMS(displaySeconds);

  const isActive = remainingSeconds > 0;
  const canEdit = !isRunning && !usePomodoro; // ⬅ disable editing in Pomodoro mode
  const canPause = isRunning && isActive;
  const canResume = !isRunning && isActive && hasStartedOnce;
  const canReset = usePomodoro
    ? isActive || hasStartedOnce
    : isActive || initialSeconds > 0;

  const canStartOrRestart = usePomodoro
    ? !isRunning && pomodoroWorkSeconds > 0
    : !isRunning && initialSeconds > 0;

  const startLabel = hasStartedOnce ? "Restart" : "Start";

    const alarmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!alarmSoundDataUrl) {
      alarmRef.current = null;
      return;
    }
    alarmRef.current = new Audio(alarmSoundDataUrl);
  }, [alarmSoundDataUrl]);

  function playAlarm() {
    if (!alarmRef.current) return;
    try {
      alarmRef.current.currentTime = 0;
      void alarmRef.current.play();
    } catch {
      // ignore play errors (e.g., user hasn't interacted yet)
    }
  }

  // Tick every second while running
  useEffect(() => {
    if (!isRunning) return;

    const id = window.setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
            // alarm whenever we hit 0
            playAlarm();

          if (!usePomodoro) {
            setIsRunning(false);
            return 0;
          }

          // Pomodoro phase transitions
          if (currentPhase === "work") {
            const nextCount = completedWorkSessions + 1;
            setCompletedWorkSessions(nextCount);
            setShowWorkPopup(false);
            setShowBreakPopup(true);

            if (
              pomodoroCyclesBeforeLongBreak > 0 &&
              nextCount % pomodoroCyclesBeforeLongBreak === 0
            ) {
              setCurrentPhase("longBreak");
              return pomodoroLongBreakSeconds;
            } else {
              setCurrentPhase("shortBreak");
              return pomodoroShortBreakSeconds;
            }
          } else if (
            currentPhase === "shortBreak" ||
            currentPhase === "longBreak"
          ) {
            setCurrentPhase("work");
            setShowBreakPopup(false);
            setShowWorkPopup(true);
            return pomodoroWorkSeconds;
          } else {
            // idle → start fresh work session
            setCurrentPhase("work");
            return pomodoroWorkSeconds;
          }
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [
    isRunning,
    usePomodoro,
    currentPhase,
    completedWorkSessions,
    pomodoroWorkSeconds,
    pomodoroShortBreakSeconds,
    pomodoroLongBreakSeconds,
    pomodoroCyclesBeforeLongBreak
  ]);

  function commitFromDom() {
    if (usePomodoro) return; // no inline editing in pomodoro mode
    const prev = splitHMS(displaySeconds);

    const rawH = (hoursRef.current?.innerText ?? "").trim();
    const rawM = (minutesRef.current?.innerText ?? "").trim();
    const rawS = (secondsRef.current?.innerText ?? "").trim();

    const parsedHours = rawH === "" ? prev.hours : Number(rawH);
    const parsedMinutes = rawM === "" ? prev.minutes : Number(rawM);
    const parsedSeconds = rawS === "" ? prev.seconds : Number(rawS);

    const invalid =
      !Number.isFinite(parsedHours) ||
      !Number.isFinite(parsedMinutes) ||
      !Number.isFinite(parsedSeconds) ||
      parsedHours < 0 ||
      parsedMinutes < 0 ||
      parsedMinutes > 59 ||
      parsedSeconds < 0 ||
      parsedSeconds > 59;

    if (invalid) {
      // revert to previous display
      if (hoursRef.current) hoursRef.current.innerText = pad2(prev.hours);
      if (minutesRef.current)
        minutesRef.current.innerText = pad2(prev.minutes);
      if (secondsRef.current)
        secondsRef.current.innerText = pad2(prev.seconds);
      return;
    }

    const totalSeconds =
      parsedHours * 3600 + parsedMinutes * 60 + parsedSeconds;

    setInitialSeconds(totalSeconds);
    setRemainingSeconds(totalSeconds);
    setHasStartedOnce(false); // new config = fresh start

    // Normalize to HH:MM:SS with padding
    if (hoursRef.current) hoursRef.current.innerText = pad2(parsedHours);
    if (minutesRef.current) minutesRef.current.innerText = pad2(parsedMinutes);
    if (secondsRef.current) secondsRef.current.innerText = pad2(parsedSeconds);
  }

  function handleBlur() {
    if (!canEdit) return;
    commitFromDom();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLSpanElement>) {
    if (!canEdit) return;

    if (e.key === "Enter") {
      e.preventDefault();
      commitFromDom();
      (e.currentTarget as HTMLElement).blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      const current = splitHMS(displaySeconds);
      if (hoursRef.current) hoursRef.current.innerText = pad2(current.hours);
      if (minutesRef.current)
        minutesRef.current.innerText = pad2(current.minutes);
      if (secondsRef.current)
        secondsRef.current.innerText = pad2(current.seconds);
      (e.currentTarget as HTMLElement).blur();
    }
  }

  function handleStartOrRestart() {
    if (usePomodoro) {
      if (pomodoroWorkSeconds <= 0) return;
      setCurrentPhase("work");
      setCompletedWorkSessions(0);
      setRemainingSeconds(pomodoroWorkSeconds);
      setIsRunning(true);
      setHasStartedOnce(true);
    } else {
      if (initialSeconds <= 0) return;
      setRemainingSeconds(initialSeconds);
      setIsRunning(true);
      setHasStartedOnce(true);
    }
  }

  function handlePause() {
    if (!canPause) return;
    setIsRunning(false);
  }

  function handleResume() {
    if (!canResume) return;
    setIsRunning(true);
  }

  function handleReset() {
    if (!canReset) return;
    setIsRunning(false);
    setHasStartedOnce(false);

    if (usePomodoro) {
      setCurrentPhase("idle");
      setCompletedWorkSessions(0);
      setRemainingSeconds(0);
      // display will show next work session duration
    } else {
      setInitialSeconds(0);
      setRemainingSeconds(0);
      if (hoursRef.current) hoursRef.current.innerText = "00";
      if (minutesRef.current) minutesRef.current.innerText = "00";
      if (secondsRef.current) secondsRef.current.innerText = "00";
    }
  }

  function handleBackdropClick(
    e: React.MouseEvent<HTMLDivElement>
  ) {
    // only close if user clicked the backdrop, not the popup itself
    if (e.target === e.currentTarget) {
      setShowBreakPopup(false);
      setShowWorkPopup(false);
    }
  }


  return (
    <section className={`timer-section ${currentPhase === "shortBreak" || currentPhase === "longBreak" ? "break" : ""}`}>
      {/* Time display: HH:MM:SS, colons static, digits inline-editable (non-Pomodoro only) */}
      <div className="timer-display">
        <span
          ref={hoursRef}
          contentEditable={canEdit}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={
            "timer-display-part" +
            (canEdit ? " timer-display-part--editable" : "")
          }
        >
          {pad2(hours)}
        </span>
        <span>:</span>
        <span
          ref={minutesRef}
          contentEditable={canEdit}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={
            "timer-display-part" +
            (canEdit ? " timer-display-part--editable" : "")
          }
        >
          {pad2(minutes)}
        </span>
        <span>:</span>
        <span
          ref={secondsRef}
          contentEditable={canEdit}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={
            "timer-display-part" +
            (canEdit ? " timer-display-part--editable" : "")
          }
        >
          {pad2(seconds)}
        </span>
      </div>

      {/* Controls */}
      <div className="timer-controls">
        <button
          type="button"
          onClick={handleStartOrRestart}
          disabled={!canStartOrRestart}
          className="timer-button"
        >
          {startLabel}
        </button>

        <button
          type="button"
          onClick={handlePause}
          disabled={!canPause}
          className="timer-button"
        >
          Pause
        </button>

        <button
          type="button"
          onClick={handleResume}
          disabled={!canResume}
          className="timer-button"
        >
          Resume
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={!canReset}
          className="timer-button"
        >
          Reset
        </button>
      </div>
      {usePomodoro &&
        showBreakPopup &&
        (currentPhase === "shortBreak" || currentPhase === "longBreak") && (
          <div
            className="break-backdrop"
            onClick={handleBackdropClick}
          >
            <div
              className="break-modal"
              onClick={e => e.stopPropagation()}
            >
              <img className="break-gif" src={breakGif} alt="break gif"/>
              <h3 className="break-modal-text">Break time!</h3>
              <div className="break-modal-button-row">
                <button
                  type="button"
                  className="break-modal-button"
                  onClick={() => setShowBreakPopup(false)}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      {usePomodoro &&
        showWorkPopup &&
        (currentPhase === "work") && (
          <div
            className="work-backdrop"
            onClick={handleBackdropClick}
          >
            <div
              className="work-modal"
              onClick={e => e.stopPropagation()}
            >
              <img className="" src="" alt=""/>
              <h3 className="work-modal-text">Time to Work...</h3>
              <div className="work-modal-button-row">
                <button
                  type="button"
                  className="work-modal-button"
                  onClick={() => setShowWorkPopup(false)}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}
