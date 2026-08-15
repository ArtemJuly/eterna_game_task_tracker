import { tasksStore, tracksStore } from './stores';
import type { Track, TrackLink, TrackStage } from '../types';
import { generateId } from '../utils/ids';
import { getStageLevel } from '../utils/trackLevels';

function normalizeStage(s: TrackStage): TrackStage {
  return {
    ...s,
    description: s.description ?? '',
    xp: s.xp ?? 0,
    level: s.level ?? 1,
    projectId: s.projectId ?? null,
  };
}

function normalizeTrack(t: Track): Track {
  return {
    ...t,
    goal: t.goal ?? '',
    stages: (t.stages ?? []).map(normalizeStage),
    currentStageIndex: t.currentStageIndex ?? 0,
    status: t.status ?? 'active',
    completedAt: t.completedAt ?? null,
  };
}

export function applyTrackXp(trackLinks: TrackLink[], totalXp: number): void {
  if (trackLinks.length === 0 || totalXp === 0) return;
  const share = totalXp / trackLinks.length;

  tracksStore.set((prev) =>
    prev.map((track) => {
      const linksForTrack = trackLinks.filter((l) => l.trackId === track.id);
      if (linksForTrack.length === 0) return track;
      return {
        ...track,
        stages: track.stages.map((stage) => {
          const link = linksForTrack.find((l) => l.stageId === stage.id);
          if (!link) return stage;
          const newXp = stage.xp + Math.round(share);
          return { ...stage, xp: newXp, level: getStageLevel(newXp) };
        }),
      };
    }),
  );
}

export function useTracks(): {
  tracks: Track[];
  addTrack: (title: string, goal: string) => void;
  renameTrack: (id: string, title: string) => void;
  setTrackGoal: (id: string, goal: string) => void;
  deleteTrack: (id: string) => void;
  addStage: (trackId: string, title: string, description: string, projectId: string | null) => void;
  addStages: (trackId: string, stages: { title: string; description: string }[]) => void;
  renameStage: (
    trackId: string,
    stageId: string,
    title: string,
    description: string,
    projectId: string | null,
  ) => void;
  deleteStage: (trackId: string, stageId: string) => void;
  moveStage: (trackId: string, stageId: string, direction: 'up' | 'down') => void;
  advanceStage: (trackId: string) => void;
  completeTrack: (trackId: string) => void;
} {
  const [rawTracks, setTracks] = tracksStore.useStore();
  const tracks = rawTracks.map(normalizeTrack);

  function addTrack(title: string, goal: string) {
    const track: Track = {
      id: generateId(),
      title,
      goal,
      createdAt: new Date().toISOString(),
      stages: [],
      currentStageIndex: 0,
      status: 'active',
      completedAt: null,
    };
    setTracks((prev) => [...prev, track]);
  }

  function renameTrack(id: string, title: string) {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }

  function setTrackGoal(id: string, goal: string) {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, goal } : t)));
  }

  function deleteTrack(id: string) {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    tasksStore.set((prev) =>
      prev.map((task) => ({
        ...task,
        trackLinks: task.trackLinks.filter((l) => l.trackId !== id),
      })),
    );
  }

  function addStage(trackId: string, title: string, description: string, projectId: string | null) {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...t, stages: [...t.stages, { id: generateId(), title, description, xp: 0, level: 1, projectId }] }
          : t,
      ),
    );
  }

  function addStages(trackId: string, stages: { title: string; description: string }[]) {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              stages: [
                ...t.stages,
                ...stages.map((s) => ({
                  id: generateId(),
                  title: s.title,
                  description: s.description,
                  xp: 0,
                  level: 1,
                  projectId: null,
                })),
              ],
            }
          : t,
      ),
    );
  }

  function renameStage(
    trackId: string,
    stageId: string,
    title: string,
    description: string,
    projectId: string | null,
  ) {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...t, stages: t.stages.map((s) => (s.id === stageId ? { ...s, title, description, projectId } : s)) }
          : t,
      ),
    );
  }

  function deleteStage(trackId: string, stageId: string) {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const idx = t.stages.findIndex((s) => s.id === stageId);
        if (idx === -1) return t;
        const newStages = t.stages.filter((s) => s.id !== stageId);
        let newIndex = t.currentStageIndex;
        if (idx < t.currentStageIndex) newIndex -= 1;
        newIndex = Math.max(0, Math.min(newIndex, Math.max(0, newStages.length - 1)));
        return { ...t, stages: newStages, currentStageIndex: newIndex };
      }),
    );
    tasksStore.set((prev) =>
      prev.map((task) => ({
        ...task,
        trackLinks: task.trackLinks.filter((l) => !(l.trackId === trackId && l.stageId === stageId)),
      })),
    );
  }

  function moveStage(trackId: string, stageId: string, direction: 'up' | 'down') {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const idx = t.stages.findIndex((s) => s.id === stageId);
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (idx === -1 || swapWith < 0 || swapWith >= t.stages.length) return t;

        const currentStageId = t.stages[t.currentStageIndex]?.id;
        const stages = [...t.stages];
        [stages[idx], stages[swapWith]] = [stages[swapWith], stages[idx]];
        const newIndex = currentStageId ? stages.findIndex((s) => s.id === currentStageId) : t.currentStageIndex;

        return { ...t, stages, currentStageIndex: newIndex === -1 ? t.currentStageIndex : newIndex };
      }),
    );
  }

  function advanceStage(trackId: string) {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        if (t.currentStageIndex >= t.stages.length - 1) return t;
        return { ...t, currentStageIndex: t.currentStageIndex + 1 };
      }),
    );
  }

  function completeTrack(trackId: string) {
    const completedAt = new Date().toISOString();
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, status: 'done', completedAt } : t)));
  }

  return {
    tracks,
    addTrack,
    renameTrack,
    setTrackGoal,
    deleteTrack,
    addStage,
    addStages,
    renameStage,
    deleteStage,
    moveStage,
    advanceStage,
    completeTrack,
  };
}
