import { LogCollectorOutputChannel } from './log_collector_output_channel';
import { languageServerLogCollector } from './log_collector';

const mockOutputChannel = {
  append: jest.fn(),
  appendLine: jest.fn(),
  replace: jest.fn(),
  clear: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
  name: 'Test Channel',
};

jest.mock('vscode', () => ({
  window: {
    createOutputChannel: jest.fn(() => mockOutputChannel),
  },
}));

jest.mock('./log_collector', () => ({
  languageServerLogCollector: {
    append: jest.fn(),
    clear: jest.fn(),
    getAll: jest.fn(),
  },
}));

describe('LogCollectorOutputChannel', () => {
  let channel: LogCollectorOutputChannel;

  beforeEach(() => {
    jest.clearAllMocks();
    channel = new LogCollectorOutputChannel('Test Channel');
  });

  describe('name', () => {
    it('returns the delegate channel name', () => {
      expect(channel.name).toBe('Test Channel');
    });
  });

  describe('append', () => {
    it('delegates to the output channel', () => {
      channel.append('hello');
      expect(mockOutputChannel.append).toHaveBeenCalledWith('hello');
    });

    it('collects the value in the log collector', () => {
      channel.append('hello');
      expect(languageServerLogCollector.append).toHaveBeenCalledWith('hello');
    });
  });

  describe('appendLine', () => {
    it('delegates to the output channel', () => {
      channel.appendLine('line');
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('line');
    });

    it('collects the value in the log collector', () => {
      channel.appendLine('line');
      expect(languageServerLogCollector.append).toHaveBeenCalledWith('line');
    });
  });

  describe('replace', () => {
    it('delegates to the output channel', () => {
      channel.replace('new content');
      expect(mockOutputChannel.replace).toHaveBeenCalledWith('new content');
    });

    it('clears the collector then appends new content', () => {
      channel.replace('new content');
      expect(languageServerLogCollector.clear).toHaveBeenCalled();
      expect(languageServerLogCollector.append).toHaveBeenCalledWith('new content');
    });
  });

  describe('clear', () => {
    it('delegates to the output channel', () => {
      channel.clear();
      expect(mockOutputChannel.clear).toHaveBeenCalled();
    });

    it('does not clear the collector (preserves history for export)', () => {
      channel.clear();
      expect(languageServerLogCollector.clear).not.toHaveBeenCalled();
    });
  });

  describe('show', () => {
    it('delegates with preserveFocus boolean', () => {
      channel.show(true);
      expect(mockOutputChannel.show).toHaveBeenCalledWith(true);
    });

    it('delegates with column and preserveFocus', () => {
      channel.show(1, false);
      expect(mockOutputChannel.show).toHaveBeenCalledWith(1, false);
    });
  });

  describe('hide', () => {
    it('delegates to the output channel', () => {
      channel.hide();
      expect(mockOutputChannel.hide).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('delegates to the output channel', () => {
      channel.dispose();
      expect(mockOutputChannel.dispose).toHaveBeenCalled();
    });
  });
});
