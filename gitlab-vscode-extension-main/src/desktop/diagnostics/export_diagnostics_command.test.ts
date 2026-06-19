import * as vscode from 'vscode';
import { DiagnosticsService } from '../../common/diagnostics/diagnostics_service';
import * as diagnosticsDocumentProvider from '../../common/diagnostics/diagnostics_document_provider';
import * as logCollector from '../../common/diagnostics/log_collector';
import * as sanitizer from '../../common/diagnostics/sanitizer';
import { exportDiagnosticsCommand } from './export_diagnostics_command';
import * as zipCreator from './zip_creator';

// Mock vscode
jest.mock('vscode', () => ({
  window: {
    withProgress: jest.fn(),
    showSaveDialog: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  workspace: {
    fs: {
      writeFile: jest.fn(),
    },
  },
  ProgressLocation: {
    Notification: 15,
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path, toString: () => path })),
    parse: jest.fn((uri: string) => ({ fsPath: uri, toString: () => uri })),
  },
  EventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
}));

// Mock modules
jest.mock('../../common/diagnostics/diagnostics_document_provider');
jest.mock('../../common/diagnostics/log_collector');
jest.mock('../../common/diagnostics/sanitizer');
jest.mock('./zip_creator');
jest.mock('../../common/log', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('exportDiagnosticsCommand', () => {
  let mockDiagnosticsService: jest.Mocked<DiagnosticsService>;
  let mockExtensionLogCollector: jest.Mocked<logCollector.LogCollector>;
  let mockLanguageServerLogCollector: jest.Mocked<logCollector.LogCollector>;
  let mockSanitizer: jest.Mocked<sanitizer.Sanitizer>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DiagnosticsService
    mockDiagnosticsService = {} as jest.Mocked<DiagnosticsService>;

    // Mock log collectors
    mockExtensionLogCollector = {
      getAll: jest.fn().mockReturnValue('Extension log line 1\nExtension log line 2'),
      append: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<logCollector.LogCollector>;

    mockLanguageServerLogCollector = {
      getAll: jest.fn().mockReturnValue('LS log line 1\nLS log line 2'),
      append: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<logCollector.LogCollector>;

    Object.defineProperty(logCollector, 'extensionLogCollector', {
      value: mockExtensionLogCollector,
      writable: true,
    });

    Object.defineProperty(logCollector, 'languageServerLogCollector', {
      value: mockLanguageServerLogCollector,
      writable: true,
    });

    // Mock sanitizer
    mockSanitizer = {
      sanitize: jest.fn((content: string) => `[SANITIZED] ${content}`),
    } as unknown as jest.Mocked<sanitizer.Sanitizer>;

    Object.defineProperty(sanitizer, 'defaultSanitizer', {
      value: mockSanitizer,
      writable: true,
    });

    // Mock diagnostics markdown generation
    (diagnosticsDocumentProvider.generateDiagnosticsMarkdown as jest.Mock).mockReturnValue(
      '# GitLab Workflow Diagnostics\n\n## Section 1\n\nContent',
    );

    // Mock ZIP creator
    (zipCreator.createDiagnosticsZip as jest.Mock).mockResolvedValue(
      Buffer.from('mock-zip-content'),
    );

    // Mock vscode.window.withProgress to immediately call the callback
    (vscode.window.withProgress as jest.Mock).mockImplementation((_options, callback) =>
      callback({
        report: jest.fn(),
      }),
    );

    // Mock vscode.workspace.fs.writeFile to succeed by default
    (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('successful export', () => {
    it('should export diagnostics successfully', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);

      const command = exportDiagnosticsCommand(mockDiagnosticsService);
      await command();

      // Verify diagnostics were generated
      expect(diagnosticsDocumentProvider.generateDiagnosticsMarkdown).toHaveBeenCalledWith(
        mockDiagnosticsService,
      );

      // Verify logs were collected
      expect(mockExtensionLogCollector.getAll).toHaveBeenCalled();
      expect(mockLanguageServerLogCollector.getAll).toHaveBeenCalled();

      // Verify sanitization was applied
      expect(mockSanitizer.sanitize).toHaveBeenCalledTimes(3);

      // Verify ZIP was created
      expect(zipCreator.createDiagnosticsZip).toHaveBeenCalledWith([
        {
          name: 'diagnostics.md',
          content: '[SANITIZED] # GitLab Workflow Diagnostics\n\n## Section 1\n\nContent',
        },
        {
          name: 'extension-logs.txt',
          content: '[SANITIZED] Extension log line 1\nExtension log line 2',
        },
        {
          name: 'language-server-logs.txt',
          content: '[SANITIZED] LS log line 1\nLS log line 2',
        },
      ]);

      // Verify file was written
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        mockUri,
        Buffer.from('mock-zip-content'),
      );

      // Verify success notification
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Diagnostics exported successfully to /path/to/export.zip',
      );
    });

    it('should show progress updates', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);

      const mockProgressReport = jest.fn();
      (vscode.window.withProgress as jest.Mock).mockImplementation((_options, callback) =>
        callback({
          report: mockProgressReport,
        }),
      );

      const command = exportDiagnosticsCommand(mockDiagnosticsService);
      await command();

      // Verify progress updates
      expect(mockProgressReport).toHaveBeenCalledWith({
        increment: 20,
        message: 'Collecting diagnostics...',
      });
      expect(mockProgressReport).toHaveBeenCalledWith({
        increment: 20,
        message: 'Collecting extension logs...',
      });
      expect(mockProgressReport).toHaveBeenCalledWith({
        increment: 20,
        message: 'Collecting language server logs...',
      });
      expect(mockProgressReport).toHaveBeenCalledWith({
        increment: 15,
        message: 'Sanitizing sensitive data...',
      });
      expect(mockProgressReport).toHaveBeenCalledWith({
        increment: 15,
        message: 'Creating archive...',
      });
      expect(mockProgressReport).toHaveBeenCalledWith({ increment: 5, message: 'Saving...' });
      expect(mockProgressReport).toHaveBeenCalledWith({ increment: 5, message: 'Writing file...' });
    });

    it('should use timestamped filename in save dialog', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);

      const command = exportDiagnosticsCommand(mockDiagnosticsService);
      await command();

      expect(vscode.window.showSaveDialog).toHaveBeenCalledWith({
        title: 'Export GitLab Diagnostics',
        defaultUri: expect.objectContaining({
          fsPath: expect.stringMatching(
            /^gitlab-diagnostics-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/,
          ),
        }),
        filters: {
          'ZIP Archive': ['zip'],
        },
      });
    });
  });

  describe('empty logs handling', () => {
    it('should handle empty extension logs', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);
      mockExtensionLogCollector.getAll.mockReturnValue('');

      const command = exportDiagnosticsCommand(mockDiagnosticsService);
      await command();

      expect(zipCreator.createDiagnosticsZip).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'extension-logs.txt',
            content: 'No extension logs available.',
          }),
        ]),
      );
    });

    it('should handle empty language server logs', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);
      mockLanguageServerLogCollector.getAll.mockReturnValue('');

      const command = exportDiagnosticsCommand(mockDiagnosticsService);
      await command();

      expect(zipCreator.createDiagnosticsZip).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'language-server-logs.txt',
            content: expect.stringContaining('No language server logs available'),
          }),
        ]),
      );
    });
  });

  describe('user cancellation', () => {
    it('should not create file when user cancels save dialog', async () => {
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(undefined);

      const command = exportDiagnosticsCommand(mockDiagnosticsService);
      await command();

      // Verify ZIP was still created (before save dialog)
      expect(zipCreator.createDiagnosticsZip).toHaveBeenCalled();

      // Verify file was NOT written
      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();

      // Verify no success notification
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();

      // Verify no error notification
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should show error message when ZIP creation fails', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);
      (zipCreator.createDiagnosticsZip as jest.Mock).mockRejectedValue(
        new Error('ZIP creation failed'),
      );

      const command = exportDiagnosticsCommand(mockDiagnosticsService);

      await command();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to export diagnostics: ZIP creation failed',
      );
    });

    it('should show error message when file write fails', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);
      (vscode.workspace.fs.writeFile as jest.Mock).mockRejectedValue(
        new Error('Permission denied'),
      );

      const command = exportDiagnosticsCommand(mockDiagnosticsService);

      await command();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to export diagnostics: Permission denied',
      );
    });

    it('should handle non-Error exceptions', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);
      (zipCreator.createDiagnosticsZip as jest.Mock).mockRejectedValue('String error');

      const command = exportDiagnosticsCommand(mockDiagnosticsService);

      await command();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to export diagnostics: String error',
      );
    });
  });

  describe('sanitization', () => {
    it('should sanitize all content before adding to ZIP', async () => {
      const mockUri = { fsPath: '/path/to/export.zip', toString: () => '/path/to/export.zip' };
      (vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);

      const command = exportDiagnosticsCommand(mockDiagnosticsService);
      await command();

      // Verify sanitizer was called for each piece of content
      expect(mockSanitizer.sanitize).toHaveBeenNthCalledWith(
        1,
        '# GitLab Workflow Diagnostics\n\n## Section 1\n\nContent',
      );
      expect(mockSanitizer.sanitize).toHaveBeenNthCalledWith(
        2,
        'Extension log line 1\nExtension log line 2',
      );
      expect(mockSanitizer.sanitize).toHaveBeenNthCalledWith(3, 'LS log line 1\nLS log line 2');
    });
  });
});
