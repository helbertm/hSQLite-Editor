import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const apiBaseUrl = "https://api.github.com";
const knownArguments = new Set(["--confirm-pages-admin-bypass-disabled", "--help"]);

export const VERDICTS = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  UNVERIFIED: "UNVERIFIED",
  TRANSPORT: "TRANSPORT"
});

export function renderPolicyTemplate(template, version) {
  return String(template).replaceAll("{version}", version);
}

export function selectGithubToken(environment) {
  return environment.GH_TOKEN || environment.GITHUB_TOKEN || "";
}

export function deriveAuditExitCode(findings) {
  if (findings.some(finding => finding.verdict === VERDICTS.TRANSPORT)) return 3;
  if (findings.some(finding => finding.verdict === VERDICTS.FAIL)) return 1;
  if (findings.some(finding => finding.verdict === VERDICTS.UNVERIFIED)) return 2;
  return 0;
}

function attestationEntries(body) {
  if (Array.isArray(body)) return body;
  return Array.isArray(body?.attestations) ? body.attestations : [];
}

function attestationStatement(entry) {
  const payload = entry?.bundle?.dsseEnvelope?.payload;
  if (typeof payload !== "string" || payload.length === 0) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function statementMatches(statement, predicateType, htmlDigest) {
  const sha256 = String(htmlDigest).replace(/^sha256:/, "");
  return statement?.predicateType === predicateType
    && Array.isArray(statement?.subject)
    && statement.subject.some(subject => subject?.digest?.sha256 === sha256);
}

function responseBody(findings, control, response, options = {}) {
  const notFoundVerdict = options.notFoundVerdict || VERDICTS.UNVERIFIED;
  if (!response || response.transportError || response.parseError) {
    findings.push({ verdict: VERDICTS.TRANSPORT, control, detail: "GitHub API transport or response parsing failed." });
    return null;
  }
  if (response.status === 401 || response.status === 403) {
    findings.push({ verdict: VERDICTS.UNVERIFIED, control, detail: `Authenticated read access is unavailable (HTTP ${response.status}).` });
    return null;
  }
  if (response.status === 404) {
    findings.push({ verdict: notFoundVerdict, control, detail: options.notFoundDetail || "The required GitHub resource was not found." });
    return null;
  }
  if (response.status !== 200) {
    findings.push({ verdict: VERDICTS.TRANSPORT, control, detail: `GitHub API returned unexpected HTTP ${response.status}.` });
    return null;
  }
  return response.body;
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sameStrings(left, right) {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

export function evaluateGithubControls({ policy, version, responses, manualConfirmations = {}, authenticated = false }) {
  const findings = [];
  const pass = (control, detail) => findings.push({ verdict: VERDICTS.PASS, control, detail });
  const fail = (control, detail) => findings.push({ verdict: VERDICTS.FAIL, control, detail });
  const unverified = (control, detail) => findings.push({ verdict: VERDICTS.UNVERIFIED, control, detail });
  const expectedTag = renderPolicyTemplate(policy.release.tagTemplate, version);
  const expectedAssets = policy.release.assetTemplates.map(template => renderPolicyTemplate(template, version));

  const repository = responseBody(findings, "repository", responses.repository, {
    notFoundVerdict: VERDICTS.FAIL,
    notFoundDetail: `Repository ${policy.repository} does not exist or is not public.`
  });
  if (repository) {
    if (repository.full_name === policy.repository && repository.default_branch === policy.defaultBranch) {
      pass("repository", `${policy.repository} uses ${policy.defaultBranch} as the default branch.`);
    } else {
      fail("repository", `Repository identity or default branch differs from policy (${policy.repository}, ${policy.defaultBranch}).`);
    }
  }

  const rulesets = responseBody(findings, "rulesets", responses.rulesets);
  if (rulesets) {
    const activeBranchRulesets = Array.isArray(rulesets)
      ? rulesets.filter(item => item?.target === "branch" && item?.enforcement === "active")
      : [];
    if (activeBranchRulesets.length > 0) {
      pass("rulesets", `${activeBranchRulesets.length} active branch ruleset(s) are visible.`);
    } else {
      fail("rulesets", "No active branch ruleset is visible.");
    }
  }

  const branchRules = responseBody(findings, "default-branch rules", responses.branchRules);
  if (branchRules) {
    const rules = Array.isArray(branchRules) ? branchRules : [];
    const pullRequestRule = rules.find(rule => rule?.type === "pull_request");
    const statusRule = rules.find(rule => rule?.type === "required_status_checks");
    const actualChecks = (statusRule?.parameters?.required_status_checks || [])
      .map(item => String(item?.context || "").trim())
      .filter(Boolean);
    if (!pullRequestRule) {
      fail("default-branch rules", `${policy.defaultBranch} does not require pull requests.`);
    } else if (!statusRule || !policy.requiredChecks.every(check => actualChecks.includes(check))) {
      const missing = policy.requiredChecks.filter(check => !actualChecks.includes(check));
      fail("default-branch rules", `Required checks are incomplete: ${missing.join(", ") || "status-check rule missing"}.`);
    } else {
      pass("default-branch rules", `${policy.defaultBranch} requires pull requests and all ${policy.requiredChecks.length} policy checks.`);
    }
  }

  const pvr = responseBody(findings, "private vulnerability reporting", responses.privateVulnerabilityReporting);
  if (pvr) {
    if (pvr.enabled === true) pass("private vulnerability reporting", "Private Vulnerability Reporting is enabled.");
    else fail("private vulnerability reporting", "Private Vulnerability Reporting is disabled.");
  }

  const pagesEnvironment = responseBody(findings, "Pages environment", responses.pagesEnvironment, {
    notFoundVerdict: VERDICTS.FAIL,
    notFoundDetail: `Environment ${policy.pagesEnvironment} is missing.`
  });
  if (pagesEnvironment) {
    const branchPolicy = pagesEnvironment.deployment_branch_policy;
    if (branchPolicy?.custom_branch_policies !== true || branchPolicy?.protected_branches !== false) {
      fail("Pages environment", `${policy.pagesEnvironment} does not use an explicit custom branch policy.`);
    } else {
      pass("Pages environment", `${policy.pagesEnvironment} uses custom deployment branch policies.`);
    }

    if (pagesEnvironment.can_admins_bypass === true) {
      fail("Pages administrator bypass", "Administrator bypass is enabled for the Pages environment.");
    } else if (pagesEnvironment.can_admins_bypass !== false) {
      unverified("Pages administrator bypass", "The API did not provide a definitive administrator-bypass value.");
    } else if (manualConfirmations.pagesAdminBypassDisabled === true) {
      pass("Pages administrator bypass", "API state and operator confirmation agree that administrator bypass is disabled.");
    } else {
      unverified("Pages administrator bypass", "The API reports bypass disabled, but the required operator confirmation was not supplied.");
    }
  }

  const pagesPolicies = responseBody(findings, "Pages branch policy", responses.pagesBranchPolicies, {
    notFoundVerdict: VERDICTS.FAIL,
    notFoundDetail: `No deployment branch policy exists for ${policy.pagesEnvironment}.`
  });
  if (pagesPolicies) {
    const actualPolicies = Array.isArray(pagesPolicies.branch_policies) ? pagesPolicies.branch_policies : [];
    const expectedPolicies = [{ name: policy.defaultBranch, type: "branch" }];
    const normalized = actualPolicies.map(item => ({ name: item?.name, type: item?.type }));
    if (JSON.stringify(normalized) === JSON.stringify(expectedPolicies)) {
      pass("Pages branch policy", `Only ${policy.defaultBranch} may deploy to ${policy.pagesEnvironment}.`);
    } else {
      fail("Pages branch policy", `${policy.pagesEnvironment} is not restricted to the single ${policy.defaultBranch} branch policy.`);
    }
  }

  const actions = responseBody(findings, "Actions policy", responses.actionsPermissions);
  if (actions) {
    if (actions.enabled === policy.actions.enabled && actions.sha_pinning_required === policy.actions.shaPinningRequired) {
      pass("Actions policy", "Actions is enabled and full-SHA pinning enforcement matches policy.");
    } else {
      fail("Actions policy", "Actions enablement or full-SHA pinning enforcement differs from policy.");
    }
  }

  const workflowPermissions = responseBody(findings, "Actions token policy", responses.actionsWorkflowPermissions);
  if (workflowPermissions) {
    const matches = workflowPermissions.default_workflow_permissions === policy.actions.defaultWorkflowPermissions
      && workflowPermissions.can_approve_pull_request_reviews === policy.actions.canCreateOrApprovePullRequests;
    if (matches) pass("Actions token policy", "Default GITHUB_TOKEN permissions are read-only, while explicitly scoped release automation may create pull requests.");
    else fail("Actions token policy", "Default GITHUB_TOKEN permissions or release pull-request authority differ from policy.");
  }

  const immutableReleases = responseBody(findings, "immutable releases setting", responses.immutableReleases, {
    notFoundVerdict: authenticated ? VERDICTS.FAIL : VERDICTS.UNVERIFIED,
    notFoundDetail: authenticated
      ? "Immutable releases are disabled for the repository."
      : "Authenticated Administration read access is required to verify the immutable-releases setting."
  });
  if (immutableReleases) {
    if (immutableReleases.enabled === policy.release.repositoryImmutabilityEnabled) {
      pass("immutable releases setting", "Repository-level immutable releases are enabled.");
    } else {
      fail("immutable releases setting", "Repository-level immutable releases are disabled.");
    }
  }

  const release = responseBody(findings, "exact release", responses.release, {
    notFoundVerdict: VERDICTS.FAIL,
    notFoundDetail: `Release ${expectedTag} is not published.`
  });
  let htmlDigest = "";
  if (release) {
    const releaseStateMatches = release.tag_name === expectedTag
      && release.draft === false
      && release.prerelease === false
      && release.immutable === policy.release.immutable;
    if (releaseStateMatches) pass("exact release", `${expectedTag} is published and immutable.`);
    else fail("exact release", `${expectedTag} is draft, prerelease, mutable, or points to a different tag.`);

    const assets = Array.isArray(release.assets) ? release.assets : [];
    const assetNames = assets.map(asset => String(asset?.name || ""));
    const uploaded = assets.every(asset => asset?.state === "uploaded");
    const digested = assets.every(asset => /^sha256:[a-f0-9]{64}$/.test(String(asset?.digest || "")));
    if (sameStrings(assetNames, expectedAssets) && uploaded && digested) {
      pass("release assets", `The immutable release contains the exact ${expectedAssets.length}-asset bundle with SHA-256 digests.`);
    } else {
      fail("release assets", `Release assets differ from policy: ${expectedAssets.join(", ")}.`);
    }
    const htmlName = renderPolicyTemplate(policy.release.subjectAssetTemplate, version);
    htmlDigest = String(assets.find(asset => asset?.name === htmlName)?.digest || "");
  }

  if (/^sha256:[a-f0-9]{64}$/.test(htmlDigest)) {
    for (const predicate of policy.release.attestationPredicates) {
      const control = `${predicate.name} attestation`;
      const body = responseBody(findings, control, responses.attestations?.[predicate.name], {
        notFoundVerdict: VERDICTS.FAIL,
        notFoundDetail: `No ${predicate.name} attestation exists for the exact released HTML digest.`
      });
      if (body) {
        const entries = attestationEntries(body);
        const repositoryId = Number(repository?.id || 0);
        if (repositoryId <= 0) {
          unverified(control, "Repository identity is unavailable for attestation ownership validation.");
          continue;
        }
        const matchingEntries = entries.filter(entry =>
          Number(entry?.repository_id) === repositoryId
          && statementMatches(attestationStatement(entry), predicate.predicateType, htmlDigest)
        );
        if (matchingEntries.length > 0) {
          pass(control, `${predicate.name} attestation matches the exact released HTML digest and ${predicate.predicateType}.`);
        } else {
          fail(control, `${predicate.name} attestation does not match repository, digest, and predicate policy.`);
        }
      }
    }
  } else {
    for (const predicate of policy.release.attestationPredicates) {
      fail(`${predicate.name} attestation`, "The exact released HTML SHA-256 digest is unavailable.");
    }
  }

  return { findings, exitCode: deriveAuditExitCode(findings), expectedTag, expectedAssets };
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function requestGithub(pathname, { token, apiVersion }) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "hsqlite-editor-github-controls-audit",
    "X-GitHub-Api-Version": apiVersion
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}${pathname}`, {
        method: "GET",
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(15_000)
      });
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await delay(250 * (attempt + 1));
        continue;
      }
      const text = await response.text();
      if (!text) return { status: response.status, body: null };
      try {
        return { status: response.status, body: JSON.parse(text) };
      } catch {
        return { status: response.status, body: null, parseError: true };
      }
    } catch {
      if (attempt < 2) {
        await delay(250 * (attempt + 1));
        continue;
      }
      return { status: 0, body: null, transportError: true };
    }
  }
  return { status: 0, body: null, transportError: true };
}

async function runLiveAudit({ policy, version, token, manualConfirmations }) {
  const repositoryPath = `/repos/${policy.repository}`;
  const encodedBranch = encodeURIComponent(policy.defaultBranch);
  const encodedEnvironment = encodeURIComponent(policy.pagesEnvironment);
  const expectedTag = renderPolicyTemplate(policy.release.tagTemplate, version);
  const get = pathname => requestGithub(pathname, { token, apiVersion: policy.apiVersion });
  const responses = {};

  [
    responses.repository,
    responses.rulesets,
    responses.branchRules,
    responses.privateVulnerabilityReporting,
    responses.pagesEnvironment,
    responses.pagesBranchPolicies,
    responses.actionsPermissions,
    responses.actionsWorkflowPermissions,
    responses.immutableReleases,
    responses.release
  ] = await Promise.all([
    get(repositoryPath),
    get(`${repositoryPath}/rulesets`),
    get(`${repositoryPath}/rules/branches/${encodedBranch}`),
    get(`${repositoryPath}/private-vulnerability-reporting`),
    get(`${repositoryPath}/environments/${encodedEnvironment}`),
    get(`${repositoryPath}/environments/${encodedEnvironment}/deployment-branch-policies`),
    get(`${repositoryPath}/actions/permissions`),
    get(`${repositoryPath}/actions/permissions/workflow`),
    get(`${repositoryPath}/immutable-releases`),
    get(`${repositoryPath}/releases/tags/${encodeURIComponent(expectedTag)}`)
  ]);

  const htmlName = renderPolicyTemplate(policy.release.subjectAssetTemplate, version);
  const releaseAssets = Array.isArray(responses.release?.body?.assets) ? responses.release.body.assets : [];
  const htmlDigest = String(releaseAssets.find(asset => asset?.name === htmlName)?.digest || "");
  responses.attestations = {};
  if (/^sha256:[a-f0-9]{64}$/.test(htmlDigest)) {
    for (const predicate of policy.release.attestationPredicates) {
      const query = new URLSearchParams({ predicate_type: predicate.query, per_page: "100" });
      responses.attestations[predicate.name] = await get(
        `${repositoryPath}/attestations/${encodeURIComponent(htmlDigest)}?${query}`
      );
    }
  }

  return evaluateGithubControls({ policy, version, responses, manualConfirmations, authenticated: Boolean(token) });
}

function printHelp() {
  console.log("Usage: npm run validate:github-controls -- [--confirm-pages-admin-bypass-disabled]");
  console.log("Uses GH_TOKEN first, then GITHUB_TOKEN, for read-only GitHub API access.");
  console.log("Exit codes: 0 pass, 1 verified mismatch, 2 unverified, 3 transport/runtime failure.");
}

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter(argument => !knownArguments.has(argument));
  if (unknown.length > 0) {
    console.error(`Unknown argument(s): ${unknown.join(", ")}`);
    printHelp();
    process.exitCode = 3;
    return;
  }
  if (args.includes("--help")) {
    printHelp();
    return;
  }

  const policy = JSON.parse(fs.readFileSync(path.join(rootDir, "github-controls-policy.json"), "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const version = String(packageJson.version || "").trim();
  const token = selectGithubToken(process.env);
  const result = await runLiveAudit({
    policy,
    version,
    token,
    manualConfirmations: {
      pagesAdminBypassDisabled: args.includes("--confirm-pages-admin-bypass-disabled")
    }
  });

  for (const finding of result.findings) {
    console.log(`[${finding.verdict}] ${finding.control}: ${finding.detail}`);
  }
  const counts = Object.values(VERDICTS).map(verdict =>
    `${verdict.toLowerCase()}=${result.findings.filter(finding => finding.verdict === verdict).length}`
  );
  console.log(`GitHub controls audit complete for ${result.expectedTag}: ${counts.join(" ")}.`);
  process.exitCode = result.exitCode;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  main().catch(() => {
    console.error("[TRANSPORT] audit: unexpected runtime failure.");
    process.exitCode = 3;
  });
}
