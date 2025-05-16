Param($TEXT, $API_KEY)

$BASE_URL = "https://your-dify-domain/v1"

$json = @{
    inputs=@{
        recoding_txt=$TEXT
    }
    user="abc-123"
} | ConvertTo-Json
$body = [System.Text.Encoding]::UTF8.GetBytes($json)

$res = Invoke-RestMethod -Uri "$BASE_URL/workflows/run" `
    -TimeoutSec 6000 `
    -Method Post `
    -Headers @{"Authorization"="Bearer $API_KEY";"Content-Type"="application/json"} `
    -Body $body 
echo $res.data.outputs.output

return($res.data.outputs.output) 
