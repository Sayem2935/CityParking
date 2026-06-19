import {
  DuoSandboxConfiguration,
  getDuoSandboxConfiguration,
  setDuoSandboxConfiguration,
} from '../../utils/extension_configuration';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { toggleSandboxEnabled } from './toggle_sandbox';

jest.mock('../../utils/extension_configuration', () => ({
  getDuoSandboxConfiguration: jest.fn(() => ({ enabled: false })),
  setDuoSandboxConfiguration: jest.fn(),
}));

describe('toggle sandbox command', () => {
  describe('toggleSandboxEnabled', () => {
    it('enables sandbox when currently disabled', async () => {
      await toggleSandboxEnabled();

      expect(setDuoSandboxConfiguration).toHaveBeenCalledWith({ enabled: true });
    });

    it('disables sandbox when currently enabled', async () => {
      jest
        .mocked(getDuoSandboxConfiguration)
        .mockReturnValue(createFakePartial<DuoSandboxConfiguration>({ enabled: true }));

      await toggleSandboxEnabled();

      expect(setDuoSandboxConfiguration).toHaveBeenCalledWith({ enabled: false });
    });
  });
});
