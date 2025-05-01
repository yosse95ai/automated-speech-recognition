# Command Parameters
# -AWS_ACCESS_KEY_ID     : AWS Access Key
# -AWS_SECRET_ACCESS_KEY : AWS Secret Key
# -REGION                : AWS Region
# -FILE_PATH             : Path to input audio file
Param($AWS_ACCESS_KEY_ID, $AWS_SECRET_ACCESS_KEY, $REGION, $FILE_PATH)

# Register AWS credentials
$env:AWS_ACCESS_KEY_ID = "$AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "$AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "$REGION"

# Upload audio file to S3
$BUCKET_NAME="s3-asr-bucket"
$FILENAME = [System.IO.Path]::GetFileName($FILE_PATH)
$S3_PATH = "s3://$BUCKET_NAME/Audio/$FILENAME"

aws s3 cp $FILE_PATH $S3_PATH | Out-Null

# Start transcription job
$TIME = Get-Date -Format "yyyyMMddHHmm"
$JOBNAME = "transcript-job"+$TIME

aws transcribe start-transcription-job `
    --region $REGION `
    --transcription-job-name $JOBNAME `
    --media MediaFileUri=$S3_PATH `
    --language-code ja-JP `
    --output-bucket-name $BUCKET_NAME | Out-Null

function GetJob($jobname) {
    return(aws transcribe get-transcription-job --transcription-job-name $jobname | ConvertFrom-Json)
}
function GetJobStatus($jobname) {
    $json = GetJob $jobname
    return($json.TranscriptionJob.TranscriptionJobStatus)
}

$STATUS = GetJobStatus $JOBNAME

while($STATUS -eq "IN_PROGRESS"){
    $STATUS = GetJobStatus $JOBNAME
    sleep 10
}

# Get output results
if ($STATUS -eq "COMPLETED") {
    $job = GetJob $JOBNAME  # Get Transcribe job
    $url = $job.TranscriptionJob.Transcript.TranscriptFileUri    # S3 location of transcription results
    $transcript_json_file = [System.IO.Path]::GetFileName($url)  # Get filename of transcription results
    $tmp_transcrip_json_file = "_tmp"+$transcript_json_file      # Temporary file for transcription results
    $outfile = [System.IO.Path]::GetFileNameWithoutExtension($url) + ".txt"  # Local output file

    aws s3api get-object `
        --bucket $BUCKET_NAME `
        --key $transcript_json_file `
        $tmp_transcrip_json_file | Out-Null

    $jsonData = Get-Content -Encoding UTF8 -Path $tmp_transcrip_json_file -Raw | ConvertFrom-Json
    $jsonData.results.transcripts.transcript > $outfile

    Remove-Item $tmp_transcrip_json_file
    Get-Content -Encoding UTF8 -Path $outfile
}
else {
    echo "Transcribe was failed."
}
