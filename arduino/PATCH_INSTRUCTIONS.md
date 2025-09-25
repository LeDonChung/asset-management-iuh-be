# Hướng Dẫn Patch Code - Scan 20 Giây

## Các Thay Đổi Cần Thực Hiện

### 1. Thêm Biến (Sau dòng 39)

Thêm vào sau dòng `bool isAlerting = false;`:

```cpp
// Alert timing
unsigned long alertStartTime = 0;
bool alertActive = false;
```

### 2. Sửa Hàm `sendStartAlert()` (Khoảng dòng 301)

Thay thế toàn bộ hàm:

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

### 3. Sửa Hàm `onWarningResponse()` (Khoảng dòng 636)

Thay thế toàn bộ hàm:

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

### 4. Sửa Hàm `handlerAlertWarningRealtime()` (Khoảng dòng 800)

Thay thế toàn bộ hàm:

```cpp
void handlerAlertWarningRealtime() {
  static byte response[512];
  static int responseIndex = 0;
  static String epcArray[20]; // Tăng kích thước array
  static int epcCount = 0; 

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

## Kết Quả

Sau khi áp dụng các thay đổi này:

1. **Scan 20 giây**: Alert sẽ tự động kết thúc sau 20 giây
2. **Gửi nhiều thẻ**: Mỗi thẻ được gửi ngay khi scan được
3. **Validation cuối**: Chỉ xử lý phản hồi khi alert kết thúc
4. **Tránh trùng lặp**: Không gửi lại thẻ đã scan
5. **Linh hoạt**: Server có thể trả về true/false bất kỳ lúc nào

## Test

1. Upload code đã sửa lên ESP1
2. Di chuyển trước PIR sensor của ESP2
3. Quét nhiều thẻ RFID trong 20 giây
4. Kiểm tra Serial Monitor để xem:
   - Các thẻ được gửi realtime
   - Alert kết thúc sau 20 giây
   - Phản hồi cuối cùng từ server
