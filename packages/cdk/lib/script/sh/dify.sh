#!/bin/bash

# Dify API を使用して文字起こしテキストを処理するスクリプト
#
# 使用方法:
#   ./dify.sh --text "文字起こしテキスト" --api-key "DIFY_API_KEY"

# グローバル変数
BASE_URL="https://your-dify-domain/v1"  # Dify API のベース URL

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
            -t|--text)
                TEXT="$2"
                shift 2
                ;;
            -k|--api-key)
                API_KEY="$2"
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

    [[ -z "$TEXT" ]] && missing_params+=("--text")
    [[ -z "$API_KEY" ]] && missing_params+=("--api-key")

    if [[ ${#missing_params[@]} -ne 0 ]]; then
        log_error "必須パラメータが不足しています: ${missing_params[*]}"
        echo "使用方法: $0 --text \"文字起こしテキスト\" --api-key \"DIFY_API_KEY\""
        exit 1
    fi
}

# Dify API にリクエストを送信
call_dify_api() {
    local text="$1"
    local api_key="$2"
    
    # JSON リクエストボディの作成
    local json_data=$(cat <<EOF
{
    "inputs": {
        "recoding_txt": "$text"
    },
    "user": "abc-123"
}
EOF
)
    
    # curl コマンドで API リクエストを送信
    local response
    response=$(curl -s -X POST "$BASE_URL/workflows/run" \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        -d "$json_data")
    
    # レスポンスから出力を抽出
    local output
    output=$(echo "$response" | jq -r '.data.outputs.output')
    
    echo "$output"
}

# メイン処理
parse_arguments "$@"
validate_input

# Dify API を呼び出し
output=$(call_dify_api "$TEXT" "$API_KEY")
echo "$output"
