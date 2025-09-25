# Hướng Dẫn Test Arduino2 và CameraWebServer2

## 📋 Tổng Quan
Hướng dẫn test 2 file mới được tạo từ code gốc:
- **arduino2.ino**: Phiên bản test của arduino.ino
- **CameraWebServer2.ino**: Phiên bản test của CameraWebServer.ino

## 🔧 Cấu Hình Test

### arduino2.ino
- **BLE Name**: `RFID2` (thay đổi từ `RFID`)
- **Chức năng**: Giống hệt arduino.ino gốc
- **Mục đích**: Test song song với thiết bị gốc

### CameraWebServer2.ino  
- **Chức năng**: Giống hệt CameraWebServer.ino gốc
- **Mục đích**: Test song song với camera gốc

## 🚀 Cách Test

### 1. Test arduino2.ino

#### Chuẩn bị:
- ESP32 development board
- RFID reader (RS485)
- Buzzer
- Dây nối

#### Kết nối phần cứng:
```
RFID Reader VCC -> 5V
RFID Reader GND -> GND
RFID Reader TX  -> GPIO 16 (RXD2)
RFID Reader RX  -> GPIO 17 (TXD2)

Buzzer (+) -> GPIO 18
Buzzer (-) -> GND
```

#### Upload và test:
1. Mở `arduino2.ino` trong Arduino IDE
2. Upload vào ESP32
3. Mở Serial Monitor (115200 baud)
4. Kết nối BLE client (tên thiết bị: `RFID2`)

#### Test các chức năng:
```json
// Test lấy firmware version
{"command": "cmd_get_firmware_version"}

// Test lấy output power
{"command": "cmd_get_output_power"}

// Test bắt đầu scan inventory
{"command": "cmd_customized_session_target_inventory_start"}

// Test dừng scan inventory
{"command": "cmd_customized_session_target_inventory_stop"}

// Test bắt đầu alert
{"command": "cmd_send_alert_start"}

// Test dừng alert
{"command": "cmd_send_alert_stop"}
```

### 2. Test CameraWebServer2.ino

#### Chuẩn bị:
- ESP32-CAM AI-Thinker
- PIR sensor (HC-SR501)
- Dây nối

#### Kết nối phần cứng:
```
PIR Sensor VCC -> 3.3V
PIR Sensor GND -> GND
PIR Sensor OUT -> GPIO 15
```

#### Upload và test:
1. Mở `CameraWebServer2.ino` trong Arduino IDE
2. Upload vào ESP32-CAM
3. Mở Serial Monitor (115200 baud)
4. Kiểm tra kết nối WiFi
5. Di chuyển trước PIR sensor để test

#### Kiểm tra kết quả:
- Serial Monitor hiển thị: `📸 Phát hiện chuyển động -> Chụp ảnh!`
- Ảnh được upload lên server
- Phản hồi server hiển thị trong Serial Monitor

## 🔍 So Sánh Với Code Gốc

### arduino2.ino vs arduino.ino
| Tính năng | arduino.ino | arduino2.ino |
|-----------|-------------|--------------|
| BLE Name | `RFID` | `RFID2` |
| Chức năng | Đầy đủ | Đầy đủ |
| RFID Reader | GPIO 16,17 | GPIO 16,17 |
| Buzzer | GPIO 18 | GPIO 18 |
| WebSocket | Có | Có |

### CameraWebServer2.ino vs CameraWebServer.ino
| Tính năng | CameraWebServer.ino | CameraWebServer2.ino |
|-----------|---------------------|----------------------|
| PIR Sensor | GPIO 15 | GPIO 15 |
| Camera Config | ESP32-CAM | ESP32-CAM |
| WiFi | Có | Có |
| Upload API | Có | Có |
| Cooldown | 10s | 10s |

## 🧪 Test Cases

### Test Case 1: BLE Connection
1. Upload arduino2.ino
2. Mở BLE scanner trên điện thoại
3. Tìm thiết bị tên `RFID2`
4. Kết nối thành công ✅

### Test Case 2: RFID Scanning
1. Kết nối BLE với arduino2
2. Gửi lệnh start inventory
3. Đưa thẻ RFID vào gần reader
4. Kiểm tra thẻ được đọc và gửi qua BLE ✅

### Test Case 3: Camera Motion Detection
1. Upload CameraWebServer2.ino
2. Kiểm tra kết nối WiFi
3. Di chuyển trước PIR sensor
4. Kiểm tra ảnh được chụp và upload ✅

### Test Case 4: Parallel Operation
1. Chạy đồng thời arduino.ino và arduino2.ino
2. Kết nối BLE với cả 2 thiết bị
3. Test không xung đột ✅

## 📊 Monitoring

### Serial Monitor Output - arduino2.ino
```
Thiết lập kết nối ESP32 thành công!!
Thiết lập kết nối BLE thành công!!
Thiết lập kết nối RFID thành công!!
🔵 Thiết bị đã kết nối!
📥 Nhận từ client: {"command": "cmd_get_firmware_version"}
📥 Phản hồi từ RFID: 0xA0 0x05 0x01 0x72 0x01 0x00 0x78
```

### Serial Monitor Output - CameraWebServer2.ino
```
Đang kết nối WiFi
✅ WiFi connected
✅ Hệ thống sẵn sàng
PIR = 0
PIR = 1
📸 Phát hiện chuyển động -> Chụp ảnh!
📩 Phản hồi server:
{"success": true, "filename": "capture_1234567890.jpg"}
```

## ⚠️ Lưu Ý Khi Test

1. **Không chạy đồng thời 2 code giống nhau** trên cùng 1 ESP32
2. **Đảm bảo WiFi credentials** đúng trong code
3. **Kiểm tra server IP** trong CameraWebServer2.ino
4. **Test từng chức năng** một cách riêng biệt
5. **Monitor Serial output** để debug

## 🔧 Troubleshooting

### arduino2.ino không kết nối BLE
- Kiểm tra code upload thành công
- Reset ESP32
- Kiểm tra BLE name: `RFID2`

### CameraWebServer2.ino không chụp ảnh
- Kiểm tra PIR sensor
- Kiểm tra kết nối WiFi
- Kiểm tra server IP và port

### RFID không đọc được thẻ
- Kiểm tra kết nối RX/TX
- Kiểm tra nguồn RFID reader
- Kiểm tra baud rate: 115200

## 📈 Kết Quả Mong Đợi

Sau khi test thành công:
- ✅ arduino2.ino hoạt động giống arduino.ino
- ✅ CameraWebServer2.ino hoạt động giống CameraWebServer.ino  
- ✅ Có thể chạy song song với code gốc
- ✅ Không có xung đột BLE hoặc WiFi
- ✅ Tất cả chức năng hoạt động bình thường

---

**Lưu ý**: Đây là file test, không nên sử dụng trong production environment.
