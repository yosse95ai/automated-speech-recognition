<#
.SYNOPSIS
    音声ファイルを AWS Transcribe を使用して文字起こしするスクリプト

.DESCRIPTION
    指定された音声ファイルを S3 にアップロードし、AWS Transcribe を使用して
    文字起こしを行い、結果をテキストファイルとして保存します。

.PARAMETER AWS_ACCESS_KEY_ID
    AWS アクセスキー ID

.PARAMETER AWS_SECRET_ACCESS_KEY
    AWS シークレットアクセスキー

.PARAMETER REGION
    AWS リージョン（例: ap-northeast-1）

.PARAMETER FILE_PATH
    処理する音声ファイルのパス

.EXAMPLE
    .\transcribe.ps1 -AWS_ACCESS_KEY_ID "AKIAXXXXXXXX" -AWS_SECRET_ACCESS_KEY "XXXXXXXX" -REGION "ap-northeast-1" -FILE_PATH "C:\audio\sample.mp3"
#>

Param(
    [Parameter(Mandatory=$true)]
    [string]$AWS_ACCESS_KEY_ID,
    
    [Parameter(Mandatory=$true)]
    [string]$AWS_SECRET_ACCESS_KEY,
    
    [Parameter(Mandatory=$true)]
    [string]$REGION,
    
    [Parameter(Mandatory=$true)]
    [string]$FILE_PATH
)

# 定数
$BUCKET_NAME = "s3-asr-bucket" # バケット名（必要に応じて変更）
$LANGUAGE_CODE = "ja-JP"       # 言語コード

# エラーハンドリングの設定
$ErrorActionPreference = "Stop"

function Initialize-AWSCredentials {
    <#
    .SYNOPSIS
        AWS 認証情報を環境変数に設定
    #>
    try {
        $env:AWS_ACCESS_KEY_ID = $AWS_ACCESS_KEY_ID
        $env:AWS_SECRET_ACCESS_KEY = $AWS_SECRET_ACCESS_KEY
        $env:AWS_DEFAULT_REGION = $REGION
    }
    catch {
        Write-Error "Error: AWS 認証情報の設定に失敗しました: $_"
        exit 1
    }
}

function Upload-FileToS3 {
    <#
    .SYNOPSIS
        ファイルを S3 バケットにアップロード
    .PARAMETER FilePath
        アップロードするファイルのパス
    .RETURNS
        S3 内のファイルパス
    #>
    param (
        [string]$FilePath
    )
    
    try {
        $fileName = [System.IO.Path]::GetFileName($FilePath)
        $s3Path = "s3://$BUCKET_NAME/Audio/$fileName"
        
        aws s3 cp $FilePath $s3Path | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            throw "Error: S3 へのアップロードに失敗しました。"
        }
        
        return $s3Path
    }
    catch {
        Write-Error "Error: S3 へのアップロードに失敗しました: $_"
        exit 1
    }
}

