import * as vscode from 'vscode';
import { IClientContext } from '@gitlab-org/gitlab-lsp';

/** IClientContext with ide and extension guaranteed present. */
export interface ResolvedClientContext extends IClientContext {
  ide: NonNullable<IClientContext['ide']>;
  extension: NonNullable<IClientContext['extension']>;
}

export const getClientContext = (): ResolvedClientContext => {
  const extension = vscode.extensions.getExtension('Gitlab.gitlab-workflow');
  return {
    ide: {
      name: 'Visual Studio Code',
      vendor: 'Microsoft Corporation',
      version: vscode.version,
    },
    extension: {
      name: 'GitLab',
      version: extension?.packageJSON?.version,
    },
  };
};
