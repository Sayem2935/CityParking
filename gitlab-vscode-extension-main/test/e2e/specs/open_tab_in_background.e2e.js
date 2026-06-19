import { browser } from '@wdio/globals';
import { waitForEditorTab } from '../helpers/index.js';

// In `src/common/language_server/diff_middleware.ts` we open a diff tab in the background.
// This is achieved via an undocumented VS Code executeCommand option, added here:
// https://github.com/microsoft/vscode/pull/96966.
//
// This test exists to guard against the possibility of the VS Code API no longer
// supporting this option, and verifies that the usage of this undocumented functionality
// does not break the extension.
//
// If this test starts failing, we should remove the open-in-background option.
// If this functionality is no longer needed, the test may be removed.
describe('Open Tab in Background - vscode.diff with background option', async () => {
  let workbench;

  beforeEach(async () => {
    workbench = await browser.getWorkbench();
  });

  it('successfully executes vscode.diff command with background: true option', async () => {
    // Create test files to compare
    const originalFilename = `original.txt`;
    const modifiedFilename = `modified.txt`;
    const diffFilename = `${originalFilename} ↔ ${modifiedFilename}`;

    // Open a base file first to have an active editor
    await browser.executeWorkbench(async vscode => {
      const uri = vscode.Uri.file('/tmp/base-file.txt');
      await vscode.workspace.fs.writeFile(uri, Buffer.from('Base file content', 'utf8'));
      await vscode.commands.executeCommand('vscode.open', uri);
    });

    const editorView = await workbench.getEditorView();

    // Wait for the base file to be active
    await waitForEditorTab(editorView, 'base-file.txt');

    // Get the initial active tab
    const initialActiveTab = await editorView.getActiveTab();
    const initialTabTitle = await initialActiveTab.getTitle();

    // Test the vscode.diff command with background: true
    let diffCommandSucceeded = false;
    let errorMessage = '';

    try {
      await browser.executeWorkbench(
        async (vscode, ...params) => {
          const [originalFile, modifiedFile, diffTitle] = params;
          const originalUri = vscode.Uri.file(originalFile);
          const modifiedUri = vscode.Uri.file(modifiedFile);

          // This is the exact command call from diff_middleware.ts that we're testing
          await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, diffTitle, {
            background: true,
          });
        },
        originalFilename,
        modifiedFilename,
        diffFilename,
      );
      diffCommandSucceeded = true;
    } catch (error) {
      errorMessage = error.message || 'Unknown error';
    }

    // The main assertion: the command should succeed without throwing an error
    expect(diffCommandSucceeded).toBe(true);
    if (!diffCommandSucceeded) {
      throw new Error(`vscode.diff with background: true failed: ${errorMessage}`);
    }

    // Verify that a diff tab was created
    const diffTabExists = await waitForEditorTab(editorView, diffFilename);

    expect(diffTabExists).toBe(true);

    // If background: true works correctly, the original active tab should still be active
    const currentActiveTab = await editorView.getActiveTab();
    const currentActiveTabTitle = await currentActiveTab.getTitle();

    expect(currentActiveTabTitle).toBe(initialTabTitle);
    expect(currentActiveTabTitle).toBe('base-file.txt');
  });
});
