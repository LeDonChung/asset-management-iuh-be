#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClient.h>

// =================== CẤU HÌNH =====================
#define PIR_PIN 15              // Chân PIR
#define COOLDOWN 10000          // 10 giây cooldown
#define WIFI_SSID "Ruby tu C13 den C25"
#define WIFI_PASS "VietnhatC136868"

// API
const char* host = "192.168.1.19";   // Server IP
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

// =================== HÀM =====================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Đang kết nối WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
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

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("❌ Camera init failed!");
    return false;
  }
  return true;
}

void uploadImage(camera_fb_t * fb) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  WiFiClient client;
  if (!client.connect(host, port)) {
    Serial.println("❌ Kết nối server thất bại");
    return;
  }

  String boundary = "----ESP32Boundary";
  String head = "--" + boundary + "\r\n"
                "Content-Disposition: form-data; name=\"file\"; filename=\"capture.jpg\"\r\n"
                "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  size_t contentLength = head.length() + fb->len + tail.length();

  // Gửi HTTP header
  client.printf("POST %s HTTP/1.1\r\n", url);
  client.printf("Host: %s\r\n", host);
  client.println("User-Agent: ESP32-CAM");
  client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
  client.printf("Content-Length: %d\r\n", contentLength);
  client.println("Connection: close\r\n");

  // Gửi body: head + ảnh + tail
  client.print(head);
  client.write(fb->buf, fb->len);
  client.print(tail);

  // Đọc phản hồi server
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") break; // hết header
  }
  String response = client.readString();
  Serial.println("📩 Phản hồi server:");
  Serial.println(response);

  client.stop();
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

// =================== MAIN =====================
void setup() {
  Serial.begin(115200);

  pinMode(PIR_PIN, INPUT);
  connectWiFi();

  if (!initCamera()) {
    Serial.println("❌ Lỗi camera");
    while (true) delay(100);
  }

  Serial.println("✅ Hệ thống sẵn sàng");
}

void loop() {
  int pirValue = digitalRead(PIR_PIN);
  Serial.printf("PIR = %d\n", pirValue);

  if (pirValue == HIGH && millis() - lastCapture > COOLDOWN) {
    Serial.println("📸 Phát hiện chuyển động -> Chụp ảnh!");
    lastCapture = millis();
    captureAndUploadImage();
  }

  delay(500);
}
