
#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <SocketIoClient.h>
#include <ArduinoJson.h>
#include <base64.h>

void startCameraServer();

#define PIR_PIN 15              // Chân PIR
#define WIFI_SSID "ThahhTuyenn"
#define WIFI_PASS "12345678"


const char* socketServer = "34.61.204.169";
const int socketPort = 3001;
// const char* socketServer = "172.20.10.12";
// const int socketPort = 3001;
SocketIoClient webSocket;

// Camera config (ESP32-CAM AI-Thinker)
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

bool socketConnected = false;
unsigned long lastSocketReconnect = 0;
const unsigned long SOCKET_RECONNECT_INTERVAL = 5000;

String deviceId = "ESP32_CAM_01";
String deviceReceive = "ESP32_RFID_01";
String deviceType = "camera";
String roomId = "4ac93e15-5e46-4ea5-ba51-ad8c6a48a262";

String currentAlertIds[15];
int alertIdsCount = 0;
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Đang kết nối WiFi");

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi connection failed!");
    Serial.printf("Status: %d\n", WiFi.status());
  }
}

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera init failed!");
    return false;
  }
  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");
  return true;
}

void captureAndUploadImage() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Lỗi chụp ảnh");
    return;
  }

  // Gửi ảnh qua Socket thay vì HTTP upload trực tiếp
  sendImageViaSocket(fb);

  esp_camera_fb_return(fb);
}

// Hàm mới để gửi ảnh qua Socket
void sendImageViaSocket(camera_fb_t* fb) {
  if (!socketConnected) {
    Serial.println("❌ Socket chưa kết nối, không thể gửi ảnh");
    return;
  }

  if (alertIdsCount == 0) {
    Serial.println("❌ Không có alertIds để gửi kèm ảnh");
    return;
  }

  Serial.println("📤 Gửi ảnh qua Socket...");
  Serial.printf("Image size: %d bytes\n", fb->len);

  // Tạo JSON data với ảnh được encode base64
  DynamicJsonDocument doc(fb->len * 1.5 + 1024);  // Cấp phát đủ memory cho base64
  doc["deviceId"] = deviceId;

  // Encode ảnh thành base64
  String base64Image = base64::encode(fb->buf, fb->len);
  doc["imageData"] = base64Image;

  // Thêm alertIds
  JsonArray alertIds = doc.createNestedArray("alertIds");
  for (int i = 0; i < alertIdsCount; i++) {
    alertIds.add(currentAlertIds[i]);
    Serial.printf("Alert ID %d: %s\n", i + 1, currentAlertIds[i].c_str());
  }

  String captureData;
  serializeJson(doc, captureData);

  // Gửi qua Socket
  webSocket.emit("receive_capture", captureData.c_str());

  Serial.println("✅ Đã gửi ảnh qua Socket!");
  Serial.printf("Alerts count đã gửi: %d\n", alertIdsCount);

  // ✅ Reset alertIds ngay sau khi gửi xong
  alertIdsCount = 0;
  for (int i = 0; i < 15; i++) {
    currentAlertIds[i] = "";
  }
  Serial.println("🔄 Đã reset alertIds, sẵn sàng cho lần tiếp theo");
}


// WebSocket Event Handlers
void onSocketConnect(const char* payload, size_t length) {
  Serial.println("WebSocket connected!");
  socketConnected = true;

  // Đăng ký device với server
  DynamicJsonDocument doc(256);
  doc["deviceId"] = deviceId;
  doc["deviceType"] = deviceType;

  String registerData;
  serializeJson(doc, registerData);
  webSocket.emit("register", registerData.c_str());

  Serial.println("Device registered as ESP32 Camera");
}

void onSocketDisconnect(const char* payload, size_t length) {
  Serial.println("WebSocket disconnected!");
  socketConnected = false;
}

