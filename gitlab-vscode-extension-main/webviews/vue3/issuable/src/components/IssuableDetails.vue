<script>
import checkbox from 'markdown-it-checkbox';
import MarkdownIt from 'markdown-it';
import UserAvatar from './UserAvatar.vue';
import Date from './Date.vue';
import { SafeHtmlDirective } from '../directives/safe_html/safe_html';

const md = new MarkdownIt().use(checkbox);

export default {
  props: {
    issuable: {
      type: Object,
      required: true,
    },
  },
  directives: {
    SafeHtml: SafeHtmlDirective,
  },
  components: {
    UserAvatar,
    Date,
  },
  computed: {
    stateText() {
      const states = {
        opened: 'Open',
        closed: 'Closed',
        merged: 'Merged',
      };

      return states[this.issuable.state] || '';
    },
    isMr() {
      return Boolean(this.issuable.source_branch && this.issuable.target_branch);
    },
    sourceBranchLabel() {
      const branch = this.issuable.source_branch;
      const namespace = this.issuable.source_namespace;
      return namespace ? `${namespace}:${branch}` : branch;
    },
    projectBaseUrl() {
      return this.issuable.web_url?.split('/-/')[0] ?? '';
    },
    sourceBranchUrl() {
      if (!this.issuable.source_branch) return null;
      const { source_namespace: sourceNamespace, source_branch: branch } = this.issuable;
      // source_namespace is only set when the MR comes from a fork
      if (sourceNamespace) {
        const { origin } = new URL(this.projectBaseUrl);
        return `${origin}/${sourceNamespace}/-/tree/${branch}`;
      }
      return `${this.projectBaseUrl}/-/tree/${branch}`;
    },
    targetBranchUrl() {
      if (!this.issuable.target_branch) return null;
      return `${this.projectBaseUrl}/-/tree/${this.issuable.target_branch}`;
    },
    description() {
      if (this.issuable.markdownRenderedOnServer) {
        return this.issuable.description;
      }

      const description = this.issuable.description || '';
      const webUrl = this.issuable.web_url || '';
      const path = `${webUrl.split('/issues/')[0]}/uploads/`;
      const normalized = description.replace(/\/uploads/gm, path);

      return md.render(normalized);
    },
  },
  mounted() {
    window.vsCodeApi.postMessage({
      command: 'renderMarkdown',
      markdown: this.issuable.description,
      object: 'issuable',
      ref: this.issuable.id,
    });
  },
  created() {
    window.addEventListener('message', event => {
      if (event.data.type === 'markdownRendered') {
        const { ref, object, markdown } = event.data;
        if (object === 'issuable' && ref === this.issuable.id) {
          // TODO: fix this. The eslint rule is disabled during vue3 migration
          // eslint-disable-next-line vue/no-mutating-props
          this.issuable.markdownRenderedOnServer = true;
          // TODO: fix this. The eslint rule is disabled during vue3 migration
          // eslint-disable-next-line vue/no-mutating-props
          this.issuable.description = markdown;
        }
      }
    });
  },
};
</script>

<template>
  <div class="issuable-details">
    <div class="title-row">
      <h1 class="title">{{ issuable.title }}</h1>
      <a :href="issuable.web_url" class="view-link">Open in GitLab</a>
    </div>
    <div class="meta-row">
      <span :class="{ [issuable.state]: true }" class="state">{{ stateText }}</span>
      <span class="meta-text">
        opened <date :date="issuable.created_at" /> by
        <user-avatar :user="issuable.author" :show-handle="false" />
      </span>
      <span v-if="isMr" class="branch-info">
        <a :href="sourceBranchUrl" class="branch-label">{{ sourceBranchLabel }}</a>
        <span class="branch-arrow">→</span>
        <a :href="targetBranchUrl" class="branch-label">{{ issuable.target_branch }}</a>
      </span>
    </div>
    <div class="description" v-safe-html="description" />
  </div>
</template>

<style lang="scss">
.issuable-details {
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vscode-panel-border);
  line-height: 21px;

  .title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-top: 8px;
    margin-bottom: 12px;
  }

  .title {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
    margin: 0;
    color: var(--vscode-foreground);
    flex: 1;
  }

  .view-link {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    white-space: nowrap;
    margin-top: 4px;

    &:hover {
      text-decoration: underline;
    }
  }

  .meta-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 20px;
  }

  .meta-text {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .state {
    display: inline-flex;
    align-items: center;
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    flex-shrink: 0;

    &.opened {
      background-color: #2a9d3f;
    }

    &.closed {
      background-color: #1d64c9;
    }

    &.merged {
      background-color: #6b4fbb;
    }
  }

  .branch-info {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }

  .branch-label {
    font-family: var(--vscode-editor-font-family);
    background-color: var(--vscode-textCodeBlock-background);
    color: var(--vscode-editor-foreground);
    border-radius: 4px;
    padding: 1px 6px;
    text-decoration: none;

    &:hover {
      color: var(--vscode-textLink-activeForeground);
      text-decoration: underline;
    }
  }

  .branch-arrow {
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
  }

  .description {
    margin-bottom: 8px;
    line-height: 1.6;
  }

  table:not(.code) {
    margin: 16px 0;
    border: 0;
    width: auto;
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
  }

  table:not(.code) tbody td {
    border: 1px solid var(--vscode-panel-border);
    border-collapse: collapse;
    padding: 10px 16px;
    text-align: start;
    vertical-align: middle;
    box-sizing: border-box;
  }

  table:not(.code) thead th {
    border: 1px solid var(--vscode-panel-border);
    border-bottom-width: 2px;
    border-collapse: collapse;
    padding: 10px 16px;
    text-align: start;
    vertical-align: middle;
    box-sizing: border-box;
  }
}
</style>
