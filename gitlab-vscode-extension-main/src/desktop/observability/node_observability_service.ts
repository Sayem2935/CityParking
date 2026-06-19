import { NodeSDK } from '@opentelemetry/sdk-node';
import { metrics, trace } from '@opentelemetry/api';
import type { Meter, Tracer } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import * as vscode from 'vscode';
import type { ObservabilityService } from '../../common/observability/observability_service';
import { log } from '../../common/log';
import { FallibleMetricExporter, FallibleSpanExporter } from '../../common/observability';
import { getClientContext } from '../language_server/get_client_context';

const SERVICE_NAME = 'gitlab-vscode-extension';
const DEFAULT_OTLP_BASE_URL = 'https://67713089.otel.gitlab-o11y.com:14318';
export const OTLP_ENDPOINT_CONFIG_KEY = 'gitlab.telemetry.otlpEndpointUrl';
function getOtlpBaseUrl(): string {
  return (
    vscode.workspace.getConfiguration().get<string>(OTLP_ENDPOINT_CONFIG_KEY) ||
    DEFAULT_OTLP_BASE_URL
  );
}

export class NodeObservabilityService implements ObservabilityService {
  #sdk: NodeSDK | undefined;

  isEnabled(): boolean {
    return vscode.env.isTelemetryEnabled;
  }

  async initialize(): Promise<void> {
    if (this.#sdk) {
      log.warn('[NodeObservabilityService] OpenTelemetry SDK already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.debug('[NodeObservabilityService] Telemetry disabled, skipping OTel initialization');
      return;
    }

    const baseUrl = getOtlpBaseUrl();
    const { ide, extension } = getClientContext();

    try {
      const traceExporter = new FallibleSpanExporter(
        new OTLPTraceExporter({
          url: `${baseUrl}/v1/traces`,
          timeoutMillis: 5000,
        }),
      );

      const spanProcessor = new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 100,
        scheduledDelayMillis: 500,
        exportTimeoutMillis: 5000,
        maxExportBatchSize: 50,
      });

      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: SERVICE_NAME,
        'gitlab.project.id': '5261717',
        'gitlab.project.name': 'GitLab Workflow',
        ide_name: ide.name,
        ide_vendor: ide.vendor,
        ide_version: ide.version,
        extension_name: extension.name,
        extension_version: extension.version ?? 'unknown',
        os: process.platform,
        remote_name: vscode.env.remoteName ?? 'local',
      });

      const metricExporter = new FallibleMetricExporter(
        new OTLPMetricExporter({
          url: `${baseUrl}/v1/metrics`,
          timeoutMillis: 5000,
        }),
      );

      this.#sdk = new NodeSDK({
        resource,
        spanProcessors: [spanProcessor],
        metricReader: new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 60000,
        }),
      });

      this.#sdk.start();

      log.debug(`[NodeObservabilityService] OpenTelemetry SDK initialized (base URL: ${baseUrl})`);
    } catch (error) {
      log.error('[NodeObservabilityService] Failed to initialize OpenTelemetry SDK:', error);
      throw error;
    }
  }

  getTracer(name: string): Tracer | null {
    if (!this.isEnabled()) {
      return null;
    }
    return trace.getTracer(name);
  }

  getMeter(name: string): Meter | null {
    if (!this.isEnabled()) {
      return null;
    }
    return metrics.getMeter(name);
  }

  async shutdown(): Promise<void> {
    if (!this.#sdk) {
      return;
    }
    try {
      await this.#sdk.shutdown();
      this.#sdk = undefined;
      log.debug('[NodeObservabilityService] OpenTelemetry SDK shutdown complete');
    } catch (error) {
      log.error('[NodeObservabilityService] Error during OpenTelemetry SDK shutdown:', error);
    }
  }
}
