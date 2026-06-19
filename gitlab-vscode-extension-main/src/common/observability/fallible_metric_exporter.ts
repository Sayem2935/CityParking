import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import type { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { FixedTimeCircuitBreaker, MaxAttemptsCircuitBreaker } from '@gitlab-org/gitlab-lsp';
import { log } from '../log';

const DEFAULT_FAILURE_THRESHOLD = 3;

/**
 * Wraps a {@link PushMetricExporter} with a circuit breaker that permanently
 * disables export after a configurable number of consecutive failures.
 *
 * This prevents indefinite error logging when the OTLP endpoint is unreachable
 * (e.g. blocked by a customer firewall).
 */
export class FallibleMetricExporter implements PushMetricExporter {
  readonly #inner: PushMetricExporter;

  readonly #circuit: MaxAttemptsCircuitBreaker;

  constructor(inner: PushMetricExporter, failureThreshold = DEFAULT_FAILURE_THRESHOLD) {
    this.#inner = inner;
    this.#circuit = new MaxAttemptsCircuitBreaker(
      new FixedTimeCircuitBreaker(failureThreshold, 3000),
      failureThreshold,
    );
    this.selectAggregationTemporality = this.#inner.selectAggregationTemporality?.bind(this.#inner);
    this.selectAggregation = this.#inner.selectAggregation?.bind(this.#inner);

    this.#circuit.onReachedMaxAttempts(() =>
      log.warn(
        `[FallibleMetricExporter] OTel metric export failed ${failureThreshold} consecutive times. ` +
          'Disabling further export attempts. The OTLP endpoint may be blocked by a firewall.',
      ),
    );
  }

  export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
    if (this.#circuit.isOpen()) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    this.#inner.export(metrics, result => {
      if (result.code === ExportResultCode.FAILED) {
        this.#circuit.error();
      } else {
        this.#circuit.success();
      }

      resultCallback(result);
    });
  }

  readonly selectAggregationTemporality: PushMetricExporter['selectAggregationTemporality'];

  readonly selectAggregation: PushMetricExporter['selectAggregation'];

  forceFlush(): Promise<void> {
    return this.#inner.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.#inner.shutdown();
  }
}
