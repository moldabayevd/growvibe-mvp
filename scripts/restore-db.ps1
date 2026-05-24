$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string] $BackupPath
)

if (-not (Test-Path $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

$file = Split-Path $BackupPath -Leaf
$containerPath = "/tmp/$file"

docker cp $BackupPath "growvibe-postgres:$containerPath"
docker exec growvibe-postgres sh -lc "gzip -dc $containerPath | psql -U `"`$POSTGRES_USER`" `"`$POSTGRES_DB`""
docker exec growvibe-postgres rm -f $containerPath | Out-Null

Write-Host "Restore completed from: $BackupPath"
