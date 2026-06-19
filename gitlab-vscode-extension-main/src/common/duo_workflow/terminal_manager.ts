import {
  Terminal,
  window,
  Disposable,
  TerminalShellExecution,
  TerminalShellIntegration,
} from 'vscode';
import { BaseLanguageClient } from 'vscode-languageclient';
import { createInterfaceId } from '@gitlab/needle';
import { log } from '../log';

const SHELL_INTEGRATION_TIMEOUT_MS = 3000;

const lookupKey = (workflowId: string, silent: boolean) => {
  return `${workflowId}-${silent}`;
};

type RunningExecution = {
  execution: TerminalShellExecution;
  terminal: Terminal;
  outputCollector: string[];
  resolver: (value: { exitCode: number; output: string }) => void;
};

type StartedExecution = {
  execution: TerminalShellExecution;
  /** Undefined when the output stream could not be opened; completion is still tracked. */
  stream: AsyncIterable<string> | undefined;
  executionEnded: Promise<{ exitCode: number }>;
  dispose: () => void;
};

export interface TerminalManager extends Disposable {
  setupRequests(client: BaseLanguageClient): void;
}

export const TerminalManager = createInterfaceId<TerminalManager>('TerminalManager');

export class TerminalManagerImpl implements TerminalManager {
  #terminals: Map<string, Terminal>;

  #runningExecutions: Map<string, RunningExecution>;

  #disposables: Disposable[] = [];

  constructor() {
    this.#terminals = new Map();
    this.#runningExecutions = new Map();
  }

  setupRequests(client: BaseLanguageClient) {
    this.#disposables.push(
      client.onRequest('$/gitlab/runCommand', async ({ workflowId, command, args, silent }) => {
        log.debug(
          `[TerminalManager] Received runCommand request for workflow ${workflowId}: ${command} ${args?.join(' ') ?? ''} (silent: ${silent})`,
        );

        return this.#executeCommand(workflowId, command, args, silent);
      }),
    );

