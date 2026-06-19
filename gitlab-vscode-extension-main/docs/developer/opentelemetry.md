# OpenTelemetry in editor extensions

This extension uses [OpenTelemetry (OTel)](https://opentelemetry.io/) to collect
traces and metrics, and export them via OTLP/HTTP to a GitLab Observability backend.
Currently, only language server startup monitoring is instrumented, but the architecture
supports adding observability to any feature in the extension.

This guide explains the architecture, how to instrument new features, and how to
test OTel locally.

## Architecture

The observability layer is built around the `ObservabilityService` interface
(`src/common/observability/observability_service.ts`):

- `isEnabled()` — returns whether the user has consented to telemetry.
- `initialize()` — sets up the OTel SDK and exporters.
- `getTracer(name)` — returns a `Tracer` or `null` when telemetry is disabled.
- `getMeter(name)` — returns a `Meter` or `null` when telemetry is disabled.
- `shutdown()` — flushes and tears down the SDK.

Two implementations exist:

- **`NodeObservabilityService`** (`src/desktop/observability/`): initializes the
  OpenTelemetry Node SDK with OTLP exporters for traces and metrics.
- **`NoopObservabilityService`** (`src/common/observability/`): returns `null` for
  all tracers and meters. Used in browser/web environments because browser OTel support
  is not yet implemented. Full support will be added if needed.

The service is initialized once at extension startup (`src/desktop/extension.ts`)
and shut down on deactivation.

### Circuit breakers

Both `FallibleSpanExporter` and `FallibleMetricExporter` wrap the OTLP exporters
with a `MaxAttemptsCircuitBreaker`. After 3 consecutive export failures, the circuit
opens and further attempts are silently skipped. This prevents indefinite error
logging when the OTLP endpoint is unreachable (for example, when it is blocked by a customer
firewall).

### OTLP endpoint

By default, signals are exported to the GitLab-hosted OTLP collector. The OTLP endpoint is available on the [`editor-extensions` **Observability > Setup** page](https://gitlab.com/groups/gitlab-org/editor-extensions/-/observability/setup).

The endpoint can be overridden via the `gitlab.telemetry.otlpEndpointUrl` VS Code setting,
which is intended for **local testing only** and should not be set in production
environments.
You can find and add dashboards for visualizing the collected signals in the [`editor-extensions` observability dashboards](https://gitlab.com/groups/gitlab-org/editor-extensions/-/observability/dashboard).

### Resource attributes

The SDK is initialized with the following resource attributes, so signals can be
filtered by extension and environment in the Observability UI:

| Attribute                                 | Description                                                       |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `service.name`                            | Identifies the extension (for example, `gitlab-vscode-extension`) |
| `gitlab.project.id`                       | GitLab project ID of the extension                                |
| `gitlab.project.name`                     | Human-readable project name                                       |
| `ide_name` / `ide_vendor` / `ide_version` | IDE identification                                                |
| `extension_name` / `extension_version`    | Extension identification                                          |
| `os`                                      | `process.platform` value                                          |
| `remote_name`                             | VS Code remote context (for example, `local`, `ssh-remote`)       |

## Instrumenting features

### Traces

Use traces to track the execution of a specific operation over time, such as a
request lifecycle or a multi-step process. Traces are made up of spans that can
be nested to show cause and effect. See the
[OTel traces documentation](https://opentelemetry.io/docs/concepts/signals/traces/) for more detail.

`getTracer()` returns `null` when telemetry is disabled, so always guard against it:

```typescript
const tracer = observabilityService.getTracer('gitlab-vscode-extension.my-feature');
tracer?.startActiveSpan('my-operation', span => {
  try {
    // ... do work ...
    span.setAttributes({ result: 'success' });
  } catch (error) {
    span.setAttributes({ result: 'error' });
    throw error;
  } finally {
    span.end();
  }
});
```

### Metrics

Use metrics to measure aggregated values over time, such as durations, counts, or
error rates. Unlike traces, metrics are not tied to individual operations. See the
[OTel metrics documentation](https://opentelemetry.io/docs/concepts/signals/metrics/) for more detail.

`getMeter()` also returns `null` when telemetry is disabled:

```typescript
const meter = observabilityService.getMeter('gitlab-vscode-extension.my-feature');
const histogram = meter?.createHistogram('operation.duration', { unit: 'ms' });

histogram?.record(Math.round(durationMs), { status: 'success' });
```

Metrics are exported on a 60-second interval by default.

## Telemetry consent

`isEnabled()` delegates to `vscode.env.isTelemetryEnabled`. When this returns `false`,
the OTel SDK is not initialized and no data is exported — tracing and metrics will not
work until the user enables telemetry in VS Code.

## Testing locally

OTel is enabled when `vscode.env.isTelemetryEnabled` is `true`. Make sure
telemetry is enabled in VS Code before testing.

Override the OTLP base URL in your VS Code `settings.json` to point at a local
collector:

```json
"gitlab.telemetry.otlpEndpointUrl": "http://localhost:4318"
```

Then, launch the extension with <kbd>F5</kbd> and trigger the instrumented code path.
Choose one of the following local collectors depending on what you need to inspect.

### Traces only — Jaeger

[Jaeger](https://www.jaegertracing.io/) is an open-source distributed tracing UI
that accepts OTLP data and lets you visualise spans in a browser.

1. Start Jaeger locally (exposes OTLP HTTP on port `4318` and the UI on port `16686`):

   ```shell
   docker run -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one
   ```

1. Set `gitlab.telemetry.otlpEndpointUrl` to `http://localhost:4318` in your
   VS Code `settings.json`.

1. Launch the extension (<kbd>F5</kbd>) and trigger the instrumented code path.

1. Open the Jaeger UI at **[http://localhost:16686](http://localhost:16686)**, select the
   `gitlab-vscode-extension` service, and click **Find Traces**.

### Traces and metrics — Grafana LGTM

[Grafana LGTM](https://github.com/grafana/docker-otel-lgtm) is an all-in-one
Docker image that accepts OTLP for both traces and metrics, and provides a Grafana
UI to visualise them.

1. Start the Grafana LGTM container (exposes OTLP HTTP on port `4318` and Grafana
   on port `3000`):

   ```shell
   docker run -d --name grafana-lgtm -p 3000:3000 -p 4318:4318 grafana/otel-lgtm
   ```

1. Set `gitlab.telemetry.otlpEndpointUrl` to `http://localhost:4318` in your
   VS Code `settings.json`.

1. Launch the extension (<kbd>F5</kbd>) and trigger the instrumented code path.

1. Open Grafana at **[http://localhost:3000](http://localhost:3000)** (credentials: `admin` / `admin`), then review
   traces or metrics:
   - **Traces**: Explore → Tempo → select the `gitlab-vscode-extension` service.
   - **Metrics**: Explore → Prometheus → query your metric name (for example,
     `ls_startup_duration`).

### Debug logs

Check the extension's Output panel for `[OTel]` and `[NodeObservabilityService]`
prefixed log messages to confirm initialization and export status.

## Related topics

- [Telemetry and tracking](https://gitlab.com/gitlab-org/editor-extensions/gitlab-lsp/-/blob/main/docs/developer/telemetry-and-tracking.md)
- [GitLab Observability development setup](https://docs.gitlab.com/ee/development/observability/)
- [Editor extensions observability setup](https://gitlab.com/groups/gitlab-org/editor-extensions/-/observability/setup) —
  contains the OTLP endpoint configuration
- [Editor extensions observability dashboards](https://gitlab.com/groups/gitlab-org/editor-extensions/-/observability/dashboard) —
  new dashboards for traces and metrics should be added here
