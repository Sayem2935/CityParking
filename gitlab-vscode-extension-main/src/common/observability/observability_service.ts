import type { Meter, Span, Tracer } from '@opentelemetry/api';

export type { Meter, Span, Tracer };

export interface ObservabilityService {
  isEnabled(): boolean;
  initialize(): Promise<void>;
  getTracer(name: string): Tracer | null;
  getMeter(name: string): Meter | null;
  shutdown(): Promise<void>;
}
