# Read access: which service keys can read logs

`--info`, `--status` and `--fetch-key` report `canReadLogs` for each key. This page explains what that
depends on and how to fix a key that cannot read.

## What a key contains

A Cloud Logging service key looks like this (values redacted):

```json
{
  "dashboards-endpoint": "dashboards-...-cloud.logs.services.<region>.hana.ondemand.com",
  "dashboards-username": "...",
  "dashboards-password": "...",
  "ingest-mtls-endpoint": "...", "ingest-mtls-cert": "...", "ingest-mtls-key": "..."
}
```

- **`backend-endpoint` / `-username` / `-password`**: present only if `backend.api_enabled` is set on
  the instance. The script prefers them for direct OpenSearch API access.
- **`dashboards-*`**: otherwise the script queries through the Dashboards console proxy.
- **Ingest-only keys**: contain only `ingest-*` / `ingest-mtls-*`. They can *ship* logs but cannot
  read them (`canReadLogs: false`).

## Fix 1: enable the backend API on the instance

`backend.api_enabled` belongs to the **service instance**, not to the key. Passing it only to
`cf create-service-key -c …` has no effect. Updating the instance changes a BTP resource, so **ask the
user before running this**:

```bash
cf target -o "<org>" -s "<space>"
cf update-service <cloud-logging-instance> -c '{"backend":{"api_enabled":true}}'
cf service <cloud-logging-instance>          # wait until the update has succeeded
cf create-service-key <cloud-logging-instance> <read-key>
```

Then re-fetch with `query-logs --fetch-key --stage <stage> --key-name <read-key> --force`.

## Fix 2: technical internal user in OpenSearch Dashboards

Use this when keys still expose no read credentials, for example on SAML/IAS-protected dashboards.
Only the user can do these steps, in the browser:

1. Open the stage's `dashboards-endpoint` → `Security` → `Internal users` → `Create internal user`.
   Use a dedicated name such as `<project>-logs-readonly` and a generated password of 20+ characters.
2. `Security` → `Roles` → `readall` → `Mapped users` → `Manage mapping`: enter the username under
   **Users** and click `Map`. Do **not** put it into `Backend roles`.
3. Map the same user to `global_tenant_read_access` as well. The Dashboards proxy path needs it.
4. The user adds two fields to `.sap-cloud-logging/keys/<stage>.json` in their editor:
   `"dashboards-username"` and `"dashboards-password"`. The password must not go through the chat.

A key file with hand-added fields must not be re-fetched with `--force`, because that would remove
them. `--fetch-key` refuses to overwrite an existing file without `--force`.

## No cf CLI or no CF access

The user copies the key JSON from the BTP cockpit (instance → Service Keys) into
`.sap-cloud-logging/keys/<stage>.json` in their editor. A `credentials` wrapper and a leading
`Getting key …` line from `cf service-key` output are both handled.
