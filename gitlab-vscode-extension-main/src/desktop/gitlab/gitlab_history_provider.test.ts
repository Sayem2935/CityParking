import { createFakePartial } from '../../common/test_utils/create_fake_partial';
import { projectInRepository } from '../test_utils/entities';
import type { GetRequest } from '../../common/platform/web_ide';
import { getGitLabService } from './get_gitlab_service';
import { gitlabHistoryProvider } from './gitlab_history_provider';
import { getProjectRepository, GitLabProjectRepository } from './gitlab_project_repository';
import { GitLabService } from './gitlab_service';

jest.mock('../gitlab/gitlab_project_repository');
jest.mock('../gitlab/get_gitlab_service');

describe('gitlabHistoryProvider', () => {
  let fakeFetch: jest.Mock;

  beforeEach(() => {
    jest.mocked(getProjectRepository).mockReturnValue(
      createFakePartial<GitLabProjectRepository>({
        getSelectedOrDefaultForRepository: jest.fn().mockReturnValue(projectInRepository),
      }),
    );
    fakeFetch = jest.fn().mockImplementation(async (request: GetRequest<RestAvatar>) => {
      const { email } = request.searchParams ?? {};
      return { avatar_url: `avatar for ${email}` };
    });
    jest.mocked(getGitLabService).mockReturnValue(
      createFakePartial<GitLabService>({
        fetchFromApi: fakeFetch,
      }),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('provides hover commands', async () => {
    const repository = projectInRepository.pointer.repository.rawRepository;
    const result = await gitlabHistoryProvider.provideHoverCommands(repository);
    expect(result).toHaveLength(1);
  });

  it('provides avatars', async () => {
    const repository = projectInRepository.pointer.repository.rawRepository;
    const result = await gitlabHistoryProvider.provideAvatar(repository, {
      commits: [
        { hash: 'commit1', authorEmail: 'first@gitlab.com' },
        { hash: 'commit2', authorEmail: 'second@gitlab.com' },
        { hash: 'commit3', authorEmail: 'first@gitlab.com' },
      ],
      size: 36,
    });

    expect(result!.size).toBe(3);

    expect(result!.get('commit1')).toBe('avatar for first@gitlab.com');
    expect(result!.get('commit2')).toBe('avatar for second@gitlab.com');
    expect(result!.get('commit3')).toBe('avatar for first@gitlab.com');

    // Check for single fetch for each distinct e-mail address
    expect(fakeFetch).toHaveBeenCalledTimes(2);
  });
});
