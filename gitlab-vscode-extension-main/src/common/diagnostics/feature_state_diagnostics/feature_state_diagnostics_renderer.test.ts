import {
  AGENT_PLATFORM,
  AGENTIC_CHAT,
  AUTHENTICATION,
  CHAT,
  CHAT_INCLUDE_TERMINAL_CONTEXT_UNAVAILABLE,
  CHAT_TERMINAL_CONTEXT,
  CODE_SUGGESTIONS,
  FLOWS,
  SANDBOX,
  StateCheckId,
} from '@gitlab-org/gitlab-lsp';
import { AllFeaturesState } from '../../language_server/language_server_feature_state_provider';
import { FeatureStateDiagnosticsRenderer } from './feature_state_diagnostics_renderer';

const createMockState = (engaged: boolean): AllFeaturesState => {
  const createCheck = (checkId: StateCheckId, details?: string) => ({
    checkId,
    details,
    engaged,
  });

  return {
    [AUTHENTICATION]: { featureId: AUTHENTICATION, engagedChecks: [], allChecks: [] },
    [CHAT]: {
      featureId: CHAT,
      engagedChecks: engaged
        ? [
            createCheck('authentication-required', 'Authentication required.'),
            createCheck('chat-disabled-by-user', 'Chat manually disabled.'),
            createCheck(
              'chat-no-license',
              'A GitLab Duo license is required to use this feature. Contact your GitLab administrator to request access.',
            ),
            createCheck(
              'duo-disabled-for-project',
              'GitLab Duo features are disabled for this project',
            ),
          ]
        : [],
      allChecks: [
        createCheck('authentication-required', 'Authentication required.'),
        createCheck('chat-disabled-by-user', 'Chat manually disabled.'),
        createCheck(
          'chat-no-license',
          'A GitLab Duo license is required to use this feature. Contact your GitLab administrator to request access.',
        ),
        createCheck(
          'duo-disabled-for-project',
          'GitLab Duo features are disabled for this project',
        ),
      ],
    },
    [CHAT_TERMINAL_CONTEXT]: {
      featureId: CHAT_TERMINAL_CONTEXT,
      engagedChecks: engaged
        ? [
            createCheck(
              CHAT_INCLUDE_TERMINAL_CONTEXT_UNAVAILABLE,
              'Chat terminal context not enabled for user.',
            ),
          ]
        : [],
      allChecks: [
        createCheck(
          CHAT_INCLUDE_TERMINAL_CONTEXT_UNAVAILABLE,
          'Chat terminal context not enabled for user.',
        ),
      ],
    },
    [CODE_SUGGESTIONS]: {
      featureId: CODE_SUGGESTIONS,
      engagedChecks: engaged
        ? [
            createCheck('authentication-required', 'Authentication required.'),
            createCheck('code-suggestions-disabled-by-user', 'Code Suggestions manually disabled.'),
            createCheck('code-suggestions-api-error', 'Error requesting suggestions from the API.'),
            createCheck('code-suggestions-unsupported-gitlab-version'),
            createCheck(
              'code-suggestions-no-license',
              'A GitLab Duo license is required to use this feature. Contact your GitLab administrator to request access.',
            ),
            createCheck(
              'duo-disabled-for-project',
              'GitLab Duo features are disabled for this project',
            ),
            createCheck(
              'code-suggestions-document-unsupported-language',
              'Code suggestions are not supported for this language',
            ),
          ]
        : [],
      allChecks: [
        createCheck('authentication-required', 'Authentication required.'),
        createCheck('code-suggestions-disabled-by-user', 'Code Suggestions manually disabled.'),
        createCheck('code-suggestions-api-error', 'Error requesting suggestions from the API.'),
        createCheck('code-suggestions-unsupported-gitlab-version'),
        createCheck(
          'code-suggestions-no-license',
          'A GitLab Duo license is required to use this feature. Contact your GitLab administrator to request access.',
        ),
        createCheck(
          'duo-disabled-for-project',
          'GitLab Duo features are disabled for this project',
        ),
        createCheck(
          'code-suggestions-document-unsupported-language',
          'Code suggestions are not supported for this language',
        ),
      ],
    },
    [AGENTIC_CHAT]: {
      featureId: AGENTIC_CHAT,
      engagedChecks: engaged
        ? [
            createCheck('authentication-required', 'Authentication required.'),
            createCheck(
              'agentic-chat-feature-flag-disabled' as StateCheckId,
              'Feature flag disabled',
            ),
            createCheck('agentic-chat-no-support', 'Not supported'),
          ]
        : [],
      allChecks: [
        createCheck('authentication-required', 'Authentication required.'),
        createCheck('agentic-chat-feature-flag-disabled' as StateCheckId, 'Feature flag disabled'),
        createCheck('agentic-chat-no-support', 'Not supported'),
      ],
    },
    [AGENT_PLATFORM]: {
      featureId: AGENT_PLATFORM,
      engagedChecks: engaged
        ? [
            createCheck('authentication-required', 'Authentication required.'),
            createCheck('agent-platform-disabled-by-user', 'Agent Platform disabled by user'),
          ]
        : [],
      allChecks: [
        createCheck('authentication-required', 'Authentication required.'),
        createCheck('agent-platform-disabled-by-user', 'Agent Platform disabled by user'),
      ],
    },
    [FLOWS]: {
      featureId: FLOWS,
      engagedChecks: engaged
        ? [
            createCheck('authentication-required', 'Authentication required.'),
            createCheck('agentic-chat-no-support', 'Not supported'),
          ]
        : [],
      allChecks: [
        createCheck('authentication-required', 'Authentication required.'),
        createCheck('agentic-chat-no-support', 'Not supported'),
      ],
    },
    [SANDBOX]: {
      featureId: SANDBOX,
      engagedChecks: engaged ? [createCheck('sandbox-disabled-by-user' as StateCheckId)] : [],
      allChecks: [
        createCheck('sandbox-disabled-by-user' as StateCheckId),
        createCheck('sandbox-missing-dependencies' as StateCheckId),
      ],
    },
  };
};

