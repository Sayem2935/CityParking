import * as vscode from 'vscode';
import { StatusBarItemUI, createStatusBarItem } from './utils/status_bar_item';
import { SHOW_QUICK_PICK_MENU } from './duo_quick_pick/commands/show_quick_pick_menu';
import { log } from './log';
import {
  LanguageServerStartupMonitor,
  StartupPhase,
} from './language_server/language_server_startup_monitor';
import {
  CodeSuggestionsStateManager,
  VisibleCodeSuggestionsState,
} from './code_suggestions/code_suggestions_state_manager';

export const CODE_SUGGESTION_LABEL = 'Duo';
const errorBackgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
export const CODE_SUGGESTIONS_STATUSES: Record<VisibleCodeSuggestionsState, StatusBarItemUI> = {
  [VisibleCodeSuggestionsState.DISABLED_VIA_SETTINGS]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'Code suggestions are disabled',
  },
  [VisibleCodeSuggestionsState.DISABLED_LANGUAGE_VIA_SETTINGS]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'Code suggestions are disabled for this language',
  },
  [VisibleCodeSuggestionsState.READY]: {
    iconName: 'gitlab-code-suggestions-enabled',
    tooltip: 'Code suggestions are enabled',
  },
  [VisibleCodeSuggestionsState.UNSUPPORTED_LANGUAGE]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'Code suggestions are not supported for this language',
  },
  [VisibleCodeSuggestionsState.DISABLED_BY_USER]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'Code suggestions are disabled per user request. Click to enable',
  },
  [VisibleCodeSuggestionsState.NO_ACCOUNT]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'Code suggestions are disabled because there is no user account',
  },
  [VisibleCodeSuggestionsState.SUGGESTIONS_API_ERROR]: {
    iconName: 'gitlab-code-suggestions-error',
    tooltip: 'Code Suggestion requests to API are failing',
    backgroundColor: errorBackgroundColor,
  },
  [VisibleCodeSuggestionsState.ERROR]: {
    iconName: 'gitlab-code-suggestions-error',
    tooltip: 'Code Suggestion requests to API are failing',
    backgroundColor: errorBackgroundColor,
  },
  [VisibleCodeSuggestionsState.NO_LICENSE]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip:
      'A GitLab Duo license is required to use this feature. Contact your GitLab administrator to request access.',
    backgroundColor: errorBackgroundColor,
  },
  [VisibleCodeSuggestionsState.SUGGESTIONS_NO_DEFAULT_NAMESPACE]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip:
      'Code Suggestions cannot detect a namespace for this project. To continue, please set a default GitLab Duo namespace in your user preferences.',
  },
  [VisibleCodeSuggestionsState.SUGGESTIONS_NO_CREDITS]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip:
      'No GitLab Credits remain for this billing period. To continue using Code Suggestions, contact your administrator. When you have more credits, reload the extension.',
  },
  [VisibleCodeSuggestionsState.DISABLED_BY_PROJECT]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'Code suggestions are disabled for this project',
  },
  [VisibleCodeSuggestionsState.UNSUPPORTED_GITLAB_VERSION]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'GitLab Duo Code Suggestions requires GitLab version 16.8 or later.',
  },
  [VisibleCodeSuggestionsState.AUTHENTICATION_REQUIRED]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'Authentication required for Code Suggestions',
  },
  [VisibleCodeSuggestionsState.SUGGESTIONS_FILE_EXCLUDED]: {
    iconName: 'gitlab-code-suggestions-disabled',
    tooltip: 'File excluded from GitLab Duo context by project settings',
  },
};

const LS_FAILED_UI: StatusBarItemUI = {
  iconName: 'gitlab-code-suggestions-error',
  tooltip: 'GitLab Duo is disabled: Language Server failed to start.',
  backgroundColor: errorBackgroundColor,
};

export class DuoStatusBarItem {
  duoStatusBarItem?: vscode.StatusBarItem;

  #codeSuggestionsStateSubscription?: vscode.Disposable;

  #startupMonitorSubscription?: vscode.Disposable;

  #lsFailed = false;

  updateCodeSuggestionsItem(state: VisibleCodeSuggestionsState) {
    if (this.#lsFailed) return;
    if (!this.duoStatusBarItem) return;
    if (state === VisibleCodeSuggestionsState.LOADING) return;

    const newUiState = CODE_SUGGESTIONS_STATUSES[state];

    if (!newUiState) {
      log.warn(
        `[Duo Status Bar Item] State ${state} doesn't have a UI icon defined, falling back to "gitlab-code-suggestions-disabled"`,
      );
      this.duoStatusBarItem.text = `$(gitlab-code-suggestions-disabled) ${CODE_SUGGESTION_LABEL}`;
      this.duoStatusBarItem.tooltip = `Code suggestions unavailable (unknown state: ${state})`;
      return;
    }

    this.duoStatusBarItem.text = `$(${newUiState.iconName}) ${CODE_SUGGESTION_LABEL}`;
    this.duoStatusBarItem.tooltip = newUiState.tooltip;
    this.duoStatusBarItem.backgroundColor = newUiState.backgroundColor;

    this.#updateItemForDiagnosticStatus(state);
  }

  #updateItemForDiagnosticStatus(state: VisibleCodeSuggestionsState) {
    if (!this.duoStatusBarItem) return;

    if (state === VisibleCodeSuggestionsState.NO_LICENSE) {
      this.duoStatusBarItem.tooltip = 'GitLab Duo failed diagnostic checks.';
    }
  }

  constructor(state: CodeSuggestionsStateManager, startupMonitor?: LanguageServerStartupMonitor) {
    this.duoStatusBarItem = createDuoStatusBarItem();
    this.updateCodeSuggestionsItem(state.getVisibleState());
    this.#codeSuggestionsStateSubscription = state.onDidChangeVisibleState(e =>
      this.updateCodeSuggestionsItem(e),
    );
    if (startupMonitor) {
      this.#startupMonitorSubscription = startupMonitor.onDidChangePhase(
        this.#onStartupPhaseChange,
      );
    }
  }

  #onStartupPhaseChange = (phase: StartupPhase): void => {
    if (phase !== 'failed') return;
    if (!this.duoStatusBarItem) return;
    this.#lsFailed = true;
    this.duoStatusBarItem.text = `$(${LS_FAILED_UI.iconName}) ${CODE_SUGGESTION_LABEL}`;
    this.duoStatusBarItem.tooltip = LS_FAILED_UI.tooltip;
    this.duoStatusBarItem.backgroundColor = LS_FAILED_UI.backgroundColor;
    this.duoStatusBarItem.command = undefined;
  };

  dispose(): void {
    this.#codeSuggestionsStateSubscription?.dispose();
    this.#startupMonitorSubscription?.dispose();
  }
}

function createDuoStatusBarItem() {
  return createStatusBarItem({
    priority: Number.MAX_VALUE,
    id: 'gl.status.code_suggestions',
    name: 'GitLab: Code Suggestions',
    initialText: '$(gitlab-code-suggestions-disabled)',
    command: SHOW_QUICK_PICK_MENU,
    alignment: vscode.StatusBarAlignment.Right,
  });
}
