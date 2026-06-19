import { log } from '../../../common/log';
import { GitLabProject } from '../../../common/platform/gitlab_project';
import { GitLabService } from '../gitlab_service';
import { getMergeRequestsForBranch } from '../api/get_merge_requests_for_branch';

/**
 * Normalizes branch names by removing refs/heads/ prefix from git config output.
 * - refs/heads/branch → branch
 * - Returns null for invalid/empty input
 */
export const normalizeBranchName = (branch: string | undefined): string | null => {
  if (!branch?.trim()) {
    return null;
  }

  const normalized = branch.trim();

  // Remove refs/heads/ prefix (can appear in git config output)
  if (normalized.startsWith('refs/heads/')) {
    return normalized.replace('refs/heads/', '');
  }

  return normalized;
};

/**
 * Selects the most recently updated MR from a list deterministically:
 * 1. Sorts by most recently updated
 * 2. Returns the first (most recent)
 * 3. Returns null if no valid MR found
 */
export const selectMostRecentMr = (mrs: RestMr[] | undefined): RestMr | null => {
  if (!mrs || mrs.length === 0) {
    return null;
  }

  const sortedMrs = [...mrs];

  // Sort by updated_at descending (most recent first)
  sortedMrs.sort((a, b) => {
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  });

  return sortedMrs[0] ?? null;
};

/**
 * Centralized helper to find open MR for current branch.
 * Handles:
 * - Branch normalization
 * - Deterministic MR selection
 * - Graceful error handling
 * Returns null if not found or error occurs (caller decides fallback)
 */
export const findOpenMrForCurrentBranch = async (
  gitlabService: GitLabService,
  project: GitLabProject,
  branchName: string | undefined,
): Promise<RestMr | null> => {
  try {
    // Normalize branch name
    const normalizedBranch = normalizeBranchName(branchName);
    if (!normalizedBranch) {
      log.debug('MR lookup: invalid branch name');
      return null;
    }

    // Fetch MRs from API
    try {
      const mrs = await gitlabService.fetchFromApi(
        getMergeRequestsForBranch(project, normalizedBranch),
      );

      // Select most recent MR deterministically
      const selectedMr = selectMostRecentMr(mrs);
      if (selectedMr) {
        log.debug(`MR lookup: found MR !${selectedMr.iid} for branch "${normalizedBranch}"`);
      }
      return selectedMr;
    } catch (apiError) {
      // Graceful API failure handling
      if (apiError instanceof Error) {
        log.warn(`MR lookup API failed: ${apiError.message}`);
      } else {
        log.warn('MR lookup API failed with unknown error');
      }
      // Return null to let caller fallback to "Create MR"
      return null;
    }
  } catch (e) {
    // Catch any unexpected errors
    log.error('MR lookup: unexpected error', e instanceof Error ? e : new Error(String(e)));
    return null;
  }
};
