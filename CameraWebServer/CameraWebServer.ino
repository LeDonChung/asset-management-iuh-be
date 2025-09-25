
#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <SocketIoClient.h>
#include <ArduinoJson.h>

// =================== CẤU HÌNH =====================
#define PIR_PIN 15              // Chân PIR
#define COOLDOWN 10000          // 10 giây cooldown
#define WIFI_SSID "Ruby tu C13 den C25"
#define WIFI_PASS "VietnhatC136868"


// ✅ WebSocket Configuration (thay thế BLE)
const char* socketServer = "192.168.1.34";
const int socketPort = 3001;
SocketIoClient webSocket;

// API
const char* host = "192.168.1.34";   // Server IP
const int port = 3000;               // Server port
const char* url = "/api/v1/files/upload/image";

// Camera config (ESP32-CAM AI-Thinker)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

unsigned long lastCapture = 0;

// ✅ WebSocket connection state
bool socketConnected = false;
unsigned long lastSocketReconnect = 0;
const unsigned long SOCKET_RECONNECT_INTERVAL = 5000;

// ✅ Device identification
String deviceId = "ESP32_CAM_01";
String deviceReceive = "ESP32_RFID_01";
String deviceType = "camera";

// =================== HÀM =====================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Đang kết nối WiFi");
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected");
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
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
  config.jpeg_quality = 30;
  config.fb_count = 1;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("❌ Camera init failed!");
    return false;
  }
  return true;
}


void uploadImage(camera_fb_t * fb) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi không kết nối, đang thử kết nối lại...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("❌ Không thể kết nối WiFi!");
      return;
    }
  }

  Serial.println("📤 Bắt đầu upload ảnh...");
  Serial.printf("Server: %s:%d\n", host, port);
  Serial.printf("URL: %s\n", url);
  Serial.printf("Image size: %d bytes\n", fb->len);

  WiFiClient client;
  client.setTimeout(10000); // 10 giây timeout
  
  Serial.println("🔗 Đang kết nối đến server...");
  if (!client.connect(host, port)) {
    Serial.println("❌ Kết nối server thất bại!");
    Serial.printf("WiFi status: %d\n", WiFi.status());
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
    return;
  }
  Serial.println("✅ Đã kết nối server!");

  String boundary = "----ESP32Boundary";
  String head = "--" + boundary + "\r\n"
                "Content-Disposition: form-data; name=\"file\"; filename=\"capture.jpg\"\r\n"
                "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  size_t contentLength = head.length() + fb->len + tail.length();

  // Gửi HTTP header
  Serial.println("📤 Gửi HTTP header...");
  client.printf("POST %s HTTP/1.1\r\n", url);
  client.printf("Host: %s\r\n", host);
  client.println("User-Agent: ESP32-CAM");
  client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
  client.printf("Content-Length: %d\r\n", contentLength);
  client.println("Connection: close\r\n");

  // Gửi body: head + ảnh + tail
  Serial.println("📤 Gửi ảnh...");
  client.print(head);
  client.write(fb->buf, fb->len);
  client.print(tail);
  client.flush(); // Quan trọng: đảm bảo dữ liệu được gửi

  // Đọc phản hồi server
  Serial.println("📥 Đang đọc phản hồi server...");
  unsigned long startTime = millis();
  while (client.connected() && millis() - startTime < 5000) {
    if (client.available()) {
      String line = client.readStringUntil('\n');
      if (line == "\r") break; // hết header
    }
  }
  
  String response = "";
  while (client.available()) {
    response += client.readString();
  }
  
  Serial.println("📩 Phản hồi server:");
  Serial.println(response);

  client.stop();
  Serial.println("✅ Upload hoàn thành!");
}


void captureAndUploadImage() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Lỗi chụp ảnh");
    return;
  }
  uploadImage(fb);
  esp_camera_fb_return(fb);
}


// ✅ WebSocket Event Handlers
void onSocketConnect(const char * payload, size_t length) {
  Serial.println("🔵 WebSocket connected!");
  socketConnected = true;
  
  // Đăng ký device với server
  DynamicJsonDocument doc(256);
  doc["deviceId"] = deviceId;
  doc["deviceType"] = deviceType;
  
  String registerData;
  serializeJson(doc, registerData);
  webSocket.emit("register", registerData.c_str());
  
  Serial.println("📝 Device registered as ESP32 Camera");
}

void onSocketDisconnect(const char * payload, size_t length) {
  Serial.println("⚪ WebSocket disconnected!");
  socketConnected = false;
}

// ✅ Nhận lệnh chụp ảnh từ Arduino qua server
void onCaptureCommand(const char * payload, size_t length) {
  Serial.printf("📥 Nhận lệnh chụp ảnh: %s\n", payload);
  
  // Parse JSON nếu cần
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (!error) {
    String deviceReceive = doc["deviceId"];
    
    if (deviceId == deviceReceive) {
      captureAndUploadImage();
    }
  }
}

// ✅ Setup WebSocket connection
void setupWebSocket() {
  Serial.println("🔗 Thiết lập WebSocket connection...");
  
  webSocket.on("connect", onSocketConnect);
  webSocket.on("disconnect", onSocketDisconnect);
  webSocket.on("receive_request_capture", onCaptureCommand);
  
  webSocket.begin(socketServer, socketPort);
  Serial.printf("📡 WebSocket connecting to %s:%d\n", socketServer, socketPort);
}

// ✅ Check and reconnect WebSocket if needed
void checkWebSocketConnection() {
  if (!socketConnected && millis() - lastSocketReconnect > SOCKET_RECONNECT_INTERVAL) {
    Serial.println("🔄 Attempting WebSocket reconnection...");
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
    
    Serial.println("📤 Đã gửi tín hiệu motion qua WebSocket");
  } else {
    Serial.println("❌ WebSocket chưa kết nối, không thể gửi tín hiệu");
  }
}

// =================== MAIN =====================

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);

  connectWiFi();

  if (!initCamera()) {
    Serial.println("❌ Lỗi camera");
    while (true) delay(100);
  }

  // ✅ Khởi tạo WebSocket thay vì BLE
  setupWebSocket();

  Serial.println("✅ Hệ thống sẵn sàng");
}


void loop() {
  // ✅ Process WebSocket events
  webSocket.loop();
  
  int pirValue = digitalRead(PIR_PIN);
  
  Serial.printf("PIR = %d ", pirValue);

  // ✅ Chỉ gửi motion signal, không tự chụp ảnh
  if (pirValue == HIGH && millis() - lastCapture > COOLDOWN) {
    Serial.println("� Phát hiện chuyển động -> Gửi motion signal!");
    lastCapture = millis();
    
    // Gửi tín hiệu motion qua WebSocket đến Arduino (để bật isMotionScan)
    sendCommandStartMotionScan();
    
    Serial.println("⏳ Chờ lệnh chụp ảnh từ server...");
  }

  // ✅ Check and reconnect WebSocket if needed
  checkWebSocketConnection();

  delay(500);
}
