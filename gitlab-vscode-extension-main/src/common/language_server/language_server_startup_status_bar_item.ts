import * as vscode from 'vscode';
import { StartupPhase, LanguageServerStartupMonitor } from './language_server_startup_monitor';

const DEBOUNCE_MS = 2000;
const MIN_VISIBLE_MS = 3000;

const PHASE_UI: Partial<Record<StartupPhase, { text: string; tooltip: string }>> = {
  spawning: {
    text: '$(loading~spin) GitLab: Starting Language Server...',
    tooltip: 'Waiting for the Language Server process to start',
  },
  handshake: {
    text: '$(loading~spin) GitLab: Initializing Language Server...',
    tooltip: 'Connecting to Language Server',
  },
  running: {
    text: '$(check) GitLab: Language Server started',
    tooltip: 'Language Server started successfully',
  },
  failed: {
    text: '$(error) GitLab: Language Server failed to start',
    tooltip: 'Language Server failed to start. Please restart the GitLab extension.',
  },
};

export class LanguageServerStartupStatusBarItem implements vscode.Disposable {
  #item: vscode.StatusBarItem;

  #debounceTimer: ReturnType<typeof setTimeout> | undefined;

  #minVisibleTimer: ReturnType<typeof setTimeout> | undefined;

  #pendingHide = false;

  #phaseListener: vscode.Disposable;

  constructor(monitor: LanguageServerStartupMonitor) {
    this.#item = vscode.window.createStatusBarItem(
      'gl.status.ls_startup',
      vscode.StatusBarAlignment.Left,
      0,
    );
    this.#item.name = 'GitLab: Language Server Startup';

    this.#phaseListener = monitor.onDidChangePhase(phase => this.#onPhaseChange(phase, monitor));
  }

  #onPhaseChange(phase: StartupPhase, monitor: LanguageServerStartupMonitor): void {
    if (phase === 'spawning') {
      // start debounce - only show if still not running after DEBOUNCE_MS
      this.#debounceTimer = setTimeout(() => {
        const current = monitor.phase;
        if (current === 'spawning' || current === 'handshake') {
          this.#show(current);
        }
      }, DEBOUNCE_MS);
      return;
    }

    if (phase === 'handshake') {
      // update tooltip immediately if already visible
      if (this.#isVisible()) {
        this.#update('handshake');
      }
      return;
    }

    if (phase === 'running') {
      clearTimeout(this.#debounceTimer);
      this.#debounceTimer = undefined;
      if (this.#isVisible()) {
        this.#update('running');
      }
      this.#hideWithMinDuration();
      return;
    }

    if (phase === 'failed') {
      clearTimeout(this.#debounceTimer);
      this.#debounceTimer = undefined;
      this.#show('failed');
    }
  }

  #isVisible(): boolean {
    return this.#item.text !== '';
  }

  #show(phase: StartupPhase): void {
    const ui = PHASE_UI[phase];
    if (!ui) return;
    this.#item.text = ui.text;
    this.#item.tooltip = ui.tooltip;
    this.#item.show();
  }

  #update(phase: StartupPhase): void {
    const ui = PHASE_UI[phase];
    if (!ui) return;
    this.#item.text = ui.text;
    this.#item.tooltip = ui.tooltip;
  }

  #hideWithMinDuration(): void {
    if (!this.#isVisible()) return;

    if (this.#minVisibleTimer) {
      // already counting down minimum visible time - just flag to hide when done
      this.#pendingHide = true;
      return;
    }

    this.#minVisibleTimer = setTimeout(() => {
      this.#minVisibleTimer = undefined;
      if (this.#pendingHide) {
        this.#pendingHide = false;
      }
      this.#item.hide();
      this.#item.text = '';
    }, MIN_VISIBLE_MS);
  }

  dispose(): void {
    clearTimeout(this.#debounceTimer);
    clearTimeout(this.#minVisibleTimer);
    this.#phaseListener.dispose();
    this.#item.dispose();
  }
}
