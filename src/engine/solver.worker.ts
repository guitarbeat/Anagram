import { solveAnagrams, type SolveOptions, type AnagramResult, type SolveMetrics } from './solver';

export interface WorkerRequest {
  id: number;
  opts: SolveOptions;
}

export interface WorkerSuccessResponse {
  id: number;
  results: AnagramResult[];
  metrics: SolveMetrics;
  error?: undefined;
}

export interface WorkerErrorResponse {
  id: number;
  error: string;
  results?: undefined;
  metrics?: undefined;
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { id, opts } = event.data;
  try {
    const { results, metrics } = solveAnagrams(opts);
    const response: WorkerSuccessResponse = {
      id,
      results,
      metrics,
    };
    self.postMessage(response);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown solver error';
    const response: WorkerErrorResponse = {
      id,
      error: errorMessage,
    };
    self.postMessage(response);
  }
});
