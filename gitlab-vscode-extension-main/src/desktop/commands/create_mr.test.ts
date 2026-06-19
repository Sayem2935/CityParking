import path from 'path';
import * as vscode from 'vscode';
import { GitRepository } from '../git/new_git';
import { ProjectInRepository } from '../gitlab/new_project';

import * as testEntities from '../test_utils/entities';
import { createFakeRepository } from '../test_utils/fake_git_extension';
import { Repository } from '../api/git';
import { VS_COMMANDS } from '../../common/command_names';
import { openCreateNewMr } from './create_mr';

function createProjectInRepository(rawRepository: Repository): ProjectInRepository {
  const repoRootPath = path.join('path', 'to', 'repo');
  return {
    ...testEntities.projectInRepository,
    pointer: {
      ...testEntities.projectInRepository.pointer,
      repository: {
        rootFsPath: repoRootPath,
        rawRepository,
      } as GitRepository,
    },
  };
}

describe('openCreateNewMr', () => {
  beforeEach(() => {
    (vscode.window.showWarningMessage as jest.Mock).mockImplementation((title, details, option) => {
      return option;
    });
    (vscode.window.withProgress as jest.Mock).mockImplementation((_, task) => task());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('opens the browser when upstream exists', async () => {
    const rawRepository = createFakeRepository({
      headRemoteName: 'branch',
      upstream: {
        name: 'yes',
        remote: 'remote',
      },
    });
    const pir = createProjectInRepository(rawRepository);

    await openCreateNewMr(pir);

    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      VS_COMMANDS.OPEN,
      vscode.Uri.parse(
        `https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/new?merge_request%5Bsource_branch%5D=branch`,
      ),
    );
  });

  it('offers to push when local repository is clean', async () => {
    const rawRepository = createFakeRepository({ headName: 'branch' });
    const pir = createProjectInRepository(rawRepository);

    expect(rawRepository.state.HEAD?.remote).toBeUndefined();

    await openCreateNewMr(pir);

    expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    expect(rawRepository.state.HEAD?.remote).toBeDefined();
  });

  it('offers to go to the sidebar when local repository is not clean', async () => {
    const rawRepository = createFakeRepository({ headName: 'branch', hasLocalChanges: true });
    const pir = createProjectInRepository(rawRepository);

    await openCreateNewMr(pir);

    expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.view.scm');
  });

  // TODO add tests for missing tracking branch etc.
});
