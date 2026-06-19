import * as vscode from 'vscode';
import { log } from '../log';
import { USER_COMMANDS } from '../command_names';
import { isUiError } from './ui_error';

export interface ErrorAction {
  label: string;
  run: () => unknown;
}

export const handleError = (e: Error, actions: ErrorAction[] = []): void => {
  log.error(e);
  if (isUiError(e)) {
    e.showUi().catch(log.error);
    return;
  }
  const showErrorMessage = async () => {
    const actionLabels = actions.map(a => a.label);
    const choice = await vscode.window.showErrorMessage(e.message, ...actionLabels, 'Show Logs');
    if (choice === 'Show Logs') {
      await vscode.commands.executeCommand(USER_COMMANDS.SHOW_LOGS);
      return;
    }
    const matched = actions.find(a => a.label === choice);
    if (matched) {
      await matched.run();
    }
  };
  // This is probably the only place where we want to ignore a floating promise.
  // We don't want to block the app and wait for user click on the "Show Logs"
  // button or close the message However, for testing this method, we need to
  // keep the promise.
  showErrorMessage().catch(log.error);
};
