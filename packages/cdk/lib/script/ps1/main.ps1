Param($AWS_ACCESS_KEY_ID, $AWS_SECRET_ACCESS_KEY, $REGION, $FILE_PATH, $S3, $DIFY_API_KEY)

function CallTranscribe($filepath) {
    $output = powershell .\transcribe.ps1  `
        -AWS_ACCESS_KEY_ID $AWS_ACCESS_KEY_ID `
        -AWS_SECRET_ACCESS_KEY $AWS_SECRET_ACCESS_KEY `
        -REGION $REGION `
        -FILE_PATH $filepath `
        -S3 $S3

    return($output)
}


echo "Start Transcript job."
$transcript = CallTranscribe $FILE_PATH
echo "Finished job."

$summary = powershell .\dify.ps1 -TEXT "$transcript" -API_KEY $DIFY_API_KEY

echo $summary