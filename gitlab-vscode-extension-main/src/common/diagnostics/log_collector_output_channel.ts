import * as vscode from 'vscode';
import { languageServerLogCollector } from './log_collector';

/**
 * LogCollectorOutputChannel wraps a VS Code OutputChannel and intercepts
 * all log output to also collect it in the languageServerLogCollector.
 * This allows us to capture language server logs for diagnostics export.
 */
export class LogCollectorOutputChannel implements vscode.OutputChannel {
  #delegate: vscode.OutputChannel;

  constructor(name: string) {
    this.#delegate = vscode.window.createOutputChannel(name);
  }

  get name(): string {
    return this.#delegate.name;
  }

  append(value: string): void {
    this.#delegate.append(value);
    // Collect for diagnostics export
    languageServerLogCollector.append(value);
  }

  appendLine(value: string): void {
    this.#delegate.appendLine(value);
    // Collect for diagnostics export
    languageServerLogCollector.append(value);
  }

  replace(value: string): void {
    this.#delegate.replace(value);
    // Note: replace clears then appends, we'll just treat it as new content
    languageServerLogCollector.clear();
    languageServerLogCollector.append(value);
  }

  clear(): void {
    this.#delegate.clear();
    // Don't clear the collector - we want to keep history for export
    // Users can manually clear if needed
  }

  show(preserveFocus?: boolean): void;

  show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;

  show(columnOrPreserveFocus?: vscode.ViewColumn | boolean, preserveFocus?: boolean): void {
    if (typeof columnOrPreserveFocus === 'boolean') {
      this.#delegate.show(columnOrPreserveFocus);
    } else {
      this.#delegate.show(columnOrPreserveFocus, preserveFocus);
    }
  }

  hide(): void {
    this.#delegate.hide();
  }

  dispose(): void {
    this.#delegate.dispose();
  }
}
