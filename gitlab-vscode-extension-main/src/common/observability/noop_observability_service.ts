import type { Meter, Tracer } from '@opentelemetry/api';
import type { ObservabilityService } from './observability_service';

export class NoopObservabilityService implements ObservabilityService {
  // TODO: implement browser-compatible OTel using @opentelemetry/sdk-trace-web
  // https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/work_items/2288
  isEnabled(): boolean {
    return false;
  }

  async initialize(): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTracer(_name: string): Tracer | null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMeter(_name: string): Meter | null {
    return null;
  }

  async shutdown(): Promise<void> {}
}
