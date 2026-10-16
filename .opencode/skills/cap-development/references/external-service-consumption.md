# Consuming External OData Services — adesso deltas

> **The remote-service integration workflow lives in the official SAP `cap-add-remote-service`
> skill** (installed via `npx skills add https://github.com/capire/skills.git`). It owns the
> full Calesi flow: `cds import` / npm-package import, `cds.requires` config, consumption
> views (`@federated`, field renaming, `where` pre-filters), delegation vs. replication vs.
> transactional outbox, SAP Cloud SDK packages, and the common pitfalls.
>
> **Do not restate that here.** This page only carries the adesso-specific deltas the
> official skill does not cover: profile-scoped destination config, BTP Destination wiring
> cross-links, and the S/4HANA "no API for what I need" decision.

## 1. Profile-scoped destination config (adesso convention)

In the default `development` profile CAP **auto-mocks the remote service in-process** from the
imported model — no extra config needed (official `cap-add-remote-service`, Step 7). That is
what keeps airplane mode working. Do **not** add a `[development]` override for this.

adesso convention: put the destination **only** into the `[hybrid]` / `[production]` profiles,
so a plain `cds watch` never tries to reach the real system:

```json
{
  "cds": {
    "requires": {
      "API_BUSINESS_PARTNER": {
        "kind": "odata-v2",
        "model": "srv/external/API_BUSINESS_PARTNER",
        "[hybrid]":      { "credentials": { "destination": "S4HANA_BusinessPartner" } },
        "[production]":  { "credentials": { "destination": "S4HANA_BusinessPartner" } }
      }
    }
  }
}
```

- **default / `development`** — no credentials → CAP mocks in-process (`mocking API_BUSINESS_PARTNER`
  in the `cds watch` log). If the log shows `connect to … > odata` instead, follow the stale
  `~/.cds-services.json` hint in `cap-add-remote-service`.
- **`[hybrid]` / `[production]`** — `credentials.destination` names a BTP Destination.

**Resilience:** every remote call must tolerate the remote being down or slow — wrap it in
the try/catch stub-fallback pattern from `coding-standards.md` → *Category 3: Libraries / SDKs*.
The in-dev auto-mock only covers the `development` profile.

## 2. BTP Destination wiring (cross-links)

The Destination itself is created in the BTP cockpit / MTA and the Destination service must
be bound to the app. Those steps live outside this repo's backend skill:

- Adding the binding / MTA resource → **`cap-project-scaffold`** (`cds add destination`, MTA wiring).
- Verifying the binding and reading `VCAP_SERVICES` on a deployed app → **`cap-cloud-foundry`**.
- Hybrid testing against the real destination from your laptop:
  `cds bind destinations --to <destination-service-instance>` then `cds watch --profile hybrid`
  (same pattern as `cds bind aicore`, see `references/development-runtime.md` → *Hybrid Testing*).

## 3. "What if there's no API for what I need?"

The answer splits on the S/4HANA edition.

### Private Cloud (S/4HANA Cloud Private Edition / on-stack ABAP)

Essentially the same freedom as on-premise ABAP. A custom OData service can be built directly
in the S/4 system via RAP (preferred for new development) or SEGW, then consumed via the
official `cap-add-remote-service` EDMX-from-endpoint route. Whether that's the *sensible*
choice — versus keeping the new logic side-by-side on BTP and pulling whatever data the
standard APIs expose — is a design call, not a capability limit. The clean-core principle
still applies: every line of custom ABAP is a future upgrade tax.

### Public Cloud (S/4HANA Cloud Public Edition)

Far more constrained. Additional CDS views can be exposed as OData via Key User Extensibility
(Custom CDS Views in a *Custom Communication Scenario*) or Developer Extensibility (custom RAP
Business Objects with managed service bindings) — **but only on top of CDS views that SAP has
released for that purpose**. The released-for-cloud-development whitelist is the actual
constraint, not the tooling. Many SAP CDS views simply aren't released; many fields on released
views aren't exposed. **Before committing to the extension path:** confirm the base CDS view
(and the specific fields) are released. The released-objects catalog is the source of truth —
don't assume from on-prem familiarity.

### Nothing fits

- Raise the gap via SAP Customer Influence and vote on existing requests.
- Meanwhile, build the missing logic side-by-side on BTP using whatever surface area *is*
  available: released business events via SAP Event Mesh / SAP Cloud ALM, data products /
  replication, the existing OData APIs (even if not a perfect fit).
- Before reaching for custom S/4 development, walk the framework-first ladder:
  **`framework-first-review`** → *use the platform first* — there is often a BTP-side service
  (Document Management, Workflow, Business Rules, Event Mesh) that removes the need to write
  the logic in S/4 at all.
