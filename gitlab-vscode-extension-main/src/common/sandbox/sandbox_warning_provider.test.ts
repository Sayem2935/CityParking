import * as vscode from 'vscode';
import {
  AGENT_PLATFORM,
  AGENTIC_CHAT,
  AUTHENTICATION,
  CHAT,
  CHAT_TERMINAL_CONTEXT,
  CODE_SUGGESTIONS,
  FLOWS,
  SANDBOX,
  FeatureState,
  FeatureStateCheck,
} from '@gitlab-org/gitlab-lsp';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { createFakeWorkspaceConfiguration } from '../test_utils/vscode_fakes';
import {
  AllFeaturesState,
  LanguageServerFeatureStateProvider,
} from '../language_server/language_server_feature_state_provider';
import { SandboxWarningProvider } from './sandbox_warning_provider';

const SANDBOX_UNSUPPORTED_PLATFORM = 'sandbox-unsupported-platform';
const SANDBOX_MISSING_DEPENDENCIES = 'sandbox-missing-dependencies';

const emptyChecks = (): FeatureState => ({ featureId: SANDBOX, engagedChecks: [], allChecks: [] });

const buildState = (sandbox: FeatureState): AllFeaturesState =>
  createFakePartial<AllFeaturesState>({
    [AUTHENTICATION]: createFakePartial<FeatureState>({}),
    [CODE_SUGGESTIONS]: createFakePartial<FeatureState>({}),
    [CHAT]: createFakePartial<FeatureState>({}),
    [CHAT_TERMINAL_CONTEXT]: createFakePartial<FeatureState>({}),
    [AGENTIC_CHAT]: createFakePartial<FeatureState>({}),
    [AGENT_PLATFORM]: createFakePartial<FeatureState>({}),
    [FLOWS]: createFakePartial<FeatureState>({}),
    [SANDBOX]: sandbox,
  });

