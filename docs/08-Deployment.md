# 08 Deployment

Vorbereitet:

- `mta.yaml` mit CAP-Service, HDI-Deployer, HANA und XSUAA.
- `xs-security.json` mit Producer-, Supplier-, Participant- und IntegrationClient-Rollen.
- `cds add hana,xsuaa,mta` wurde verwendet.
- Produktionsbuild: `npx.cmd cds build --production` erfolgreich.

Für einen echten Deploy fehlen in dieser Umgebung BTP-Organisation, Space, Entitlements und Ziel-Credentials. Der Deploy wurde daher nicht behauptet oder ausgeführt.
