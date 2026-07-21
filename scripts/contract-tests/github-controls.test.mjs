import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateGithubControls, selectGithubToken, VERDICTS } from "../validate-github-controls.mjs";

const policy = {
  repository: "helbertm/hSQLite-Editor",
  defaultBranch: "master",
  pagesEnvironment: "github-pages",
  requiredChecks: ["Quality Gate / validate", "Linux Package / validate"],
  actions: {
    enabled: true,
    shaPinningRequired: true,
    defaultWorkflowPermissions: "read",
    canCreateOrApprovePullRequests: true
  },
  release: {
    repositoryImmutabilityEnabled: true,
    tagTemplate: "hsqlite-editor-v{version}",
    subjectAssetTemplate: "hSQLite-Editor-v{version}.html",
    assetTemplates: ["hSQLite-Editor-v{version}.html", "sbom.spdx.json", "SHA256SUMS"],
    immutable: true,
    attestationPredicates: [
      { name: "provenance", query: "provenance", predicateType: "https://slsa.dev/provenance/v1" },
      { name: "sbom", query: "sbom", predicateType: "https://spdx.dev/Document/v2.3" }
    ]
  }
};
const version = "0.3.143";
const digest = `sha256:${"a".repeat(64)}`;
const validatorPath = fileURLToPath(new URL("../validate-github-controls.mjs", import.meta.url));

function attestation(predicateType, subjectDigest = digest) {
  const statement = {
    _type: "https://in-toto.io/Statement/v1",
    predicateType,
    subject: [{ name: "hSQLite-Editor-v0.3.143.html", digest: { sha256: subjectDigest.replace(/^sha256:/, "") } }],
    predicate: {}
  };
  return {
    repository_id: 42,
    bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(statement)).toString("base64") } }
  };
}

function passingResponses() {
  return {
    repository: { status: 200, body: { id: 42, full_name: policy.repository, default_branch: policy.defaultBranch } },
    rulesets: { status: 200, body: [{ id: 1, target: "branch", enforcement: "active" }] },
    branchRules: {
      status: 200,
      body: [
        { type: "pull_request", parameters: {} },
        {
          type: "required_status_checks",
          parameters: { required_status_checks: policy.requiredChecks.map(context => ({ context })) }
        }
      ]
    },
    privateVulnerabilityReporting: { status: 200, body: { enabled: true } },
    pagesEnvironment: {
      status: 200,
      body: {
        can_admins_bypass: false,
        deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }
      }
    },
    pagesBranchPolicies: {
      status: 200,
      body: { branch_policies: [{ name: policy.defaultBranch, type: "branch" }] }
    },
    actionsPermissions: { status: 200, body: { enabled: true, sha_pinning_required: true } },
    actionsWorkflowPermissions: {
      status: 200,
      body: { default_workflow_permissions: "read", can_approve_pull_request_reviews: true }
    },
    immutableReleases: { status: 200, body: { enabled: true, enforced_by_owner: false } },
    release: {
      status: 200,
      body: {
        tag_name: "hsqlite-editor-v0.3.143",
        draft: false,
        prerelease: false,
        immutable: true,
        assets: [
          { name: "hSQLite-Editor-v0.3.143.html", state: "uploaded", digest },
          { name: "sbom.spdx.json", state: "uploaded", digest: `sha256:${"b".repeat(64)}` },
          { name: "SHA256SUMS", state: "uploaded", digest: `sha256:${"c".repeat(64)}` }
        ]
      }
    },
    attestations: {
      provenance: { status: 200, body: { attestations: [attestation("https://slsa.dev/provenance/v1")] } },
      sbom: { status: 200, body: { attestations: [attestation("https://spdx.dev/Document/v2.3")] } }
    }
  };
}

test("passes only when every remote and operator control is verified", () => {
  const result = evaluateGithubControls({
    policy,
    version,
    responses: passingResponses(),
    manualConfirmations: { pagesAdminBypassDisabled: true }
  });
  assert.equal(result.exitCode, 0);
  assert.ok(result.findings.every(finding => finding.verdict === VERDICTS.PASS));
});

test("uses exit code 2 for authenticated or operator evidence gaps", () => {
  const responses = passingResponses();
  responses.actionsPermissions = { status: 401, body: null };
  responses.actionsWorkflowPermissions = { status: 403, body: null };
  const result = evaluateGithubControls({ policy, version, responses });
  assert.equal(result.exitCode, 2);
  assert.ok(result.findings.some(finding => finding.verdict === VERDICTS.UNVERIFIED));
  assert.ok(result.findings.some(finding => finding.control === "Pages administrator bypass"));
});

