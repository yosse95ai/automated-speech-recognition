#!/bin/bash

# 音声ファイルを AWS Transcribe を使用して文字起こしするスクリプト
#
# 指定された音声ファイルを S3 にアップロードし、AWS Transcribe を使用して
# 文字起こしを行い、結果をテキストファイルとして保存します。
#
# 使用方法:
#   ./transcribe.sh \
#     --aws-access-key-id <key> \
#     --aws-secret-access-key <secret> \
#     --region <region> \
#     --file-path <path>

# 定数
BUCKET_NAME="s3-asr-bucket" # バケット名（必要に応じて変更）
LANGUAGE_CODE="ja-JP"       # 言語コード

# エラーが発生したら即座に終了
set -e

# ログ出力関数
log_error() {
    echo "ERROR $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

# 引数の解析
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--aws-access-key-id)
                AWS_ACCESS_KEY_ID="$2"
                shift 2
                ;;
            -s|--aws-secret-access-key)
                AWS_SECRET_ACCESS_KEY="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            -f|--file-path)
                FILE_PATH="$2"
                shift 2
                ;;
            -f|--s3)
                S3="$2"
                shift 2
                ;;
            *)
                log_error "不明なオプション: $1"
                exit 1
                ;;
        esac
    done
}

# 入力値の検証
validate_input() {
    local missing_params=()

    [[ -z "$AWS_ACCESS_KEY_ID" ]] && missing_params+=("--aws-access-key-id")
    [[ -z "$AWS_SECRET_ACCESS_KEY" ]] && missing_params+=("--aws-secret-access-key")
    [[ -z "$REGION" ]] && missing_params+=("--region")
    [[ -z "$FILE_PATH" ]] && missing_params+=("--file-path")
    [[ -z "$S3" ]] && missing_params+=("--s3")

    if [[ ${#missing_params[@]} -ne 0 ]]; then
        log_error "必須パラメータが不足しています: ${missing_params[*]}"
        echo "使用方法: $0 --aws-access-key-id <key> --aws-secret-access-key <secret> --region <region> --file-path <path> --s3 <bucket-name>"
        exit 1
    fi

    if [[ ! -f "$FILE_PATH" ]]; then
        log_error "指定されたファイルが存在しません: $FILE_PATH"
        exit 1
    fi
}

# AWS 認証情報の設定
setup_aws_credentials() {
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$REGION"
}

# S3 へのファイルアップロード
upload_to_s3() {
    local file_path="$1"
    local filename
    filename=$(basename "$file_path")
    local s3_path="s3://$BUCKET_NAME/Audio/$filename"

    if ! aws s3 cp "$file_path" "$s3_path" > /dev/null; then
        log_error "S3 へのアップロードに失敗しました"
        exit 1
    fi
    
    echo "$s3_path"
}

# Transcribe ジョブの開始
start_transcribe_job() {
    local s3_path="$1"
    local timestamp
    timestamp=$(date +"%Y%m%d%H%M%S")
    local jobname="transcript-job-$timestamp"

    if ! aws transcribe start-transcription-job \
        --region "$REGION" \
        --transcription-job-name "$jobname" \
        --media "MediaFileUri=$s3_path" \
        --language-code "$LANGUAGE_CODE" \
        --output-bucket-name "$BUCKET_NAME" > /dev/null; then
        log_error "Transcribe ジョブの開始に失敗しました"
        exit 1
    fi
    
    echo "$jobname"
}

# Transcribe ジョブの情報を取得
get_transcription_job() {
    local jobname="$1"
    aws transcribe get-transcription-job --transcription-job-name "$jobname"
}

# ジョブステータスの取得
get_job_status() {
    local jobname="$1"
    local job_info
    job_info=$(get_transcription_job "$jobname")
    echo "$job_info" | jq -r '.TranscriptionJob.TranscriptionJobStatus'
}

# ジョブの完了を待機
wait_for_job_completion() {
    local jobname="$1"
    
    local status
    status=$(get_job_status "$jobname")
    
    while [ "$status" = "IN_PROGRESS" ]; do
        sleep 10
        status=$(get_job_status "$jobname")
    done
    
    echo "$status"
}

# 文字起こし結果の処理
process_transcription_result() {
    local jobname="$1"
    
    local job_info
    job_info=$(get_transcription_job "$jobname")
    
    local transcript_uri
    transcript_uri=$(echo "$job_info" | jq -r '.TranscriptionJob.Transcript.TranscriptFileUri')
    
    # S3 からファイル名を抽出
    local transcript_json_file
    transcript_json_file=$(basename "$transcript_uri")
    
    local temp_json_file="_tmp_$transcript_json_file"
    local output_text_file="${transcript_json_file%.json}.txt"
    
    # S3 から JSON ファイルをダウンロード
    if ! aws s3api get-object \
        --bucket "$BUCKET_NAME" \
        --key "$transcript_json_file" \
        "$temp_json_file" > /dev/null; then
        log_error "文字起こし結果のダウンロードに失敗しました"
        exit 1
    fi
    
    # JSON から文字起こしテキストを抽出してファイルに保存
    jq -r '.results.transcripts[0].transcript' "$temp_json_file" > "$output_text_file"
    
    # 一時ファイルを削除
    rm "$temp_json_file"
    
    echo "$output_text_file"
}

# 文字起こし結果の表示
show_transcription_result() {
    local file_path="$1"
    
    cat "$file_path"
}

# メイン処理
parse_arguments "$@"
validate_input

# AWS 認証情報の設定
setup_aws_credentials

# S3 にファイルをアップロード
s3_path=$(upload_to_s3 "$FILE_PATH")

# Transcribe ジョブを開始
jobname=$(start_transcribe_job "$s3_path")

# ジョブの完了を待機
status=$(wait_for_job_completion "$jobname")

# 結果の処理
if [ "$status" = "COMPLETED" ]; then
    output_file=$(process_transcription_result "$jobname")
    show_transcription_result "$output_file"
else
    log_error "文字起こし処理が失敗しました。ステータス: $status"
    exit 1
fi
