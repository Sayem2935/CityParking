import * as vscode from 'vscode';
import {
  DUO_CHAT_WEBVIEW_ID,
  AGENTIC_CHAT_WEBVIEW_ID,
  AGENTIC_TABS_WEBVIEW_ID,
  DUO_WORKFLOW_PANEL_WEBVIEW_ID,
  SECURITY_VULNS_WEBVIEW_ID,
} from '../constants';

import { createFakePartial } from '../test_utils/create_fake_partial';
import { AIContextManager } from '../chat/ai_context_manager';
import {
  AllFeaturesState,
  LanguageServerFeatureStateProvider,
} from '../language_server/language_server_feature_state_provider';
import { setupWebviews } from './setup_webviews';
import { LsWebviewController } from './ls_webview_controller';
import { getWebviewContent } from './get_ls_webview_content';
import { applyMiddleware } from './middleware';
import { createThemeHandlerMiddleware } from './theme/create_theme_handler_middleware';
import { createInitialStateMiddleware } from './theme/create_initial_state_middleware';
import { WebviewManager } from './webview_manager';
import { WebviewMessageRegistry } from './message_handlers/webview_message_registry';
import { registerDuoChatHandlers } from './duo_chat/duo_chat_handlers';
import { registerDuoChatCommands } from './duo_chat/duo_chat_commands';
import { registerDuoAgenticChatCommands } from './duo_agentic_chat/duo_agentic_chat_commands';
import { LSDuoChatWebviewController } from './duo_chat/duo_chat_controller';
import { registerKnowledgeGraphHandlers } from './knowldege_graph/knowledge_graph_handler';
import { KnowledgeGraphWebview } from './knowldege_graph/knowledge_graph_webview';

jest.mock('./middleware');
jest.mock('./get_ls_webview_content');
jest.mock('./theme/create_theme_handler_middleware');
jest.mock('./theme/create_initial_state_middleware');
jest.mock('./ls_webview_controller');
jest.mock('./duo_chat/duo_chat_handlers');
jest.mock('./duo_chat/duo_chat_commands');
jest.mock('./duo_agentic_chat/duo_agentic_chat_commands');
jest.mock('./knowldege_graph/knowledge_graph_handler');
jest.mock('./knowldege_graph/knowledge_graph_webview');

