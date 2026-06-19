import * as vscode from 'vscode';
import { SANDBOX } from '@gitlab-org/gitlab-lsp';
import {
  AllFeaturesState,
  LanguageServerFeatureStateProvider,
} from '../language_server/language_server_feature_state_provider';
import {
  DUO_SANDBOX_CONFIG_NAMESPACE,
  getDuoSandboxConfiguration,
} from '../utils/extension_configuration';
import { log } from '../log';
import {
  formatSandboxPlatform,
  formatSandboxMissingDependencies,
  sandboxMissingDependencyKey,
} from './sandbox_utils';

const SANDBOX_UNSUPPORTED_PLATFORM = 'sandbox-unsupported-platform';
const SANDBOX_MISSING_DEPENDENCIES = 'sandbox-missing-dependencies';

const OPEN_SETTINGS = 'Open Settings';
const DISABLE_SANDBOX = 'Disable Sandboxing';

async function handleAction(action: string | undefined) {
  if (action === OPEN_SETTINGS) {
    await vscode.commands.executeCommand(
      'workbench.action.openSettings',
      DUO_SANDBOX_CONFIG_NAMESPACE,
    );
    return;
  }
  if (action === DISABLE_SANDBOX) {
    const config = vscode.workspace.getConfiguration(DUO_SANDBOX_CONFIG_NAMESPACE);
    await config.update('enabled', false, vscode.ConfigurationTarget.Global);
  }
}

export class SandboxWarningProvider implements vscode.Disposable {
  #stateProvider: LanguageServerFeatureStateProvider;

  #subscriptions: vscode.Disposable[] = [];

  // Stores a fingerprint of the last warning shown so we only re-notify on
  // material state transitions (e.g. when the missing dependency list changes).
  #lastNotifiedKey: string | undefined;

  // Tracks the last logged enabled state to avoid duplicate log entries.
  #lastLoggedEnabled: boolean | undefined;

  constructor(stateProvider: LanguageServerFeatureStateProvider) {
    this.#stateProvider = stateProvider;
  }

  start(): void {
    this.#subscriptions.push(
      this.#stateProvider.onChange(allStates => {
        this.#evaluate(allStates).catch(err => log.warn(`[sandbox] evaluate failed: ${err}`));
      }),
    );
  }

  async #evaluate(allStates: AllFeaturesState): Promise<void> {
    const sandboxState = allStates[SANDBOX];
    if (!sandboxState) return;

    const isEnabled = sandboxState.engagedChecks.length === 0;
    if (isEnabled !== this.#lastLoggedEnabled) {
      log.debug(`[sandbox] state changed: enabled=${isEnabled}`);
      this.#lastLoggedEnabled = isEnabled;
    }

    if (!getDuoSandboxConfiguration().enabled) {
      this.#lastNotifiedKey = undefined;
      return;
    }

    const unsupported = sandboxState.engagedChecks.find(
      c => c.checkId === SANDBOX_UNSUPPORTED_PLATFORM,
    );
    if (unsupported) {
      const platform = formatSandboxPlatform(unsupported.context);
      await this.#notify(
        `unsupported:${platform}`,
        `GitLab Duo Agent Platform sandboxing is not available because ${platform} is not supported.`,
      );
      return;
    }

    const missing = sandboxState.engagedChecks.find(
      c => c.checkId === SANDBOX_MISSING_DEPENDENCIES,
    );
    if (missing) {
      await this.#notify(
        `missing:${sandboxMissingDependencyKey(missing.context)}`,
        `GitLab Duo Agent Platform sandboxing is not available because required dependencies are missing: ${formatSandboxMissingDependencies(missing.context)}.`,
      );
      return;
    }

    this.#lastNotifiedKey = undefined;
  }

  async #notify(key: string, message: string): Promise<void> {
    if (this.#lastNotifiedKey === key) return;
    this.#lastNotifiedKey = key;
    log.debug(`[sandbox] warning surfaced: ${key}`);
    try {
      const action = await vscode.window.showWarningMessage(
        message,
        OPEN_SETTINGS,
        DISABLE_SANDBOX,
      );
      await handleAction(action);
    } catch (err) {
      log.warn(`[sandbox] warning action failed: ${err}`);
    }
  }

  dispose(): void {
    this.#subscriptions.forEach(d => d.dispose());
    this.#subscriptions = [];
  }
}