function Start-TranscriptionJob {
    <#
    .SYNOPSIS
        Transcribe ジョブを開始
    .PARAMETER MediaUri
        S3 上の音声ファイルの URI
    .RETURNS
        ジョブ名
    #>
    param (
        [string]$MediaUri
    )
    
    try {
        $timestamp = Get-Date -Format "yyyyMMddHHmmss"
        $jobName = "transcript-job-$timestamp"
        
        aws transcribe start-transcription-job `
            --region $REGION `
            --transcription-job-name $jobName `
            --media MediaFileUri=$MediaUri `
            --language-code $LANGUAGE_CODE `
            --output-bucket-name $BUCKET_NAME | Out-Null
            
        if ($LASTEXITCODE -ne 0) {
            throw "Transcribe ジョブの開始に失敗しました。"
        }
        
        return $jobName
    }
    catch {
        Write-Error "Transcribe ジョブの開始に失敗しました: $_"
        exit 1
    }
}

function Get-TranscriptionJob {
    <#
    .SYNOPSIS
        Transcribe ジョブの情報を取得
    .PARAMETER JobName
        Transcribe ジョブ名
    .RETURNS
        ジョブ情報の JSON オブジェクト
    #>
    param (
        [string]$JobName
    )
    
    try {
        $jobInfo = aws transcribe get-transcription-job --transcription-job-name $JobName | ConvertFrom-Json
        return $jobInfo
    }
    catch {
        Write-Error "ジョブ情報の取得に失敗しました: $_"
        exit 1
    }
}

function Get-TranscriptionJobStatus {
    <#
    .SYNOPSIS
        Transcribe ジョブのステータスを取得
    .PARAMETER JobName
        Transcribe ジョブ名
    .RETURNS
        ジョブステータス
    #>
    param (
        [string]$JobName
    )
    
    $jobInfo = Get-TranscriptionJob -JobName $JobName
    return $jobInfo.TranscriptionJob.TranscriptionJobStatus
}

function Wait-ForTranscriptionJobCompletion {
    <#
    .SYNOPSIS
        Transcribe ジョブの完了を待機
    .PARAMETER JobName
        Transcribe ジョブ名
    .RETURNS
        最終的なジョブステータス
    #>
    param (
        [string]$JobName
    )
    
    $status = Get-TranscriptionJobStatus -JobName $JobName
    
    while ($status -eq "IN_PROGRESS") {
        Start-Sleep -Seconds 10
        $status = Get-TranscriptionJobStatus -JobName $JobName
    }
    
    return $status
    
}

function Process-TranscriptionResult {
    <#
    .SYNOPSIS
        Transcribe の結果を処理してテキストファイルに保存
    .PARAMETER JobName
        Transcribe ジョブ名
    .RETURNS
        出力ファイルのパス
    #>
    param (
        [string]$JobName
    )
    
    try {
        $jobInfo = Get-TranscriptionJob -JobName $JobName
        $transcriptUri = $jobInfo.TranscriptionJob.Transcript.TranscriptFileUri
        
        # S3 からファイル名を抽出
        $transcriptJsonFile = [System.IO.Path]::GetFileName($transcriptUri)
        $tempJsonFile = "_tmp_$transcriptJsonFile"
        $outputTextFile = [System.IO.Path]::GetFileNameWithoutExtension($transcriptUri) + ".txt"
        
        # S3 から JSON ファイルをダウンロード
        aws s3api get-object `
            --bucket $BUCKET_NAME `
            --key $transcriptJsonFile `
            $tempJsonFile | Out-Null
            
        if ($LASTEXITCODE -ne 0) {
            throw "文字起こし結果のダウンロードに失敗しました。"
        }
        
        # JSON から文字起こしテキストを抽出してファイルに保存
        $jsonData = Get-Content -Encoding UTF8 -Path $tempJsonFile -Raw | ConvertFrom-Json
        $jsonData.results.transcripts.transcript > $outputTextFile
        
        # 一時ファイルを削除
        Remove-Item $tempJsonFile

        return $outputTextFile
    }
    catch {
        Write-Error "Error: 文字起こし結果の処理に失敗しました: $_"
        exit 1
    }
}

function Show-TranscriptionResult {
    <#
    .SYNOPSIS
        文字起こし結果を表示
    .PARAMETER FilePath
        文字起こし結果のファイルパス
    #>
    param (
        [string]$FilePath
    )
    
    try {
        Get-Content -Encoding UTF8 -Path $FilePath
    }
    catch {
        Write-Error "文字起こし結果の表示に失敗しました: $_"
    }
}

# メイン処理
try {
    # 入力ファイルの存在確認
    if (-not (Test-Path $FILE_PATH)) {
        throw "指定されたファイルが見つかりません: $FILE_PATH"
    }
    
    
    # AWS 認証情報の設定
    Initialize-AWSCredentials
    
    # S3 にファイルをアップロード
    $s3Path = Upload-FileToS3 -FilePath $FILE_PATH
    
    # Transcribe ジョブを開始
    $jobName = Start-TranscriptionJob -MediaUri $s3Path
    
    # ジョブの完了を待機
    $status = Wait-ForTranscriptionJobCompletion -JobName $jobName
    
    # 結果の処理
    if ($status -eq "COMPLETED") {
        $outputFile = Process-TranscriptionResult -JobName $jobName
        Show-TranscriptionResult -FilePath $outputFile
    }
    else {
        Write-Host "Error: 文字起こし処理が失敗しました。ステータス: $status"
        exit 1
    }
}
catch {
    Write-Error "Error: $_"
    exit 1
}