    this.#disposables.push(
      client.onNotification('$/gitlab/cancelRunningCommand', ({ workflowId }) => {
        log.debug(`[TerminalManager] Received cancel request for workflow ${workflowId}`);
        this.#cancelRunningCommand(workflowId);
      }),
    );

    this.#disposables.push(
      window.onDidCloseTerminal(closedTerminal => {
        for (const [key, terminal] of this.#terminals.entries()) {
          if (terminal === closedTerminal) {
            log.debug(`[TerminalManager] Terminal closed, removing from cache (key: ${key})`);
            this.#terminals.delete(key);
            break;
          }
        }
      }),
    );
  }

  async #executeCommand(
    workflowId: string,
    command: string,
    args: string[] | undefined,
    silent: boolean,
  ): Promise<{ exitCode: number; output: string }> {
    const terminal = await this.#getOrCreateTerminal(workflowId, silent);

    if (!terminal.shellIntegration) {
      log.warn(
        `[TerminalManager] Terminal for workflow ${workflowId} lost shell integration, recreating...`,
      );
      this.#terminals.delete(lookupKey(workflowId, silent));
      terminal.dispose();
      return this.#executeCommand(workflowId, command, args, silent);
    }

    if (!silent) {
      terminal.show(true);
    }

    const output: string[] = [];
    const startTime = Date.now();

    const { execution, stream, executionEnded, dispose } = this.#startExecution(
      terminal.shellIntegration,
      command,
      args,
      workflowId,
    );

    const cancelled = new Promise<{ cancelled: true; exitCode: number }>(resolve => {
      this.#runningExecutions.set(workflowId, {
        execution,
        terminal,
        outputCollector: output,
        resolver: ({ exitCode }) => resolve({ cancelled: true, exitCode }),
      });
    });

    const streamDrained = (async () => {
      if (!stream) {
        return;
      }
      try {
        for await (const data of stream) {
          output.push(data);
        }
      } catch (error) {
        log.error(`[TerminalManager] Error reading stream for workflow ${workflowId}:`, error);
      }
    })();

    const result = await Promise.race([
      executionEnded.then(({ exitCode }) => ({ cancelled: false as const, exitCode })),
      cancelled,
    ]);

    dispose();
    this.#runningExecutions.delete(workflowId);

    const durationMs = Date.now() - startTime;

    if (result.cancelled) {
      log.debug(
        `[TerminalManager] Command for workflow ${workflowId} cancelled after ${durationMs}ms (${output.length} output chunks)`,
      );
      return { exitCode: result.exitCode, output: output.join('') };
    }

    await streamDrained;
    log.debug(
      `[TerminalManager] Command for workflow ${workflowId} completed in ${durationMs}ms with exit code ${result.exitCode} (${output.length} output chunks)`,
    );
    return { exitCode: result.exitCode, output: output.join('') };
  }

  /**
   * Starts a command and wires up completion tracking in a single synchronous step.
   *
   * This method is intentionally not `async`: the end-execution listener must be registered
   * before the command starts, and the output stream must be opened immediately, because VS
   * Code delivers terminal events on a later tick, does not replay missed events, and `read()`
   * drops output written before its first call.
   */
  #startExecution(
    shellIntegration: TerminalShellIntegration,
    command: string,
    args: string[] | undefined,
    workflowId: string,
  ): StartedExecution {
    let execution: TerminalShellExecution | undefined;
    let executionEndDisposable: Disposable | undefined;

    const executionEnded = new Promise<{ exitCode: number }>(resolve => {
      executionEndDisposable = window.onDidEndTerminalShellExecution(
        ({ execution: ended, exitCode }) => {
          if (ended === execution) {
            log.debug(
              `[TerminalManager] Shell execution ended for workflow ${workflowId} with exit code ${exitCode ?? 'undefined'}`,
            );
            executionEndDisposable?.dispose();
            resolve({ exitCode: exitCode ?? 0 });
          }
        },
      );
    });

    execution = args
      ? shellIntegration.executeCommand(command, args)
      : shellIntegration.executeCommand(command);

    let stream: AsyncIterable<string> | undefined;
    try {
      stream = execution.read();
    } catch (error) {
      log.error(`[TerminalManager] Error starting stream read for workflow ${workflowId}:`, error);
    }

    log.debug(`[TerminalManager] Started shell execution for workflow ${workflowId}`);

    return {
      execution,
      stream,
      executionEnded,
      dispose: () => executionEndDisposable?.dispose(),
    };
  }

  async #getOrCreateTerminal(workflowId: string, silent: boolean) {
    const existingTerminal = this.#terminals.get(lookupKey(workflowId, silent));
    if (existingTerminal) {
      log.debug(`[TerminalManager] Reusing existing terminal for workflow ${workflowId}`);
      return existingTerminal;
    }

    return this.#createTerminal(workflowId, silent);
  }

  async #createTerminal(workflowId: string, silent: boolean) {
    log.debug(`[TerminalManager] Creating new terminal for workflow ${workflowId}`);
    const terminal = window.createTerminal({
      name: `GitLab Duo Agent Platform ${workflowId}`,
      isTransient: true,
      hideFromUser: silent,
    });

    const createStartTime = Date.now();
    try {
      await this.#listenForShellIntegration(terminal);
      log.debug(
        `[TerminalManager] Terminal ready with shell integration for workflow ${workflowId} (took ${Date.now() - createStartTime}ms)`,
      );
      this.#terminals.set(lookupKey(workflowId, silent), terminal);
      return terminal;
    } catch (error) {
      log.warn(
        `[TerminalManager] Failed to establish shell integration for workflow ${workflowId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      terminal.dispose();
      throw error;
    }
  }

  #cancelRunningCommand(workflowId: string) {
    const runningExec = this.#runningExecutions.get(workflowId);

    if (!runningExec) {
      log.warn(
        `[TerminalManager] No running command found for workflow ${workflowId}, may have already completed`,
      );
      return;
    }

    log.info(
      `[TerminalManager] Cancelling running command for workflow ${workflowId}, sending SIGINT (${runningExec.outputCollector.length} output chunks captured so far)`,
    );

    // Remove entry first to prevent race with #executeCommand cleanup
    this.#runningExecutions.delete(workflowId);

    // Send Ctrl+C (SIGINT) to the terminal to interrupt the running process
    runningExec.terminal.sendText('\x03', false);

    // Trigger the cancellation promise with partial output
    const partialOutput = runningExec.outputCollector.join('');
    runningExec.resolver({ exitCode: 0, output: partialOutput });
  }

  #listenForShellIntegration(term: Terminal) {
    return new Promise<Terminal>((resolve, reject) => {
      if (term.shellIntegration) {
        resolve(term);
        return;
      }

      let isSettled = false;
      const disposable = window.onDidChangeTerminalShellIntegration(
        ({ terminal, shellIntegration }) => {
          if (term === terminal && shellIntegration) {
            isSettled = true;
            disposable.dispose();
            clearTimeout(timeoutId);
            resolve(terminal);
          }
        },
      );

      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          disposable.dispose();
          reject(new Error('User does not have shell integration configured'));
        }
      }, SHELL_INTEGRATION_TIMEOUT_MS);
    });
  }

  dispose() {
    this.#runningExecutions.forEach((_, workflowId) => {
      this.#cancelRunningCommand(workflowId);
    });
    this.#runningExecutions.clear();

    this.#terminals.forEach(term => {
      term.dispose();
    });

    this.#disposables.forEach(disposable => {
      disposable.dispose();
    });
  }
}
