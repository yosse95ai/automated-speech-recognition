#!/bin/bash

# 音声ファイルを AWS Transcribe で文字起こしし、その結果を Dify API に送信するスクリプト
#
# 使用方法:
#   ./main.sh \
#     --aws-access-key-id <key> \
#     --aws-secret-access-key <secret> \
#     --region <region> \
#     --file-path <path> \
#     --s3 <bucket-name> \
#     --dify-api-key <api-key>

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
            -b|--s3)
                S3="$2"
                shift 2
                ;;
            -d|--dify-api-key)
                DIFY_API_KEY="$2"
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
    [[ -z "$DIFY_API_KEY" ]] && missing_params+=("--dify-api-key")

    if [[ ${#missing_params[@]} -ne 0 ]]; then
        log_error "必須パラメータが不足しています: ${missing_params[*]}"
        echo "使用方法: $0 --aws-access-key-id <key> --aws-secret-access-key <secret> --region <region> --file-path <path> --s3 <bucket-name> --dify-api-key <api-key>"
        exit 1
    fi
}

# Transcribe スクリプトを呼び出す関数
call_transcribe() {
    local file_path="$1"
    
    echo "文字起こしジョブを開始します..."
    
    # transcribe.sh を呼び出して文字起こしを実行
    local transcript
    transcript=$(./transcribe.sh \
        --aws-access-key-id "$AWS_ACCESS_KEY_ID" \
        --aws-secret-access-key "$AWS_SECRET_ACCESS_KEY" \
        --region "$REGION" \
        --file-path "$file_path" \
        --s3 "$S3")
    
    echo "$transcript"
}

# メイン処理
parse_arguments "$@"
validate_input

# スクリプトのディレクトリに移動
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
cd "$SCRIPT_DIR"

# 文字起こしを実行
transcript=$(call_transcribe "$FILE_PATH")
echo "文字起こしが完了しました。"

# Dify API を呼び出し
echo "Dify API に文字起こし結果を送信しています..."
summary=$(./dify.sh --text "$transcript" --api-key "$DIFY_API_KEY")

# 結果を表示
echo "処理結果:"
echo "$summary"
