import { getGitLabService } from '../gitlab/get_gitlab_service';
import { JobItemModel } from '../tree_view/items/job_item_model';
import { currentBranchDataProvider } from '../tree_view/current_branch_data_provider';
import { currentBranchRefresher } from '../current_branch_refresher';

async function retryOrCancelJobItemModel(
  action: 'retry' | 'cancel' | 'play',
  item: JobItemModel,
): Promise<RestJob | undefined> {
  const { job, projectInRepository } = item;
  const gitlabService = getGitLabService(projectInRepository);
  return currentBranchDataProvider.withMarkedAsBusy('job', job.id, async () => {
    const result = await gitlabService.cancelOrRetryJob(action, projectInRepository.project, job);
    if (result) await currentBranchRefresher.refresh();
    return result;
  });
}

export function executeJob(item: JobItemModel): Promise<RestJob | undefined> {
  return retryOrCancelJobItemModel('play', item);
}

export function retryJob(item: JobItemModel): Promise<RestJob | undefined> {
  return retryOrCancelJobItemModel('retry', item);
}

export function cancelJob(item: JobItemModel): Promise<RestJob | undefined> {
  return retryOrCancelJobItemModel('cancel', item);
}
