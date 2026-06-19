import {
  getDuoCodeSuggestionsConfiguration,
  setDuoCodeSuggestionsConfiguration,
} from '../../utils/extension_configuration';

export const COMMAND_TOGGLE_CODE_SUGGESTIONS = 'gl.toggleCodeSuggestions';

/**
 * Toggle code suggestions globally by updating workspace settings.
 * This ensures the Language Server is notified via DidChangeConfigurationNotification.
 */
export const toggleCodeSuggestions = async () => {
  const config = getDuoCodeSuggestionsConfiguration();
  await setDuoCodeSuggestionsConfiguration({ enabled: !config.enabled });
};
