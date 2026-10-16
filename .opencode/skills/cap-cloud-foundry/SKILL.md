---
name: cap-cloud-foundry
description: >-
  Inspects a deployed SAP BTP Cloud Foundry CAP/MTA app via the local cf CLI
  to read runtime env, VCAP_SERVICES, service bindings, and logs. TRIGGER
  when: project root contains mta.yaml or mtad.yaml; user mentions cf push,
  cf logs, cf env, cf ssh, cf target, cf services, VCAP_SERVICES, service
  binding, bound service, XSUAA binding, HANA binding, destination service,
  connectivity service, application-logs, audit-log, SAP BTP, Cloud Foundry,
  "deployed app", "it works locally but fails in prod / cf"; runtime errors
  only reproducible after deployment. SKIP: for local `cds watch` debugging
  (use cap-development), for adding CF-related features to a project such
  as `cds add mta` / `cds add xsuaa` (use cap-project-scaffold), for
  historical or cross-app log search in SAP Cloud Logging (use
  sap-cloud-logging), or for Kyma / Kubernetes deployments (out of scope).
---

# CAP on Cloud Foundry (MTA + `cf` CLI)

## When this skill applies

If the project root (or any workspace folder) contains an **`mta.yaml`** — or a built **`mtad.yaml`** / `*.mtar` — treat the project as an **SAP BTP Cloud Foundry** deployment. The user most likely has the **`cf` CLI** installed locally and is logged in to a CF org/space.

`mta.yaml` is the MTA (Multi-Target Application) descriptor used by the **MultiApps plugin** (`cf deploy`) on Cloud Foundry. Its presence strongly implies:

- BTP Cloud Foundry runtime (not Kyma; Kyma projects use `chart/` + `helm` or `kyma` artifacts).
- Bound services declared as `resources:` (XSUAA, HANA HDI, destination, connectivity, application-logs, job-scheduler, html5-apps-repo, etc.).
- Deployed modules under `modules:` (CAP `srv`, `db-deployer`, `approuter`, `html5` apps, …).

## Do before inventing

**Before** guessing at bindings, URLs, env vars, or why a deployed app misbehaves, **ask to run `cf` commands** (or run them if shell access is granted). Reading the live runtime is almost always faster and more accurate than re-deriving from source.

Never run destructive commands (`cf delete*`, `cf unbind-*`, `cf scale` down, `cf stop`, `cf restage` of prod, `cf ssh` writes) without explicit user confirmation.

## Useful `cf` commands for investigation

Targeting & auth (read-only, safe to suggest first):

```bash
cf target                    # current api / org / space
cf orgs ; cf spaces
cf target -o <org> -s <space>
```

Apps, services, routes:

```bash
cf apps
cf app <app>                 # state, instances, memory, routes, last uploaded
cf services
cf service <instance>        # plan, bindings, dashboard URL
cf routes
```

Runtime config (the usual reason to reach for `cf`):

```bash
cf env <app>                 # VCAP_SERVICES, VCAP_APPLICATION, user-provided env
cf ssh <app> -c 'env'        # live process env (needs ssh enabled)
cf running-environment-variable-group
cf staging-environment-variable-group
```

Logs:

```bash
cf logs <app> --recent       # snapshot of recent logs
cf logs <app>                # live tail (ask before leaving this running)
cf events <app>              # crashes, restarts, scale events
```

MTA-aware (MultiApps plugin, present when `mta.yaml` is used):

```bash
cf mtas
cf mta <mta-id>              # modules + provided/consumed deps for the MTA
cf deploy <file.mtar>        # only on explicit user request
```

## Typical CAP-on-CF investigations

| Symptom / question | First `cf` command |
|---|---|
| "Which HANA HDI container is the srv bound to?" | `cf env <srv-app>` → inspect `VCAP_SERVICES.hana` |
| "Why is XSUAA auth failing in prod?" | `cf env <srv-app>` → `VCAP_SERVICES.xsuaa.credentials`, then `cf service <xsuaa-instance>` |
| "Destinations not found at runtime" | `cf service <destination-instance>` + `cf env <srv-app>` (check `destination` binding) |
| "App crashes on start" | `cf logs <app> --recent` + `cf events <app>` |
| "What got deployed in the last MTA push?" | `cf mta <mta-id>` and `cf events <app>` |
| "Which approuter route serves the UI?" | `cf app <approuter-app>` (routes section) |

## Interpreting the mta.yaml locally

`mta.yaml` (and the generated `mtad.yaml` after `mbt build`) is the source of truth for **intended** topology:

- `modules:` → apps that become CF apps (CAP `srv` is typically `type: nodejs` or `type: nodejs | java`; `*-db-deployer` is a one-off task module; `approuter` is the frontend; `*-destination-content` / `*-html5-deployer` handle BTP wiring).
- `resources:` → CF services to create/bind. `service: …`, `service-plan: …`, `service-name: …` tell you what will show up in `cf services`.
- `requires:` inside a module → which `resources` (and provided deps) get bound, i.e. what lands in `VCAP_SERVICES` for that app.

Pair local `mta.yaml` reading with `cf env` / `cf services` to confirm the **actual** runtime matches the descriptor (names can be overridden per space).

## Scaffolding MTA

If the project needs MTA but doesn't have one, do **not** hand-write it. Use the scaffold skill:

```bash
cds add mta           # and related: cds add xsuaa, cds add hana, cds add approuter
```

See **`skills/cap-project-scaffold/SKILL.md`**.

## When NOT to assume CF

- `chart/` or `values.yaml` at the root, or `cds add kyma` artifacts → **Kyma / Kubernetes**, use `kubectl` / `helm`, not `cf`.
- Only `package.json` + `cds` with no `mta.yaml`, no `manifest.yml` → local / hybrid dev only; don't push for `cf` commands.
- `manifest.yml` without `mta.yaml` → plain `cf push` deployment (still CF, still use `cf` CLI, but skip the MTA-specific commands above).

## CDS MCP

For authoritative, up-to-date CAP deployment guidance use CDS MCP `search_docs` with queries like:

- `"deploy to cloud foundry mta"`
- `"cds add mta xsuaa hana approuter"`
- `"VCAP_SERVICES CAP"`
- `"hybrid testing cds bind"` (for reading prod-like bindings locally via `cds bind`)
