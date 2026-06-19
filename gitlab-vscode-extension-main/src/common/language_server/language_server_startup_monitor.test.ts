import { BaseLanguageClient, State, StateChangeEvent } from 'vscode-languageclient';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { log } from '../log';
import { NoopObservabilityService } from '../observability';
import { LanguageServerStartupMonitor } from './language_server_startup_monitor';

jest.mock('../log');

describe('LanguageServerStartupMonitor', () => {
  let monitor: LanguageServerStartupMonitor;
  let onDidChangeStateHandler: (event: StateChangeEvent) => void;
  let client: BaseLanguageClient;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    monitor = new LanguageServerStartupMonitor(new NoopObservabilityService());
    client = createFakePartial<BaseLanguageClient>({
      onDidChangeState: jest.fn(handler => {
        onDidChangeStateHandler = handler;
        return { dispose: jest.fn() };
      }),
    });
  });

  afterEach(() => {
    monitor.dispose();
    jest.useRealTimers();
  });

  it('starts in idle phase', () => {
    expect(monitor.phase).toBe('idle');
  });

  describe('notifyHandshakeStarted()', () => {
    it('is a no-op before State.Starting fires', () => {
      monitor.observe(client).catch(() => {});

      monitor.notifyHandshakeStarted();

      expect(monitor.phase).toBe('idle');
    });

    it('transitions phase to handshake on first call after spawning', () => {
      monitor.observe(client).catch(() => {});
      onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });

      monitor.notifyHandshakeStarted();

      expect(monitor.phase).toBe('handshake');
    });

    it('is a no-op on subsequent calls within the same spawn attempt', () => {
      monitor.observe(client).catch(() => {});
      onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });

      monitor.notifyHandshakeStarted();
      monitor.notifyHandshakeStarted();

      expect(monitor.phase).toBe('handshake');
    });

    it('resets per spawn attempt so each new attempt can transition to handshake', () => {
      monitor.observe(client).catch(() => {});

      onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
      monitor.notifyHandshakeStarted(); // attempt 1 → handshake

      onDidChangeStateHandler({ oldState: State.Starting, newState: State.Stopped });
      onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
      monitor.notifyHandshakeStarted(); // attempt 2 - should transition to handshake again

      expect(monitor.phase).toBe('handshake');
    });
  });

  describe('dispose()', () => {
    it('disposes the onDidChangeState listener', () => {
      const dispose = jest.fn();
      client = createFakePartial<BaseLanguageClient>({
        onDidChangeState: jest.fn(handler => {
          onDidChangeStateHandler = handler;
          return { dispose };
        }),
      });

      monitor.observe(client).catch(() => {});
      monitor.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it('is safe to call multiple times', () => {
      const dispose = jest.fn();
      client = createFakePartial<BaseLanguageClient>({
        onDidChangeState: jest.fn(handler => {
          onDidChangeStateHandler = handler;
          return { dispose };
        }),
      });

      monitor.observe(client).catch(() => {});
      monitor.dispose();
      monitor.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('observe()', () => {
    it('registers onDidChangeState listener', () => {
      monitor.observe(client).catch(() => {});

      expect(client.onDidChangeState).toHaveBeenCalledWith(expect.any(Function));
    });

    it('transitions to spawning when State.Starting fires', () => {
      monitor.observe(client).catch(() => {});
      onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });

      expect(monitor.phase).toBe('spawning');
    });

    it('resolves and transitions to running when State.Running fires', async () => {
      const promise = monitor.observe(client);
      onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
      onDidChangeStateHandler({ oldState: State.Starting, newState: State.Running });

      await expect(promise).resolves.toBeUndefined();
      expect(monitor.phase).toBe('running');
    });

    it('does not reject when State.Stopped fires - lets the library handle restarts', async () => {
      const promise = monitor.observe(client);
      onDidChangeStateHandler({ oldState: State.Starting, newState: State.Stopped });

      // resolve via Running after restart - promise should still work
      onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
      onDidChangeStateHandler({ oldState: State.Starting, newState: State.Running });

      await expect(promise).resolves.toBeUndefined();
    });

    describe('spawn timeout', () => {
      it('rejects if State.Starting never fires within 10s', async () => {
        const promise = monitor.observe(client);
        jest.advanceTimersByTime(10000);

        await expect(promise).rejects.toThrow('Language Server process did not start within 10s');
        expect(monitor.phase).toBe('failed');
      });

      it('clears spawn timeout when State.Starting fires', async () => {
        const promise = monitor.observe(client);
        jest.advanceTimersByTime(9999);
        onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
        onDidChangeStateHandler({ oldState: State.Starting, newState: State.Running });

        await expect(promise).resolves.toBeUndefined();
      });
    });

    describe('handshake timeout', () => {
      it('rejects with handshake timeout message when process never completes handshake', async () => {
        const promise = monitor.observe(client);
        onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
        jest.advanceTimersByTime(30000);

        await expect(promise).rejects.toThrow(
          'Language Server process started but LSP initialize handshake did not complete within 30s',
        );
        expect(monitor.phase).toBe('failed');
      });

      it('clears handshake timeout when State.Running fires', async () => {
        const promise = monitor.observe(client);
        onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
        onDidChangeStateHandler({ oldState: State.Starting, newState: State.Running });
        jest.advanceTimersByTime(30000);

        await expect(promise).resolves.toBeUndefined();
      });

      it('resets handshake timeout on each State.Starting so the full 30s is allowed per attempt', async () => {
        const promise = monitor.observe(client);

        // first attempt - advance 29s without completing
        onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
        jest.advanceTimersByTime(29000);

        // crash and restart - timer should reset
        onDidChangeStateHandler({ oldState: State.Starting, newState: State.Stopped });
        onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });

        // advance another 29s - should not have fired yet (29s into the new timer)
        jest.advanceTimersByTime(29000);
        expect(monitor.phase).toBe('spawning');

        // now let it expire
        jest.advanceTimersByTime(1000);
        await expect(promise).rejects.toThrow(
          'Language Server process started but LSP initialize handshake did not complete within 30s',
        );
      });
    });

    describe('restart grace period', () => {
      it('rejects when State.Starting does not follow State.Stopped within grace period on first startup', async () => {
        const promise = monitor.observe(client);
        onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
        onDidChangeStateHandler({ oldState: State.Starting, newState: State.Stopped });
        jest.advanceTimersByTime(5000);

        await expect(promise).rejects.toThrow(
          'Language Server failed to restart after 1 attempt(s)',
        );
        expect(monitor.phase).toBe('failed');
        expect(log.debug).toHaveBeenCalledWith(
          expect.stringContaining('failed to restart after 1 attempt(s)'),
        );
      });

      it('does not reject when State.Starting follows State.Stopped within grace period', async () => {
        const promise = monitor.observe(client);
        onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
        onDidChangeStateHandler({ oldState: State.Starting, newState: State.Running });
        await promise;

        onDidChangeStateHandler({ oldState: State.Running, newState: State.Stopped });
        jest.advanceTimersByTime(4999);
        onDidChangeStateHandler({ oldState: State.Stopped, newState: State.Starting });
        jest.advanceTimersByTime(1); // grace period would have fired - but was cancelled

        expect(monitor.phase).toBe('spawning');
      });
    });
  });
});
