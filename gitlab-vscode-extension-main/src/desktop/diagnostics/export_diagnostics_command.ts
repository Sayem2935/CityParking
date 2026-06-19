import * as vscode from 'vscode';
import { log } from '../../common/log';
import { DiagnosticsService } from '../../common/diagnostics/diagnostics_service';
import { generateDiagnosticsMarkdown } from '../../common/diagnostics/diagnostics_document_provider';
import {
  extensionLogCollector,
  languageServerLogCollector,
} from '../../common/diagnostics/log_collector';
import { defaultSanitizer } from '../../common/diagnostics/sanitizer';
import { doNotAwait } from '../../common/utils/do_not_await';
import { createDiagnosticsZip, DiagnosticsFile } from './zip_creator';

/**
 * Command to export diagnostics, logs, and configuration to a ZIP file.
 * @param diagnosticsService The diagnostics service to get diagnostic information from
 * @returns A function that executes the export when called
 */
export const exportDiagnosticsCommand =
  (diagnosticsService: DiagnosticsService) => async (): Promise<void> => {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Preparing diagnostics export',
          cancellable: false,
        },
        async progress => {
          // Step 1: Collect diagnostics markdown
          progress.report({ increment: 20, message: 'Collecting diagnostics...' });
          const diagnosticsMarkdown = generateDiagnosticsMarkdown(diagnosticsService);

          // Step 2: Collect extension logs
          progress.report({ increment: 20, message: 'Collecting extension logs...' });
          const extensionLogs = extensionLogCollector.getAll();

          // Step 3: Collect language server logs
          progress.report({ increment: 20, message: 'Collecting language server logs...' });
          const languageServerLogs = languageServerLogCollector.getAll();

          // Step 4: Sanitize all content
          progress.report({ increment: 15, message: 'Sanitizing sensitive data...' });
          const sanitizedDiagnostics = defaultSanitizer.sanitize(diagnosticsMarkdown);
          const sanitizedExtensionLogs = extensionLogs
            ? defaultSanitizer.sanitize(extensionLogs)
            : 'No extension logs available.';
          const sanitizedLanguageServerLogs = languageServerLogs
            ? defaultSanitizer.sanitize(languageServerLogs)
            : 'No language server logs available. Enable trace logging with "gitlab-lsp.trace.server": "verbose" in settings.';

          // Step 5: Create ZIP file
          progress.report({ increment: 15, message: 'Creating archive...' });
          const files: DiagnosticsFile[] = [
            {
              name: 'diagnostics.md',
              content: sanitizedDiagnostics,
            },
            {
              name: 'extension-logs.txt',
              content: sanitizedExtensionLogs,
            },
            {
              name: 'language-server-logs.txt',
              content: sanitizedLanguageServerLogs,
            },
          ];

          const zipBuffer = await createDiagnosticsZip(files);

          // Step 6: Show save dialog
          progress.report({ increment: 5, message: 'Saving...' });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds and 'Z'
          const defaultFilename = `gitlab-diagnostics-${timestamp}.zip`;

          const saveUri = await vscode.window.showSaveDialog({
            title: 'Export GitLab Diagnostics',
            defaultUri: vscode.Uri.file(defaultFilename),
            filters: {
              'ZIP Archive': ['zip'],
            },
          });

          if (!saveUri) {
            // User cancelled
            return;
          }

          // Step 7: Write file
          progress.report({ increment: 5, message: 'Writing file...' });
          await vscode.workspace.fs.writeFile(saveUri, zipBuffer);

          // Step 8: Show success notification
          doNotAwait(
            vscode.window.showInformationMessage(
              `Diagnostics exported successfully to ${saveUri.fsPath}`,
            ),
          );

          log.info(`Diagnostics exported to ${saveUri.fsPath}`);
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showErrorMessage(`Failed to export diagnostics: ${message}`);
      log.error('Failed to export diagnostics', error);
    }
  };
