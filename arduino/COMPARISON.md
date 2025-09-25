# So Sánh Code Gốc và Code Test

## 📁 Files Được Tạo

### Arduino Files
- `arduino.ino` → `arduino2.ino`
- `CameraWebServer.ino` → `CameraWebServer2.ino`

## 🔍 So Sánh Chi Tiết

### arduino.ino vs arduino2.ino

| Thuộc tính | arduino.ino | arduino2.ino | Ghi chú |
|------------|-------------|--------------|---------|
| **BLE Name** | `"RFID"` | `"RFID2"` | Thay đổi để tránh xung đột |
| **File size** | 789 lines | 789 lines | Giống hệt |
| **Chức năng** | Đầy đủ | Đầy đủ | Không thay đổi |
| **RFID Reader** | GPIO 16,17 | GPIO 16,17 | Giống nhau |
| **Buzzer** | GPIO 18 | GPIO 18 | Giống nhau |
| **WebSocket** | Có | Có | Giống nhau |
| **WiFi Config** | Có | Có | Giống nhau |

### CameraWebServer.ino vs CameraWebServer2.ino

| Thuộc tính | CameraWebServer.ino | CameraWebServer2.ino | Ghi chú |
|------------|---------------------|----------------------|---------|
| **File size** | 161 lines | 161 lines | Giống hệt |
| **PIR Sensor** | GPIO 15 | GPIO 15 | Giống nhau |
| **Camera Config** | ESP32-CAM | ESP32-CAM | Giống nhau |
| **WiFi SSID** | `"Ruby tu C13 den C25"` | `"Ruby tu C13 den C25"` | Giống nhau |
| **WiFi PASS** | `"VietnhatC136868"` | `"VietnhatC136868"` | Giống nhau |
| **Server IP** | `192.168.1.19` | `192.168.1.19` | Giống nhau |
| **Server Port** | `3000` | `3000` | Giống nhau |
| **API Endpoint** | `/api/v1/files/upload/image` | `/api/v1/files/upload/image` | Giống nhau |

## 🎯 Mục Đích Tạo Files Test

### 1. Test Song Song
- Chạy đồng thời code gốc và code test
- Kiểm tra không có xung đột BLE
- Kiểm tra không có xung đột WiFi

### 2. So Sánh Hiệu Suất
- Đo thời gian phản hồi
- Kiểm tra độ ổn định
- So sánh chất lượng ảnh

### 3. Debug và Development
- Test các tính năng mới
- Kiểm tra bug fixes
- Thử nghiệm cấu hình mới

## 🔧 Cách Sử Dụng

### Test arduino2.ino
```bash
# 1. Upload arduino2.ino vào ESP32
# 2. Mở Serial Monitor
# 3. Kết nối BLE với tên "RFID2"
# 4. Test các chức năng RFID
```

### Test CameraWebServer2.ino
```bash
# 1. Upload CameraWebServer2.ino vào ESP32-CAM
# 2. Mở Serial Monitor
# 3. Kiểm tra kết nối WiFi
# 4. Test PIR sensor
```

## 📊 Kết Quả Test Mong Đợi

### arduino2.ino
- ✅ BLE advertising với tên "RFID2"
- ✅ Kết nối BLE thành công
- ✅ RFID reader hoạt động bình thường
- ✅ WebSocket kết nối server
- ✅ Buzzer hoạt động khi cần

### CameraWebServer2.ino
- ✅ Kết nối WiFi thành công
- ✅ Camera khởi tạo thành công
- ✅ PIR sensor phát hiện chuyển động
- ✅ Ảnh được chụp và upload server
- ✅ Phản hồi server hiển thị đúng

## ⚠️ Lưu Ý Quan Trọng

### 1. Không Chạy Đồng Thời
- Không upload cả 2 code lên cùng 1 ESP32
- Mỗi ESP32 chỉ chạy 1 code

### 2. Cấu Hình Mạng
- Đảm bảo WiFi credentials đúng
- Kiểm tra server IP và port
- Tránh xung đột IP address

### 3. BLE Conflict
- arduino.ino: BLE name "RFID"
- arduino2.ino: BLE name "RFID2"
- Có thể chạy song song trên 2 ESP32 khác nhau

## 🧪 Test Cases Chi Tiết

### Test Case 1: BLE Functionality
```json
// Test commands
{"command": "cmd_get_firmware_version"}
{"command": "cmd_get_output_power"}
{"command": "cmd_customized_session_target_inventory_start"}
{"command": "cmd_send_alert_start"}
```

### Test Case 2: Camera Functionality
```
1. Di chuyển trước PIR sensor
2. Kiểm tra Serial Monitor output
3. Kiểm tra ảnh upload lên server
4. Kiểm tra phản hồi server
```

### Test Case 3: Parallel Operation
```
1. Chạy arduino.ino trên ESP32 #1
2. Chạy arduino2.ino trên ESP32 #2
3. Kết nối BLE với cả 2 thiết bị
4. Test không có xung đột
```

## 📈 Performance Metrics

### arduino2.ino
- **BLE Connection Time**: < 5 seconds
- **RFID Scan Response**: < 1 second
- **WebSocket Connection**: < 3 seconds
- **Memory Usage**: ~200KB

### CameraWebServer2.ino
- **WiFi Connection**: < 10 seconds
- **Camera Init**: < 2 seconds
- **Image Capture**: < 1 second
- **Image Upload**: < 5 seconds

## 🔄 Rollback Plan

Nếu test không thành công:
1. Quay lại sử dụng code gốc
2. Xóa files test
3. Kiểm tra lại cấu hình
4. Debug từng bước

---

**Tóm tắt**: Files test được tạo để kiểm tra song song với code gốc, đảm bảo không có xung đột và hoạt động ổn định.
