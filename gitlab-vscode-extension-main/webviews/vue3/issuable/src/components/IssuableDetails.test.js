import { vi, expect, it, describe, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import IssuableDetails from './IssuableDetails.vue';

const baseIssuable = {
  id: 1,
  title: 'Fix the bug',
  state: 'opened',
  description: 'Some description',
  web_url: 'https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/1',
  created_at: '2024-01-01T00:00:00Z',
  author: {
    name: 'Jane Doe',
    username: 'janedoe',
    avatar_url: 'https://example.com/avatar.jpg',
  },
};

const baseMr = {
  ...baseIssuable,
  web_url: 'https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/1',
  state: 'opened',
  source_branch: 'feature-branch',
  target_branch: 'main',
  source_project_id: 1,
  target_project_id: 1,
};

const mountComponent = (issuable = baseIssuable) =>
  mount(IssuableDetails, {
    props: { issuable },
    global: {
      stubs: { date: true, 'user-avatar': true },
      directives: { SafeHtml: {} },
    },
  });

describe('IssuableDetails', () => {
  beforeEach(() => {
    window.vsCodeApi = { postMessage: vi.fn() };
  });

  describe('title', () => {
    it('renders the issuable title', () => {
      const wrapper = mountComponent();
      expect(wrapper.find('.title').text()).toBe('Fix the bug');
    });
  });

  describe('Open in GitLab link', () => {
    it('renders a link to the issuable web url', () => {
      const wrapper = mountComponent();
      const link = wrapper.find('.view-link');
      expect(link.attributes('href')).toBe(baseIssuable.web_url);
    });
  });

  describe('state badge', () => {
    it.each`
      state       | expectedText | expectedClass
      ${'opened'} | ${'Open'}    | ${'opened'}
      ${'closed'} | ${'Closed'}  | ${'closed'}
      ${'merged'} | ${'Merged'}  | ${'merged'}
    `(
      'renders "$expectedText" badge for $state state',
      ({ state, expectedText, expectedClass }) => {
        const wrapper = mountComponent({ ...baseIssuable, state });
        const badge = wrapper.find('.state');
        expect(badge.text()).toBe(expectedText);
        expect(badge.classes()).toContain(expectedClass);
      },
    );

    it('renders empty text for unknown state', () => {
      const wrapper = mountComponent({ ...baseIssuable, state: 'unknown' });
      expect(wrapper.find('.state').text()).toBe('');
    });
  });

  describe('branch info', () => {
    it('does not render branch info for issues', () => {
      const wrapper = mountComponent(baseIssuable);
      expect(wrapper.find('.branch-info').exists()).toBe(false);
    });

    it('renders branch info for merge requests', () => {
      const wrapper = mountComponent(baseMr);
      expect(wrapper.find('.branch-info').exists()).toBe(true);
    });

    it('renders source and target branch labels', () => {
      const wrapper = mountComponent(baseMr);
      const labels = wrapper.findAll('.branch-label');
      expect(labels[0].text()).toBe('feature-branch');
      expect(labels[1].text()).toBe('main');
    });

    it('links source branch to the correct GitLab branch page', () => {
      const wrapper = mountComponent(baseMr);
      const labels = wrapper.findAll('.branch-label');
      expect(labels[0].attributes('href')).toBe(
        'https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/tree/feature-branch',
      );
    });

    it('links target branch to the correct GitLab branch page', () => {
      const wrapper = mountComponent(baseMr);
      const labels = wrapper.findAll('.branch-label');
      expect(labels[1].attributes('href')).toBe(
        'https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/tree/main',
      );
    });

    describe('fork MR', () => {
      const forkMr = {
        ...baseMr,
        source_project_id: 9999,
        source_namespace: 'my_fork/test_project',
      };

      it('prefixes source branch label with the fork namespace', () => {
        const wrapper = mountComponent(forkMr);
        const labels = wrapper.findAll('.branch-label');
        expect(labels[0].text()).toBe('my_fork/test_project:feature-branch');
      });

      it('links source branch to the fork project branch page', () => {
        const wrapper = mountComponent(forkMr);
        const labels = wrapper.findAll('.branch-label');
        expect(labels[0].attributes('href')).toBe(
          'https://gitlab.com/my_fork/test_project/-/tree/feature-branch',
        );
      });

      it('links target branch to the target project branch page', () => {
        const wrapper = mountComponent(forkMr);
        const labels = wrapper.findAll('.branch-label');
        expect(labels[1].attributes('href')).toBe(
          'https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/tree/main',
        );
      });
    });
  });
});
