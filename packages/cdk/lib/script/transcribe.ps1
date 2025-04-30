# コマンドパラメーター
# -AWS_ACCESS_KEY_ID     : AWSアクセスキー
# -AWS_SECRET_ACCESS_KEY : AWSシークレットキー
# -REGION                : AWSリージョン
# -FILE_PATH             : 入力音声ファイルのパス
Param($AWS_ACCESS_KEY_ID, $AWS_SECRET_ACCESS_KEY, $REGION, $FILE_PATH)

# AWS のクレデンシャル情報を登録
$env:AWS_ACCESS_KEY_ID = "$AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "$AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "$REGION"

# S3 へ音声ファイルアップロード
$BUCKET_NAME="s3-asr-bucket"
$FILENAME = [System.IO.Path]::GetFileName($FILE_PATH)
$S3_PATH = "s3://$BUCKET_NAME/Audio/$FILENAME"

aws s3 cp $FILE_PATH $S3_PATH | Out-Null

# Transcript job の開始
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

# 出力結果の取得
if ($STATUS -eq "COMPLETED") {
    $job = GetJob $JOBNAME  # Transcribe job を取得
    $url = $job.TranscriptionJob.Transcript.TranscriptFileUri    # Transcribe の文字起こし結果保存先 (s3) 
    $transcript_json_file = [System.IO.Path]::GetFileName($url)  # 文字起こし結果のファイル名を取得
    $tmp_transcrip_json_file = "_tmp"+$transcript_json_file      # 文字起こし結果の一時ファイル
    $outfile = [System.IO.Path]::GetFileNameWithoutExtension($url) + ".txt"  # ローカル出力先ファイル

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