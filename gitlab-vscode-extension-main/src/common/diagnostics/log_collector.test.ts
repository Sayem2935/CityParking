import { LogCollector } from './log_collector';

describe('LogCollector', () => {
  let collector: LogCollector;

  beforeEach(() => {
    collector = new LogCollector();
  });

  describe('basic functionality', () => {
    it('collects and retrieves a single log line', () => {
      collector.append('Line 1');
      expect(collector.getAll()).toBe('Line 1');
    });

    it('collects and retrieves multiple log lines', () => {
      collector.append('Line 1');
      collector.append('Line 2');
      collector.append('Line 3');
      expect(collector.getAll()).toBe('Line 1\nLine 2\nLine 3');
    });

    it('maintains chronological order', () => {
      for (let i = 1; i <= 10; i++) {
        collector.append(`Line ${i}`);
      }
      const result = collector.getAll();
      expect(result).toBe(
        'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10',
      );
    });

    it('handles empty log lines', () => {
      collector.append('');
      collector.append('Line 2');
      expect(collector.getAll()).toBe('\nLine 2');
    });

    it('handles log lines with newlines', () => {
      collector.append('Line 1\nhas multiple lines');
      collector.append('Line 2');
      expect(collector.getAll()).toBe('Line 1\nhas multiple lines\nLine 2');
    });
  });

  describe('line count', () => {
    it('returns correct line count for empty buffer', () => {
      expect(collector.getLineCount()).toBe(0);
    });

    it('returns correct line count for partial buffer', () => {
      collector.append('Line 1');
      collector.append('Line 2');
      expect(collector.getLineCount()).toBe(2);
    });

    it('returns correct line count for many lines', () => {
      for (let i = 0; i < 100; i++) {
        collector.append(`Line ${i}`);
      }
      expect(collector.getLineCount()).toBe(100);
    });
  });

  describe('clear functionality', () => {
    it('clears all log lines', () => {
      collector.append('Line 1');
      collector.append('Line 2');
      collector.clear();
      expect(collector.getAll()).toBe('');
      expect(collector.getLineCount()).toBe(0);
    });

    it('can collect logs after clearing', () => {
      collector.append('Line 1');
      collector.clear();
      collector.append('Line 2');
      expect(collector.getAll()).toBe('Line 2');
      expect(collector.getLineCount()).toBe(1);
    });
  });

  describe('ring buffer behavior', () => {
    // Note: MAX_LINES is 5000, but we'll test with a reasonable number
    it('handles overflow by overwriting oldest entries', () => {
      // Fill buffer to max (5000 lines)
      for (let i = 1; i <= 5000; i++) {
        collector.append(`Line ${i}`);
      }

      expect(collector.getLineCount()).toBe(5000);
      const beforeOverflow = collector.getAll();
      expect(beforeOverflow.startsWith('Line 1\n')).toBe(true);
      expect(beforeOverflow).toContain('Line 5000');

      // Add one more line, should overflow and remove Line 1
      collector.append('Line 5001');

      expect(collector.getLineCount()).toBe(5000); // Still at max
      const afterOverflow = collector.getAll();
      expect(afterOverflow.startsWith('Line 2\n')).toBe(true); // Should start with Line 2
      expect(afterOverflow.endsWith('Line 5001')).toBe(true); // Should end with Line 5001
      expect(afterOverflow.startsWith('Line 1\n')).toBe(false); // Line 1 should not be at start
    });

    it('maintains chronological order after overflow', () => {
      // Fill buffer with exactly MAX_LINES
      for (let i = 1; i <= 5000; i++) {
        collector.append(`Line ${i}`);
      }

      // Add 10 more lines, causing overflow
      for (let i = 5001; i <= 5010; i++) {
        collector.append(`Line ${i}`);
      }

      const result = collector.getAll();
      const lines = result.split('\n');

      // Should have exactly 5000 lines
      expect(lines.length).toBe(5000);

      // First line should be Line 11 (lines 1-10 were overwritten)
      expect(lines[0]).toBe('Line 11');

      // Last line should be Line 5010
      expect(lines[lines.length - 1]).toBe('Line 5010');

      // Check a few lines in the middle
      expect(lines[100]).toBe('Line 111');
      expect(lines[lines.length - 2]).toBe('Line 5009');
    });

    it('handles multiple wraparounds', () => {
      // Fill buffer beyond capacity multiple times
      for (let i = 1; i <= 15000; i++) {
        collector.append(`Line ${i}`);
      }

      const result = collector.getAll();
      const lines = result.split('\n');

      // Should still have exactly 5000 lines
      expect(lines.length).toBe(5000);

      // Should have the last 5000 lines (10001-15000)
      expect(lines[0]).toBe('Line 10001');
      expect(lines[lines.length - 1]).toBe('Line 15000');
    });

    it('getAll returns empty string when buffer is empty after clear', () => {
      for (let i = 1; i <= 5000; i++) {
        collector.append(`Line ${i}`);
      }
      collector.clear();
      expect(collector.getAll()).toBe('');
    });
  });

  describe('edge cases', () => {
    it('handles very long log lines', () => {
      const longLine = 'x'.repeat(10000);
      collector.append(longLine);
      expect(collector.getAll()).toBe(longLine);
    });

    it('handles special characters in log lines', () => {
      collector.append('Line with "quotes" and \'apostrophes\'');
      collector.append('Line with [brackets] and {braces}');
      collector.append('Line with /slashes\\ and |pipes|');
      const result = collector.getAll();
      expect(result).toContain('"quotes"');
      expect(result).toContain('[brackets]');
      expect(result).toContain('/slashes\\');
    });

    it('handles unicode characters', () => {
      collector.append('Hello 世界 🌍');
      expect(collector.getAll()).toBe('Hello 世界 🌍');
    });

    it('handles rapid successive calls', () => {
      for (let i = 0; i < 1000; i++) {
        collector.append(`Line ${i}`);
      }
      const lines = collector.getAll().split('\n');
      expect(lines.length).toBe(1000);
      expect(lines[0]).toBe('Line 0');
      expect(lines[999]).toBe('Line 999');
    });
  });
});
