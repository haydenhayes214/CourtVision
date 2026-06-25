param(
    [Parameter(Mandatory = $true)]
    [string]$BucketName,

    [string]$DistributionId = ""
)

$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\frontend"
try {
    npm run build
    aws s3 sync dist "s3://$BucketName" --delete

    if ($DistributionId) {
        aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
    }
}
finally {
    Pop-Location
}
