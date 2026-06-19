import {
  formatSandboxPlatform,
  parseSandboxMissingDependencies,
  formatSandboxMissingDependencies,
  sandboxMissingDependencyKey,
} from './sandbox_utils';

describe('sandbox utils', () => {
  describe('formatSandboxPlatform', () => {
    it('returns the platform name when it is a valid string', () => {
      expect(formatSandboxPlatform({ platform: 'linux' })).toBe('linux');
      expect(formatSandboxPlatform({ platform: 'macos' })).toBe('macos');
      expect(formatSandboxPlatform({ platform: 'windows' })).toBe('windows');
    });

    it('returns "this platform" when platform is "unsupported"', () => {
      expect(formatSandboxPlatform({ platform: 'unsupported' })).toBe('this platform');
    });

    it('returns "this platform" when platform is an empty string', () => {
      expect(formatSandboxPlatform({ platform: '' })).toBe('this platform');
    });

    it('returns "this platform" when context has no platform field', () => {
      expect(formatSandboxPlatform({})).toBe('this platform');
    });

    it('returns "this platform" when context is undefined', () => {
      expect(formatSandboxPlatform(undefined)).toBe('this platform');
    });

    it('returns "this platform" when platform is not a string', () => {
      expect(formatSandboxPlatform({ platform: 42 })).toBe('this platform');
    });
  });

  describe('parseSandboxMissingDependencies', () => {
    it('returns parsed deps when context is valid', () => {
      const context = {
        missingDependencies: [
          { name: 'bwrap', installHint: 'apt install bubblewrap' },
          { name: 'newuidmap' },
        ],
      };
      expect(parseSandboxMissingDependencies(context)).toEqual([
        { name: 'bwrap', installHint: 'apt install bubblewrap' },
        { name: 'newuidmap' },
      ]);
    });

    it('filters out entries without a string name', () => {
      const context = {
        missingDependencies: [{ name: 'bwrap' }, { installHint: 'no name' }, 'not-an-object'],
      };
      expect(parseSandboxMissingDependencies(context)).toEqual([{ name: 'bwrap' }]);
    });

    it('returns an empty array when missingDependencies is not an array', () => {
      expect(parseSandboxMissingDependencies({ missingDependencies: 'bad' })).toEqual([]);
    });

    it('returns an empty array when context is undefined', () => {
      expect(parseSandboxMissingDependencies(undefined)).toEqual([]);
    });
  });

  describe('formatSandboxMissingDependencies', () => {
    it('formats deps with install hints', () => {
      const context = {
        missingDependencies: [
          { name: 'bwrap', installHint: 'apt install bubblewrap' },
          { name: 'newuidmap', installHint: 'apt install uidmap' },
        ],
      };
      expect(formatSandboxMissingDependencies(context)).toBe(
        'bwrap (apt install bubblewrap), newuidmap (apt install uidmap)',
      );
    });

    it('formats deps without install hints', () => {
      const context = { missingDependencies: [{ name: 'bwrap' }] };
      expect(formatSandboxMissingDependencies(context)).toBe('bwrap');
    });

    it('returns "unknown" when context has no deps', () => {
      expect(formatSandboxMissingDependencies(undefined)).toBe('unknown');
      expect(formatSandboxMissingDependencies({})).toBe('unknown');
    });
  });

  describe('sandboxMissingDependencyKey', () => {
    it('returns a sorted comma-joined string of dep names', () => {
      const context = {
        missingDependencies: [{ name: 'socat' }, { name: 'bwrap' }],
      };
      expect(sandboxMissingDependencyKey(context)).toBe('bwrap,socat');
    });

    it('returns an empty string when there are no deps', () => {
      expect(sandboxMissingDependencyKey(undefined)).toBe('');
    });
  });
});
