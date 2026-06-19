import { BaseLanguageClient, Disposable, State } from 'vscode-languageclient';
import * as vscode from 'vscode';
import type { Histogram, Span, Tracer } from '@opentelemetry/api';
import { log } from '../log';
import type { ObservabilityService } from '../observability';

export type StartupPhase = 'idle' | 'spawning' | 'handshake' | 'running' | 'failed';

const SPAWN_TIMEOUT_MS = 10000;
const HANDSHAKE_TIMEOUT_MS = 30000;
const RESTART_GRACE_PERIOD_MS = 5000;

export class LanguageServerStartupMonitor {
  #phase: StartupPhase = 'idle';

  #tProcessStarting = 0;

  #tHandshakeStart = 0;

  #stateChangeListener: Disposable | undefined;

  #handshakeStarted = false;

  #restartAttempts = 0;

  #spawnTimeout: ReturnType<typeof setTimeout> | undefined;

  #handshakeTimeout: ReturnType<typeof setTimeout> | undefined;

  #phaseEmitter = new vscode.EventEmitter<StartupPhase>();

  readonly onDidChangePhase = this.#phaseEmitter.event;

  #tracer: Tracer | null;

  #startupSpan: Span | undefined;

  #histogram: Histogram | null;

  constructor(observabilityService: ObservabilityService) {
    this.#tracer = observabilityService.getTracer('gitlab-vscode-extension.language-server');
    this.#histogram =
      observabilityService
        .getMeter('gitlab-vscode-extension.language-server')
        ?.createHistogram('ls.startup.duration', { unit: 'ms' }) ?? null;
  }

  get phase(): StartupPhase {
    return this.#phase;
  }

