#!/usr/bin/env node
// Query SAP Cloud Logging (OpenSearch) using a BTP service key.
// No external dependencies — uses Node built-ins only.
//
// Service keys belong to the project, not to this skill: they live in the project's
// gitignored .sap-cloud-logging/keys/<stage>.json. Run the script from anywhere inside
// the project; the working directory decides which project's keys are used.
//
// Setup (an AI agent can run all of these for the user):
//   node query-logs.mjs --status                  # what is configured, what is missing, next steps
//   node query-logs.mjs --init                    # create .sap-cloud-logging/ in this project
//   node query-logs.mjs --fetch-key --stage dev   # read the stage's key via cf curl into keys/dev.json
//   node query-logs.mjs --fetch-key --stage test --cf-org <org> --cf-space <space> \
//     [--instance <name>] [--key-name <name>] [--force]
//
// Usage:
//   node query-logs.mjs --cf-app-logs --last 15m
//   node query-logs.mjs --stage dev --last 1h --query "level:error"
//   node query-logs.mjs --stage test --cf-errors --last 6h
//   node query-logs.mjs --key path/to/key.json --index "logs-otel-v1-*" --size 100
//   node query-logs.mjs --stage qa --info
//   cat dsl.json | node query-logs.mjs --stage qa --dsl
//
// The script never prints credentials. Every line it writes passes through a redactor.

import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT = path.join(SCRIPT_DIR, 'query-logs.mjs')
const PROJECT_FOLDER = '.sap-cloud-logging'
const DENY_RULE = `Read(./${PROJECT_FOLDER}/keys/**)`
const CLOUD_LOGGING_OFFERING = 'cloud-logging'

// Secret values seen in the key file. Anything written to stdout/stderr is scrubbed of
// them, so even an unexpected error message from OpenSearch or Node cannot leak one.
const secrets = new Set()

function redact(text) {
  let out = text
  for (const s of secrets) out = out.split(s).join('«redacted»')
  return out
}

function protectStreams() {
  for (const stream of [process.stdout, process.stderr]) {
    // `… | head` closes the pipe early; that is normal use, not a failure.
    stream.on('error', (err) => process.exit(err?.code === 'EPIPE' ? 0 : 1))
    const original = stream.write.bind(stream)
    stream.write = (chunk, enc, cb) => {
      if (typeof enc === 'function') {
        cb = enc
        enc = undefined
      }
      return original(redact(typeof chunk === 'string' ? chunk : String(chunk)), enc, cb)
    }
  }
}

function rememberSecrets(key) {
  for (const [name, value] of Object.entries(key)) {
    if (/(password|secret|key|cert|token)$/i.test(name) && typeof value === 'string' && value.length >= 4) {
      secrets.add(value)
    }
  }
}

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) {
        args[key] = true
      } else {
        args[key] = next
        i++
      }
    } else {
      args._.push(a)
    }
  }
  return args
}

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

function durationToMs(d) {
  const m = String(d).match(/^(\d+)\s*(ms|s|m|h|d|w)?$/)
  if (!m) fail(`Invalid duration: ${d} (use e.g. 30m, 2h, 1d)`)
  const n = Number(m[1])
  const unit = m[2] || 'm'
  const mult = { ms: 1, s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7, w: 6.048e8 }
  return n * mult[unit]
}

// The skill is shared from the library clone, so the project is found from the working
// directory (like git finds .git), never from the script's own location.
function findProjectDir(from = process.cwd()) {
  let dir = path.resolve(from)
  while (true) {
    if (fs.statSync(path.join(dir, PROJECT_FOLDER), { throwIfNoEntry: false })?.isDirectory()) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

function keysDir(projectDir) {
  return path.join(projectDir, PROJECT_FOLDER, 'keys')
}

function loadProjectConfig(projectDir) {
  if (!projectDir) return {}
  const file = path.join(projectDir, PROJECT_FOLDER, 'config.json')
  if (!fs.existsSync(file)) return {}
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) ?? {}
  } catch (e) {
    fail(`Could not parse ${file}: ${e.message}`)
  }
}

