"use client";

import { useEffect, useState } from "react";

import { localDateKey } from "@/features/tasks/date-utils";
import { useTasks } from "@/features/tasks/use-tasks";
import { notify } from "@/providers/notification-provider";
import type { Task } from "@/types/productivity";

const FIRED_KEY = "flowy:tab-reminders";
/** A reminder found a little late (the tab was asleep) still shows. */
const LATE_MS = 10 * 60 * 1000;

type DueTask = Pick<Task, "id" | "title" | "status" | "due_date" | "due_time">;

/** The moment a task is due on this device's clock, or null without a time. */
function dueAt(task: DueTask) {
  if (!task.due_date || !task.due_time) return null;
  return new Date(`${task.due_date}T${task.due_time.slice(0, 5)}:00`);
}

/** Tasks of today whose time came in the last 10 minutes and were not shown yet. */
export function dueInTab(tasks: DueTask[], now: Date, fired: Set<string>) {
  const today = localDateKey(now);
  return tasks.filter((task) => {
    const at = dueAt(task);
    if (!at || task.status === "completed" || task.due_date !== today) return false;
    const late = now.getTime() - at.getTime();
    return late >= 0 && late < LATE_MS && !fired.has(firedId(task));
  });
}

export function firedId(task: DueTask) {
  return `${task.id}@${task.due_date}T${task.due_time?.slice(0, 5)}`;
}

function readFired(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(FIRED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveFired(fired: Set<string>) {
  try {
    window.localStorage.setItem(FIRED_KEY, JSON.stringify([...fired].slice(-100)));
  } catch {
    // Private mode: at worst a reminder shows again after a reload.
  }
}

function chime() {
  try {
    const audio = new AudioContext();
    const gain = audio.createGain();
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.9);
    [880, 1318.5].forEach((frequency, index) => {
      const tone = audio.createOscillator();
      tone.frequency.value = frequency;
      tone.connect(gain);
      tone.start(audio.currentTime + index * 0.15);
      tone.stop(audio.currentTime + 0.9);
    });
  } catch {
    // No sound allowed yet (no click on the page): the banner still shows.
  }
}

async function show(task: DueTask) {
  const time = task.due_time!.slice(0, 5);
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      const options = { body: `Agora · ${time}`, tag: `task-${task.id}`, icon: "/icon-192.png", data: { url: "/app?view=today" } };
      if (registration) await registration.showNotification(task.title, options);
      else new Notification(task.title, options);
    } catch {
      // Falls back to the banner below.
    }
  }
  notify(`🔔 ${task.title} · ${time}`);
  chime();
}

/** Whether this browser is subscribed to push (then the server already reminds). */
async function hasPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * Reminders for browsers that cannot receive push (Brave, Vivaldi, DuckDuckGo,
 * a Firefox private window…): while Flowy is open in a tab or window, each task
 * of today shows a notification at its time, with a sound and a banner.
 */
export function TabReminders() {
  const [pushHere, setPushHere] = useState<boolean | null>(null);
  const today = useTasks({ scope: "today" });
  const tasks = today.data;

  useEffect(() => {
    let active = true;
    void hasPush().then((value) => {
      if (active) setPushHere(value);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (pushHere !== false || !tasks) return;
    const tick = () => {
      const fired = readFired();
      const due = dueInTab(tasks, new Date(), fired);
      if (!due.length) return;
      due.forEach((task) => fired.add(firedId(task)));
      saveFired(fired);
      due.forEach((task) => void show(task));
    };
    tick();
    const timer = window.setInterval(tick, 20_000);
    return () => window.clearInterval(timer);
  }, [pushHere, tasks]);

  return null;
}
