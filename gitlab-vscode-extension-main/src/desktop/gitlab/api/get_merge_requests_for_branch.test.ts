import { project } from '../../../common/test_utils/entities';
import { getMergeRequestsForBranch } from './get_merge_requests_for_branch';

describe('getPipelinesForRef', () => {
  it('creates request', async () => {
    const request = getMergeRequestsForBranch(project, 'test-ref');

    expect(request).toEqual({
      type: 'rest',
      method: 'GET',
      path: `/projects/${project.restId}/merge_requests`,
      searchParams: { source_branch: 'test-ref' },
    });
  });
});
