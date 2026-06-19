import {
  DuoCodeSuggestionsConfiguration,
  getDuoCodeSuggestionsConfiguration,
  setDuoCodeSuggestionsConfiguration,
} from '../../utils/extension_configuration';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { toggleCodeSuggestions } from './toggle';

jest.mock('../state_policy/disabled_for_session_policy');
jest.mock('../../utils/extension_configuration', () => ({
  getDuoCodeSuggestionsConfiguration: jest.fn(() => ({ enabled: false })),
  setDuoCodeSuggestionsConfiguration: jest.fn(),
}));

describe('toggle code suggestions command', () => {
  describe('toggleCodeSuggestions (global toggle)', () => {
    it('toggles code suggestions globally when disabled', async () => {
      await toggleCodeSuggestions();

      expect(setDuoCodeSuggestionsConfiguration).toHaveBeenCalledWith({
        enabled: true,
      });
    });

    it('toggles code suggestions globally when enabled', async () => {
      jest
        .mocked(getDuoCodeSuggestionsConfiguration)
        .mockReturnValue(createFakePartial<DuoCodeSuggestionsConfiguration>({ enabled: true }));

      await toggleCodeSuggestions();

      expect(setDuoCodeSuggestionsConfiguration).toHaveBeenCalledWith({
        enabled: false,
      });
    });
  });
});
