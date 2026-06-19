import { Sanitizer, defaultSanitizer } from './sanitizer';

describe('Sanitizer', () => {
  describe('GitLab tokens', () => {
    it('redacts glpat- tokens', () => {
      const input = 'token: glpat-1234567890abcdef';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('token: [REDACTED_GITLAB_TOKEN]');
    });

    it('redacts glptt- tokens', () => {
      const input = 'trigger token: glptt-abc123xyz';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('trigger token: [REDACTED_GITLAB_TOKEN]');
    });

    it('redacts gloas- tokens', () => {
      const input = 'oauth token: gloas-secret-token';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('oauth token: [REDACTED_GITLAB_TOKEN]');
    });

    it('redacts glpsc- tokens', () => {
      const input = 'session token: glpsc-session-123';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('session token: [REDACTED_GITLAB_TOKEN]');
    });

    it('redacts multiple GitLab tokens in same text', () => {
      const input = 'token1: glpat-abc token2: glptt-xyz';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('token1: [REDACTED_GITLAB_TOKEN] token2: [REDACTED_GITLAB_TOKEN]');
    });

    it('handles GitLab tokens at line boundaries', () => {
      const input = 'glpat-start\nglpat-end';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('[REDACTED_GITLAB_TOKEN]\n[REDACTED_GITLAB_TOKEN]');
    });
  });

  describe('Bearer tokens', () => {
    it('redacts Bearer tokens', () => {
      const input = 'Authorization: Bearer abc123.xyz789';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Authorization: Bearer [REDACTED_TOKEN]');
    });

    it('redacts Bearer tokens with various characters', () => {
      const input = 'Bearer jwt.token_with-special.chars';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Bearer [REDACTED_TOKEN]');
    });

    it('handles multiple Bearer tokens', () => {
      const input = 'Bearer token1 and Bearer token2';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Bearer [REDACTED_TOKEN] and Bearer [REDACTED_TOKEN]');
    });
  });

  describe('GitLab HTTP header tokens', () => {
    it('redacts PRIVATE-TOKEN header values', () => {
      const input = 'PRIVATE-TOKEN: glpat-abc123xyz';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('PRIVATE-TOKEN: [REDACTED_TOKEN]');
    });

    it('redacts JOB-TOKEN header values', () => {
      const input = 'JOB-TOKEN: some-ci-token-value';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('JOB-TOKEN: [REDACTED_TOKEN]');
    });

    it('redacts X-GITLAB-TOKEN header values', () => {
      const input = 'X-GITLAB-TOKEN: webhook-secret-123';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('X-GITLAB-TOKEN: [REDACTED_TOKEN]');
    });

    it('redacts header tokens with equals separator', () => {
      const input = 'PRIVATE-TOKEN=my-secret-token';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('PRIVATE-TOKEN: [REDACTED_TOKEN]');
    });

    it('is case-insensitive for header names', () => {
      const input = 'private-token: some-token';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('private-token: [REDACTED_TOKEN]');
    });
  });

  describe('Basic auth', () => {
    it('redacts Basic auth credentials', () => {
      const input = 'Authorization: Basic dXNlcjpwYXNzd29yZA==';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Authorization: Basic [REDACTED_CREDENTIALS]');
    });
  });

  describe('Passwords', () => {
    it('redacts password with colon separator', () => {
      const input = 'password: mysecret123';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('password: [REDACTED_PASSWORD]');
    });

    it('redacts password with equals separator', () => {
      const input = 'password=mysecret123';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('password=[REDACTED_PASSWORD]');
    });

    it('redacts password with quoted value', () => {
      const input = 'password: "mysecret123"';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('password: [REDACTED_PASSWORD]');
    });

    it('handles case-insensitive password matching', () => {
      const input = 'PASSWORD: secret and Password: secret2';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toContain('[REDACTED_PASSWORD]');
    });

    it('does not redact password in phrases without assignment', () => {
      const input = 'Invalid password format';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Invalid password format');
    });
  });

  describe('URLs with credentials', () => {
    it('redacts URLs with username and password', () => {
      const input = 'https://user:pass@gitlab.com/api/v4';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('https://[REDACTED_USERNAME]:[REDACTED_PASSWORD]@gitlab.com/api/v4');
    });

    it('redacts HTTP URLs with credentials', () => {
      const input = 'http://admin:secret@localhost:8080/path';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('http://[REDACTED_USERNAME]:[REDACTED_PASSWORD]@localhost:8080/path');
    });

    it('redacts URLs with credentials and query params', () => {
      const input = 'https://user:pass@example.com/path?query=value';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe(
        'https://[REDACTED_USERNAME]:[REDACTED_PASSWORD]@example.com/path?query=value',
      );
    });

    it('redacts URLs with credentials and hash', () => {
      const input = 'https://user:pass@example.com/path#section';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe(
        'https://[REDACTED_USERNAME]:[REDACTED_PASSWORD]@example.com/path#section',
      );
    });

    it('preserves URLs without credentials', () => {
      const input = 'https://gitlab.com/api/v4';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('https://gitlab.com/api/v4');
    });
  });

  describe('File paths', () => {
    it('redacts Windows user paths', () => {
      const input = 'File: C:\\Users\\john\\project\\file.ts';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('File: C:\\Users\\[REDACTED_USER]\\project\\file.ts');
    });

    it('redacts multiple Windows paths', () => {
      const input = 'C:\\Users\\alice\\file1 and C:\\Users\\bob\\file2';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe(
        'C:\\Users\\[REDACTED_USER]\\file1 and C:\\Users\\[REDACTED_USER]\\file2',
      );
    });

    it('redacts Unix /home paths', () => {
      const input = 'Path: /home/jane/workspace/file.ts';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Path: /home/[REDACTED_USER]/workspace/file.ts');
    });

    it('redacts macOS /Users paths', () => {
      const input = 'Path: /Users/john/project/file.ts';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Path: /Users/[REDACTED_USER]/project/file.ts');
    });

    it('handles mixed Windows and Unix paths', () => {
      const input = 'Windows: C:\\Users\\alice\\file Unix: /home/bob/file';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe(
        'Windows: C:\\Users\\[REDACTED_USER]\\file Unix: /home/[REDACTED_USER]/file',
      );
    });

    it('preserves system paths without user directories', () => {
      const input = 'Path: /usr/bin/node';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Path: /usr/bin/node');
    });

    it('preserves Windows system paths', () => {
      const input = 'Path: C:\\Program Files\\app';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('Path: C:\\Program Files\\app');
    });
  });

  describe('Combined patterns', () => {
    it('redacts multiple patterns in same text', () => {
      const input =
        'Token glpat-abc in C:\\Users\\john with password: secret123 at https://user:pass@gitlab.com';
      const result = defaultSanitizer.sanitize(input);

      expect(result).toContain('[REDACTED_GITLAB_TOKEN]');
      expect(result).toContain('[REDACTED_USER]');
      expect(result).toContain('[REDACTED_PASSWORD]');
      expect(result).toContain('[REDACTED_USERNAME]');
    });

    it('handles multiline content with various patterns', () => {
      const input = `Log entry 1: glpat-token123
Path: /Users/alice/project
Password: mysecret
URL: https://admin:pass@example.com`;

      const result = defaultSanitizer.sanitize(input);

      expect(result).toContain('[REDACTED_GITLAB_TOKEN]');
      expect(result).toContain('/Users/[REDACTED_USER]/project');
      expect(result).toContain('[REDACTED_PASSWORD]');
      expect(result).toContain('[REDACTED_USERNAME]');
    });
  });

  describe('Custom patterns', () => {
    it('applies custom redaction patterns', () => {
      const customPattern = /SECRET_\w+/g;
      const sanitizer = new Sanitizer({ customPatterns: [customPattern] });

      const input = 'Value is SECRET_API_KEY_123';
      const result = sanitizer.sanitize(input);
      expect(result).toBe('Value is [REDACTED]');
    });

    it('applies multiple custom patterns', () => {
      const pattern1 = /API_KEY_\w+/g;
      const pattern2 = /SESSION_\w+/g;
      const sanitizer = new Sanitizer({ customPatterns: [pattern1, pattern2] });

      const input = 'API_KEY_abc and SESSION_xyz';
      const result = sanitizer.sanitize(input);
      expect(result).toBe('[REDACTED] and [REDACTED]');
    });
  });

  describe('Selective redaction', () => {
    it('can disable token redaction', () => {
      const sanitizer = new Sanitizer({ redactTokens: false });
      const input = 'token: glpat-1234567890';
      const result = sanitizer.sanitize(input);
      expect(result).toBe('token: glpat-1234567890');
    });

    it('can disable password redaction', () => {
      const sanitizer = new Sanitizer({ redactPasswords: false });
      const input = 'password: mysecret';
      const result = sanitizer.sanitize(input);
      expect(result).toBe('password: mysecret');
    });

    it('can disable file path redaction', () => {
      const sanitizer = new Sanitizer({ redactFilePaths: false });
      const input = 'Path: /Users/john/file';
      const result = sanitizer.sanitize(input);
      expect(result).toBe('Path: /Users/john/file');
    });

    it('can disable URL credential redaction', () => {
      const sanitizer = new Sanitizer({ redactUrls: false });
      const input = 'https://user:pass@example.com';
      const result = sanitizer.sanitize(input);
      expect(result).toBe('https://user:pass@example.com');
    });

    it('applies only enabled redactions', () => {
      const sanitizer = new Sanitizer({
        redactTokens: true,
        redactPasswords: false,
        redactFilePaths: false,
        redactUrls: false,
      });

      const input = 'glpat-token at /Users/john with password: secret';
      const result = sanitizer.sanitize(input);

      expect(result).toContain('[REDACTED_GITLAB_TOKEN]');
      expect(result).toContain('/Users/john');
      expect(result).toContain('password: secret');
    });
  });

  describe('Edge cases', () => {
    it('handles empty string', () => {
      const result = defaultSanitizer.sanitize('');
      expect(result).toBe('');
    });

    it('handles string with no sensitive data', () => {
      const input = 'This is a normal log message';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('This is a normal log message');
    });

    it('handles partial token patterns that should not be redacted', () => {
      const input = 'glpat is a prefix but glpat- needs more';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toBe('glpat is a prefix but glpat- needs more');
    });

    it('handles special regex characters in content', () => {
      const input = 'Pattern: /test[^a-z]+$/ with glpat-token';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toContain('[REDACTED_GITLAB_TOKEN]');
      expect(result).toContain('Pattern: /test[^a-z]+$/');
    });

    it('preserves whitespace and formatting', () => {
      const input = '  Token:  glpat-abc  \n  Next line  ';
      const result = defaultSanitizer.sanitize(input);
      expect(result).toContain('  Token:  [REDACTED_GITLAB_TOKEN]  \n  Next line  ');
    });
  });
});
