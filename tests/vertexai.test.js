import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { vertexAudit, vertexProofread, VERTEX_PROOFREAD_SYSTEM_PROMPT, PROOFREAD_RESPONSE_SCHEMA } from '../src/vertexai.js';
import { isAuditEligible } from '../src/aiaudit.js';

function mockFetch(reply = { text: '{}', model: 'gemini-4-neon', seconds: 4.2, thinkingLevel: 'HIGH' }) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : null });
    return {
      ok: true,
      status: 200,
      async json() { return reply; }
    };
  };
  return { fetchImpl, calls };
}

describe('Build 2b — Vertex AI staging audit & proofreading routing', () => {
  it('vertexAudit defaults to HIGH thinking and 12000 maxOutputTokens', async () => {
    const { fetchImpl, calls } = mockFetch();
    const res = await vertexAudit({
      system: 'Audit system prompt',
      prompt: 'Audit case prompt',
      responseSchema: { type: 'OBJECT', properties: {} },
      token: 'test-token',
      fetchImpl
    });
    assert.equal(res.model, 'gemini-4-neon');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.task, 'audit');
    assert.equal(calls[0].body.kind, 'cancer resection');
    assert.equal(calls[0].body.thinkingLevel, 'HIGH');
    assert.equal(calls[0].body.maxOutputTokens, 12000);
  });

  it('vertexAudit honours explicit thinkingLevel and maxOutputTokens overrides', async () => {
    const { fetchImpl, calls } = mockFetch({ text: '{}', model: 'gemini-4-neon', thinkingLevel: 'MEDIUM' });
    await vertexAudit({
      system: 'Audit system prompt',
      prompt: 'Audit case prompt',
      thinkingLevel: 'MEDIUM',
      maxOutputTokens: 6000,
      token: 'test-token',
      fetchImpl
    });
    assert.equal(calls[0].body.thinkingLevel, 'MEDIUM');
    assert.equal(calls[0].body.maxOutputTokens, 6000);
  });

  it('vertexProofread uses VERTEX_PROOFREAD_SYSTEM_PROMPT and PROOFREAD_RESPONSE_SCHEMA', async () => {
    const { fetchImpl, calls } = mockFetch({ text: '{"edits":[],"flags":[],"rewrites":[]}', model: 'gemini-4-neon', thinkingLevel: 'MEDIUM' });
    await vertexProofread({
      prompt: '[DIAGNOSIS]\nInvasive carcinoma.',
      kind: 'cancer resection',
      token: 'test-token',
      fetchImpl
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.task, 'proofread');
    assert.equal(calls[0].body.kind, 'cancer resection');
    assert.equal(calls[0].body.system, VERTEX_PROOFREAD_SYSTEM_PROMPT);
    assert.deepEqual(calls[0].body.responseSchema, PROOFREAD_RESPONSE_SCHEMA);
    assert.equal(calls[0].body.thinkingLevel, undefined);
  });

  it('isAuditEligible selects cancer resections, biomarkers, CNS, lymphoma, melanoma, and sarcoma only', () => {
    assert.equal(isAuditEligible([{ id: 'colonic_carcinoma', kind: 'cancer resection' }]), true);
    assert.equal(isAuditEligible([{ id: 'breast_ish', kind: 'biomarker' }]), true);
    assert.equal(isAuditEligible([{ id: 'cns_tumour', kind: 'resection' }]), true);
    assert.equal(isAuditEligible([{ id: 'lymphoma_node', kind: 'biopsy' }]), true);
    assert.equal(isAuditEligible([{ id: 'soft_tissue_sarcoma', kind: 'resection' }]), true);
    assert.equal(isAuditEligible([{ id: 'bowel_benign', kind: 'benign resection' }]), false);
    assert.equal(isAuditEligible([{ id: 'gastric_biopsy', kind: 'biopsy' }]), false);
  });
});