function availableStages(projectDir) {
  if (!projectDir || !fs.existsSync(keysDir(projectDir))) return []
  return fs
    .readdirSync(keysDir(projectDir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort()
}

function resolveKeyPath(args, projectDir, config) {
  if (args.key === true) fail('--key needs a file path')
  if (args.stage === true) fail('--stage needs a stage name, e.g. --stage dev')
  if (args.key) return path.resolve(process.cwd(), args.key)
  if (process.env.CLS_KEY_FILE) return path.resolve(process.env.CLS_KEY_FILE)

  if (!projectDir) {
    fail(
      `No ${PROJECT_FOLDER}/ folder found in ${process.cwd()} or any parent directory.\n` +
        `This project is not set up for Cloud Logging yet. Run with --status for the setup steps.`,
    )
  }
  const stages = availableStages(projectDir)
  let stage = args.stage || process.env.CLS_DEFAULT_STAGE || config.defaultStage
  if (!stage) {
    if (stages.length === 1) stage = stages[0]
    else if (stages.length > 1) {
      fail(
        `Several stages are available (${stages.join(', ')}). Pass --stage <name>, ` +
          `or set "defaultStage" in ${path.join(projectDir, PROJECT_FOLDER, 'config.json')}.`,
      )
    } else {
      fail(`No service keys in ${keysDir(projectDir)}. Run with --status for the setup steps.`)
    }
  }
  const keyPath = path.join(keysDir(projectDir), `${stage}.json`)
  if (!fs.existsSync(keyPath)) {
    const hint = config.stages?.[stage]
      ? `Its source is recorded in config.json — fetch it with: node ${SCRIPT} --fetch-key --stage ${stage}`
      : `Run with --status for the setup steps — never invent endpoints or credentials.`
    fail(
      `No service key for stage "${stage}": ${keyPath}\n` +
        `Available stages: ${stages.length ? stages.join(', ') : '(none)'}. ${hint}`,
    )
  }
  return keyPath
}

function gitTopLevel() {
  const git = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' })
  return git.status === 0 ? git.stdout.trim() : undefined
}

// 'ignored' | 'not-ignored' (or already tracked) | 'no-git'. The file does not have to exist.
function gitIgnoreState(file) {
  let cwd = path.dirname(file)
  while (!fs.existsSync(cwd)) cwd = path.dirname(cwd)
  const res = spawnSync('git', ['check-ignore', '-q', path.relative(cwd, file)], { cwd, stdio: 'ignore' })
  // 128 = not inside a git repo; error = git not installed. Nothing can be committed then.
  if (res.error || res.status === 128) return 'no-git'
  return res.status === 0 ? 'ignored' : 'not-ignored'
}

// A key file that git would pick up is one `git add .` away from being published.
function assertGitIgnored(keyPath) {
  if (gitIgnoreState(keyPath) !== 'not-ignored') return
  fail(
    `Refusing to use ${keyPath}: git does not ignore it, or it is already tracked.\n` +
      `Add "keys/" to ${PROJECT_FOLDER}/.gitignore (--init creates it). If the file was ever ` +
      `committed, run "git rm --cached <file>" and rotate the service key.`,
  )
}

// Returns { key } or { error } — never the file content.
function readKeyFile(keyPath) {
  const text = fs.readFileSync(keyPath, 'utf8')
  // `cf service-key <instance> <key> > file` writes a "Getting key …" line before the JSON.
  const start = text.indexOf('{')
  try {
    const raw = JSON.parse(start > 0 ? text.slice(start) : text)
    // CF service keys sometimes wrap credentials under "credentials".
    const key = raw?.credentials ?? raw ?? {}
    rememberSecrets(key)
    return { key }
  } catch {
    // No parser message on purpose: Node quotes part of the input, which may be a secret.
    return { error: 'not valid JSON' }
  }
}

function loadKey(keyPath) {
  if (!fs.existsSync(keyPath)) fail(`Service key not found: ${keyPath}`)
  assertGitIgnored(keyPath)
  const { key, error } = readKeyFile(keyPath)
  if (error) {
    fail(
      `Service key at ${keyPath} is ${error}. Re-fetch it with --fetch-key, or paste the raw ` +
        `service-key JSON from the BTP cockpit.`,
    )
  }
  return key
}

function saveProjectConfig(projectDir, config) {
  const file = path.join(projectDir, PROJECT_FOLDER, 'config.json')
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n')
  return file
}

/* ------------------------------------------------------------------ setup */

function claudeSettingsFile(root) {
  return path.join(root, '.claude', 'settings.json')
}

// 'present' | 'missing' | 'not-applicable' (project does not use Claude Code) | 'unreadable'
function denyRuleState(root) {
  const file = claudeSettingsFile(root)
  if (!fs.existsSync(file)) {
    // CLAUDECODE is set in shells that Claude Code spawns.
    return fs.existsSync(path.dirname(file)) || process.env.CLAUDECODE ? 'missing' : 'not-applicable'
  }
  try {
    const deny = JSON.parse(fs.readFileSync(file, 'utf8'))?.permissions?.deny ?? []
    return deny.includes(DENY_RULE) ? 'present' : 'missing'
  } catch {
    return 'unreadable'
  }
}

function ensureDenyRule(root) {
  const file = claudeSettingsFile(root)
  const state = denyRuleState(root)
  if (state === 'present') return console.log(`exists   ${file} (deny rule)`)
  if (state === 'not-applicable') {
    return console.log(`skipped  Claude Code deny rule (no .claude/ folder). Using Claude Code? Add "${DENY_RULE}" to permissions.deny.`)
  }
  if (state === 'unreadable') {
    return console.log(`skipped  ${file} is not valid JSON — add "${DENY_RULE}" to permissions.deny by hand.`)
  }
  const settings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  settings.permissions = { ...settings.permissions, deny: [...(settings.permissions?.deny ?? []), DENY_RULE] }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n')
  console.log(`updated  ${file} (deny rule ${DENY_RULE})`)
}

function initProject() {
  const root = findProjectDir() ?? gitTopLevel() ?? process.cwd()
  const dir = path.join(root, PROJECT_FOLDER)
  fs.mkdirSync(keysDir(root), { recursive: true })
  fs.chmodSync(keysDir(root), 0o700)

  const files = {
    '.gitignore': '# Service keys are secrets. Only config.json and README.md are committed.\nkeys/\n',
    'config.json': JSON.stringify({ defaultStage: null, defaultIndex: null, stages: {} }, null, 2) + '\n',
  }
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(dir, name)
    if (fs.existsSync(file)) {
      console.log(`exists   ${file}`)
      continue
    }
    fs.writeFileSync(file, content)
    console.log(`created  ${file}`)
  }
  ensureDenyRule(root)
  console.log(
    [
      '',
      'Next steps:',
      `  1. Get each stage's service key (needs a cf login with access to that stage's space):`,
      `       node ${SCRIPT} --fetch-key --stage dev [--cf-org <org> --cf-space <space>]`,
      `     or paste the key JSON from the BTP cockpit into ${keysDir(root)}/<stage>.json`,
      `  2. Commit ${PROJECT_FOLDER}/.gitignore and config.json — never the keys/ folder.`,
      `  3. Check the setup: node ${SCRIPT} --status`,
    ].join('\n'),
  )
}

/* --------------------------------------------------------------- cf access */

function cfTarget() {
  const res = spawnSync('cf', ['target'], { encoding: 'utf8' })
  if (res.error) return { installed: false, loggedIn: false }
  const out = `${res.stdout}\n${res.stderr}`
  const field = (name) => out.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi'))?.[1].trim()
  return {
    installed: true,
    loggedIn: res.status === 0 && !/not logged in/i.test(out),
    api: field('API endpoint'),
    org: field('org'),
    space: field('space'),
  }
}

// `cf curl` exits 0 even on API errors; those arrive as { errors: [...] } in the body.
// With secret: true, nothing from the response is ever put into a message.
function cfCurl(apiPath, { secret = false } = {}) {
  const res = spawnSync('cf', ['curl', apiPath], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (res.error) fail(`Could not run cf: ${res.error.code}. Install the cf CLI, or paste the key JSON by hand.`)
  if (res.status !== 0) {
    const why = secret ? '' : `: ${(res.stderr || res.stdout).trim().split('\n').slice(0, 2).join(' ')}`
    fail(`cf curl ${apiPath.split('?')[0]} failed${why}`)
  }
  let body
  try {
    body = JSON.parse(res.stdout)
  } catch {
    fail(`cf curl ${apiPath.split('?')[0]} returned no JSON.`)
  }
  if (body?.errors?.length) {
    fail(`cf curl ${apiPath.split('?')[0]}: ${body.errors.map((e) => e.detail || e.title).join('; ')}`)
  }
  return body
}

function cloudLoggingInstances(spaceGuid) {
  const body = cfCurl(
    `/v3/service_instances?space_guids=${spaceGuid}&type=managed&per_page=5000` +
      '&fields%5Bservice_plan%5D=guid,relationships.service_offering' +
      '&fields%5Bservice_plan.service_offering%5D=guid,name',
  )
  const offeringOfPlan = new Map(
    (body.included?.service_plans ?? []).map((p) => [p.guid, p.relationships?.service_offering?.data?.guid]),
  )
  const offeringName = new Map((body.included?.service_offerings ?? []).map((o) => [o.guid, o.name]))
  return body.resources.filter(
    (i) => offeringName.get(offeringOfPlan.get(i.relationships?.service_plan?.data?.guid)) === CLOUD_LOGGING_OFFERING,
  )
}

const sameApi = (a, b) => String(a).replace(/\/+$/, '').toLowerCase() === String(b).replace(/\/+$/, '').toLowerCase()
const q = encodeURIComponent

/**
 * Read a stage's service key straight from Cloud Foundry and store it in keys/<stage>.json.
 * The credentials go from `cf curl` into the file and nowhere else. Where the key came from
 * (api, org, space, instance, key name — no secrets) is recorded in config.json, so the next
 * developer, or a refresh after the key expired, needs nothing but `--fetch-key --stage <stage>`.
 */
function fetchKey(args) {
  if (!args.stage || args.stage === true) fail('--fetch-key needs --stage <name>, e.g. --fetch-key --stage dev')
  const stage = String(args.stage)
  const projectDir = findProjectDir() ?? fail(`No ${PROJECT_FOLDER}/ folder yet — run --init first.`)
  const config = loadProjectConfig(projectDir)
  const saved = config.stages?.[stage] ?? {}

  const target = cfTarget()
  if (!target.installed) {
    fail(`The cf CLI is not installed. Install it, or paste the ${stage} key JSON from the BTP cockpit into ${keysDir(projectDir)}/${stage}.json.`)
  }
  const login = `! cf login${saved.api ? ` -a ${saved.api}` : ''} --sso`
  if (!target.loggedIn) fail(`Not logged in to Cloud Foundry. Ask the user to run:  ${login}`)
  if (saved.api && target.api && !sameApi(saved.api, target.api)) {
    fail(`Stage "${stage}" lives on ${saved.api}, but cf is logged in to ${target.api}. Ask the user to run:  ${login}`)
  }

  const org = args['cf-org'] || saved.org || target.org
  const space = args['cf-space'] || saved.space || target.space
  if (!org || !space) fail('No CF org/space known for this stage. Pass --cf-org <org> --cf-space <space>.')

  const orgRes = cfCurl(`/v3/organizations?names=${q(org)}`).resources[0] ??
    fail(`CF org "${org}" not found on ${target.api}, or this user cannot see it.`)
  const spaceRes = cfCurl(`/v3/spaces?names=${q(space)}&organization_guids=${orgRes.guid}`).resources[0] ??
    fail(`CF space "${space}" not found in org "${org}", or this user cannot see it.`)

  let instance
  const instanceName = args.instance || saved.instance
  if (instanceName) {
    instance = cfCurl(`/v3/service_instances?names=${q(instanceName)}&space_guids=${spaceRes.guid}`).resources[0] ??
      fail(`Service instance "${instanceName}" not found in ${org} / ${space}.`)
  } else {
    const found = cloudLoggingInstances(spaceRes.guid)
    if (found.length !== 1) {
      fail(
        found.length
          ? `Several Cloud Logging instances in ${org} / ${space}: ${found.map((i) => i.name).join(', ')}. Pass --instance <name>.`
          : `No SAP Cloud Logging instance in ${org} / ${space}. Pass --cf-org/--cf-space of the stage's space, or --instance <name>.`,
      )
    }
    instance = found[0]
  }

  const keys = cfCurl(`/v3/service_credential_bindings?type=key&service_instance_guids=${instance.guid}&per_page=5000`).resources
  const keyName = args['key-name'] || saved.key
  const create =
    `Creating a key adds credentials on BTP, so ask the user first, then run: ` +
    `cf target -o "${org}" -s "${space}" && cf create-service-key ${instance.name} <key-name>`
  let binding
  if (keyName) {
    binding = keys.find((k) => k.name === keyName) ??
      fail(`No service key "${keyName}" on ${instance.name}. Existing keys: ${keys.map((k) => k.name).join(', ') || '(none)'}. ${create}`)
  } else if (keys.length === 1) {
    binding = keys[0]
  } else {
    fail(
      keys.length
        ? `Several service keys on ${instance.name}: ${keys.map((k) => k.name).join(', ')}. Pass --key-name <name>.`
        : `${instance.name} has no service key yet. ${create}`,
    )
  }

  const keyPath = path.join(keysDir(projectDir), `${stage}.json`)
  if (fs.existsSync(keyPath) && !args.force) {
    fail(`${keyPath} already exists. Re-run with --force to replace it (fields added by hand, such as an internal dashboards user, would be lost).`)
  }
  fs.mkdirSync(keysDir(projectDir), { recursive: true, mode: 0o700 })
  assertGitIgnored(keyPath) // before any secret touches the disk

  const credentials = cfCurl(`/v3/service_credential_bindings/${binding.guid}/details`, { secret: true })?.credentials
  if (!credentials || typeof credentials !== 'object') fail(`Cloud Foundry returned no credentials for key "${binding.name}".`)
  rememberSecrets(credentials)
  fs.writeFileSync(keyPath, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 })
  fs.chmodSync(keyPath, 0o600)

  config.stages = {
    ...config.stages,
    [stage]: { api: target.api, org, space, instance: instance.name, key: binding.name },
  }
  const newDefault = !config.defaultStage
  if (newDefault) config.defaultStage = stage
  const configFile = saveProjectConfig(projectDir, config)
  console.log(`wrote    ${keyPath}  (key "${binding.name}" of ${instance.name} in ${org} / ${space})`)
  console.log(`updated  ${configFile}  (stages.${stage}${newDefault ? ', defaultStage' : ''})`)
  printInfo(credentials, keyPath, projectDir, config)
}

/**
 * The whole setup state in one JSON document, plus concrete next steps. Never fails and
 * never reads a key file that git would commit — so it is the safe first call in any project.
 */
function printStatus() {
  const projectDir = findProjectDir()
  const root = projectDir ?? gitTopLevel() ?? process.cwd()
  const config = projectDir ? loadProjectConfig(projectDir) : {}
  const cf = cfTarget()
  const next = []
  const run = (flags) => `node ${SCRIPT} ${flags}`

  const keysIgnored = projectDir ? gitIgnoreState(path.join(keysDir(root), 'probe.json')) !== 'not-ignored' : null
  const names = [...new Set([...availableStages(projectDir), ...Object.keys(config.stages ?? {})])].sort()
  const stages = names.map((name) => {
    const keyPath = path.join(keysDir(root), `${name}.json`)
    const report = { stage: name, keyFile: fs.existsSync(keyPath), source: config.stages?.[name] ?? null }
    if (!report.keyFile) {
      next.push(
        report.source
          ? `Fetch the ${name} key: ${run(`--fetch-key --stage ${name}`)}`
          : `Get the ${name} key: ${run(`--fetch-key --stage ${name} --cf-org <org> --cf-space <space>`)}`,
      )
      return report
    }
    if (gitIgnoreState(keyPath) === 'not-ignored') {
      next.push(`keys/${name}.json is not gitignored or is tracked — fix before using it (see --init).`)
      return { ...report, gitIgnored: false }
    }
    const { key, error } = readKeyFile(keyPath)
    if (error) {
      next.push(`keys/${name}.json is ${error} — re-fetch: ${run(`--fetch-key --stage ${name} --force`)}`)
      return { ...report, error }
    }
    const caps = keyCapabilities(key)
    if (!caps.canReadLogs) next.push(`The ${name} key cannot read logs — see references/read-access.md.`)
    return { ...report, canReadLogs: caps.canReadLogs, readMethods: caps.readMethods }
  })

  const denyRule = denyRuleState(root)
  if (!projectDir) next.push(`Set up the project: ${run('--init')}`)
  else if (!keysIgnored) next.push(`${PROJECT_FOLDER}/keys/ is not gitignored — run ${run('--init')} or add "keys/" to ${PROJECT_FOLDER}/.gitignore.`)
  if (projectDir && denyRule === 'missing') next.push(`Add the Claude Code deny rule: ${run('--init')}`)
  if (projectDir && !names.length) {
    next.push(
      `No stages yet. Find out which stages exist and which CF org/space holds each one's Cloud Logging ` +
        `instance, then: ${run('--fetch-key --stage <stage> --cf-org <org> --cf-space <space>')}`,
    )
  }
  if ((!projectDir || !names.length || stages.some((s) => !s.keyFile)) && !cf.loggedIn) {
    next.unshift(cf.installed ? 'Ask the user to log in: ! cf login --sso' : 'cf CLI missing — install it, or paste key JSON by hand.')
  }
  if (names.length > 1 && !config.defaultStage) next.push(`Set "defaultStage" in ${PROJECT_FOLDER}/config.json.`)
  if (projectDir && !fs.existsSync(path.join(root, PROJECT_FOLDER, 'README.md'))) {
    next.push(`Optional: write ${PROJECT_FOLDER}/README.md (CF app names, which stage tickets usually mean).`)
  }

  console.log(
    JSON.stringify(
      {
        ready: stages.some((s) => s.canReadLogs),
        projectDir: projectDir ?? null,
        setupDir: path.join(root, PROJECT_FOLDER),
        keysGitIgnored: keysIgnored,
        claudeDenyRule: denyRule,
        defaultStage: config.defaultStage ?? null,
        stages,
        cf: { installed: cf.installed, loggedIn: cf.loggedIn, api: cf.api ?? null, org: cf.org ?? null, space: cf.space ?? null },
        nextSteps: next,
      },
      null,
      2,
    ),
  )
}

function endpointHost(value) {
  if (!value || value === true) return undefined
  const raw = String(value).trim()
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname
  } catch {
    return raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

function keyCapabilities(key) {
  const has = (name) => Boolean(key[name])
  const readViaBackend =
    has('backend-endpoint') && has('backend-username') && has('backend-password')
  const readViaDashboards =
    has('dashboards-endpoint') &&
    has('dashboards-username') &&
    has('dashboards-password')

  return {
    canReadLogs: readViaBackend || readViaDashboards,
    readMethods: [
      readViaBackend ? 'backend' : undefined,
      readViaDashboards ? 'dashboards-proxy' : undefined,
    ].filter(Boolean),
    canOpenDashboard: has('dashboards-endpoint'),
    canIngestJson:
      has('ingest-endpoint') && has('ingest-username') && has('ingest-password'),
    canIngestMtls:
      has('ingest-mtls-endpoint') &&
      has('ingest-mtls-cert') &&
      has('ingest-mtls-key'),
    endpoints: {
      backend: endpointHost(key['backend-endpoint']),
      dashboards: endpointHost(key['dashboards-endpoint']),
      ingest: endpointHost(key['ingest-endpoint']),
      ingestMtls: endpointHost(key['ingest-mtls-endpoint']),
    },
  }
}

function printInfo(key, keyPath, projectDir, config) {
  const caps = keyCapabilities(key)
  console.log(
    JSON.stringify(
      {
        projectDir: projectDir ?? null,
        defaultStage: config.defaultStage ?? null,
        availableStages: availableStages(projectDir),
        keyFile: keyPath,
        ...caps,
        missingForScriptedReads: caps.canReadLogs
          ? []
          : [
              'backend-endpoint + backend-username + backend-password',
              'or dashboards-endpoint + dashboards-username + dashboards-password',
            ],
      },
      null,
      2,
    ),
  )
}

function buildDsl(args) {
  const timeField = args['time-field'] || '@timestamp'
  const size = Number(args.size || 50)
  const must = []
  const filter = []

  const queryParts = []
  const cfAppLogs = args['cf-app-logs'] || args['cf-errors'] || args.errors
  if (cfAppLogs) {
    filter.push({
      bool: {
        should: [{ match_phrase: { type: 'log' } }, { match_phrase: { type: 'trace' } }],
        minimum_should_match: 1,
      },
    })
    filter.push({ bool: { must_not: [{ match_phrase: { source_type: 'RTR' } }] } })
  }
  if (args['cf-errors'] || args.errors) {
    queryParts.push(
      '(level:error OR level:ERROR OR severity:error OR severity:ERROR OR severity_text:ERROR)',
    )
  }
  if (args.query && args.query !== '*' && args.query !== true) {
    queryParts.push(`(${String(args.query)})`)
  }
  if (args.app) {
    const app = String(args.app).replaceAll('"', '\\"')
    queryParts.push(`(cf_app_name:"${app}" OR app_name:"${app}" OR application_name:"${app}" OR component_name:"${app}")`)
  }
  if (args.space) {
    const space = String(args.space).replaceAll('"', '\\"')
    queryParts.push(`(cf_space_name:"${space}" OR space_name:"${space}")`)
  }
  if (args.org) {
    const org = String(args.org).replaceAll('"', '\\"')
    queryParts.push(`(cf_org_name:"${org}" OR org_name:"${org}")`)
  }

  if (queryParts.length) {
    must.push({
      query_string: { query: queryParts.join(' AND '), analyze_wildcard: true },
    })
  } else {
    must.push({ match_all: {} })
  }

  const range = {}
  if (args.from) range.gte = String(args.from)
  if (args.to) range.lte = String(args.to)
  if (!args.from && !args.to) {
    const last = args.last || '1h'
    range.gte = new Date(Date.now() - durationToMs(last)).toISOString()
    range.lte = 'now'
  }
  filter.push({ range: { [timeField]: range } })

  return {
    size,
    sort: [{ [timeField]: { order: args.asc ? 'asc' : 'desc' } }],
    query: { bool: { must, filter } },
  }
}

function request({ hostname, pathName, auth, body }) {
  const token = Buffer.from(`${auth.user}:${auth.pass}`).toString('base64')
  secrets.add(token)
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body))
    const req = https.request(
      {
        hostname,
        port: 443,
        path: pathName,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': data.length,
          'osd-xsrf': 'true',
          authorization: `Basic ${token}`,
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          if (res.statusCode >= 400) {
            return reject(
              new Error(`HTTP ${res.statusCode}: ${text.slice(0, 800)}`),
            )
          }
          try {
            resolve(JSON.parse(text))
          } catch {
            reject(new Error(`Non-JSON response: ${text.slice(0, 800)}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function pickEndpoint(key, args, index) {
  const force = args.endpoint
  const caps = keyCapabilities(key)
  const hasBackend = caps.readMethods.includes('backend')
  const useBackend = force === 'backend' || (!force && hasBackend)

  if (useBackend) {
    if (!hasBackend) fail('Service key has no backend-endpoint (backend.api_enabled likely false)')
    return {
      hostname: endpointHost(key['backend-endpoint']),
      pathName: `/${index}/_search`,
      auth: { user: key['backend-username'], pass: key['backend-password'] },
      via: 'backend',
    }
  }

  if (!caps.readMethods.includes('dashboards-proxy')) {
    fail(
      'Service key cannot be used for scripted log reads. It has no backend read credentials ' +
        'and no dashboard basic-auth credentials. Ask for a Cloud Logging key with ' +
        'backend-endpoint/backend-username/backend-password, or dashboards-username/' +
        'dashboards-password. Run with --info to inspect available non-secret capabilities.',
    )
  }
  // Query OpenSearch through the Dashboards console proxy.
  const proxyPath =
    '/api/console/proxy?method=POST&path=' +
    encodeURIComponent(`${index}/_search`)
  return {
    hostname: endpointHost(key['dashboards-endpoint']),
    pathName: proxyPath,
    auth: { user: key['dashboards-username'], pass: key['dashboards-password'] },
    via: 'dashboards-proxy',
  }
}

function printHits(result, args) {
  const hits = result?.hits?.hits ?? []
  const total = result?.hits?.total?.value ?? hits.length
  const fields = args.fields
    ? String(args.fields).split(',').map((f) => f.trim())
    : args['cf-errors']
      ? [
          '@timestamp',
          'level',
          'app_name',
          'component_name',
          'type',
          'source_type',
          'correlation_id',
          'request_id',
          'x_correlation_id',
          'msg',
          'message',
        ]
      : args['cf-app-logs']
        ? [
            '@timestamp',
            'level',
            'app_name',
            'component_name',
            'type',
            'source_type',
            'correlation_id',
            'request_id',
            'x_correlation_id',
            'msg',
            'message',
          ]
        : null
  const timeField = args['time-field'] || '@timestamp'

  console.error(`# ${hits.length} of ${total} matching documents`)
  for (const h of hits) {
    const s = h._source || {}
    if (fields) {
      const obj = {}
      for (const f of fields) obj[f] = s[f]
      console.log(JSON.stringify(obj))
    } else {
      const ts = s[timeField] || s.time || ''
      const level = s.level || s.severity || s.severity_text || ''
      const msg =
        s.msg || s.message || s.body || s.log || JSON.stringify(s).slice(0, 500)
      console.log(`${ts}  ${String(level).padEnd(7)}  ${msg}`)
    }
  }
}

async function main() {
  protectStreams()
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    const lines = fs.readFileSync(path.join(SCRIPT_DIR, 'query-logs.mjs'), 'utf8').split('\n')
    const help = []
    for (let i = 1; i < lines.length && lines[i].startsWith('//'); i++) {
      help.push(lines[i].replace(/^\/\/ ?/, ''))
    }
    console.log(help.join('\n'))
    return
  }
  if (args.stage && args.stage !== true && !/^[\w-]+$/.test(String(args.stage))) {
    fail(`Invalid stage name "${args.stage}" — use letters, digits, "-" or "_" (e.g. dev, test, qa).`)
  }
  if (args.status) return printStatus()
  if (args.init) return initProject()
  if (args['fetch-key']) return fetchKey(args)

  const projectDir = findProjectDir()
  const config = loadProjectConfig(projectDir)
  const keyPath = resolveKeyPath(args, projectDir, config)
  const key = loadKey(keyPath)
  if (args.info) {
    printInfo(key, keyPath, projectDir, config)
    return
  }
  const index =
    args.index ||
    (args['cf-app-logs'] || args['cf-errors'] || args.errors
      ? 'logs-cfsyslog-*'
      : config.defaultIndex || 'logs-json-*')

  let dsl
  if (args.dsl) {
    const stdin = fs.readFileSync(0, 'utf8')
    dsl = JSON.parse(stdin)
  } else {
    dsl = buildDsl(args)
  }

  const ep = pickEndpoint(key, args, index)
  console.error(`# index=${index} via=${ep.via} host=${ep.hostname}`)

  const result = await request({ ...ep, body: dsl })

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHits(result, args)
  }
}

main().catch((e) => fail(e.message))
