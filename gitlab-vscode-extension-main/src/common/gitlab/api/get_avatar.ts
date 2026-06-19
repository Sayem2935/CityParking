import { GetRequest } from '../../platform/web_ide';

export const avatarRequest = (email: string): GetRequest<RestAvatar> => ({
  type: 'rest',
  method: 'GET',
  path: '/avatar',
  searchParams: { email },
});
