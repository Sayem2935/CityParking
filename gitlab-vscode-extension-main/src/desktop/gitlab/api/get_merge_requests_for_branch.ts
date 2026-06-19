import { GitLabProject } from '../../../common/platform/gitlab_project';
import { GetRequest } from '../../../common/platform/web_ide';

export const getMergeRequestsForBranch = (
  project: GitLabProject,
  sourceBranch: string,
): GetRequest<RestMr[]> => ({
  type: 'rest',
  method: 'GET',
  path: `/projects/${project.restId}/merge_requests`,
  searchParams: { source_branch: sourceBranch },
});
