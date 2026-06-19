import {
  getDuoSandboxConfiguration,
  setDuoSandboxConfiguration,
} from '../../utils/extension_configuration';

export const COMMAND_TOGGLE_SANDBOX = 'gl.toggleSandbox';

/**
 * Toggle sandbox enabled in settings.
 * This ensures the Language Server is notified via DidChangeConfigurationNotification.
 */
export const toggleSandboxEnabled = async () => {
  const config = getDuoSandboxConfiguration();
  await setDuoSandboxConfiguration({ enabled: !config.enabled });
};
