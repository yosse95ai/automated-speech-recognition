Param($FILE_PATH)

function CallTranscribe($filepath) {
    $AWS_ACCESS_KEY_ID = "your-access-key"
    $AWS_SECRET_ACCESS_KEY = "your-secret-access-key"
    $AWS_DEFAULT_REGION = "ap-northeast-1"
    $output = powershell transcribe.ps1  `
        -AWS_ACCESS_KEY_ID  $AWS_ACCESS_KEY_ID `
        -AWS_SECRET_ACCESS_KEY $AWS_SECRET_ACCESS_KEY `
        -REGION $AWS_DEFAULT_REGION `
        -FILE_PATH $filepath

    return($output)
}


echo "Start Transcript job."
$transcript = CallTranscribe $FILE_PATH
echo "Finished job."

$summary = powershell dify.ps1 -TEXT "$transcript"

echo $summary