describe('SandboxWarningProvider', () => {
  let listener: ((states: AllFeaturesState) => void) | undefined;
  let stateProvider: LanguageServerFeatureStateProvider;
  let provider: SandboxWarningProvider;

  const triggerState = (sandbox: FeatureState) => {
    listener?.(buildState(sandbox));
  };

  const showWarningMessage = () => jest.mocked(vscode.window.showWarningMessage);

  beforeEach(() => {
    listener = undefined;
    stateProvider = createFakePartial<LanguageServerFeatureStateProvider>({
      onChange: jest.fn(cb => {
        listener = cb;
        return new vscode.Disposable(() => {});
      }),
    });

    jest
      .mocked(vscode.workspace.getConfiguration)
      .mockReturnValue(createFakeWorkspaceConfiguration({ enabled: true }));

    jest.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined as never);

    provider = new SandboxWarningProvider(stateProvider);
    provider.start();
  });

  afterEach(() => {
    provider.dispose();
  });

  it('does not warn when no sandbox checks are engaged', () => {
    triggerState(emptyChecks());
    expect(showWarningMessage()).not.toHaveBeenCalled();
  });

  it('warns once when the platform is unsupported', () => {
    const check = createFakePartial<FeatureStateCheck<typeof SANDBOX_UNSUPPORTED_PLATFORM>>({
      checkId: SANDBOX_UNSUPPORTED_PLATFORM,
      engaged: true,
      context: { platform: 'win32' } as never,
    });
    triggerState({ featureId: SANDBOX, engagedChecks: [check], allChecks: [check] });
    triggerState({ featureId: SANDBOX, engagedChecks: [check], allChecks: [check] });

    expect(showWarningMessage()).toHaveBeenCalledTimes(1);
    expect(showWarningMessage()).toHaveBeenCalledWith(
      expect.stringContaining('win32 is not supported'),
      'Open Settings',
      'Disable Sandboxing',
    );
  });

  const buildMissingCheck = (deps: string[]) =>
    createFakePartial<FeatureStateCheck<typeof SANDBOX_MISSING_DEPENDENCIES>>({
      checkId: SANDBOX_MISSING_DEPENDENCIES,
      engaged: true,
      context: {
        missingDependencies: deps.map(name => ({ name, installHint: `brew install ${name}` })),
      } as never,
    });

  it("formats an 'unsupported' platform value as 'this platform'", () => {
    const check = createFakePartial<FeatureStateCheck<typeof SANDBOX_UNSUPPORTED_PLATFORM>>({
      checkId: SANDBOX_UNSUPPORTED_PLATFORM,
      engaged: true,
      context: { platform: 'unsupported' } as never,
    });
    triggerState({ featureId: SANDBOX, engagedChecks: [check], allChecks: [check] });

    expect(showWarningMessage()).toHaveBeenCalledWith(
      expect.stringContaining('this platform is not supported'),
      'Open Settings',
      'Disable Sandboxing',
    );
    expect(showWarningMessage().mock.calls[0][0]).not.toContain('unsupported is not supported');
  });

  it('warns again when the missing-dependency set changes', () => {
    const firstCheck = buildMissingCheck(['bwrap']);
    triggerState({ featureId: SANDBOX, engagedChecks: [firstCheck], allChecks: [firstCheck] });
    const secondCheck = buildMissingCheck(['bwrap', 'newuidmap']);
    triggerState({ featureId: SANDBOX, engagedChecks: [secondCheck], allChecks: [secondCheck] });

    expect(showWarningMessage()).toHaveBeenCalledTimes(2);
    expect(showWarningMessage().mock.calls[0][0]).toContain('bwrap (brew install bwrap)');
    expect(showWarningMessage().mock.calls[1][0]).toContain('newuidmap');
  });

  it('does not re-warn when the same dependency set arrives in a different order', () => {
    const firstCheck = buildMissingCheck(['bwrap', 'newuidmap']);
    triggerState({ featureId: SANDBOX, engagedChecks: [firstCheck], allChecks: [firstCheck] });
    const reorderedCheck = buildMissingCheck(['newuidmap', 'bwrap']);
    triggerState({
      featureId: SANDBOX,
      engagedChecks: [reorderedCheck],
      allChecks: [reorderedCheck],
    });

    expect(showWarningMessage()).toHaveBeenCalledTimes(1);
  });

  it('does not warn when the user has disabled sandboxing', () => {
    jest
      .mocked(vscode.workspace.getConfiguration)
      .mockReturnValue(createFakeWorkspaceConfiguration({ enabled: false }));
    const check = createFakePartial<FeatureStateCheck<typeof SANDBOX_UNSUPPORTED_PLATFORM>>({
      checkId: SANDBOX_UNSUPPORTED_PLATFORM,
      engaged: true,
      context: { platform: 'win32' } as never,
    });
    triggerState({ featureId: SANDBOX, engagedChecks: [check], allChecks: [check] });

    expect(showWarningMessage()).not.toHaveBeenCalled();
  });

  it('prefers unsupported-platform over missing-dependencies when both are engaged', () => {
    const unsupported = createFakePartial<FeatureStateCheck<typeof SANDBOX_UNSUPPORTED_PLATFORM>>({
      checkId: SANDBOX_UNSUPPORTED_PLATFORM,
      engaged: true,
      context: { platform: 'win32' } as never,
    });
    const missing = createFakePartial<FeatureStateCheck<typeof SANDBOX_MISSING_DEPENDENCIES>>({
      checkId: SANDBOX_MISSING_DEPENDENCIES,
      engaged: true,
      context: { missingDependencies: [{ name: 'bwrap' }] } as never,
    });
    triggerState({
      featureId: SANDBOX,
      engagedChecks: [unsupported, missing],
      allChecks: [unsupported, missing],
    });

    expect(showWarningMessage()).toHaveBeenCalledTimes(1);
    expect(showWarningMessage()).toHaveBeenCalledWith(
      expect.stringContaining('win32 is not supported'),
      'Open Settings',
      'Disable Sandboxing',
    );
  });
});
