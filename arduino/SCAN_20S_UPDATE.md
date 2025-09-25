# Hướng Dẫn Sửa Đổi Code - Scan 20 Giây

## Thay Đổi Cần Thiết

### 1. Thêm Biến Theo Dõi Thời Gian Alert

Thêm vào phần biến toàn cục (sau dòng 39):

```cpp
// Alert timing
unsigned long alertStartTime = 0;
bool alertActive = false;
```

### 2. Sửa Đổi Hàm `sendStartAlert()`

Thay thế hàm `sendStartAlert()` hiện tại:

```cpp
void sendStartAlert() {
  isAlert = true;
  isScan = false;
  isBuzzer = false;
  alertActive = true;
  alertStartTime = millis();
  
  // Thiết lập WiFi và WebSocket khi bắt đầu alert
  if (strlen(ssid) > 0 && strlen(password) > 0 && strlen(server) > 0 && port > 0) {
    setupWifi();
    setupWebSocket();
  }
  
  Serial.println("🚨 Alert mode bắt đầu - Scan trong 20 giây");
}
```

### 3. Sửa Đổi Hàm `onWarningResponse()`

Thay thế hàm `onWarningResponse()` hiện tại:

```cpp
void onWarningResponse(const char * payload, size_t length) {
  Serial.printf("Received warningResponse: %s\n", payload);
  
  // Chỉ xử lý phản hồi cuối cùng khi alert kết thúc
  if (!alertActive) {
    if (strcmp(payload, "true") == 0) {
      isBuzzer = false;
      Serial.println("✅ Tag hợp lệ - Tắt còi!");
      sendToESP2("rfid_ok");
    } else {
      isBuzzer = true;
      Serial.println("❌ Tag không hợp lệ - Bật còi và yêu cầu chụp ảnh!");
      sendToESP2("take_photo");
    }
  }
}
```

### 4. Sửa Đổi Hàm `handlerAlertWarningRealtime()`

Thay thế toàn bộ hàm `handlerAlertWarningRealtime()`:

```cpp
void handlerAlertWarningRealtime() {
  static byte response[512];
  static int responseIndex = 0;
  static String epcArray[20]; // Tăng kích thước array
  static int epcCount = 0; 
  static unsigned long lastSendTime = 0;

  if (isAlert && alertActive) {
    // Kiểm tra thời gian alert
    unsigned long currentTime = millis();
    if (currentTime - alertStartTime >= ALERT_DURATION) {
      // Kết thúc alert sau 20 giây
      alertActive = false;
      isAlert = false;
      endScan();
      
      // Gửi tất cả tags đã scan để validation cuối cùng
      if (epcCount > 0) {
        String allTags = "[";
        for (int i = 0; i < epcCount; i++) {
          allTags += "\"" + epcArray[i] + "\"";
          if (i < epcCount - 1) allTags += ",";
        }
        allTags += "]";
        
        String finalPayload = "{\"tags\":" + allTags + ",\"final\":true}";
        Serial.println("📤 Gửi tất cả tags cuối cùng: " + finalPayload);
        webSocket.emit("warning", finalPayload.c_str());
      }
      
      Serial.println("⏰ Alert kết thúc sau 20 giây");
      return;
    }
    
    // Start scanning
    startScan();
    while (RFID.available()) {
      byte b = RFID.read();
      if (responseIndex < sizeof(response)) {
        response[responseIndex++] = b;
      } else {
        Serial.println("⚠️ Buffer overflow, resetting...");
        responseIndex = 0;
        continue;
      }

      if (responseIndex >= 2 && responseIndex >= response[1] + 2) {
        if (response[0] == 0xA0 && response[3] == 0x89 && checkResponseChecksum(response, responseIndex)) {
          if (response[1] == 0x13 && epcCount < 20) { // Tăng giới hạn array
            char epcBuffer[25] = {0};
            int index = 0;
            for (int i = 7; i < 19; i++) {
              sprintf(&epcBuffer[index], "%02X", response[i]);
              index += 2;
            }

            Serial.print("\nEPC: ");
            Serial.println(epcBuffer);
            
            // Kiểm tra tag đã tồn tại chưa
            bool tagExists = false;
            for (int i = 0; i < epcCount; i++) {
              if (epcArray[i] == String(epcBuffer)) {
                tagExists = true;
                break;
              }
            }
            
            // Chỉ thêm tag mới
            if (!tagExists) {
              epcArray[epcCount++] = String(epcBuffer);
              
              // Gửi từng tag ngay lập tức lên WebSocket
              String rawPayload = "\"" + String(epcBuffer) + "\"";
              Serial.println("📤 Sending WebSocket warning: " + rawPayload);
              webSocket.emit("warning", rawPayload.c_str());
            }
          }
        }
        responseIndex = 0;
      }
    }

    endScan();
    delay(500);
  }
}
```

## Luồng Hoạt Động Mới

### 1. Khi ESP2 gửi "scan_rfid"
- ESP1 bật alert mode
- Bắt đầu scan liên tục trong 20 giây
- `alertActive = true`

### 2. Trong 20 giây scan
- Mỗi khi scan được tag mới → Gửi ngay lập tức qua WebSocket "warning"
- Lưu tất cả tags vào array (tránh trùng lặp)
- Tiếp tục scan cho đến hết 20 giây

### 3. Sau 20 giây
- `alertActive = false`
- Gửi tất cả tags đã scan qua WebSocket "warning" với flag `"final": true`
- Chờ phản hồi từ server

### 4. Xử lý phản hồi
- Chỉ xử lý phản hồi khi `alertActive = false`
- `true` → Gửi "rfid_ok" về ESP2
- `false` → Bật còi + Gửi "take_photo" về ESP2

## Lợi Ích

1. **Scan liên tục**: Có thể bắt được nhiều thẻ trong 20 giây
2. **Gửi realtime**: Mỗi thẻ được gửi ngay khi scan được
3. **Validation cuối**: Chỉ xử lý kết quả cuối cùng
4. **Tránh trùng lặp**: Không gửi lại thẻ đã scan
5. **Linh hoạt**: Server có thể trả về true/false bất kỳ lúc nào