jest.mock('vscode', () => ({
  window: {
    createWebviewPanel: jest.fn(),
    registerWebviewViewProvider: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  ViewColumn: {
    One: 1,
    Beside: -2,
  },
  EventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  workspace: {
    onDidChangeConfiguration: jest.fn(),
    getConfiguration: jest.fn().mockReturnValue({
      debug: false,
      get: jest.fn(),
    }),
  },
  env: {
    asExternalUri: jest.fn(),
  },
  Uri: {
    parse: jest.fn(),
  },
  Disposable: jest.fn(),
}));

// Test helper types and functions
interface SetupWebviewsTestContext {
  webviewManager: WebviewManager;
  webviewMessageRegistry: WebviewMessageRegistry;
  aiContextManager: AIContextManager;
  languageServerFeatureStateProvider: LanguageServerFeatureStateProvider;
  webview: vscode.Webview;
  panel: vscode.WebviewPanel | undefined;
  revealSpy: jest.Mock;
  onDidDisposeSpy: jest.Mock;
  disposeSpy: jest.Mock;
}

function createTestContext(
  overrides?: Partial<SetupWebviewsTestContext>,
): SetupWebviewsTestContext {
  const revealSpy = jest.fn();
  const onDidDisposeSpy = jest.fn();
  const disposeSpy = jest.fn();

  const webviewMessageRegistry = createFakePartial<WebviewMessageRegistry>({
    onNotification: jest.fn(),
    onRequest: jest.fn(),
    initNotifier: jest.fn(),
    initRequester: jest.fn(),
  });

  const webviewManager = {
    getWebviewInfos: jest.fn().mockResolvedValue([]),
    publishWebviewTheme: jest.fn(),
    setDuoWorkflowInitialState: jest.fn(),
  };

  const aiContextManager = createFakePartial<AIContextManager>({
    add: jest.fn(),
  });

  const languageServerFeatureStateProvider = createFakePartial<LanguageServerFeatureStateProvider>({
    onChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    state: createFakePartial<AllFeaturesState>({}),
  });

  const webview = {} as vscode.Webview;
  const panel = {
    webview,
    dispose: disposeSpy,
    onDidDispose: onDidDisposeSpy,
    reveal: revealSpy,
  } as unknown as vscode.WebviewPanel;

  vscode.window.createWebviewPanel = jest.fn().mockReturnValue(panel);

  const defaults: SetupWebviewsTestContext = {
    webviewManager,
    webviewMessageRegistry,
    aiContextManager,
    languageServerFeatureStateProvider,
    webview,
    panel,
    revealSpy,
    onDidDisposeSpy,
    disposeSpy,
  };

  return { ...defaults, ...overrides };
}

function callSetupWebviews(ctx: SetupWebviewsTestContext): Promise<vscode.Disposable> {
  return setupWebviews(ctx.webviewManager, ctx.webviewMessageRegistry, ctx.aiContextManager);
}

describe('setupWebviews', () => {
  let ctx: SetupWebviewsTestContext;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createTestContext();
  });

  describe('for the panel webviews', () => {
    it('should setup panel webviews correctly', async () => {
      ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([
        {
          id: DUO_CHAT_WEBVIEW_ID,
          title: 'Duo Chat',
          uris: ['https://example.com/duo-chat'],
        },
      ]);

      const disposable = await callSetupWebviews(ctx);

      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledTimes(1);
      expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(1);
      expect(LsWebviewController).toHaveBeenCalledTimes(1);
      expect(disposable).toBeDefined();
    });

    it('should create show command for panel webviews', async () => {
      ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([
        {
          id: DUO_CHAT_WEBVIEW_ID,
          title: 'Duo Chat',
          uris: ['https://example.com/duo-chat'],
        },
      ]);

      await callSetupWebviews(ctx);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'gl.webview.duoChatV2.show',
        expect.any(Function),
      );
    });
  });

  describe('for the editor webviews', () => {
    const editorWebviewInfo = {
      id: SECURITY_VULNS_WEBVIEW_ID,
      title: 'Security Vulnerabilities',
      uris: ['https://example.com/security-vulns'],
    };
    let showCommandHandler: (initialState?: Record<string, unknown>) => Promise<void>;

    beforeEach(async () => {
      ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([editorWebviewInfo]);
      vscode.env.asExternalUri = jest.fn().mockResolvedValue({
        toString: () => editorWebviewInfo.uris[0],
      } as vscode.Uri);
      await callSetupWebviews(ctx);

      const [, handler] = jest.mocked(vscode.commands.registerCommand).mock.calls[0];
      showCommandHandler = handler;
    });

    it('should register the correct command', async () => {
      ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([editorWebviewInfo]);

      const disposable = await callSetupWebviews(ctx);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        `gl.webview.securityVulnDetails.show`,
        expect.any(Function),
      );
      expect(disposable).toBeDefined();
    });

    it('should create webview panel with correct parameters when show command is executed', async () => {
      jest.mocked(getWebviewContent).mockResolvedValue('<html>Mock Content</html>');
      await showCommandHandler();
      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        editorWebviewInfo.id,
        editorWebviewInfo.title,
        {
          viewColumn: -2,
          preserveFocus: true,
        },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );
    });

    it('should set correct HTML content for the webview', async () => {
      jest.mocked(getWebviewContent).mockResolvedValue('<html>Mock Content</html>');
      await showCommandHandler();

      expect(getWebviewContent).toHaveBeenCalledWith(
        new URL(editorWebviewInfo.uris[0]),
        editorWebviewInfo.title,
      );
      expect(ctx.webview.html).toBe('<html>Mock Content</html>');
    });

    it('should apply correct middlewares', async () => {
      await showCommandHandler();

      expect(createThemeHandlerMiddleware).toHaveBeenCalledWith(ctx.webviewManager);
      expect(createInitialStateMiddleware).toHaveBeenCalledWith(ctx.webviewManager, {
        type: undefined,
      });
      expect(applyMiddleware).toHaveBeenCalledWith(ctx.panel, expect.any(Array));
    });

    it('should return a disposable', async () => {
      const result = await callSetupWebviews(ctx);

      expect(result).toBeInstanceOf(vscode.Disposable);
    });

    it('calls the onDidDispose method', async () => {
      await showCommandHandler();
      expect(ctx.onDidDisposeSpy).toHaveBeenCalled();
    });

    describe('when the panel already exists', () => {
      beforeEach(async () => {
        ctx.panel = undefined;
        ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([editorWebviewInfo]);
        await callSetupWebviews(ctx);
      });

      describe('and there is an initialState', () => {
        const initialState = { foo: 'bar' };
        beforeEach(async () => {
          await showCommandHandler(initialState);
        });

        it('should dispose of the existing panel', async () => {
          expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
          expect(ctx.disposeSpy).not.toHaveBeenCalled();

          await showCommandHandler(initialState);
          expect(ctx.disposeSpy).toHaveBeenCalled();
        });

        it('should not reveal an existing panel', () => {
          expect(ctx.revealSpy).not.toHaveBeenCalled();
        });
      });

      describe('and there are no initialState', () => {
        beforeEach(async () => {
          await showCommandHandler();
        });

        it('should reuse the existing panel', async () => {
          expect(ctx.revealSpy).not.toHaveBeenCalled();
          expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);

          ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([editorWebviewInfo]);
          await callSetupWebviews(ctx);
          await showCommandHandler();

          expect(ctx.revealSpy).toHaveBeenCalled();
          expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  it('should correctly setup both panel and editor webviews when there are both', async () => {
    ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([
      {
        id: DUO_CHAT_WEBVIEW_ID,
        title: 'Duo Chat',
        uris: ['https://example.com/duo-chat'],
      },
      {
        id: SECURITY_VULNS_WEBVIEW_ID,
        title: 'Security Vulnerabilities',
        uris: ['https://example.com/security-vulns'],
      },
      {
        id: DUO_WORKFLOW_PANEL_WEBVIEW_ID,
        title: 'GitLab Duo Agent Platform',
        uris: ['https://example.com/duo-workflow-panel'],
      },
    ]);

    const disposable = await callSetupWebviews(ctx);

    expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(3);
    expect(jest.mocked(vscode.commands.registerCommand).mock.calls).toEqual([
      [`gl.webview.duoChatV2.show`, expect.any(Function)],
      [`gl.webview.duoWorkflowPanel.show`, expect.any(Function)],
      [`gl.webview.securityVulnDetails.show`, expect.any(Function)],
    ]);
    expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledTimes(2);
    expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
      `gl.webview.${DUO_CHAT_WEBVIEW_ID}`,
      expect.anything(),
      {
        webviewOptions: { retainContextWhenHidden: true },
      },
    );
    expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
      `gl.webview.${DUO_WORKFLOW_PANEL_WEBVIEW_ID}`,
      expect.anything(),
      {
        webviewOptions: { retainContextWhenHidden: true },
      },
    );

    expect(LsWebviewController).toHaveBeenCalledTimes(2);
    expect(LsWebviewController).toHaveBeenCalledWith(
      expect.objectContaining({ viewId: `gl.webview.${DUO_CHAT_WEBVIEW_ID}` }),
    );

    expect(disposable).toBeDefined();
  });

  it('should handle empty webview infos', async () => {
    ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([]);

    const disposable = await callSetupWebviews(ctx);

    expect(vscode.window.registerWebviewViewProvider).not.toHaveBeenCalled();
    expect(vscode.commands.registerCommand).not.toHaveBeenCalled();
    expect(LsWebviewController).not.toHaveBeenCalled();
    expect(disposable).toBeDefined();
  });

  it('should handle custom settings for webview', async () => {
    ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([
      {
        id: SECURITY_VULNS_WEBVIEW_ID,
        title: 'GitLab SAST Remote Scanner',
        uris: ['https://example.com/security-vuln-details'],
      },
    ]);
    await callSetupWebviews(ctx);
    const showCommandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
    await showCommandHandler();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      SECURITY_VULNS_WEBVIEW_ID,
      'GitLab SAST Remote Scanner',
      {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: true,
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );
  });

  it('should create webview panel when show command is executed for editor webviews', async () => {
    const htmlContent = '<h1>Foo Bar</h1>';
    jest.mocked(getWebviewContent).mockResolvedValue(htmlContent);

    ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([
      {
        id: SECURITY_VULNS_WEBVIEW_ID,
        title: 'Security Vulnerabilities',
        uris: ['https://example.com/security-vulns'],
      },
    ]);

    await callSetupWebviews(ctx);

    const showCommandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
    await showCommandHandler();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      SECURITY_VULNS_WEBVIEW_ID,
      'Security Vulnerabilities',
      {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: true,
      },
      { enableScripts: true, retainContextWhenHidden: true },
    );
    expect(ctx.webview.html).toBe(htmlContent);
  });

  describe('Duo Chat message handlers and commands', () => {
    beforeEach(() => {
      jest.mocked(ctx.webviewManager.getWebviewInfos).mockResolvedValue([
        {
          id: DUO_CHAT_WEBVIEW_ID,
          title: 'Duo Chat',
          uris: ['https://example.com/duo-chat'],
        },
        {
          id: AGENTIC_CHAT_WEBVIEW_ID,
          title: 'GitLab Duo Agentic Chat',
          uris: ['https://example.com/agentic-duo-chat'],
        },
      ]);
    });

    it('should register Duo chat messages in the registry', async () => {
      await callSetupWebviews(ctx);
      expect(jest.mocked(registerDuoChatHandlers).mock.calls).toEqual([
        [ctx.webviewMessageRegistry, expect.any(LSDuoChatWebviewController), DUO_CHAT_WEBVIEW_ID],
        [
          ctx.webviewMessageRegistry,
          expect.any(LSDuoChatWebviewController),
          AGENTIC_CHAT_WEBVIEW_ID,
        ],
      ]);
    });

    it('should register Duo chat commands', async () => {
      await callSetupWebviews(ctx);

      expect(registerDuoChatCommands).toHaveBeenCalledWith(
        ctx.webviewMessageRegistry,
        expect.any(LSDuoChatWebviewController),
        ctx.aiContextManager,
      );
    });

    it('should register Duo Agentic Chat commands', async () => {
      await callSetupWebviews(ctx);

      expect(registerDuoAgenticChatCommands).toHaveBeenCalledWith(
        ctx.webviewMessageRegistry,
        expect.any(LSDuoChatWebviewController),
      );
    });
  });

  describe('for the knowledge graph webview', () => {
    it('should setup knowledge graph webview', async () => {
      ctx.webviewManager.getWebviewInfos = jest.fn().mockResolvedValue([]);

      await callSetupWebviews(ctx);

      expect(KnowledgeGraphWebview).toHaveBeenCalledTimes(1);
      expect(registerKnowledgeGraphHandlers).toHaveBeenCalledWith(
        ctx.webviewMessageRegistry,
        expect.any(KnowledgeGraphWebview),
      );
    });
  });

  describe('for the agentic tabs webview', () => {
    beforeEach(() => {
      jest.mocked(ctx.webviewManager.getWebviewInfos).mockResolvedValue([
        {
          id: AGENTIC_TABS_WEBVIEW_ID,
          title: 'GitLab Duo Agent Platform',
          uris: ['https://example.com/agentic-tabs'],
        },
      ]);
    });

    it('should register webview view provider for agentic tabs', async () => {
      await callSetupWebviews(ctx);

      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
        'gl.webview.agentic-tabs',
        expect.any(LsWebviewController),
        expect.objectContaining({
          webviewOptions: { retainContextWhenHidden: true },
        }),
      );
    });

    it('should register show command for agentic tabs', async () => {
      await callSetupWebviews(ctx);

      const commandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const showCommandCall = commandCalls.find(call => call[0] === 'gl.webview.agenticTabs.show');

      expect(showCommandCall).toBeDefined();
      expect(showCommandCall[1]).toEqual(expect.any(Function));
    });

    it('should pass correct URL to AgenticTabsWebviewController', async () => {
      await callSetupWebviews(ctx);

      const controllerCall = (LsWebviewController as jest.Mock).mock.calls[0][0];
      expect(controllerCall.url.toString()).toBe('https://example.com/agentic-tabs');
    });
  });
});
