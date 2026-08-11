import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const deployScript = path.join(repositoryRoot, "scripts/ops/deploy-release.sh");
const rollbackScript = path.join(repositoryRoot, "scripts/ops/rollback-release.sh");
const latencyScript = path.join(repositoryRoot, "scripts/ops/latency-test.sh");
const smokeScript = path.join(repositoryRoot, "scripts/ops/smoke-test.sh");

test("连续发布保留上一版本，并能显式回滚", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "openvibe-ops-"));
  const fakeBin = path.join(temporaryRoot, "bin");
  const deployRoot = path.join(temporaryRoot, "deploy");
  await mkdir(fakeBin, { recursive: true });
  await installFakeCommand(fakeBin, "docker", `#!/usr/bin/env bash\nexit 0\n`);
  await installFakeCommand(fakeBin, "curl", `#!/usr/bin/env bash\nprintf '200'\n`);

  const environment = { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ""}` };
  const firstId = "a".repeat(40);
  const secondId = "b".repeat(40);

  try {
    const firstArchive = await createReleaseArchive(temporaryRoot, "first");
    runScript(deployScript, [firstArchive, firstId, deployRoot], environment);
    assert.equal(path.basename(await readlink(path.join(deployRoot, "current"))), firstId);

    const secondArchive = await createReleaseArchive(temporaryRoot, "second");
    runScript(deployScript, [secondArchive, secondId, deployRoot], environment);
    assert.equal(path.basename(await readlink(path.join(deployRoot, "current"))), secondId);
    assert.equal(path.basename(await readlink(path.join(deployRoot, "previous"))), firstId);

    runScript(rollbackScript, [deployRoot], environment);
    assert.equal(path.basename(await readlink(path.join(deployRoot, "current"))), firstId);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("发布脚本拒绝覆盖相同版本目录", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "openvibe-ops-"));
  const fakeBin = path.join(temporaryRoot, "bin");
  const deployRoot = path.join(temporaryRoot, "deploy");
  await mkdir(fakeBin, { recursive: true });
  await installFakeCommand(fakeBin, "docker", `#!/usr/bin/env bash\nexit 0\n`);
  await installFakeCommand(fakeBin, "curl", `#!/usr/bin/env bash\nprintf '200'\n`);
  const environment = { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ""}` };
  const releaseId = "c".repeat(40);

  try {
    runScript(deployScript, [await createReleaseArchive(temporaryRoot, "original"), releaseId, deployRoot], environment);
    const duplicate = spawnSync("bash", [deployScript, await createReleaseArchive(temporaryRoot, "duplicate"), releaseId, deployRoot], {
      env: environment,
      encoding: "utf8",
    });
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /拒绝覆盖/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("延迟检查在健康样本下通过", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "openvibe-latency-"));
  const fakeBin = path.join(temporaryRoot, "bin");
  await mkdir(fakeBin, { recursive: true });
  await installFakeCommand(fakeBin, "curl", '#!/usr/bin/env bash\nprintf \'%s\\n\' "$OPENVIBE_FAKE_CURL_OUTPUT"\n');

  try {
    const result = spawnSync("bash", [latencyScript, "https://example.test"], {
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        OPENVIBE_FAKE_CURL_OUTPUT: "200 0.020 0.080 0.120",
      },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /PASS latency severe=0\/5 warning=0\/5/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("延迟检查只在重复严重慢样本达到阈值后失败", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "openvibe-latency-"));
  const fakeBin = path.join(temporaryRoot, "bin");
  await mkdir(fakeBin, { recursive: true });
  await installFakeCommand(fakeBin, "curl", '#!/usr/bin/env bash\nprintf \'%s\\n\' "$OPENVIBE_FAKE_CURL_OUTPUT"\n');

  try {
    const result = spawnSync("bash", [latencyScript, "https://example.test"], {
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        OPENVIBE_FAKE_CURL_OUTPUT: "200 0.020 8.500 8.700",
      },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /5\/5 个样本不可用或超过 8s/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("冒烟检查会复核一次偶发传输失败并在恢复后通过", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "openvibe-smoke-"));
  const fakeBin = path.join(temporaryRoot, "bin");
  const stateFile = path.join(temporaryRoot, "curl-count");
  await mkdir(fakeBin, { recursive: true });
  await installFakeCommand(fakeBin, "curl", `#!/usr/bin/env bash
count=0
if [[ -f "\${OPENVIBE_FAKE_CURL_STATE}" ]]; then count="$(<"\${OPENVIBE_FAKE_CURL_STATE}")"; fi
count=$((count + 1))
printf '%s' "\${count}" > "\${OPENVIBE_FAKE_CURL_STATE}"
if (( count == 1 )); then printf '200'; exit 28; fi
printf '200'
`);

  try {
    const result = spawnSync("bash", [smokeScript, "https://example.test"], {
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        OPENVIBE_FAKE_CURL_STATE: stateFile,
        SMOKE_RETRY_DELAY_SECONDS: "0",
      },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stderr, /RETRY 1 个失败路由/);
    assert.match(result.stdout, /PASS \/api\/health 200/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("冒烟检查在传输持续失败时仍然拒绝发布", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "openvibe-smoke-"));
  const fakeBin = path.join(temporaryRoot, "bin");
  await mkdir(fakeBin, { recursive: true });
  await installFakeCommand(fakeBin, "curl", "#!/usr/bin/env bash\nprintf '200'\nexit 28\n");

  try {
    const result = spawnSync("bash", [smokeScript, "https://example.test"], {
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        SMOKE_RETRY_DELAY_SECONDS: "0",
      },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /curl_exit=28/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

async function installFakeCommand(directory: string, name: string, contents: string): Promise<void> {
  const target = path.join(directory, name);
  await writeFile(target, contents, "utf8");
  await chmod(target, 0o755);
}

async function createReleaseArchive(root: string, name: string): Promise<string> {
  const source = path.join(root, `source-${name}`);
  const archive = path.join(root, `${name}.tar.gz`);
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, "Dockerfile"), "FROM scratch\n", "utf8");
  await writeFile(path.join(source, "compose.production.yml"), "services: {}\n", "utf8");
  execFileSync("tar", ["-czf", archive, "-C", source, "."]);
  return archive;
}

function runScript(script: string, arguments_: string[], environment: NodeJS.ProcessEnv): void {
  const result = spawnSync("bash", [script, ...arguments_], { env: environment, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