describe('FeatureStateDiagnosticsRenderer', () => {
  const testCases = [
    {
      name: 'when checks are not engaged',
      engaged: false,
      expectedStatus: 'On',
      checkStatusPre: '[x]',
      checkStatusAppend: '(true)',
    },
    {
      name: 'when checks are engaged',
      engaged: true,
      expectedStatus: 'Off',
      checkStatusPre: '[ ]',
      checkStatusAppend: '(false)',
    },
  ];

  test.each(testCases)(
    '$name',
    ({ engaged, expectedStatus, checkStatusPre, checkStatusAppend }) => {
      const renderer = new FeatureStateDiagnosticsRenderer();
      const mockState = createMockState(engaged);
      const result = renderer.render([mockState]);
      const details = (text: string) => (engaged ? `\n  > ${text}` : '');

      const expectedCodeSuggestions =
        `- ${checkStatusPre} User is authenticated ${checkStatusAppend}${details('Authentication required.')}\n` +
        `- ${checkStatusPre} Code Suggestions is enabled in settings ${checkStatusAppend}${details('Code Suggestions manually disabled.')}\n` +
        `- ${checkStatusPre} Code Suggestions API connection is working ${checkStatusAppend}${details('Error requesting suggestions from the API.')}\n` +
        `- ${checkStatusPre} The GitLab instance version supports Code Suggestions ${checkStatusAppend}\n` +
        `- ${checkStatusPre} Valid GitLab license ${checkStatusAppend}${details('A GitLab Duo license is required to use this feature. Contact your GitLab administrator to request access.')}\n` +
        `- ${checkStatusPre} GitLab Duo is enabled for the open project(s) ${checkStatusAppend}${details('GitLab Duo features are disabled for this project')}`;

      const expectedDuo =
        `- ${checkStatusPre} User is authenticated ${checkStatusAppend}${details('Authentication required.')}\n` +
        `- ${checkStatusPre} Non-Agentic Chat is enabled in settings ${checkStatusAppend}${details('Chat manually disabled.')}\n` +
        `- ${checkStatusPre} Valid GitLab license ${checkStatusAppend}${details('A GitLab Duo license is required to use this feature. Contact your GitLab administrator to request access.')}\n` +
        `- ${checkStatusPre} GitLab Duo is enabled for the open project(s) ${checkStatusAppend}${details('GitLab Duo features are disabled for this project')}`;

      const expectedTerminalContext = `- ${checkStatusPre} Include terminal context is enabled for user ${checkStatusAppend}${details('Chat terminal context not enabled for user.')}`;

      // Note: Only checks with labels in STATE_CHECK_USER_READABLE_LABELS will appear
      // The 'agentic-chat-feature-flag-disabled' check doesn't have a label, so it's filtered out
      const expectedAgenticChat =
        `- ${checkStatusPre} User is authenticated ${checkStatusAppend}${details('Authentication required.')}\n` +
        `- ${checkStatusPre} Agentic Chat is supported for the current project ${checkStatusAppend}${details('Not supported')}\n` +
        `- ${checkStatusPre} Agent Platform is enabled in settings ${checkStatusAppend}${details('Agent Platform disabled by user')}`;

      const expectedFlows =
        `- ${checkStatusPre} User is authenticated ${checkStatusAppend}${details('Authentication required.')}\n` +
        `- ${checkStatusPre} Agentic Chat is supported for the current project ${checkStatusAppend}${details('Not supported')}\n` +
        `- ${checkStatusPre} Agent Platform is enabled in settings ${checkStatusAppend}${details('Agent Platform disabled by user')}`;

      expect(result[0].title).toBe(`GitLab Duo Code Suggestions (${expectedStatus})`);
      expect(result[0].content).toBe(expectedCodeSuggestions);
      expect(result[1].title).toBe(`GitLab Duo Non-Agentic Chat (${expectedStatus})`);
      expect(result[1].content).toBe(expectedDuo);
      expect(result[2].title).toBe(`Terminal Context (${expectedStatus})`);
      expect(result[2].content).toBe(expectedTerminalContext);
      expect(result[3].title).toBe(`GitLab Duo Agentic Chat (${expectedStatus})`);
      expect(result[3].content).toBe(expectedAgenticChat);
      expect(result[4].title).toBe(`GitLab Flows (${expectedStatus})`);
      expect(result[4].content).toBe(expectedFlows);

      const expectedSandboxing =
        `- ${checkStatusPre} Process sandboxing is enabled in settings ${checkStatusAppend}\n` +
        `- ${checkStatusPre} System dependencies required for process sandboxing are installed ${checkStatusAppend}`;

      expect(result[5].title).toBe(`GitLab Duo Agent Sandboxing (${expectedStatus})`);
      expect(result[5].content).toBe(expectedSandboxing);
    },
  );

  it('should return an empty array when language server is disabled', () => {
    const renderer = new FeatureStateDiagnosticsRenderer();
    const mockEmptyState: AllFeaturesState = {
      [AGENT_PLATFORM]: { featureId: AGENT_PLATFORM, engagedChecks: [], allChecks: [] },
      [AUTHENTICATION]: { featureId: AUTHENTICATION, engagedChecks: [], allChecks: [] },
      [CHAT]: { featureId: CHAT, engagedChecks: [], allChecks: [] },
      [CHAT_TERMINAL_CONTEXT]: {
        featureId: CHAT_TERMINAL_CONTEXT,
        engagedChecks: [],
        allChecks: [],
      },
      [CODE_SUGGESTIONS]: { featureId: CODE_SUGGESTIONS, engagedChecks: [], allChecks: [] },
      [AGENTIC_CHAT]: { featureId: AGENTIC_CHAT, engagedChecks: [], allChecks: [] },
      [FLOWS]: { featureId: FLOWS, engagedChecks: [], allChecks: [] },
      [SANDBOX]: { featureId: SANDBOX, engagedChecks: [], allChecks: [] },
    };
    const result = renderer.render([mockEmptyState]);
    expect(result).toEqual([]);
  });
});