  #setPhase(phase: StartupPhase): void {
    this.#phase = phase;
    this.#phaseEmitter.fire(phase);
  }

  dispose(): void {
    this.#stateChangeListener?.dispose();
    this.#stateChangeListener = undefined;
    clearTimeout(this.#spawnTimeout);
    this.#spawnTimeout = undefined;
    clearTimeout(this.#handshakeTimeout);
    this.#handshakeTimeout = undefined;
    this.#phaseEmitter.dispose();
    this.#startupSpan?.end();
    this.#startupSpan = undefined;
  }

  notifyHandshakeStarted(): void {
    if (this.#handshakeStarted || this.#phase !== 'spawning') return;
    this.#handshakeStarted = true;
    this.#tHandshakeStart = performance.now();
    this.#setPhase('handshake');
  }

  #recordStartupMetrics({
    status,
    failedPhase,
    totalMs,
  }: {
    status: 'success' | 'failed';
    failedPhase: StartupPhase | null;
    totalMs: number;
  }): void {
    this.#histogram?.record(Math.round(totalMs), {
      status,
      failed_phase: failedPhase ?? '',
    });
  }

  observe(client: BaseLanguageClient): Promise<void> {
    return new Promise((resolve, reject) => {
      const fail = (error: Error) => {
        this.dispose();
        reject(error);
      };

      this.#startupSpan = this.#tracer?.startSpan('ls.startup');

      this.#spawnTimeout = setTimeout(() => {
        if (this.#phase !== 'idle') return;
        this.#setPhase('failed');
        this.#startupSpan?.setAttributes({
          status: 'failed',
          failed_phase: 'idle',
          spawn_duration_ms: 0,
          handshake_duration_ms: 0,
          total_duration_ms: SPAWN_TIMEOUT_MS,
          restart_attempts: this.#restartAttempts,
        });
        this.#startupSpan?.end();
        this.#startupSpan = undefined;
        this.#recordStartupMetrics({
          status: 'failed',
          failedPhase: 'idle',
          totalMs: SPAWN_TIMEOUT_MS,
        });
        fail(
          new Error(
            `Language Server process did not start within ${SPAWN_TIMEOUT_MS / 1000}s. Try to restart the GitLab extension.`,
          ),
        );
      }, SPAWN_TIMEOUT_MS);

      this.#stateChangeListener = client.onDidChangeState(({ newState }) => {
        switch (newState) {
          case State.Starting:
            clearTimeout(this.#spawnTimeout);
            this.#spawnTimeout = undefined;
            this.#handshakeStarted = false;
            this.#restartAttempts += 1;
            this.#tProcessStarting = performance.now();
            this.#setPhase('spawning');
            log.debug(
              `[LS startup] Language Server process spawning (attempt ${this.#restartAttempts})`,
            );
            clearTimeout(this.#handshakeTimeout);
            this.#handshakeTimeout = setTimeout(() => {
              if (this.#phase !== 'spawning' && this.#phase !== 'handshake') return;
              const failedPhase = this.#phase;
              const spawnMs = this.#tHandshakeStart - this.#tProcessStarting;
              this.#startupSpan?.setAttributes({
                status: 'failed',
                failed_phase: failedPhase,
                spawn_duration_ms: Math.round(spawnMs),
                handshake_duration_ms: HANDSHAKE_TIMEOUT_MS,
                total_duration_ms: Math.round(spawnMs) + HANDSHAKE_TIMEOUT_MS,
                restart_attempts: this.#restartAttempts,
              });
              this.#startupSpan?.end();
              this.#startupSpan = undefined;
              this.#setPhase('failed');
              this.#recordStartupMetrics({
                status: 'failed',
                failedPhase,
                totalMs: spawnMs + HANDSHAKE_TIMEOUT_MS,
              });
              fail(
                new Error(
                  `Language Server process started but LSP initialize handshake did not complete within ${HANDSHAKE_TIMEOUT_MS / 1000}s (spawn took ${spawnMs.toFixed(1)}ms). Try to restart the GitLab extension.`,
                ),
              );
            }, HANDSHAKE_TIMEOUT_MS);
            break;
          case State.Running: {
            const spawnMs = this.#tHandshakeStart - this.#tProcessStarting;
            const handshakeMs = performance.now() - this.#tHandshakeStart;
            const totalMs = performance.now() - this.#tProcessStarting;
            this.#startupSpan?.setAttributes({
              status: 'success',
              failed_phase: '',
              spawn_duration_ms: Math.round(spawnMs),
              handshake_duration_ms: Math.round(handshakeMs),
              total_duration_ms: Math.round(totalMs),
              restart_attempts: this.#restartAttempts,
            });
            this.#startupSpan?.end();
            this.#startupSpan = undefined;
            this.#setPhase('running');
            log.debug(
              `[LS startup] Language Server is running (spawn took ${spawnMs.toFixed(1)}ms, handshake took ${handshakeMs.toFixed(1)}ms, total ${totalMs.toFixed(1)}ms)`,
            );
            clearTimeout(this.#handshakeTimeout);
            this.#handshakeTimeout = undefined;
            this.#recordStartupMetrics({
              status: 'success',
              failedPhase: null,
              totalMs,
            });
            resolve();
            break;
          }
          case State.Stopped: {
            clearTimeout(this.#handshakeTimeout);
            this.#handshakeTimeout = undefined;
            log.debug('[LS startup] Language Server process stopped, waiting for restart');
            const attemptsAtStop = this.#restartAttempts;
            this.#handshakeTimeout = setTimeout(() => {
              clearTimeout(this.#spawnTimeout);
              this.#spawnTimeout = undefined;
              if (this.#restartAttempts !== attemptsAtStop) return;
              this.#startupSpan?.setAttributes({
                status: 'failed',
                failed_phase: 'spawning',
                spawn_duration_ms: 0,
                handshake_duration_ms: 0,
                total_duration_ms: RESTART_GRACE_PERIOD_MS,
                restart_attempts: this.#restartAttempts,
              });
              this.#startupSpan?.end();
              this.#startupSpan = undefined;
              this.#setPhase('failed');
              this.#recordStartupMetrics({
                status: 'failed',
                failedPhase: 'spawning',
                totalMs: RESTART_GRACE_PERIOD_MS,
              });
              log.debug(
                `[LS startup] Language Server failed to restart after ${this.#restartAttempts} attempt(s). Try to restart the GitLab extension.`,
              );
              fail(
                new Error(
                  `Language Server failed to restart after ${this.#restartAttempts} attempt(s). Try to restart the GitLab extension.`,
                ),
              );
            }, RESTART_GRACE_PERIOD_MS);
            break;
          }
          default:
            break;
        }
      });
    });
  }
}
