/* eslint-disable max-classes-per-file */
import * as vscode from 'vscode';
import {
  API,
  Change,
  CredentialsProvider,
  RefType,
  RemoteSourceProvider,
  RemoteSourcePublisher,
  Repository,
  SourceControlHistoryItemDetailsProvider,
  Status,
  UpstreamRef,
} from '../api/git';
import { EventEmitter } from './event_emitter';

const removeFromArray = <T>(array: Array<T>, element: T): Array<T> =>
  array.filter(el => el !== element);

export interface FakeRepositoryOptions {
  rootUriPath: string;
  remotes: [string, string?, string?][];
  headName?: string;
  headRemoteName?: string;
  upstream?: UpstreamRef;
  hasLocalChanges?: boolean;
  commit?: string;
}

export const fakeRepositoryOptions: FakeRepositoryOptions = {
  rootUriPath: '/path/to/repo',
  remotes: [['origin', 'git@a.com:gitlab/extension.git']],
};

const fakeChange: Change = {
  uri: vscode.Uri.file('/path/to/repo'),
  originalUri: vscode.Uri.file('/path/to/repo'),
  status: Status.INDEX_MODIFIED,
  renameUri: undefined,
};

export const createFakeRepository = (options: Partial<FakeRepositoryOptions> = {}): Repository => {
  const { rootUriPath, remotes, headName, headRemoteName, commit, upstream, hasLocalChanges } = {
    ...fakeRepositoryOptions,
    ...options,
  };

  const onDidChangeEmitter = new EventEmitter<string>();

  return {
    rootUri: vscode.Uri.file(rootUriPath),
    state: {
      remotes: remotes.map(([name, fetchUrl, pushUrl]) => ({ name, fetchUrl, pushUrl })),
      HEAD: {
        type: RefType.Head,
        remote: headRemoteName,
        name: headName ?? headRemoteName,
        upstream,
        commit,
      },
      indexChanges: hasLocalChanges ? [fakeChange] : [],
      refs: [],
      onDidChangeEmitter,
      onDidChange: onDidChangeEmitter.event,
    },
    addRemote(name: string, url: string) {
      (this as Repository).state.remotes.push({
        name,
        fetchUrl: url,
        pushUrl: url,
        isReadOnly: false,
      });
    },
    async push(remoteName: string, branchName: string, setUpstream: boolean) {
      if (setUpstream) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const head = (this as any).state.HEAD;
        head.remote = branchName;
      }
    },
    status: async () => undefined,
    getConfig: async () => '',
    log: async () => [],
  } as unknown as Repository;
};

/**
 * This is a simple test double for the native Git extension API
 *
 * It allows us to test our cloning feature without mocking every response
 * and validating arguments of function calls.
 */
class FakeGitApi {
  credentialsProviders: CredentialsProvider[] = [];

  remoteSourceProviders: RemoteSourceProvider[] = [];

  remoteSourcePublishers: RemoteSourcePublisher[] = [];

  historyDetailsProviders: SourceControlHistoryItemDetailsProvider[] = [];

  repositories: Repository[] = [];

  onDidOpenRepositoryEmitter = new EventEmitter<Repository>();

  onDidOpenRepository = this.onDidOpenRepositoryEmitter.event;

  onDidCloseRepositoryEmitter = new EventEmitter<Repository>();

  onDidCloseRepository = this.onDidCloseRepositoryEmitter.event;

  registerCredentialsProvider(provider: CredentialsProvider) {
    this.credentialsProviders.push(provider);
    return {
      dispose: () => {
        this.credentialsProviders = removeFromArray(this.credentialsProviders, provider);
      },
    };
  }

  getRepository(uri: vscode.Uri) {
    return this.repositories.find(r => r.rootUri.toString() === uri.toString());
  }

  registerRemoteSourceProvider(provider: RemoteSourceProvider) {
    this.remoteSourceProviders.push(provider);
    return {
      dispose: () => {
        this.remoteSourceProviders = removeFromArray(this.remoteSourceProviders, provider);
      },
    };
  }

  registerRemoteSourcePublisher(provider: RemoteSourcePublisher) {
    this.remoteSourcePublishers.push(provider);
    return {
      dispose: () => {
        this.remoteSourcePublishers = removeFromArray(this.remoteSourcePublishers, provider);
      },
    };
  }

  registerSourceControlHistoryItemDetailsProvider(
    provider: SourceControlHistoryItemDetailsProvider,
  ) {
    this.historyDetailsProviders.push(provider);
    return {
      dispose: () => {
        this.historyDetailsProviders = removeFromArray(this.historyDetailsProviders, provider);
      },
    };
  }
}

/**
 * This is a simple test double for the native Git extension
 *
 * We use it to test enabling and disabling the extension.
 */
export class FakeGitExtension {
  enabled = true;

  enablementListeners: (<T>() => T)[] = [];

  gitApi = new FakeGitApi();

  onDidChangeEnablementEmitter = new EventEmitter<boolean>();

  onDidChangeEnablement = this.onDidChangeEnablementEmitter.event;

  getAPI(): API {
    return this.gitApi as unknown as API;
  }
}
