import vscode from 'vscode';
import {
  getDuoCodeSuggestionsConfiguration,
  DuoCodeSuggestionsConfiguration,
} from '../utils/extension_configuration';
import { createFakeWorkspaceConfiguration } from '../test_utils/vscode_fakes';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { VisibleCodeSuggestionsState } from '../code_suggestions/code_suggestions_state_manager';
import { USER_COMMANDS } from '../command_names';
import { LanguageServerFeatureStateProvider } from '../language_server/language_server_feature_state_provider';
import {
  generateCodeSuggestionsStatusItem,
  generateDuoChatStatusItem,
  generateCodeSuggestionsToggleItem,
  generateCodeSuggestionsLangToggleItem,
  generateQuickPickItem,
  generateDuoUnavailableStatusItem,
  generateDuoDiagnosticsStatusItem,
  generateSandboxStatusItem,
  generateSandboxToggleItem,
} from './utils';
import {
  CODE_SUGGESTIONS_ENABLED,
  CODE_SUGGESTIONS_DISABLED,
  CODE_SUGGESTIONS_DESCRIPTION,
  DUO_CHAT_ENABLED,
  DUO_CHAT_DISABLED,
  ENABLE_CODE_SUGGESTIONS,
  DISABLE_CODE_SUGGESTIONS,
  DUO_UNAVAILABLE,
  SANDBOX_STATUS_ENABLED,
  SANDBOX_STATUS_DISABLED,
  SANDBOX_STATUS_UNSUPPORTED,
  SANDBOX_STATUS_MISSING_DEPS,
  ENABLE_SANDBOX,
  DISABLE_SANDBOX,
} from './constants';

jest.mock('../utils/extension_configuration');

