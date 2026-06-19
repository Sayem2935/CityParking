/**
 * LogCollector collects log lines in a ring buffer with a maximum size limit.
 * When the buffer is full, old lines are overwritten by new ones.
 * This prevents unbounded memory growth from logging.
 */
export class LogCollector {
  static readonly #MAX_LINES = 5000;

  #buffer: string[] = [];

  #cursor = 0;

  #isFull = false;

  /**
   * Append a log line to the buffer.
   * @param line The log line to append
   */
  append(line: string): void {
    if (!this.#isFull && this.#buffer.length < LogCollector.#MAX_LINES) {
      // Buffer not yet full, just push
      this.#buffer.push(line);
    } else {
      // Buffer is full, use ring buffer logic
      if (!this.#isFull) {
        this.#isFull = true;
      }
      this.#buffer[this.#cursor] = line;
      this.#cursor = (this.#cursor + 1) % LogCollector.#MAX_LINES;
    }
  }

  /**
   * Get all log lines in chronological order.
   * @returns All log lines joined with newlines
   */
  getAll(): string {
    if (!this.#isFull) {
      // Buffer not full yet, return in order
      return this.#buffer.join('\n');
    }

    // Buffer is full, reorder to maintain chronological order
    // Lines from cursor to end are oldest, lines from start to cursor-1 are newest
    const orderedBuffer = [
      ...this.#buffer.slice(this.#cursor),
      ...this.#buffer.slice(0, this.#cursor),
    ];
    return orderedBuffer.join('\n');
  }

  /**
   * Clear all log lines from the buffer.
   */
  clear(): void {
    this.#buffer = [];
    this.#cursor = 0;
    this.#isFull = false;
  }

  /**
   * Get the current number of lines in the buffer.
   */
  getLineCount(): number {
    return this.#isFull ? LogCollector.#MAX_LINES : this.#buffer.length;
  }
}

// Singleton instances for extension and language server logs
export const extensionLogCollector = new LogCollector();
export const languageServerLogCollector = new LogCollector();
