import * as vscode from 'vscode';
import { isEmpty } from 'lodash';
import { Repository } from '../api/git';
import { USER_COMMANDS } from '../command_names';
import { GitRemoteUrlPointer } from '../git/new_git';
import { DetachedHeadError } from '../errors/detached_head_error';
import { getTrackingBranchName } from '../git/get_tracking_branch_name';
import { ProjectCommand } from './run_with_valid_project';
import { openUrl } from './openers';

async function pushBranchForMergeRequest(pointer: GitRemoteUrlPointer) {
  const { rawRepository } = pointer.repository;
  const { state } = rawRepository;
  const isClean = isEmpty(state.indexChanges) && isEmpty(state.workingTreeChanges);

  let message = 'You must push this branch to GitLab before you can create a merge request.';
  if (!isClean) {
    message += '\n\nYou have uncommitted changes. Use the Source Control tab to commit them first.';
  }

  if (
    !(await vscode.window.showWarningMessage(
      'Push branch to GitLab',
      {
        modal: true,
        detail: message,
      },
      isClean ? 'Publish Branch' : 'Open Source Control',
    ))
  ) {
    return;
  }

  if (!isClean) {
    await vscode.commands.executeCommand('workbench.view.scm');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Pushing to GitLab…',
    },
    () => rawRepository.push(pointer.remote.name, state.HEAD?.name, true),
  );

  if (
    await vscode.window.showInformationMessage('Branch pushed to GitLab.', 'Create merge request')
  ) {
    await vscode.commands.executeCommand(USER_COMMANDS.OPEN_CREATE_NEW_MR);
  }
}

async function getTrackingBranchNameOrThrow(rawRepository: Repository): Promise<string> {
  const branchName = await getTrackingBranchName(rawRepository);
  if (!branchName) throw new DetachedHeadError();
  return branchName;
}

export const openCreateNewMr: ProjectCommand = async projectInRepository => {
  const { project, pointer } = projectInRepository;

  const branch = pointer.repository.rawRepository.state.HEAD;
  if (branch?.name && !branch.upstream) {
    await pushBranchForMergeRequest(pointer);
    return;
  }

  const branchName = await getTrackingBranchNameOrThrow(pointer.repository.rawRepository);

  await openUrl(
    `${project.webUrl}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(
      branchName,
    )}`,
  );
};
