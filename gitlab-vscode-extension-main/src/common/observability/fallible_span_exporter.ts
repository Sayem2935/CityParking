import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { FixedTimeCircuitBreaker, MaxAttemptsCircuitBreaker } from '@gitlab-org/gitlab-lsp';
import { log } from '../log';

const DEFAULT_FAILURE_THRESHOLD = 3;

/**
 * Wraps a {@link SpanExporter} with a circuit breaker that permanently
 * disables export after a configurable number of consecutive failures.
 *
 * This prevents indefinite error logging when the OTLP endpoint is unreachable
 * (e.g. blocked by a customer firewall).
 */
export class FallibleSpanExporter implements SpanExporter {
  readonly #inner: SpanExporter;

  readonly #circuit: MaxAttemptsCircuitBreaker;

  constructor(inner: SpanExporter, failureThreshold = DEFAULT_FAILURE_THRESHOLD) {
    this.#inner = inner;
    this.#circuit = new MaxAttemptsCircuitBreaker(
      new FixedTimeCircuitBreaker(failureThreshold, 3000),
      failureThreshold,
    );
    this.#circuit.onReachedMaxAttempts(() =>
      log.warn(
        `[FallibleSpanExporter] OTel span export failed ${failureThreshold} consecutive times. ` +
          'Disabling further export attempts. The OTLP endpoint may be blocked by a firewall.',
      ),
    );
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this.#circuit.isOpen()) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    this.#inner.export(spans, result => {
      if (result.code === ExportResultCode.FAILED) {
        this.#circuit.error();
      } else {
        this.#circuit.success();
      }

      resultCallback(result);
    });
  }

  forceFlush(): Promise<void> {
    return this.#inner.forceFlush?.() ?? Promise.resolve();
  }

  shutdown(): Promise<void> {
    return this.#inner.shutdown();
  }
}
