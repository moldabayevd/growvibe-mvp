$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path "backups" | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = "growvibe-$stamp.sql.gz"
$containerPath = "/tmp/$file"
$localPath = Join-Path "backups" $file

docker exec growvibe-postgres sh -lc "pg_dump -U `"`$POSTGRES_USER`" `"`$POSTGRES_DB`" | gzip > $containerPath"
docker cp "growvibe-postgres:$containerPath" $localPath
docker exec growvibe-postgres rm -f $containerPath | Out-Null

Write-Host "Backup written: $localPath"
