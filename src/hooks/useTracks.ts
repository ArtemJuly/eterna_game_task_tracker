import { goalNodesStore, tasksStore, tracksStore } from './stores';
import type { Track, TrackLink, TrackStage } from '../types';
import { generateId } from '../utils/ids';
import { getStageLevel } from '../utils/trackLevels';

function normalizeStage(s: TrackStage): TrackStage {
  const legacyProjectId = (s as unknown as { projectId?: string | null }).projectId;
  return {
    ...s,
    description: s.description ?? '',
    xp: s.xp ?? 0,
    level: s.level ?? 1,
    projectIds: s.projectIds ?? (legacyProjectId ? [legacyProjectId] : []),
  };
}

function normalizeTrack(t: Track, fallbackPriority: number): Track {
  return {
    ...t,
    goal: t.goal ?? '',
    stages: (t.stages ?? []).map(normalizeStage),
    currentStageIndex: t.currentStageIndex ?? 0,
    status: t.status ?? 'active',
    completedAt: t.completedAt ?? null,
    priority: t.priority ?? fallbackPriority,
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

// A project can be attached to at most one track stage app-wide, so this lookup is unambiguous:
// completing a task inside that project routes its XP to that stage's track automatically.
export function getProjectTrackLink(projectId: string): TrackLink | null {
  const tracks = tracksStore.getSnapshot().map((t, i) => normalizeTrack(t, i));
  for (const track of tracks) {
    for (const stage of track.stages) {
      if (stage.projectIds.includes(projectId)) {
        return { trackId: track.id, stageId: stage.id };
      }
    }
  }
  return null;
}

export function useTracks(): {
  tracks: Track[];
  addTrack: (title: string, goal: string) => void;
  renameTrack: (id: string, title: string) => void;
  setTrackGoal: (id: string, goal: string) => void;
  deleteTrack: (id: string) => void;
  addStage: (trackId: string, title: string, description: string, projectIds: string[]) => void;
  addStages: (trackId: string, stages: { title: string; description: string }[]) => void;
  renameStage: (
    trackId: string,
    stageId: string,
    title: string,
    description: string,
    projectIds: string[],
  ) => void;
  deleteStage: (trackId: string, stageId: string) => void;
  moveStage: (trackId: string, stageId: string, direction: 'up' | 'down') => void;
  advanceStage: (trackId: string) => void;
  completeTrack: (trackId: string) => void;
  moveTrackPriority: (id: string, direction: 'up' | 'down') => void;
  assignProjectsToStages: (assignments: { projectId: string; trackId: string; stageId: string }[]) => void;
} {
  const [rawTracks, setTracks] = tracksStore.useStore();
  const tracks = rawTracks
    .map((t, index) => normalizeTrack(t, index))
    .sort((a, b) => a.priority - b.priority);

  function addTrack(title: string, goal: string) {
    const priority = tracks.length > 0 ? Math.max(...tracks.map((t) => t.priority)) + 1 : 0;
    const track: Track = {
      id: generateId(),
      title,
      goal,
      createdAt: new Date().toISOString(),
      stages: [],
      currentStageIndex: 0,
      status: 'active',
      completedAt: null,
      priority,
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
    const track = tracks.find((t) => t.id === id);
    setTracks((prev) => prev.filter((t) => t.id !== id));
    tasksStore.set((prev) =>
      prev.map((task) => ({
        ...task,
        trackLinks: task.trackLinks.filter((l) => l.trackId !== id),
      })),
    );
    goalNodesStore.set((prev) =>
      prev.map((n) =>
        (n.type === 'track' || n.type === 'trackStage') && n.trackId === id
          ? { ...n, type: 'goal', title: track?.title ?? 'Трек удалён', trackId: null, stageId: null }
          : n,
      ),
    );
  }

  // A project can only be attached to one stage app-wide (XP routing must stay unambiguous),
  // so claiming it here strips it from wherever else it was attached. Operates on raw (unnormalized)
  // store data, so legacy stages saved before `projectIds` existed need the same fallback as normalizeStage.
  function stripProjectsFromOtherStages(prev: Track[], projectIds: string[], keepStageId: string | null): Track[] {
    if (projectIds.length === 0) return prev;
    return prev.map((t) => ({
      ...t,
      stages: t.stages.map((s) => {
        if (s.id === keepStageId) return s;
        const legacyProjectId = (s as unknown as { projectId?: string | null }).projectId;
        const currentIds = s.projectIds ?? (legacyProjectId ? [legacyProjectId] : []);
        return { ...s, projectIds: currentIds.filter((pid) => !projectIds.includes(pid)) };
      }),
    }));
  }

  // Bulk version of the same "strip from elsewhere, then claim" rule used by addStage/renameStage —
  // for applying an AI-suggested project→stage distribution in one action.
  function assignProjectsToStages(assignments: { projectId: string; trackId: string; stageId: string }[]) {
    setTracks((prev) => {
      let next = prev;
      for (const a of assignments) {
        next = stripProjectsFromOtherStages(next, [a.projectId], a.stageId);
        next = next.map((t) =>
          t.id === a.trackId
            ? {
                ...t,
                stages: t.stages.map((s) =>
                  s.id === a.stageId ? { ...s, projectIds: [...(s.projectIds ?? []), a.projectId] } : s,
                ),
              }
            : t,
        );
      }
      return next;
    });
  }

  function addStage(trackId: string, title: string, description: string, projectIds: string[]) {
    setTracks((prev) => {
      const stripped = stripProjectsFromOtherStages(prev, projectIds, null);
      return stripped.map((t) =>
        t.id === trackId
          ? { ...t, stages: [...t.stages, { id: generateId(), title, description, xp: 0, level: 1, projectIds }] }
          : t,
      );
    });
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
                  projectIds: [],
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
    projectIds: string[],
  ) {
    setTracks((prev) => {
      const stripped = stripProjectsFromOtherStages(prev, projectIds, stageId);
      return stripped.map((t) =>
        t.id === trackId
          ? { ...t, stages: t.stages.map((s) => (s.id === stageId ? { ...s, title, description, projectIds } : s)) }
          : t,
      );
    });
  }

  function deleteStage(trackId: string, stageId: string) {
    const stage = tracks.find((t) => t.id === trackId)?.stages.find((s) => s.id === stageId);
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
    goalNodesStore.set((prev) =>
      prev.map((n) =>
        n.type === 'trackStage' && n.trackId === trackId && n.stageId === stageId
          ? { ...n, type: 'goal', title: stage?.title ?? 'Этап удалён', trackId: null, stageId: null }
          : n,
      ),
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

  function moveTrackPriority(id: string, direction: 'up' | 'down') {
    const idx = tracks.findIndex((t) => t.id === id);
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapWith < 0 || swapWith >= tracks.length) return;

    const a = tracks[idx];
    const b = tracks[swapWith];
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === a.id) return { ...t, priority: b.priority };
        if (t.id === b.id) return { ...t, priority: a.priority };
        return t;
      }),
    );
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
    moveTrackPriority,
    assignProjectsToStages,
  };
}
