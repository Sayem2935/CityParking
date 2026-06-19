import vscode, { QuickPickItem } from 'vscode';
import { SANDBOX } from '@gitlab-org/gitlab-lsp';
import { CONFIG_NAMESPACE } from '../constants';
import { getDuoCodeSuggestionsConfiguration } from '../utils/extension_configuration';
import { VisibleCodeSuggestionsState } from '../code_suggestions/code_suggestions_state_manager';
import { USER_COMMANDS } from '../command_names';
import { LanguageServerFeatureStateProvider } from '../language_server/language_server_feature_state_provider';
import { formatSandboxPlatform, formatSandboxMissingDependencies } from '../sandbox/sandbox_utils';
import {
  CODE_SUGGESTIONS_ENABLED,
  CODE_SUGGESTIONS_DISABLED,
  CODE_SUGGESTIONS_DESCRIPTION,
  DUO_UNAVAILABLE,
  DUO_CHAT_ENABLED,
  DUO_CHAT_DISABLED,
  ENABLE_CODE_SUGGESTIONS,
  DISABLE_CODE_SUGGESTIONS,
  NOT_AUTHENTICATED,
  DUO_STATUS_ZERO_PROBLEMS_DETECTED,
  SANDBOX_STATUS_ENABLED,
  SANDBOX_STATUS_DISABLED,
  SANDBOX_STATUS_UNSUPPORTED,
  SANDBOX_STATUS_MISSING_DEPS,
  ENABLE_SANDBOX,
  DISABLE_SANDBOX,
} from './constants';

export const generateQuickPickItem = (
  label: string,
  description?: string,
): vscode.QuickPickItem => ({
  label,
  description,
});

const getCurrentFileLanguage = (): string | undefined => {
  const activeEditor = vscode.window.activeTextEditor;
  return activeEditor ? activeEditor.document.languageId : undefined;
};

const isLanguageEnabled = (language: string) => {
  const { enabledSupportedLanguages, additionalLanguages } = getDuoCodeSuggestionsConfiguration();
  return enabledSupportedLanguages[language] || additionalLanguages.includes(language);
};

export const generateCodeSuggestionsStatusItem = (
  globallyEnabled: boolean,
): vscode.QuickPickItem => {
  let isEnabled = globallyEnabled;
  const language = getCurrentFileLanguage();
  if (language) {
    isEnabled = globallyEnabled && isLanguageEnabled(language);
  }
  const label = isEnabled ? CODE_SUGGESTIONS_ENABLED : CODE_SUGGESTIONS_DISABLED;
  return generateQuickPickItem(label, CODE_SUGGESTIONS_DESCRIPTION);
};

const authenticateUser = () => vscode.commands.executeCommand(USER_COMMANDS.AUTHENTICATE);

export const generateDuoUnavailableStatusItem = (
  state: VisibleCodeSuggestionsState,
): [QuickPickItem, () => void] => {
  switch (state) {
    case VisibleCodeSuggestionsState.NO_ACCOUNT:
      return [generateQuickPickItem(DUO_UNAVAILABLE, NOT_AUTHENTICATED), () => authenticateUser()];
    default:
      return [generateQuickPickItem(DUO_UNAVAILABLE), () => {}];
  }
};

export const generateDuoChatStatusItem = (): vscode.QuickPickItem => {
  const workspaceConfig = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  const label = workspaceConfig?.duoChat?.enabled ? DUO_CHAT_ENABLED : DUO_CHAT_DISABLED;
  return generateQuickPickItem(label);
};

export const generateCodeSuggestionsToggleItem = (enabled: boolean): vscode.QuickPickItem => {
  const label = enabled ? DISABLE_CODE_SUGGESTIONS : ENABLE_CODE_SUGGESTIONS;
  return generateQuickPickItem(label);
};

export const generateCodeSuggestionsLangToggleItem = (
  globallyEnabled: boolean,
): vscode.QuickPickItem | undefined => {
  let quickPickItem;
  const language = getCurrentFileLanguage();

  if (globallyEnabled && language) {
    const action = isLanguageEnabled(language) ? DISABLE_CODE_SUGGESTIONS : ENABLE_CODE_SUGGESTIONS;
    const label = `${action} for ${language}`;

    quickPickItem = generateQuickPickItem(label);
  }

  return quickPickItem;
};

const SANDBOX_UNSUPPORTED_PLATFORM = 'sandbox-unsupported-platform';
const SANDBOX_MISSING_DEPENDENCIES = 'sandbox-missing-dependencies';

export const generateSandboxStatusItem = (
  languageServerFeatureStateProvider: LanguageServerFeatureStateProvider,
): vscode.QuickPickItem | undefined => {
  const sandboxState = languageServerFeatureStateProvider.state[SANDBOX];
  if (!sandboxState || sandboxState.allChecks.length === 0) return undefined;

  const unsupportedCheck = sandboxState.allChecks.find(
    c => c.checkId === SANDBOX_UNSUPPORTED_PLATFORM && c.engaged,
  );
  if (unsupportedCheck) {
    const platform = formatSandboxPlatform(unsupportedCheck.context);
    return generateQuickPickItem(`${SANDBOX_STATUS_UNSUPPORTED} (${platform})`);
  }

  const missingDeps = sandboxState.allChecks.find(
    c => c.checkId === SANDBOX_MISSING_DEPENDENCIES && c.engaged,
  );
  if (missingDeps) {
    const deps = formatSandboxMissingDependencies(missingDeps.context);
    return generateQuickPickItem(SANDBOX_STATUS_MISSING_DEPS, deps);
  }

  const isEnabled = sandboxState.engagedChecks.length === 0;
  return generateQuickPickItem(isEnabled ? SANDBOX_STATUS_ENABLED : SANDBOX_STATUS_DISABLED);
};

export const generateSandboxToggleItem = (
  languageServerFeatureStateProvider: LanguageServerFeatureStateProvider,
): vscode.QuickPickItem | undefined => {
  const sandboxState = languageServerFeatureStateProvider.state[SANDBOX];
  if (!sandboxState || sandboxState.allChecks.length === 0) return undefined;

  // Only show the toggle when sandbox is actually toggleable (not unsupported or missing deps)
  const isBlocked = sandboxState.allChecks.some(
    c =>
      (c.checkId === SANDBOX_UNSUPPORTED_PLATFORM || c.checkId === SANDBOX_MISSING_DEPENDENCIES) &&
      c.engaged,
  );
  if (isBlocked) return undefined;

  const isEnabled = sandboxState.engagedChecks.length === 0;
  return generateQuickPickItem(isEnabled ? DISABLE_SANDBOX : ENABLE_SANDBOX);
};

export const generateDuoDiagnosticsStatusItem = (state: string): vscode.QuickPickItem => {
  if (state === VisibleCodeSuggestionsState.NO_LICENSE) {
    const label = '$(error) Status: 1 problem detected, contact your GitLab administrator.';
    const description = 'Duo license not assigned.';
    return generateQuickPickItem(label, description);
  }

  if (
    state === VisibleCodeSuggestionsState.ERROR ||
    state === VisibleCodeSuggestionsState.SUGGESTIONS_API_ERROR
  ) {
    const label = '$(error) Status: Code Suggestion requests to API are failing.';
    const description = 'See logs for more details.';

    return generateQuickPickItem(label, description);
  }

  return generateQuickPickItem(DUO_STATUS_ZERO_PROBLEMS_DETECTED);
};
