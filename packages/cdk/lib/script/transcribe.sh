#!/bin/bash

# コマンドパラメーター
# -a, --aws-access-key-id     : AWS アクセスキー
# -s, --aws-secret-access-key : AWS シークレットキー
# -r, --region                : AWS リージョン
# -f, --file-path             : 入力音声ファイルのパス

# 引数の解析
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
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# 必須パラメータのチェック
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$REGION" ] || [ -z "$FILE_PATH" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 --aws-access-key-id <key> --aws-secret-access-key <secret> --region <region> --file-path <path>"
  exit 1
fi

# AWS のクレデンシャル情報を環境変数に設定
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="$REGION"

# S3 へ音声ファイルアップロード
BUCKET_NAME="s3-asr-bucket" # !!CHANGE your bucket name
FILENAME=$(basename "$FILE_PATH")
S3_PATH="s3://$BUCKET_NAME/Audio/$FILENAME"

aws s3 cp "$FILE_PATH" "$S3_PATH" > /dev/null

# Transcript job の開始
TIME=$(date +"%Y%m%d%H%M")
JOBNAME="transcript-job$TIME"

aws transcribe start-transcription-job \
    --region "$REGION" \
    --transcription-job-name "$JOBNAME" \
    --media "MediaFileUri=$S3_PATH" \
    --language-code ja-JP \
    --output-bucket-name "$BUCKET_NAME" > /dev/null

# ジョブステータスを取得する関数
get_job_status() {
  local jobname="$1"
  aws transcribe get-transcription-job --transcription-job-name "$jobname" | jq -r '.TranscriptionJob.TranscriptionJobStatus'
}

# ジョブ情報を取得する関数
get_job() {
  local jobname="$1"
  aws transcribe get-transcription-job --transcription-job-name "$jobname"
}

# ジョブの完了を待つ
STATUS=$(get_job_status "$JOBNAME")

while [ "$STATUS" = "IN_PROGRESS" ]; do
  sleep 10
  STATUS=$(get_job_status "$JOBNAME")
done

# 出力結果の取得
if [ "$STATUS" = "COMPLETED" ]; then
  # Transcribe job を取得
  JOB=$(get_job "$JOBNAME")
  
  # Transcribe の文字起こし結果保存先 (s3)
  URL=$(echo "$JOB" | jq -r '.TranscriptionJob.Transcript.TranscriptFileUri')
  
  # 文字起こし結果のファイル名を取得
  TRANSCRIPT_JSON_FILE=$(basename "$URL")
  
  # 文字起こし結果の一時ファイル
  TMP_TRANSCRIPT_JSON_FILE="_tmp$TRANSCRIPT_JSON_FILE"
  
  # ローカル出力先ファイル
  OUTFILE="${TRANSCRIPT_JSON_FILE%.json}.txt"

  # S3から文字起こし結果のJSONファイルを取得
  aws s3api get-object \
    --bucket "$BUCKET_NAME" \
    --key "$TRANSCRIPT_JSON_FILE" \
    "$TMP_TRANSCRIPT_JSON_FILE" > /dev/null

  # JSONから文字起こしテキストを抽出
  jq -r '.results.transcripts[0].transcript' "$TMP_TRANSCRIPT_JSON_FILE" > "$OUTFILE"

  # 一時ファイルを削除
  rm "$TMP_TRANSCRIPT_JSON_FILE"
  
  # 結果を表示
  cat "$OUTFILE"
else
  echo "Transcribe was failed."
fi
