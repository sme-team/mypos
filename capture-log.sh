#!/bin/bash

# Script để capture log React Native iOS ra file
# Cách dùng: ./capture-log.sh

LOG_FILE="debug.log"
PROJECT_DIR="/Users/macbook/Documents/Capstone2_Mobifone/Code/mypos"

cd "$PROJECT_DIR"

echo "📝 Đang capture log ra file: $LOG_FILE"
echo "⚠️  Thực hiện hành động gây bug trong app..."
echo "⚠️  Nhấn Ctrl+C để dừng capture khi xong"

# Xóa log cũ nếu có
rm -f "$LOG_FILE"

# Capture log ra file
npx react-native log-ios > "$LOG_FILE" 2>&1

echo "✅ Đã dừng capture log"
echo "📄 Log file: $LOG_FILE"
echo ""
echo "Xem log:"
echo "  cat $LOG_FILE"
echo ""
echo "Filter log theo module:"
echo "  grep 'customer-service' $LOG_FILE"
echo "  grep 'error' $LOG_FILE"
echo ""
echo "Copy file ra Desktop:"
echo "  cp $LOG_FILE ~/Desktop/debug-log.txt"
