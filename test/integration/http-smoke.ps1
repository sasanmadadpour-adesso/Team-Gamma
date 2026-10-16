$ErrorActionPreference = 'Stop'
$base = 'http://[::1]:4004/service/CommunityManagementService'
$credential = New-Object PSCredential('alice', (ConvertTo-SecureString '' -AsPlainText -Force))
$metadata = Invoke-WebRequest -UseBasicParsing -Uri "$base/`$metadata" -Credential $credential
if ($metadata.StatusCode -ne 200) { throw "Metadata request failed" }
$communities = Invoke-RestMethod -Uri "$base/Communities" -Credential $credential
if ($communities.value.Count -lt 1) { throw "Seed community missing" }
Write-Output "HTTP smoke test passed: metadata and seeded Communities are available."
