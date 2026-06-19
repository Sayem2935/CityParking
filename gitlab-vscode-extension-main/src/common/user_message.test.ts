import vscode from 'vscode';
import { InMemoryMemento } from '../../test/integration/test_infrastructure/in_memory_memento';
import { UserMessage } from './user_message';

describe('UserMessage', () => {
  const TEST_STORAGE_KEY = 'test-message-key';
  const TEST_MESSAGE = 'Test message';

  let globalState: vscode.Memento;
  let callbackSpy: jest.Mock;
  let messageResponse: string | undefined;

  beforeEach(() => {
    globalState = new InMemoryMemento();
    callbackSpy = jest.fn();

    jest
      .mocked(vscode.window.showInformationMessage)
      .mockImplementation(async () => messageResponse as unknown as vscode.MessageItem);
  });

  describe('forever dismissal mode (default)', () => {
    let message: UserMessage;

    beforeEach(() => {
      message = new UserMessage(globalState, TEST_STORAGE_KEY, TEST_MESSAGE, [
        { title: 'Action 1', callback: callbackSpy },
        { title: 'Action 2', callback: () => {} },
      ]);
    });

    it('shows message with all options', async () => {
      await message.trigger();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        TEST_MESSAGE,
        'Action 1',
        'Action 2',
        "Don't show again",
      );
    });

    it('executes callback when action is selected', async () => {
      messageResponse = 'Action 1';

      await message.trigger();

      expect(callbackSpy).toHaveBeenCalled();
    });

    it('stores dismissal in globalState when "Don\'t show again" is selected', async () => {
      messageResponse = "Don't show again";

      await message.trigger();

      const stored = globalState.get(TEST_STORAGE_KEY);
      expect(stored).toEqual({ date: new Date().toDateString() });
    });

    it('does not show message if previously dismissed', async () => {
      await globalState.update(TEST_STORAGE_KEY, { date: new Date().toDateString() });

      await message.trigger();

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('shows message only once per session', async () => {
      await message.trigger();
      await message.trigger();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no option is selected', async () => {
      messageResponse = undefined;

      await message.trigger();

      expect(callbackSpy).not.toHaveBeenCalled();
      expect(globalState.get(TEST_STORAGE_KEY)).toBeUndefined();
    });
  });

  describe('day dismissal mode', () => {
    let message: UserMessage;

    beforeEach(() => {
      message = new UserMessage(globalState, TEST_STORAGE_KEY, TEST_MESSAGE, [], 'day');
    });

    it('shows "Dismiss" button instead of "Don\'t show again"', async () => {
      await message.trigger();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(TEST_MESSAGE, 'Dismiss');
    });

    it('stores dismissal with today\'s date when "Dismiss" is selected', async () => {
      messageResponse = 'Dismiss';

      await message.trigger();

      const stored = globalState.get(TEST_STORAGE_KEY);
      expect(stored).toEqual({ date: new Date().toDateString() });
    });

    it('does not show message if dismissed today', async () => {
      await globalState.update(TEST_STORAGE_KEY, { date: new Date().toDateString() });

      await message.trigger();

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('shows message again if dismissed on a different day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await globalState.update(TEST_STORAGE_KEY, { date: yesterday.toDateString() });

      await message.trigger();

      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });
  });

  describe('session dismissal mode', () => {
    let message: UserMessage;

    beforeEach(() => {
      message = new UserMessage(globalState, TEST_STORAGE_KEY, TEST_MESSAGE, [], 'session');
    });

    it('shows "Dismiss" button', async () => {
      await message.trigger();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(TEST_MESSAGE, 'Dismiss');
    });

    it('does not persist dismissal to globalState', async () => {
      messageResponse = 'Dismiss';

      await message.trigger();

      expect(globalState.get(TEST_STORAGE_KEY)).toBeUndefined();
    });

    it('does not show message again in same session after dismissal', async () => {
      messageResponse = 'Dismiss';

      await message.trigger();
      await message.trigger();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
    });

    it('shows message again in new instance even if dismissed', async () => {
      messageResponse = 'Dismiss';

      await message.trigger();

      const newMessage = new UserMessage(
        globalState,
        TEST_STORAGE_KEY,
        TEST_MESSAGE,
        [],
        'session',
      );
      await newMessage.trigger();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(2);
    });
  });
});
