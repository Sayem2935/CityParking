import assert from 'assert';
import * as sinon from 'sinon';
import * as logModule from '../../../common/log';
import { GitLabProject } from '../../../common/platform/gitlab_project';
import { GitLabService } from '../gitlab_service';
import {
  normalizeBranchName,
  selectMostRecentMr,
  findOpenMrForCurrentBranch,
} from './mr_lookup_helpers';

describe('mr_lookup_helpers', () => {
  describe('normalizeBranchName', () => {
    it('removes refs/heads/ prefix from branch name', () => {
      const result = normalizeBranchName('refs/heads/feature/my-branch');
      assert.strictEqual(result, 'feature/my-branch');
    });

    it('returns the branch name as-is if no prefix', () => {
      const result = normalizeBranchName('feature/my-branch');
      assert.strictEqual(result, 'feature/my-branch');
    });

    it('trims whitespace from branch name', () => {
      const result = normalizeBranchName('  feature/my-branch  ');
      assert.strictEqual(result, 'feature/my-branch');
    });

    it('returns null for empty string', () => {
      const result = normalizeBranchName('');
      assert.strictEqual(result, null);
    });

    it('returns null for undefined input', () => {
      const result = normalizeBranchName(undefined);
      assert.strictEqual(result, null);
    });

    it('returns null for whitespace-only input', () => {
      const result = normalizeBranchName('   ');
      assert.strictEqual(result, null);
    });

    it('handles refs/heads/ with complex branch names', () => {
      const result = normalizeBranchName('refs/heads/feature/JIRA-123/fix-bug');
      assert.strictEqual(result, 'feature/JIRA-123/fix-bug');
    });
  });

  describe('selectMostRecentMr', () => {
    const createMr = (iid: number, draft: boolean, updatedAt: string): RestMr => ({
      id: iid,
      iid,
      title: `MR ${iid}`,
      project_id: 1,
      author: { name: 'User', avatar_url: null },
      web_url: `https://example.com/mr/${iid}`,
      references: { full: 'project#123' },
      severity: 'none',
      name: `MR ${iid}`,
      sha: 'abc123',
      source_project_id: 1,
      target_project_id: 1,
      source_branch: 'feature',
      state: 'opened',
      updated_at: updatedAt,
      draft,
    });

    it('returns null for undefined input', () => {
      const result = selectMostRecentMr(undefined);
      assert.strictEqual(result, null);
    });

    it('returns null for empty array', () => {
      const result = selectMostRecentMr([]);
      assert.strictEqual(result, null);
    });

    it('selects single non-draft MR', () => {
      const mr = createMr(1, false, '2026-01-27T10:00:00Z');
      const result = selectMostRecentMr([mr]);
      assert.strictEqual(result?.iid, 1);
    });

    it('includes draft MRs when selecting the most recent MR', () => {
      const draft = createMr(1, true, '2026-01-27T10:00:00Z');
      const nonDraft = createMr(2, false, '2026-01-27T09:00:00Z');
      const result = selectMostRecentMr([draft, nonDraft]);
      assert.strictEqual(result?.iid, 1);
    });

    it('selects most recent MR when all MRs are drafts', () => {
      const draft1 = createMr(1, true, '2026-01-27T09:00:00Z');
      const draft2 = createMr(2, true, '2026-01-27T10:00:00Z');
      const result = selectMostRecentMr([draft1, draft2]);
      assert.strictEqual(result?.iid, 2);
    });

    it('selects most recently updated MR', () => {
      const mr1 = createMr(1, false, '2026-01-27T10:00:00Z');
      const mr2 = createMr(2, false, '2026-01-27T15:00:00Z');
      const mr3 = createMr(3, false, '2026-01-27T12:00:00Z');
      const result = selectMostRecentMr([mr1, mr2, mr3]);
      assert.strictEqual(result?.iid, 2);
    });

    it('handles MRs with identical updated_at timestamps', () => {
      const mr1 = createMr(1, false, '2026-01-27T10:00:00Z');
      const mr2 = createMr(2, false, '2026-01-27T10:00:00Z');
      const result = selectMostRecentMr([mr1, mr2]);
      // Should return first one in the sorted list
      assert(result?.iid === 1 || result?.iid === 2);
    });

    it('handles MRs with missing updated_at (treats as 0)', () => {
      const mrNoDate = createMr(1, false, '');
      const mrWithDate = createMr(2, false, '2026-01-27T10:00:00Z');
      const result = selectMostRecentMr([mrNoDate, mrWithDate]);
      assert.strictEqual(result?.iid, 2);
    });

    it('correctly sorts MRs in descending order by date', () => {
      const mr1 = createMr(1, false, '2026-01-26T10:00:00Z');
      const mr2 = createMr(2, false, '2026-01-28T10:00:00Z');
      const mr3 = createMr(3, false, '2026-01-27T10:00:00Z');
      const result = selectMostRecentMr([mr1, mr2, mr3]);
      assert.strictEqual(result?.iid, 2);
    });
  });

  describe('findOpenMrForCurrentBranch', () => {
    let logDebugStub: sinon.SinonStub;
    let logWarnStub: sinon.SinonStub;
    let gitlabServiceStub: sinon.SinonStubbedInstance<GitLabService>;
    let projectStub: GitLabProject;

    beforeEach(() => {
      logDebugStub = sinon.stub(logModule.log, 'debug');
      logWarnStub = sinon.stub(logModule.log, 'warn');
      gitlabServiceStub = sinon.createStubInstance(GitLabService);
      projectStub = {
        gqlId: 'gid://gitlab/Project/1',
        restId: 1,
        description: 'Test Project',
        namespaceWithPath: 'test/project',
        webUrl: 'https://example.com/test/project',
      } as GitLabProject;
    });

    afterEach(() => {
      sinon.restore();
    });

    it('returns null for undefined branch name', async () => {
      const result = await findOpenMrForCurrentBranch(
        gitlabServiceStub as unknown as GitLabService,
        projectStub,
        undefined,
      );
      assert.strictEqual(result, null);
      sinon.assert.called(logDebugStub);
    });

    it('returns null for empty branch name', async () => {
      const result = await findOpenMrForCurrentBranch(
        gitlabServiceStub as unknown as GitLabService,
        projectStub,
        '',
      );
      assert.strictEqual(result, null);
      sinon.assert.called(logDebugStub);
    });

    it('normalizes branch name before API call', async () => {
      const createMr = (iid: number): RestMr => ({
        id: iid,
        iid,
        title: `MR ${iid}`,
        project_id: 1,
        author: { name: 'User', avatar_url: null },
        web_url: `https://example.com/mr/${iid}`,
        references: { full: 'project#123' },
        severity: 'none',
        name: `MR ${iid}`,
        sha: 'abc123',
        source_project_id: 1,
        target_project_id: 1,
        source_branch: 'feature',
        state: 'opened',
        updated_at: '2026-01-27T10:00:00Z',
        draft: false,
      });

      gitlabServiceStub.fetchFromApi.resolves([createMr(1)]);

      const result = await findOpenMrForCurrentBranch(
        gitlabServiceStub as unknown as GitLabService,
        projectStub,
        'refs/heads/feature/my-branch',
      );

      assert.strictEqual(result?.iid, 1);
      sinon.assert.called(logDebugStub);
    });

    it('handles API errors gracefully', async () => {
      gitlabServiceStub.fetchFromApi.rejects(new Error('API error'));

      const result = await findOpenMrForCurrentBranch(
        gitlabServiceStub as unknown as GitLabService,
        projectStub,
        'feature/my-branch',
      );

      assert.strictEqual(result, null);
      sinon.assert.called(logWarnStub);
    });

    it('returns null when no MRs found for branch', async () => {
      gitlabServiceStub.fetchFromApi.resolves([]);

      const result = await findOpenMrForCurrentBranch(
        gitlabServiceStub as unknown as GitLabService,
        projectStub,
        'feature/my-branch',
      );

      assert.strictEqual(result, null);
    });
  });
});
