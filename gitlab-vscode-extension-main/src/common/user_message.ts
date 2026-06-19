import * as vscode from 'vscode';

export interface UserMessageAction {
  title: string;
  callback: () => Promise<void> | void;
}

type UserMessageDismissalMode = 'forever' | 'session' | 'day';

export class UserMessage {
  readonly #storageKey: string;

  readonly #message: string;

  readonly #globalState: vscode.Memento;

  readonly #actions: UserMessageAction[];

  readonly #dismissalMode: UserMessageDismissalMode;

  readonly #dismissalText: string;

  // we only show the message once per VS Code window even if the user only dismisses the message
  #hasBeenShownInSession = false;

  /**
   * @param storageKey - the string should be date prefixed to ensure we avoid conflicts in the local storage e.g. `2025-01-15-message-singleAccount`
   * @param dismissalMode - 'session': dismissed only for current session; 'day': dismissed until next day; 'forever': permanently dismissed
   */
  constructor(
    globalState: vscode.Memento,
    storageKey: string,
    message: string,
    actions: UserMessageAction[] = [],
    dismissalMode: UserMessageDismissalMode = 'forever',
  ) {
    this.#globalState = globalState;
    this.#storageKey = storageKey;
    this.#message = message;
    this.#actions = actions;
    this.#dismissalMode = dismissalMode;
    this.#dismissalText = dismissalMode === 'forever' ? "Don't show again" : 'Dismiss';
  }

  async trigger() {
    if (this.#hasBeenShownInSession) return;

    if (this.#dismissalMode !== 'session') {
      const dismissalInfo = this.#globalState.get<{ date: string }>(this.#storageKey);
      if (dismissalInfo) {
        if (this.#dismissalMode === 'forever') {
          return;
        }
        if (
          this.#dismissalMode === 'day' &&
          typeof dismissalInfo === 'object' &&
          dismissalInfo.date === new Date().toDateString()
        ) {
          return;
        }
      }
    }

    this.#hasBeenShownInSession = true;

    const actionTitles = this.#actions.map(a => a.title);
    const allOptions = [...actionTitles, this.#dismissalText];

    const selection = await vscode.window.showInformationMessage(this.#message, ...allOptions);

    if (selection === this.#dismissalText) {
      if (this.#dismissalMode === 'day' || this.#dismissalMode === 'forever') {
        await this.#globalState.update(this.#storageKey, { date: new Date().toDateString() });
      }
      return;
    }

    const selectedAction = this.#actions.find(a => a.title === selection);
    if (selectedAction) {
      await selectedAction.callback();
    }
  }
}
