import * as vscode from 'vscode';
import { createFakeWorkspaceConfiguration } from '../../common/test_utils/vscode_fakes';
import { mr } from '../test_utils/entities';
import { getMostRelevantMergeRequest } from './get_most_relevant_merge_request';

describe('getMostRelevantMergeRequest', () => {
  beforeEach(() => {
    jest
      .mocked(vscode.workspace.getConfiguration)
      .mockReturnValue(createFakeWorkspaceConfiguration({ showClosedMergeRequests: true }));
  });

  it('returns undefined when the list is empty', () => {
    expect(getMostRelevantMergeRequest(undefined)).toBeUndefined();
    expect(getMostRelevantMergeRequest([])).toBeUndefined();
  });

  it('returns an open MR', () => {
    const mrs: RestMr[] = [{ ...mr, state: 'closed' }, mr, { ...mr, state: 'merged' }];
    expect(getMostRelevantMergeRequest(mrs)).toBe(mrs[1]);
  });

  it('returns a merged MR', () => {
    const mrs: RestMr[] = [
      { ...mr, state: 'closed' },
      { ...mr, state: 'merged' },
    ];
    expect(getMostRelevantMergeRequest(mrs)).toBe(mrs[1]);
  });

  it('returns the most recent MR', () => {
    const mrs: RestMr[] = [
      { ...mr, iid: 8, state: 'closed' },
      { ...mr, iid: 9, state: 'merged' },
      { ...mr, iid: 10, state: 'merged' },
    ];
    expect(getMostRelevantMergeRequest(mrs)).toBe(mrs[2]);
  });

  it('does not return a merged MR when disabled', () => {
    jest
      .mocked(vscode.workspace.getConfiguration)
      .mockReturnValue(createFakeWorkspaceConfiguration({ showClosedMergeRequests: false }));

    const mrs: RestMr[] = [
      { ...mr, state: 'closed' },
      { ...mr, state: 'merged' },
    ];
    expect(getMostRelevantMergeRequest(mrs)).toBeUndefined();
  });
});