// Nhận lệnh chụp ảnh từ Arduino qua server
void onCaptureCommand(const char* payload, size_t length) {
  Serial.printf("Nhận lệnh chụp ảnh: %s\n", payload);

  // Parse JSON để lấy thông tin và alertIds
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload, length);

  if (!error) {
    String deviceReceive = doc["deviceId"];

    // Lưu trữ Alert IDs để cập nhật sau khi upload ảnh
    alertIdsCount = 0;  // Reset count
    if (doc.containsKey("alertIds") && doc["alertIds"].is<JsonArray>()) {
      JsonArray alertIds = doc["alertIds"];
      Serial.printf("📋 Alert IDs trong lệnh chụp ảnh (%d items): ", alertIds.size());

      // Lưu alertIds vào mảng global
      for (size_t i = 0; i < alertIds.size() && i < 10; i++) {
        currentAlertIds[alertIdsCount] = alertIds[i].as<String>();
        alertIdsCount++;
        Serial.printf("%s", alertIds[i].as<String>().c_str());
        if (i < alertIds.size() - 1) Serial.print(", ");
      }
      Serial.println();
    }

    if (deviceId == deviceReceive) {
      Serial.println("📸 Bắt đầu chụp ảnh cho cảnh báo...");
      captureAndUploadImage();
    }
  }
}

// Setup WebSocket connection
void setupWebSocket() {
  Serial.println("🔗 Thiết lập WebSocket connection...");

  webSocket.on("connect", onSocketConnect);
  webSocket.on("disconnect", onSocketDisconnect);
  webSocket.on("receive_request_capture", onCaptureCommand);

  webSocket.begin(socketServer, socketPort);
  Serial.printf("WebSocket connecting to %s:%d\n", socketServer, socketPort);
}

// Check and reconnect WebSocket if needed
void checkWebSocketConnection() {
  if (!socketConnected && millis() - lastSocketReconnect > SOCKET_RECONNECT_INTERVAL) {
    Serial.println("Attempting WebSocket reconnection...");
    webSocket.begin(socketServer, socketPort);
    lastSocketReconnect = millis();
  }
}

// Gửi yêu cầu scan của thiết bị rfid
void sendCommandStartMotionScan() {
  if (socketConnected) {
    DynamicJsonDocument doc(256);
    doc["deviceId"] = deviceId;
    doc["deviceReceive"] = deviceReceive;

    String motionData;
    serializeJson(doc, motionData);
    webSocket.emit("send_command_start_motion_scan", motionData.c_str());

    Serial.println("Đã gửi tín hiệu motion qua WebSocket");
  } else {
    Serial.println("WebSocket chưa kết nối, không thể gửi tín hiệu");
  }
}

// =================== MAIN =====================

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);

  connectWiFi();

  if (!initCamera()) {
    Serial.println("Lỗi camera");
    while (true) delay(100);
  }

  // Start camera web server
  startCameraServer();

  // Khởi tạo WebSocket thay vì BLE
  setupWebSocket();

  Serial.println("Hệ thống sẵn sàng");
  Serial.println("==================================");
  Serial.printf("📹 Camera Stream: http://%s\n", WiFi.localIP().toString().c_str());
  Serial.printf("📸 Single Capture: http://%s/capture\n", WiFi.localIP().toString().c_str());
  Serial.printf("🔗 Socket Server: %s:%d\n", socketServer, socketPort);
  Serial.println("==================================");
}


void loop() {
  // Process WebSocket events
  webSocket.loop();

  int pirValue = digitalRead(PIR_PIN);
  Serial.printf("PIR Value: %d\n", pirValue);

  if (pirValue == HIGH) {
    Serial.println("🚨 Phát hiện chuyển động -> Gửi motion signal!");

    // Gửi tín hiệu motion qua WebSocket đến Arduino (để bật isMotionScan)
    sendCommandStartMotionScan();

    Serial.println("⏳ Chờ lệnh chụp ảnh từ server...");
  }

  // Delay 200 milliseconds
  delay(200);
  // Check and reconnect WebSocket if needed
  checkWebSocketConnection();
}
