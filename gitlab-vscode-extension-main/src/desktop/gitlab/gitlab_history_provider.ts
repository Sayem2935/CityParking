import type { Command, ProviderResult } from 'vscode';
import type { AvatarQuery, Repository, SourceControlHistoryItemDetailsProvider } from '../api/git';
import { avatarRequest } from '../../common/gitlab/api/get_avatar';
import { getProjectRepository } from './gitlab_project_repository';
import { getGitLabService } from './get_gitlab_service';

class GitlabHistoryProvider implements SourceControlHistoryItemDetailsProvider {
  #avatarCache: Record<string, ProviderResult<string>> = {};

  async provideHoverCommands(repository: Repository): Promise<Command[] | undefined> {
    const projectInRepository = getProjectRepository().getSelectedOrDefaultForRepository(
      repository.rootUri.fsPath,
    );

    const url = projectInRepository?.project.webUrl;
    if (!url) {
      return undefined;
    }

    return [
      {
        title: '$(gitlab-logo) Open in GitLab',
        tooltip: 'Open in GitLab',
        command: 'gl.openCommitInGitLab',
        arguments: [url],
      },
    ];
  }

  async provideAvatar(
    repository: Repository,
    query: AvatarQuery,
  ): Promise<Map<string, string | undefined> | undefined> {
    const projectInRepository = getProjectRepository().getSelectedOrDefaultForRepository(
      repository.rootUri.fsPath,
    );
    if (!projectInRepository) return undefined;
    const gitlabService = getGitLabService(projectInRepository);

    const map = new Map();
    await Promise.all(
      query.commits.map(async commit => {
        const { hash, authorEmail } = commit;
        if (!authorEmail) {
          return;
        }
        if (authorEmail in this.#avatarCache) {
          const url = await this.#avatarCache[authorEmail];
          if (url) map.set(hash, url);
        } else {
          const promise = gitlabService
            .fetchFromApi(avatarRequest(authorEmail))
            .then(result => result.avatar_url)
            .catch(() => null);

          // Add the Promise to the cache, so other items don't do another request for the same e-mail address.
          this.#avatarCache[authorEmail] = promise;

          const url = await promise;
          if (url) map.set(hash, url);

          // Remove the Promise and replace it with the end result
          this.#avatarCache[authorEmail] = url;
        }
      }),
    );

    return map;
  }

  provideMessageLinks() {
    return undefined;
  }
}

export const gitlabHistoryProvider = new GitlabHistoryProvider();
