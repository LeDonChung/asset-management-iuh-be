# Hệ Thống BLE RFID với ESP32

## Tổng Quan
Hệ thống gồm 2 thiết bị ESP32:
- **ESP2 (Peripheral)**: Phát hiện chuyển động và gửi tín hiệu BLE
- **ESP1 (Central)**: Nhận tín hiệu, quét RFID và gửi phản hồi

## Cấu Hình Phần Cứng

### ESP2 (Peripheral)
```
PIR Sensor -> GPIO 15
```

### ESP1 (Central)  
```
RFID Reader -> GPIO 16 (RXD2), GPIO 17 (TXD2)
Buzzer -> GPIO 18
```

## Cài Đặt

### 1. ESP2_Peripheral.ino
- Upload code vào ESP2
- Kết nối PIR sensor vào GPIO 15
- ESP2 sẽ tự động phát hiện chuyển động và gửi tín hiệu BLE

### 2. ESP1_Central.ino
- Upload code vào ESP1
- Kết nối RFID reader vào GPIO 16, 17
- Kết nối buzzer vào GPIO 18
- Cấu hình WiFi và WebSocket server

## Cấu Hình

### WiFi và WebSocket (ESP1)
```cpp
char* ssid = "Your_WiFi_Name";
char* password = "Your_WiFi_Password";
char* server = "192.168.1.100";  // IP server
uint16_t port = 3001;            // Port server
```

### Thẻ RFID Hợp Lệ (ESP1)
```cpp
String validRFIDTags[] = {
  "E20000123456789012345678",  // Thẻ hợp lệ 1
  "E20000123456789012345679",  // Thẻ hợp lệ 2
  "E20000123456789012345680"   // Thẻ hợp lệ 3
};
```

## Luồng Hoạt Động

1. **ESP2 phát hiện chuyển động** → Gửi tín hiệu "scan RFID" qua BLE
2. **ESP1 nhận tín hiệu** → Bắt đầu quét RFID
3. **ESP1 tìm thấy thẻ**:
   - Nếu hợp lệ → Gửi "ok" về ESP2
   - Nếu không hợp lệ → Gửi "alert" về ESP2 + Kích hoạt còi
4. **ESP2 nhận phản hồi**:
   - "ok" → Dừng alert
   - "alert" → Tiếp tục alert
5. **ESP1 gửi kết quả** → WebSocket server

## Tính Năng

### ESP2 (Peripheral)
- ✅ Phát hiện chuyển động bằng PIR sensor
- ✅ Gửi tín hiệu BLE notify "scan RFID"
- ✅ Tự động dừng sau 20 giây
- ✅ Nhận phản hồi từ ESP1

### ESP1 (Central)
- ✅ Tự động tìm và kết nối ESP2
- ✅ Quét RFID khi nhận tín hiệu
- ✅ Xác thực thẻ RFID
- ✅ Gửi phản hồi về ESP2
- ✅ Kích hoạt còi khi thẻ không hợp lệ
- ✅ Gửi kết quả lên WebSocket server

## Debug và Monitoring

### Serial Monitor Output
```
ESP2:
🔵 ESP1 đã kết nối!
🚨 Bắt đầu alert - Phát hiện chuyển động!
📤 Gửi tín hiệu: scan RFID
✅ RFID hợp lệ - Dừng alert

ESP1:
🎯 Tìm thấy ESP2_Peripheral!
🔗 Đã kết nối tới ESP2!
📥 Nhận từ ESP2: scan RFID
🔍 Bắt đầu quét RFID...
🏷️ Tìm thấy thẻ: E20000123456789012345678
✅ Thẻ hợp lệ: E20000123456789012345678
📤 Gửi phản hồi tới ESP2: ok
```

## Troubleshooting

### ESP2 không phát hiện chuyển động
- Kiểm tra kết nối PIR sensor
- Điều chỉnh độ nhạy PIR
- Kiểm tra nguồn điện

### ESP1 không kết nối được ESP2
- Kiểm tra tên BLE device: "ESP2_Peripheral"
- Đảm bảo ESP2 đang chạy và advertising
- Kiểm tra khoảng cách giữa 2 thiết bị

### RFID không hoạt động
- Kiểm tra kết nối RX/TX
- Kiểm tra baud rate: 115200
- Kiểm tra nguồn RFID reader

### WebSocket không kết nối
- Kiểm tra WiFi connection
- Kiểm tra IP và port server
- Kiểm tra server có đang chạy không

## Tùy Chỉnh

### Thay đổi thời gian alert
```cpp
#define ALERT_DURATION 20000    // 20 giây
```

### Thay đổi interval gửi tín hiệu
```cpp
#define NOTIFY_INTERVAL 1000    // 1 giây
```

### Thêm thẻ RFID hợp lệ
```cpp
String validRFIDTags[] = {
  "E20000123456789012345678",
  "E20000123456789012345679",
  "E20000123456789012345680",
  "E20000123456789012345681"  // Thêm thẻ mới
};
int validTagCount = 4;  // Cập nhật số lượng
```

## API WebSocket

### Event: rfid_scan_result
```json
{
  "tag": "E20000123456789012345678",
  "status": "valid|invalid",
  "timestamp": 1234567890
}
```

## Lưu Ý
- Đảm bảo khoảng cách giữa ESP1 và ESP2 < 10m
- RFID reader cần nguồn điện ổn định
- PIR sensor cần thời gian warm-up (~1 phút)
- Hệ thống hoạt động tốt nhất trong môi trường ít nhiễu BLE
