// Provenance is a declaration and submission route, never proof of identity.
export const contributorTypes = ['human', 'agent', 'synthetic'];

export function webProvenance({ contributorType = 'human', synthetic = false } = {}) {
  if (!contributorTypes.includes(contributorType)) throw new TypeError('Invalid contributor type. Choose human, agent, or synthetic.');
  // Retain the existing explicit synthetic checkbox for older forms/tests.
  const type = synthetic ? 'synthetic' : contributorType;
  return { contributorType: type, submissionPath: type === 'synthetic' ? 'test' : 'web', verification: 'unverified' };
}

// Future server-only agent endpoint: call after its own trust/access checks.
// Accepts no request body; route provenance does not verify contributor identity.
export function agentProvenance() {
  return { contributorType: 'agent', submissionPath: 'agent', verification: 'unverified' };
}

export function provenanceLabel(record) {
  if (record.synthetic === true || record.contributorType === 'synthetic') return 'Synthetic · UNVERIFIED · Test fixture';
  if (!contributorTypes.includes(record.contributorType)) return 'Human · UNVERIFIED · Legacy/Web submission';
  if (record.contributorType === 'agent') {
    return record.submissionPath === 'agent'
      ? 'Agent · UNVERIFIED · Agent submission'
      : 'Agent (self-declared) · UNVERIFIED · Web submission';
  }
  return 'Human · UNVERIFIED · Web submission';
}
