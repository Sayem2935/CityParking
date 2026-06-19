import { log } from '../../common/log';
import { GitLabProject } from '../../common/platform/gitlab_project';
import { sort } from '../utils/sort';
import { findOpenMrForCurrentBranch } from './utils/mr_lookup_helpers';
import { getPipelinesForMr } from './api/get_pipelines_for_mr';
import { getPipelinesForRef } from './api/get_pipelines_for_ref';
import { GitLabService } from './gitlab_service';

// Error handler that distinguishes between real errors and not-found cases
const handleApiError = <T>(error: unknown, context: string): T | undefined => {
  // Log with context for debugging
  if (error instanceof Error) {
    log.error(`${context}: ${error.message}`);
  } else {
    log.error(context, error instanceof Error ? error : new Error(String(error)));
  }
  return undefined;
};

export const getPipelineAndMrForBranch = async (
  gitlabService: GitLabService,
  project: GitLabProject,
  trackingBranchName: string,
): Promise<{
  pipeline?: RestPipeline;
  mr?: RestMr;
}> => {
  // Use centralized MR lookup helper (handles normalization, selection, error handling)
  let mr: RestMr | undefined;
  let mrPipeline: RestPipeline | undefined;
  try {
    mr =
      (await findOpenMrForCurrentBranch(gitlabService, project, trackingBranchName)) || undefined;
  } catch (e) {
    handleApiError(e, 'findOpenMrForCurrentBranch failed');
  }

  // Only fetch MR-specific pipeline if MR exists
  if (mr) {
    try {
      const pipelines = await gitlabService.fetchFromApi(getPipelinesForMr(mr));
      if (pipelines && pipelines.length > 0) {
        [mrPipeline] = sort(pipelines, (p1, p2) => p2.iid - p1.iid);
      }
    } catch (e) {
      handleApiError(e, `Failed to fetch pipelines for MR !${mr.iid}`);
    }
  }

  // Fallback: fetch pipeline by ref (works for both MR and non-MR branches)
  try {
    const pipelines = await gitlabService.fetchFromApi(
      getPipelinesForRef(project, trackingBranchName),
    );
    const branchPipeline = pipelines?.[0];
    const pipeline =
      (mrPipeline?.iid ?? 0) > (branchPipeline?.iid ?? 0) ? mrPipeline : branchPipeline;

    return { mr, pipeline };
  } catch (e) {
    handleApiError(e, `Failed to fetch pipelines for ref "${trackingBranchName}"`);
    return { mr, pipeline: mrPipeline };
  }
};
