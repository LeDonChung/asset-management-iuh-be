# Hướng Dẫn Tích Hợp BLE giữa ESP1 và ESP2

## Tổng Quan
Hệ thống bao gồm 2 thiết bị ESP32:
- **ESP2 (Peripheral)**: Camera + PIR sensor, gửi tín hiệu BLE khi phát hiện chuyển động
- **ESP1 (Central)**: RFID reader, nhận tín hiệu BLE và xử lý validation

## Luồng Hoạt Động

### 1. ESP2 (CameraWebServer2.ino) - BLE Peripheral
```
PIR phát hiện chuyển động → Gửi BLE signal "scan_rfid" → Chờ phản hồi từ ESP1
```

**Chức năng chính:**
- Phát hiện chuyển động qua PIR sensor
- Gửi tín hiệu BLE "scan_rfid" đến ESP1
- Nhận phản hồi từ ESP1:
  - "rfid_ok": Tag hợp lệ
  - "take_photo": Tag không hợp lệ, chụp ảnh

### 2. ESP1 (arduino2.ino) - BLE Central + RFID Reader
```
Nhận "scan_rfid" → Bật alert mode → Scan RFID → Gửi tag đến WebSocket → Nhận kết quả validation → Gửi phản hồi về ESP2
```

**Chức năng chính:**
- Kết nối BLE với ESP2
- Nhận tín hiệu "scan_rfid" từ ESP2
- Bật chế độ alert và scan RFID
- Gửi tag đã scan đến WebSocket server để validation
- Nhận kết quả validation từ server:
  - `true`: Tag hợp lệ → Gửi "rfid_ok" về ESP2
  - `false`: Tag không hợp lệ → Bật còi + Gửi "take_photo" về ESP2

## Cấu Hình BLE

### Service và Characteristic
- **Service UUID**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- **Characteristic UUID**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- **Device Name**: `ESP2_Peripheral`

### Giao Thức Giao Tiếp

#### ESP2 → ESP1
- `"scan_rfid"`: Yêu cầu scan RFID khi phát hiện chuyển động

#### ESP1 → ESP2
- `"rfid_ok"`: Tag hợp lệ
- `"take_photo"`: Tag không hợp lệ, yêu cầu chụp ảnh

## WebSocket Events

### ESP1 gửi đến Server
- `"checkTag"`: Gửi tag để kiểm tra validation
- `"warning"`: Gửi tag khi phát hiện (legacy)

### Server gửi về ESP1
- `"tagValidationResponse"`: Kết quả validation (`true`/`false`)
- `"warningResponse"`: Phản hồi warning (legacy)

## Cài Đặt và Sử Dụng

### 1. Upload Code
- Upload `CameraWebServer2.ino` lên ESP2 (có camera)
- Upload `arduino2.ino` lên ESP1 (có RFID reader)

### 2. Kết Nối Phần Cứng
**ESP2:**
- PIR sensor: Pin 15
- Camera: Cấu hình ESP32-CAM AI-Thinker

**ESP1:**
- RFID Reader: Serial2 (RXD2, TXD2)
- Buzzer: Pin được định nghĩa trong config

### 3. Cấu Hình WiFi (ESP1)
Gửi command BLE để cấu hình:
```json
{
  "command": "cmd_send_setting_alert",
  "value": {
    "wifiName": "YourWiFiSSID",
    "wifiPassword": "YourPassword",
    "host": "192.168.1.100",
    "port": "3000"
  }
}
```

### 4. Test Hệ Thống
1. Bật cả 2 ESP32
2. ESP1 sẽ tự động scan và kết nối ESP2
3. Di chuyển trước PIR sensor của ESP2
4. ESP2 sẽ gửi tín hiệu "scan_rfid"
5. ESP1 sẽ bật alert mode và scan RFID
6. Quét thẻ RFID
7. Kiểm tra phản hồi từ server và ESP2

## Debug và Troubleshooting

### Serial Monitor Output
**ESP2:**
```
🔵 BLE Peripheral đã sẵn sàng!
🔵 ESP1 đã kết nối!
📸 Phát hiện chuyển động -> Gửi tín hiệu scan RFID!
📤 Đã gửi tín hiệu 'scan_rfid' đến ESP1
📥 Nhận từ ESP1: rfid_ok
✅ ESP1 báo RFID hợp lệ!
```

**ESP1:**
```
🔍 Bắt đầu scan tìm ESP2...
🔵 Đã kết nối đến ESP2!
📥 Nhận từ ESP2: scan_rfid
🚀 ESP2 yêu cầu scan RFID - Bắt đầu alert!
EPC: E200001234567890
📤 Gửi tag để kiểm tra: "E200001234567890"
📥 Received tagValidationResponse: true
✅ Tag hợp lệ - Tắt còi!
📤 Đã gửi đến ESP2: rfid_ok
```

### Lỗi Thường Gặp
1. **ESP1 không kết nối được ESP2**: Kiểm tra tên device "ESP2_Peripheral"
2. **Không nhận được tín hiệu BLE**: Kiểm tra UUID service/characteristic
3. **WebSocket không kết nối**: Kiểm tra cấu hình WiFi và server
4. **Tag không được validate**: Kiểm tra server có xử lý event "checkTag"

## Tùy Chỉnh

### Thay Đổi Thời Gian Cooldown
Trong `CameraWebServer2.ino`:
```cpp
#define COOLDOWN 10000  // 10 giây
```

### Thay Đổi Danh Sách Tag Hợp Lệ
Cập nhật logic validation trong WebSocket server thay vì hardcode trong ESP1.

### Thêm Chức Năng
- Thêm LED indicator cho trạng thái
- Thêm buzzer pattern khác nhau
- Thêm logging chi tiết hơn