describe('Quick Pick Utils', () => {
  const label = 'some label';

  describe('generateQuickPickItem', () => {
    it('should generate a QuickPickItem with a label if only a label is provided', () => {
      const result = generateQuickPickItem(label);
      expect(result).toEqual({ label });
    });

    it('should generate a QuickPickItem with a label and a description', () => {
      const description = 'some description';
      const result = generateQuickPickItem(label, description);
      expect(result).toEqual({ label, description });
    });
  });

  describe('generateDuoUnavailableStatusItem', () => {
    it('should generate a QuickPickItem with a label and description for Duo unavailable', () => {
      const description = 'Please sign in to GitLab';
      const result = generateDuoUnavailableStatusItem(VisibleCodeSuggestionsState.NO_ACCOUNT);
      expect(result[0]).toEqual({ label: DUO_UNAVAILABLE, description });
      expect(result[1]).toBeInstanceOf(Function);
    });

    it('should return a function that calls authenticateUser for NO_ACCOUNT state', () => {
      const [, action] = generateDuoUnavailableStatusItem(VisibleCodeSuggestionsState.NO_ACCOUNT);
      const authenticateUserMock = jest.fn();
      jest.spyOn(vscode.commands, 'executeCommand').mockImplementation(authenticateUserMock);

      action();

      expect(authenticateUserMock).toHaveBeenCalledWith(USER_COMMANDS.AUTHENTICATE);
    });

    it('should return an empty function for other states', () => {
      const [, action] = generateDuoUnavailableStatusItem(VisibleCodeSuggestionsState.ERROR);
      expect(action).toBeInstanceOf(Function);
      expect(action()).toBeUndefined();
    });
  });

  describe('generateCodeSuggestionsStatusItem', () => {
    it('should generate a QuickPickItem for enabled code suggestions', () => {
      const result = generateCodeSuggestionsStatusItem(true);
      expect(result).toEqual({
        label: CODE_SUGGESTIONS_ENABLED,
        description: CODE_SUGGESTIONS_DESCRIPTION,
      });
    });

    it('should generate a disabled code suggestions status when language disabled', () => {
      jest.mocked(getDuoCodeSuggestionsConfiguration).mockReturnValue(
        createFakePartial<DuoCodeSuggestionsConfiguration>({
          enabledSupportedLanguages: { javascript: false },
          additionalLanguages: [],
        }),
      );

      vscode.window.activeTextEditor = createFakePartial<vscode.TextEditor>({
        document: createFakePartial<vscode.TextDocument>({
          languageId: 'javascript',
        }),
      });

      const result = generateCodeSuggestionsStatusItem(true);
      expect(result).toEqual({
        label: CODE_SUGGESTIONS_DISABLED,
        description: CODE_SUGGESTIONS_DESCRIPTION,
      });
    });

    it('should generate a QuickPickItem for disabled code suggestions', () => {
      const result = generateCodeSuggestionsStatusItem(false);
      expect(result).toEqual({
        label: CODE_SUGGESTIONS_DISABLED,
        description: CODE_SUGGESTIONS_DESCRIPTION,
      });
    });
  });

  describe('generateDuoChatStatusItem', () => {
    const setDuoChatEnabled = (enabled: boolean) =>
      jest
        .mocked(vscode.workspace.getConfiguration)
        .mockReturnValue(createFakeWorkspaceConfiguration({ duoChat: { enabled } }));

    it('should generate a QuickPickItem for enabled Duo Chat', () => {
      setDuoChatEnabled(true);
      const result = generateDuoChatStatusItem();
      expect(result).toEqual({
        label: DUO_CHAT_ENABLED,
      });
    });

    it('should generate a QuickPickItem for disabled Duo Chat', () => {
      setDuoChatEnabled(false);
      const result = generateDuoChatStatusItem();
      expect(result).toEqual({
        label: DUO_CHAT_DISABLED,
      });
    });
  });

  describe('generateCodeSuggestionsToggleItem', () => {
    it('should generate a QuickPickItem to disable code suggestions when enabled', () => {
      const result = generateCodeSuggestionsToggleItem(true);
      expect(result).toEqual({ label: DISABLE_CODE_SUGGESTIONS });
    });

    it('should generate a QuickPickItem to enable code suggestions when disabled', () => {
      const result = generateCodeSuggestionsToggleItem(false);
      expect(result).toEqual({ label: ENABLE_CODE_SUGGESTIONS });
    });
  });

  describe('generateCodeSuggestionsLangToggleItem', () => {
    beforeEach(() => {
      jest.mocked(getDuoCodeSuggestionsConfiguration).mockReturnValue(
        createFakePartial<DuoCodeSuggestionsConfiguration>({
          enabledSupportedLanguages: { javascript: false },
          additionalLanguages: [],
        }),
      );

      vscode.window.activeTextEditor = createFakePartial<vscode.TextEditor>({
        document: createFakePartial<vscode.TextDocument>({
          languageId: 'javascript',
        }),
      });
    });

    it('should return undefined when code suggestions is globally disabled', () => {
      const result = generateCodeSuggestionsLangToggleItem(false);
      expect(result).toBeUndefined();
    });

    it('should return undefined when no active editor is open', () => {
      vscode.window.activeTextEditor = undefined;

      const result = generateCodeSuggestionsLangToggleItem(true);
      expect(result).toBeUndefined();
    });

    it('should return "Enable" item when language is not enabled', () => {
      const result = generateCodeSuggestionsLangToggleItem(true);
      expect(result).toEqual({
        label: `${ENABLE_CODE_SUGGESTIONS} for javascript`,
      });
    });

    it('should return "Disable" item when language is enabled', () => {
      jest.mocked(getDuoCodeSuggestionsConfiguration).mockReturnValue(
        createFakePartial<DuoCodeSuggestionsConfiguration>({
          enabledSupportedLanguages: { javascript: true },
          additionalLanguages: [],
        }),
      );

      const result = generateCodeSuggestionsLangToggleItem(true);
      expect(result).toEqual({
        label: `${DISABLE_CODE_SUGGESTIONS} for javascript`,
      });
    });

    it('should return "Disable" item when language is in additionalLanguages', () => {
      jest.mocked(getDuoCodeSuggestionsConfiguration).mockReturnValue(
        createFakePartial<DuoCodeSuggestionsConfiguration>({
          enabledSupportedLanguages: {},
          additionalLanguages: ['javascript'],
        }),
      );

      const result = generateCodeSuggestionsLangToggleItem(true);
      expect(result).toEqual({
        label: `${DISABLE_CODE_SUGGESTIONS} for javascript`,
      });
    });
  });

  describe('generateSandboxStatusItem', () => {
    const makeProvider = (
      sandboxAllChecks: { checkId: string; engaged: boolean; context?: unknown }[],
    ) =>
      createFakePartial<LanguageServerFeatureStateProvider>({
        state: {
          sandbox: {
            featureId: 'sandbox',
            engagedChecks: sandboxAllChecks.filter(c => c.engaged),
            allChecks: sandboxAllChecks,
          },
        } as never,
      });

    it('returns undefined when sandbox has no checks', () => {
      const provider = createFakePartial<LanguageServerFeatureStateProvider>({
        state: { sandbox: { featureId: 'sandbox', engagedChecks: [], allChecks: [] } } as never,
      });
      expect(generateSandboxStatusItem(provider)).toBeUndefined();
    });

    it('returns enabled label when no checks are engaged', () => {
      const provider = makeProvider([{ checkId: 'sandbox-disabled-by-user', engaged: false }]);
      expect(generateSandboxStatusItem(provider)).toEqual({ label: SANDBOX_STATUS_ENABLED });
    });

    it('returns disabled label when sandbox-disabled-by-user is engaged', () => {
      const provider = makeProvider([{ checkId: 'sandbox-disabled-by-user', engaged: true }]);
      expect(generateSandboxStatusItem(provider)).toEqual({ label: SANDBOX_STATUS_DISABLED });
    });

    it('returns unsupported label with platform when sandbox-unsupported-platform is engaged', () => {
      const provider = makeProvider([
        {
          checkId: 'sandbox-unsupported-platform',
          engaged: true,
          context: { platform: 'windows' },
        },
      ]);
      expect(generateSandboxStatusItem(provider)).toEqual({
        label: `${SANDBOX_STATUS_UNSUPPORTED} (windows)`,
      });
    });

    it('falls back to "this platform" when context omits it', () => {
      const provider = makeProvider([{ checkId: 'sandbox-unsupported-platform', engaged: true }]);
      expect(generateSandboxStatusItem(provider)).toEqual({
        label: `${SANDBOX_STATUS_UNSUPPORTED} (this platform)`,
      });
    });

    it('returns missing-deps label with formatted deps as description', () => {
      const provider = makeProvider([
        {
          checkId: 'sandbox-missing-dependencies',
          engaged: true,
          context: {
            missingDependencies: [{ name: 'bwrap', installHint: 'apt install bubblewrap' }],
          },
        },
      ]);
      expect(generateSandboxStatusItem(provider)).toEqual({
        label: SANDBOX_STATUS_MISSING_DEPS,
        description: 'bwrap (apt install bubblewrap)',
      });
    });

    it('returns "unknown" description when missing-deps context is empty', () => {
      const provider = makeProvider([{ checkId: 'sandbox-missing-dependencies', engaged: true }]);
      expect(generateSandboxStatusItem(provider)).toEqual({
        label: SANDBOX_STATUS_MISSING_DEPS,
        description: 'unknown',
      });
    });

    it('prefers unsupported-platform over missing-dependencies', () => {
      const provider = makeProvider([
        { checkId: 'sandbox-unsupported-platform', engaged: true },
        { checkId: 'sandbox-missing-dependencies', engaged: true },
      ]);
      expect(generateSandboxStatusItem(provider)?.label).toContain(SANDBOX_STATUS_UNSUPPORTED);
    });

    it('prefers missing-dependencies over disabled-by-user', () => {
      const provider = makeProvider([
        { checkId: 'sandbox-disabled-by-user', engaged: true },
        { checkId: 'sandbox-missing-dependencies', engaged: true },
      ]);
      expect(generateSandboxStatusItem(provider)?.label).toContain(SANDBOX_STATUS_MISSING_DEPS);
    });
  });

  describe('generateSandboxToggleItem', () => {
    const makeProvider = (sandboxAllChecks: { checkId: string; engaged: boolean }[]) =>
      createFakePartial<LanguageServerFeatureStateProvider>({
        state: {
          sandbox: {
            featureId: 'sandbox',
            engagedChecks: sandboxAllChecks.filter(c => c.engaged),
            allChecks: sandboxAllChecks,
          },
        } as never,
      });

    it('returns undefined when sandbox has no checks', () => {
      const provider = createFakePartial<LanguageServerFeatureStateProvider>({
        state: { sandbox: { featureId: 'sandbox', engagedChecks: [], allChecks: [] } } as never,
      });

      expect(generateSandboxToggleItem(provider)).toBeUndefined();
    });

    it('returns "Disable Agent Sandboxing" when sandbox is enabled', () => {
      const provider = makeProvider([{ checkId: 'sandbox-disabled-by-user', engaged: false }]);

      expect(generateSandboxToggleItem(provider)).toEqual({ label: DISABLE_SANDBOX });
    });

    it('returns "Enable Agent Sandboxing" when sandbox is disabled', () => {
      const provider = makeProvider([{ checkId: 'sandbox-disabled-by-user', engaged: true }]);

      expect(generateSandboxToggleItem(provider)).toEqual({ label: ENABLE_SANDBOX });
    });

    it('returns undefined when sandbox-unsupported-platform is engaged', () => {
      const provider = makeProvider([{ checkId: 'sandbox-unsupported-platform', engaged: true }]);

      expect(generateSandboxToggleItem(provider)).toBeUndefined();
    });

    it('returns undefined when sandbox-missing-dependencies is engaged', () => {
      const provider = makeProvider([{ checkId: 'sandbox-missing-dependencies', engaged: true }]);

      expect(generateSandboxToggleItem(provider)).toBeUndefined();
    });
  });

  describe('generateDuoDiagnosticsStatusItem', () => {
    it.each`
      state                                                | stateLabel                                                          | description
      ${VisibleCodeSuggestionsState.NO_LICENSE}            | ${'Status: 1 problem detected, contact your GitLab administrator.'} | ${'Duo license not assigned.'}
      ${VisibleCodeSuggestionsState.ERROR}                 | ${'Status: Code Suggestion requests to API are failing.'}           | ${'See logs for more details.'}
      ${VisibleCodeSuggestionsState.SUGGESTIONS_API_ERROR} | ${'Status: Code Suggestion requests to API are failing.'}           | ${'See logs for more details.'}
    `(
      'calls quick pick item with correct payload for state: $state',
      ({ state, stateLabel, description }) => {
        const result = generateDuoDiagnosticsStatusItem(state);
        expect(result.label).toEqual(`$(error) ${stateLabel}`);
        expect(result.description).toEqual(description);
      },
    );
  });
});
