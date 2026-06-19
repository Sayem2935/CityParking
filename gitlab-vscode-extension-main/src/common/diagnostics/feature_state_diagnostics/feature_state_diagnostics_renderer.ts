import {
  AGENT_PLATFORM,
  CHAT,
  CODE_SUGGESTIONS,
  FeatureState,
  FeatureStateCheck,
  StateCheckId,
  STATE_CHECK_USER_READABLE_LABELS,
  UNSUPPORTED_LANGUAGE,
  CHAT_TERMINAL_CONTEXT,
  AGENTIC_CHAT,
  FLOWS,
  SANDBOX,
} from '@gitlab-org/gitlab-lsp';
import { DiagnosticsRenderer, DiagnosticsSection } from '../diagnostics_service';
import {
  AllFeaturesState,
  LanguageServerFeatureStateKey,
} from '../../language_server/language_server_feature_state_provider';

const checkEnabledMapper = ({ engaged, checkId, details }: FeatureStateCheck<StateCheckId>) => {
  const line = `- [${engaged ? ' ' : 'x'}] ${STATE_CHECK_USER_READABLE_LABELS[checkId]} (${engaged ? 'false' : 'true'})`;
  return engaged && details ? `${line}\n  > ${details}` : line;
};

const createFeatureStateDiagnosticsSection = (
  title: string,
  checks: FeatureState,
  additionalChecks?: FeatureStateCheck<StateCheckId>[],
): DiagnosticsSection => {
  // UNSUPPORTED_LANGUAGE check returns false by default on markdown files
  const diagnosticsChecks = checks.allChecks.filter(
    ch => STATE_CHECK_USER_READABLE_LABELS[ch.checkId] && ch.checkId !== UNSUPPORTED_LANGUAGE,
  );

  // Merge additional checks if provided
  const allChecks = additionalChecks
    ? [...diagnosticsChecks, ...additionalChecks]
    : diagnosticsChecks;

  const onOff = allChecks.find(ch => ch.engaged) ? 'Off' : 'On';

  return {
    title: `${title} (${onOff})`,
    content: allChecks.map(checkEnabledMapper).join('\n') || '',
  };
};

export class FeatureStateDiagnosticsRenderer implements DiagnosticsRenderer<[AllFeaturesState]> {
  keys = [LanguageServerFeatureStateKey] as const;

  render([state]: [AllFeaturesState]): DiagnosticsSection[] {
    if (state[CODE_SUGGESTIONS].allChecks.length === 0 && state[CHAT].allChecks.length === 0) {
      return [];
    }

    // Get only the "Agent Platform is enabled in settings" check to merge into Agentic Chat and Flows
    // We filter out the authentication check and only include the platform-specific check
    const agentPlatformEnabledCheck = state[AGENT_PLATFORM].allChecks.filter(
      ch =>
        STATE_CHECK_USER_READABLE_LABELS[ch.checkId] && ch.checkId !== 'authentication-required',
    );

    return [
      createFeatureStateDiagnosticsSection('GitLab Duo Code Suggestions', state[CODE_SUGGESTIONS]),
      createFeatureStateDiagnosticsSection('GitLab Duo Non-Agentic Chat', state[CHAT]),
      createFeatureStateDiagnosticsSection('Terminal Context', state[CHAT_TERMINAL_CONTEXT]),
      createFeatureStateDiagnosticsSection(
        'GitLab Duo Agentic Chat',
        state[AGENTIC_CHAT],
        agentPlatformEnabledCheck,
      ),
      createFeatureStateDiagnosticsSection('GitLab Flows', state[FLOWS], agentPlatformEnabledCheck),
      createFeatureStateDiagnosticsSection('GitLab Duo Agent Sandboxing', state[SANDBOX]),
    ];
  }
}
