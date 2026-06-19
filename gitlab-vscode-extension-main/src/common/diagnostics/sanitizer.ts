export interface SanitizerOptions {
  redactTokens?: boolean;
  redactPasswords?: boolean;
  redactFilePaths?: boolean;
  redactUrls?: boolean;
  customPatterns?: RegExp[];
}

export class Sanitizer {
  // GitLab token patterns (glpat-, glptt-, gloas-, glpsc-)
  readonly #GITLAB_TOKEN_PATTERN = /gl(pat|ptt|oas|psc)-[a-zA-Z0-9_-]+/gi;

  // GitLab HTTP header token patterns (PRIVATE-TOKEN, JOB-TOKEN, X-GITLAB-TOKEN)
  readonly #HEADER_TOKEN_PATTERN =
    /(PRIVATE-TOKEN|JOB-TOKEN|X-GITLAB-TOKEN)['"\s:=]+['"]?[^\s"';,}]+['"]?/gi;

  // Bearer and Basic auth patterns
  readonly #BEARER_TOKEN_PATTERN = /Bearer\s+[a-zA-Z0-9._-]+/gi;

  readonly #BASIC_AUTH_PATTERN = /Basic\s+[a-zA-Z0-9+/=]+/gi;

  // Password patterns (require : or = separator to avoid matching phrases like "Invalid password format")
  readonly #PASSWORD_PATTERN = /\bpassword['"\s]*[:=]\s*(?:(['"]).*?\1|[^\s;,}]+)/gi;

  // URL with credentials
  readonly #URL_CREDS_PATTERN = /https?:\/\/[^:/@\s]+:[^@\s]+@[^\s"'<>]+/gi;

  // Platform-specific path patterns (match only the username segment)
  readonly #WINDOWS_PATH_PATTERN = /([A-Z]:\\Users\\)[^\\\s"']+((?:\\[^\s"']*)?)/gi;

  readonly #UNIX_PATH_PATTERN = /\/(?:home|Users)\/[^/\s"']+/gi;

  #options: SanitizerOptions;

  constructor(options: SanitizerOptions = {}) {
    // Default: redact everything
    this.#options = {
      redactTokens: true,
      redactPasswords: true,
      redactFilePaths: true,
      redactUrls: true,
      ...options,
    };
  }

  sanitize(text: string): string {
    let sanitized = text;

    if (this.#options.redactTokens) {
      sanitized = this.#redactTokens(sanitized);
    }

    if (this.#options.redactPasswords) {
      sanitized = this.#redactPasswords(sanitized);
    }

    if (this.#options.redactUrls) {
      sanitized = this.#redactUrlsWithCredentials(sanitized);
    }

    if (this.#options.redactFilePaths) {
      sanitized = this.#redactFilePaths(sanitized);
    }

    // Apply custom patterns
    if (this.#options.customPatterns) {
      this.#options.customPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      });
    }

    return sanitized;
  }

  #redactTokens(text: string): string {
    let result = text;

    // GitLab tokens
    result = result.replace(this.#GITLAB_TOKEN_PATTERN, '[REDACTED_GITLAB_TOKEN]');

    // GitLab HTTP header tokens
    result = result.replace(this.#HEADER_TOKEN_PATTERN, '$1: [REDACTED_TOKEN]');

    // Bearer tokens
    result = result.replace(this.#BEARER_TOKEN_PATTERN, 'Bearer [REDACTED_TOKEN]');

    // Basic auth
    result = result.replace(this.#BASIC_AUTH_PATTERN, 'Basic [REDACTED_CREDENTIALS]');

    return result;
  }

  #redactPasswords(text: string): string {
    return text.replace(this.#PASSWORD_PATTERN, match => {
      const prefix = match.match(/\bpassword['"\s]*[:=]\s*/i)?.[0] || 'password: ';
      return `${prefix}[REDACTED_PASSWORD]`;
    });
  }

  #redactUrlsWithCredentials(text: string): string {
    return text.replace(this.#URL_CREDS_PATTERN, match => {
      try {
        const url = new URL(match);
        return `${url.protocol}//[REDACTED_USERNAME]:[REDACTED_PASSWORD]@${url.host}${url.pathname}${url.search}${url.hash}`;
      } catch {
        // If URL parsing fails, use a simple replacement
        return match.replace(
          /https?:\/\/[^:/@\s]+:[^@\s]+@/,
          match.startsWith('https')
            ? 'https://[REDACTED_USERNAME]:[REDACTED_PASSWORD]@'
            : 'http://[REDACTED_USERNAME]:[REDACTED_PASSWORD]@',
        );
      }
    });
  }

  #redactFilePaths(text: string): string {
    let result = text;

    // Windows paths (preserve path after username)
    result = result.replace(this.#WINDOWS_PATH_PATTERN, '$1[REDACTED_USER]$2');

    // Unix paths (macOS and Linux)
    result = result.replace(this.#UNIX_PATH_PATTERN, match => {
      if (match.startsWith('/home/')) {
        return '/home/[REDACTED_USER]';
      }
      return '/Users/[REDACTED_USER]';
    });

    return result;
  }
}

// Default sanitizer instance with all redactions enabled
export const defaultSanitizer = new Sanitizer();
