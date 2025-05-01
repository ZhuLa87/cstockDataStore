#!/bin/bash

# 指定要執行的腳本路徑（使用腳本所在目錄的 run.sh）
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RUN_SCRIPT_PATH="$SCRIPT_DIR/run.sh"

# 檢查腳本是否存在
if [ ! -f "$RUN_SCRIPT_PATH" ]; then
  echo "錯誤：找不到腳本 $RUN_SCRIPT_PATH"
  exit 1
fi

# 新的 Crontab 任務內容
CRON_JOB="0 14 * * * $RUN_SCRIPT_PATH"

# 檢查 crontab 中是否已存在該任務
(crontab -l 2>/dev/null | grep -F "$RUN_SCRIPT_PATH") && echo "任務已存在，無需新增。" && exit 0

# 新增 Crontab 任務
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# 顯示目前 Crontab 內容
echo "已新增任務，當前的 Crontab 如下："
crontab -l

echo "完成！每日 14:00 會執行 $RUN_SCRIPT_PATH"
