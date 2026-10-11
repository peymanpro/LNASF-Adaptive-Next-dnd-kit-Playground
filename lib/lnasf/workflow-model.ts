export type WorkflowEvent = "list:reorder" | "task:reorder" | "task:move";

export interface WorkflowObservation {
  event: WorkflowEvent;
  occurredAt: number;
}

export interface WorkflowSnapshot {
  observations: WorkflowObservation[];
  transitionCounts: Record<string, number>;
}

export const MAX_OBSERVATIONS = 100;

export function observeWorkflowEvent(
  snapshot: WorkflowSnapshot,
  event: WorkflowEvent,
  occurredAt = Date.now(),
): WorkflowSnapshot {
  const observations = [...snapshot.observations, { event, occurredAt }].slice(-MAX_OBSERVATIONS);
  const transitionCounts = { ...snapshot.transitionCounts };

  if (snapshot.observations.length > 0) {
    const previous = snapshot.observations[snapshot.observations.length - 1].event;
    const key = `${previous} -> ${event}`;
    transitionCounts[key] = (transitionCounts[key] ?? 0) + 1;
  }

  return { observations, transitionCounts };
}

export interface WorkflowRecommendation {
  nextEvent: WorkflowEvent;
  confidence: number;
  support: number;
}

export function recommendNextEvent(snapshot: WorkflowSnapshot): WorkflowRecommendation | null {
  const previous = snapshot.observations.at(-1)?.event;
  if (!previous) return null;

  const candidates = Object.entries(snapshot.transitionCounts)
    .filter(([key, count]) => key.startsWith(`${previous} -> `) && count >= 3)
    .map(([key, count]) => ({
      event: key.slice(key.indexOf(" -> ") + 4) as WorkflowEvent,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.event.localeCompare(b.event));

  const total = candidates.reduce((sum, candidate) => sum + candidate.count, 0);
  const best = candidates[0];
  if (!best || total === 0 || best.count / total < 0.65) return null;

  return { nextEvent: best.event, confidence: best.count / total, support: best.count };
}

export const emptyWorkflowSnapshot: WorkflowSnapshot = {
  observations: [],
  transitionCounts: {},
};
