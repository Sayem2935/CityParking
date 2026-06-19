import { getGitLabService } from '../gitlab/get_gitlab_service';
import { ProjectInRepositoryProvider } from '../gitlab/new_project';
import { PipelineProvider } from '../tree_view/items/pipeline_provider';
import { PipelineItemModel } from '../tree_view/items/pipeline_item_model';
import { currentBranchDataProvider } from '../tree_view/current_branch_data_provider';
import { currentBranchRefresher } from '../current_branch_refresher';

async function retryOrCancelPipeline(
  action: 'retry' | 'cancel',
  provider: PipelineProvider & ProjectInRepositoryProvider,
): Promise<RestPipeline | undefined> {
  const { pipeline, projectInRepository } = provider;
  const gitlabService = getGitLabService(projectInRepository);
  return currentBranchDataProvider.withMarkedAsBusy('pipeline', pipeline.id, async () => {
    const result = await gitlabService.cancelOrRetryPipeline(
      action,
      projectInRepository.project,
      pipeline,
    );
    if (result) await currentBranchRefresher.refresh();
    return result;
  });
}

export function retryPipeline(item: PipelineItemModel): Promise<RestPipeline | undefined> {
  return retryOrCancelPipeline('retry', item);
}

export function cancelPipeline(item: PipelineItemModel): Promise<RestPipeline | undefined> {
  return retryOrCancelPipeline('cancel', item);
}
