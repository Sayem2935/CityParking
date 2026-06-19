import * as vscode from 'vscode';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { LanguageServerStartupMonitor, StartupPhase } from './language_server_startup_monitor';
import { LanguageServerStartupStatusBarItem } from './language_server_startup_status_bar_item';

jest.mock('vscode');

describe('LanguageServerStartupStatusBarItem', () => {
  let monitor: LanguageServerStartupMonitor;
  let onDidChangePhaseHandler: (phase: StartupPhase) => void;
  let statusBarItem: vscode.StatusBarItem;
  let item: LanguageServerStartupStatusBarItem;

  beforeEach(() => {
    jest.useFakeTimers();

    statusBarItem = createFakePartial<vscode.StatusBarItem>({
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      text: '',
      tooltip: undefined,
    });

    jest.mocked(vscode.window.createStatusBarItem).mockReturnValue(statusBarItem);

    monitor = createFakePartial<LanguageServerStartupMonitor>({
      phase: 'idle',
      onDidChangePhase: jest.fn(handler => {
        onDidChangePhaseHandler = handler;
        return { dispose: jest.fn() };
      }),
    });

    item = new LanguageServerStartupStatusBarItem(monitor);
  });

  afterEach(() => {
    item.dispose();
    jest.useRealTimers();
  });

  it('does not show the status bar item immediately on spawning', () => {
    onDidChangePhaseHandler('spawning');

    expect(statusBarItem.show).not.toHaveBeenCalled();
  });

  it('shows the status bar item with spawning text after debounce', () => {
    onDidChangePhaseHandler('spawning');
    (monitor as { phase: StartupPhase }).phase = 'spawning';
    jest.advanceTimersByTime(2000);

    expect(statusBarItem.show).toHaveBeenCalled();
    expect(statusBarItem.text).toBe('$(loading~spin) GitLab: Starting Language Server...');
    expect(statusBarItem.tooltip).toBe('Waiting for the Language Server process to start');
  });

  it('does not show if running before debounce fires', () => {
    onDidChangePhaseHandler('spawning');
    jest.advanceTimersByTime(1999);
    onDidChangePhaseHandler('running');
    jest.advanceTimersByTime(1);

    expect(statusBarItem.show).not.toHaveBeenCalled();
  });

  it('updates tooltip to handshake when already visible', () => {
    onDidChangePhaseHandler('spawning');
    jest.advanceTimersByTime(2000);
    (statusBarItem as { text: string }).text =
      '$(loading~spin) GitLab: Starting Language Server...';

    onDidChangePhaseHandler('handshake');

    expect(statusBarItem.tooltip).toBe('Connecting to Language Server');
  });

  it('shows success state then hides after minimum visible duration when running', () => {
    onDidChangePhaseHandler('spawning');
    jest.advanceTimersByTime(2000);
    (statusBarItem as { text: string }).text =
      '$(loading~spin) GitLab: Starting Language Server...';

    onDidChangePhaseHandler('running');

    expect(statusBarItem.text).toBe('$(check) GitLab: Language Server started');
    expect(statusBarItem.hide).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000);
    expect(statusBarItem.hide).toHaveBeenCalled();
  });

  it('shows failed state immediately bypassing debounce', () => {
    onDidChangePhaseHandler('failed');

    expect(statusBarItem.show).toHaveBeenCalled();
    expect(statusBarItem.text).toBe('$(error) GitLab: Language Server failed to start');
  });

  it('shows failed state even if debounce has not fired', () => {
    onDidChangePhaseHandler('spawning');
    jest.advanceTimersByTime(1000);
    onDidChangePhaseHandler('failed');

    expect(statusBarItem.show).toHaveBeenCalled();
    expect(statusBarItem.text).toBe('$(error) GitLab: Language Server failed to start');
  });

  it('disposes the status bar item and listener on dispose', () => {
    const listenerDispose = jest.fn();
    monitor = createFakePartial<LanguageServerStartupMonitor>({
      phase: 'idle',
      onDidChangePhase: jest.fn(() => ({ dispose: listenerDispose })),
    });
    item = new LanguageServerStartupStatusBarItem(monitor);

    item.dispose();

    expect(statusBarItem.dispose).toHaveBeenCalled();
    expect(listenerDispose).toHaveBeenCalled();
  });
});
