import * as vscode from 'vscode';

export function getMostRelevantMergeRequest(items?: RestMr[]): RestMr | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }

  const includeClosed = vscode.workspace.getConfiguration('gitlab').showClosedMergeRequests;

  const filtered = includeClosed ? items : items.filter(i => i.state === 'opened');

  const sorted = [...filtered].sort((a, b) => {
    // `state` is being compared as a string, but the alphabetical order
    // also matches the priority.
    //
    // opened > merged > closed

    if (b.state > a.state) {
      return +1;
    }
    if (b.state < a.state) {
      return -1;
    }

    return b.iid - a.iid;
  });

  return sorted[0];
}