test("does not misclassify an unauthenticated immutable-release 404 as disabled", () => {
  const responses = passingResponses();
  responses.immutableReleases = { status: 404, body: null };
  const result = evaluateGithubControls({
    policy,
    version,
    responses,
    manualConfirmations: { pagesAdminBypassDisabled: true }
  });
  assert.equal(result.exitCode, 2);
  assert.ok(result.findings.some(finding =>
    finding.control === "immutable releases setting" && finding.verdict === VERDICTS.UNVERIFIED
  ));
});

test("fails when authenticated evidence shows immutable releases are disabled", () => {
  const responses = passingResponses();
  responses.immutableReleases = { status: 404, body: null };
  const result = evaluateGithubControls({
    policy,
    version,
    responses,
    manualConfirmations: { pagesAdminBypassDisabled: true },
    authenticated: true
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some(finding =>
    finding.control === "immutable releases setting" && finding.verdict === VERDICTS.FAIL
  ));
});

test("verified mismatches take precedence over unverified controls", () => {
  const responses = passingResponses();
  responses.rulesets = { status: 200, body: [] };
  responses.privateVulnerabilityReporting = { status: 200, body: { enabled: false } };
  responses.actionsPermissions = { status: 401, body: null };
  const result = evaluateGithubControls({ policy, version, responses });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some(finding => finding.control === "rulesets" && finding.verdict === VERDICTS.FAIL));
});

test("requires release pull-request authority while the workflow uses github.token", () => {
  const responses = passingResponses();
  responses.actionsWorkflowPermissions.body.can_approve_pull_request_reviews = false;
  const result = evaluateGithubControls({
    policy,
    version,
    responses,
    manualConfirmations: { pagesAdminBypassDisabled: true }
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some(finding =>
    finding.control === "Actions token policy" && finding.verdict === VERDICTS.FAIL
  ));
});

test("transport or malformed API responses use exit code 3", () => {
  const responses = passingResponses();
  responses.repository = { status: 0, body: null, transportError: true };
  const result = evaluateGithubControls({
    policy,
    version,
    responses,
    manualConfirmations: { pagesAdminBypassDisabled: true }
  });
  assert.equal(result.exitCode, 3);
  assert.ok(result.findings.some(finding => finding.verdict === VERDICTS.TRANSPORT));
});

test("requires the exact immutable asset bundle and both digest-bound attestations", () => {
  const responses = passingResponses();
  responses.release.body.immutable = false;
  responses.release.body.assets = responses.release.body.assets.slice(0, 1);
  responses.attestations.provenance = { status: 200, body: { attestations: [] } };
  const result = evaluateGithubControls({
    policy,
    version,
    responses,
    manualConfirmations: { pagesAdminBypassDisabled: true }
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some(finding => finding.control === "release assets" && finding.verdict === VERDICTS.FAIL));
  assert.ok(result.findings.some(finding => finding.control === "provenance attestation" && finding.verdict === VERDICTS.FAIL));
});

test("rejects an attestation whose signed statement has the wrong predicate type", () => {
  const responses = passingResponses();
  responses.attestations.sbom = {
    status: 200,
    body: { attestations: [attestation("https://slsa.dev/provenance/v1")] }
  };
  const result = evaluateGithubControls({
    policy,
    version,
    responses,
    manualConfirmations: { pagesAdminBypassDisabled: true }
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some(finding =>
    finding.control === "sbom attestation" && finding.verdict === VERDICTS.FAIL
  ));
});

test("rejects an attestation whose signed subject has a different digest", () => {
  const responses = passingResponses();
  responses.attestations.provenance = {
    status: 200,
    body: { attestations: [attestation("https://slsa.dev/provenance/v1", `sha256:${"d".repeat(64)}`)] }
  };
  const result = evaluateGithubControls({
    policy,
    version,
    responses,
    manualConfirmations: { pagesAdminBypassDisabled: true }
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some(finding =>
    finding.control === "provenance attestation" && finding.verdict === VERDICTS.FAIL
  ));
});

test("prefers GH_TOKEN without exposing or rewriting credential values", () => {
  assert.equal(selectGithubToken({ GH_TOKEN: "primary", GITHUB_TOKEN: "fallback" }), "primary");
  assert.equal(selectGithubToken({ GITHUB_TOKEN: "fallback" }), "fallback");
  assert.equal(selectGithubToken({}), "");
});

test("CLI help exits cleanly without starting a network audit", () => {
  const result = spawnSync(process.execPath, [validatorPath, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Exit codes: 0 pass, 1 verified mismatch, 2 unverified, 3 transport\/runtime failure\./);
  assert.equal(result.stderr, "");
});

test("CLI rejects unknown arguments with the runtime-failure exit code", () => {
  const result = spawnSync(process.execPath, [validatorPath, "--unknown"], { encoding: "utf8" });
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Unknown argument\(s\): --unknown/);
  assert.match(result.stdout, /Usage: npm run validate:github-controls/);
});
