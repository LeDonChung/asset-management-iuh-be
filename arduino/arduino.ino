#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;

String deviceId = "ESP32_RFID_01";
String deviceReceive = "ESP32_CAM_01";
String deviceType = "rfid";

#include <WiFi.h>
#include <SocketIoClient.h>

char* ssid = "iPhone";
char* password = "12345678";

// char* server = "172.20.10.12";
// uint16_t port = 3001;
char* server = "34.61.204.169";
uint16_t port = 3001;
SocketIoClient webSocket;

#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_NAME "RFID"
String roomId = "c7246d36-d0c8-4bee-8b15-c4b136f7542c";

#define RXD2 16
#define TXD2 17
#define BUZZER_PIN 18

// RENAME SERIAL02 TO RFID
#define RFID Serial2
uint16_t currentMTU = 517;  // mặc định

// DEFAULT BAUD RATE RFID
#define BAUD_RFID 115200

// DEFAULT BAUD RATE ESP32
#define BAUD_ESP32 115200

// Thêm các biến để kiểm soát tốc độ gửi
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 1000;  // Gửi mỗi 1000ms để tăng tốc độ
static String epcArray[15];                // Tăng từ 10 lên 15 tags
static int epcCount = 0;
static bool hasNewData = false;

const unsigned long MOTION_SCAN_DURATION = 20000;

unsigned char CheckSum(unsigned char* uBuff, unsigned char uBuffLen) {
  unsigned char i, uSum = 0;
  for (i = 0; i < uBuffLen; i++) {
    uSum = uSum + uBuff[i];
  }
  uSum = (~uSum) + 1;
  return uSum;
}

int readRFIDResponse(byte* buffer, int maxLen = 32, unsigned long timeout = 300) {
  unsigned long start = millis();
  int index = 0;

  while (millis() - start < timeout) {
    while (RFID.available() && index < maxLen) {
      buffer[index++] = RFID.read();
    }
  }

  return index;
}
void sendBLEJson(const String& json) {
  int maxPayload = currentMTU - 3;
  for (int i = 0; i < json.length(); i += maxPayload) {
    String chunk = json.substring(i, i + maxPayload);
    pCharacteristic->setValue(chunk.c_str());
    pCharacteristic->notify();
    delay(100);
  }
}
void sendGetOutputPower() {
  byte cmd[] = { 0xA0, 0x03, 0x01, 0x77 };
  byte checksum = CheckSum(cmd, 4);

  RFID.write(cmd, 4);
  RFID.write(checksum);

  byte resp[16];
  int len = readRFIDResponse(resp);

  // Debug HEX chuỗi
  String hexStr = "";
  for (int i = 0; i < len; i++) {
    char hexPart[6];
    sprintf(hexPart, "0x%02X ", resp[i]);
    hexStr += hexPart;
  }

  Serial.print("📥 Phản hồi từ RFID: ");
  Serial.println(hexStr);

  // Kiểm tra phản hồi hợp lệ và lấy power antenna 1
  String bleResp;
  if (len >= 9 && resp[0] == 0xA0 && resp[3] == 0x77) {
    int power1 = resp[4];  // Giá trị 0-33 (dBm)

    bleResp = "{\"cmd\":\"cmd_get_output_power\",\"value\":" + String(power1) + ",\"unit\":\"dBm\",\"raw\":\"" + hexStr + "\"}";
  } else {
    bleResp = "{\"cmd\":\"cmd_get_output_power\",\"error\":\"invalid_response\",\"raw\":\"" + hexStr + "\"}";
  }

  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}
void sendFirmwareCommand() {
  byte cmd[] = { 0xA0, 0x03, 0x01, 0x72 };
  byte checksum = CheckSum(cmd, 4);

  RFID.write(cmd, 4);
  RFID.write(checksum);

  byte resp[16];
  int len = readRFIDResponse(resp);

  // In ra chuỗi HEX để debug
  String hexStr = "";
  for (int i = 0; i < len; i++) {
    char hexPart[6];
    sprintf(hexPart, "0x%02X ", resp[i]);
    hexStr += hexPart;
  }

  Serial.print("📥 Phản hồi từ RFID: ");
  Serial.println(hexStr);

  // Parse version nếu hợp lệ
  String bleResp;
  if (len >= 6 && resp[3] == 0x72) {
    char versionStr[10];
    sprintf(versionStr, "%d.%02d", resp[4], resp[5]);
    bleResp = "{\"cmd\":\"cmd_get_firmware_version\",\"value\":\"" + String(versionStr) + "\",\"raw\":\"" + hexStr + "\"}";
  } else {
    bleResp = "{\"cmd\":\"cmd_get_firmware_version\",\"error\":\"invalid_response\",\"raw\":\"" + hexStr + "\"}";
  }

  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}

void sendGetReaderTemperature() {
  byte cmd[] = { 0xA0, 0x03, 0x01, 0x7B };
  byte checksum = CheckSum(cmd, 4);

  RFID.write(cmd, 4);
  RFID.write(checksum);

  byte resp[16];
  int len = readRFIDResponse(resp);

  // In phản hồi dạng HEX để debug
  String hexStr = "";
  for (int i = 0; i < len; i++) {
    char hexPart[6];
    sprintf(hexPart, "0x%02X ", resp[i]);
    hexStr += hexPart;
  }

  Serial.print("📥 Phản hồi từ RFID: ");
  Serial.println(hexStr);

  String bleResp;

  // Parse nhiệt độ nếu đúng định dạng phản hồi
  if (len >= 7 && resp[0] == 0xA0 && resp[3] == 0x7B) {
    int temp = resp[5];  // resp[5] là giá trị nhiệt độ, ví dụ 0x31 = 49
    bleResp = "{\"cmd\":\"cmd_get_reader_temperature\",\"value\":" + String(temp) + ",\"unit\":\"C\",\"raw\":\"" + hexStr + "\"}";
  } else {
    bleResp = "{\"cmd\":\"cmd_get_reader_temperature\",\"error\":\"invalid_response\",\"raw\":\"" + hexStr + "\"}";
  }

  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}

void sendReaderIdentifier() {
  byte cmd[] = { 0xA0, 0x03, 0x01, 0x68 };
  byte checksum = CheckSum(cmd, 4);

  RFID.write(cmd, 4);
  RFID.write(checksum);

  byte resp[32];
  int len = readRFIDResponse(resp);

  // Debug: In phản hồi dạng HEX
  String hexStr = "";
  for (int i = 0; i < len; i++) {
    char hexPart[6];
    sprintf(hexPart, "0x%02X ", resp[i]);
    hexStr += hexPart;
  }
  Serial.print("📥 Phản hồi từ RFID: ");
  Serial.println(hexStr);

  String bleResp;

  // Kiểm tra phản hồi hợp lệ và có 12 byte ID
  if (len >= 17 && resp[0] == 0xA0 && resp[3] == 0x68) {
    char idStr[13];  // 12 ký tự + null-terminator
    for (int i = 0; i < 12; i++) {
      idStr[i] = (char)resp[4 + i];
    }
    idStr[12] = '\0';  // Kết thúc chuỗi

    bleResp = "{\"cmd\":\"get_reader_identifier\",\"value\":\"" + String(idStr) + "\",\"raw\":\"" + hexStr + "\"}";
  } else {
    bleResp = "{\"cmd\":\"get_reader_identifier\",\"error\":\"invalid_response\",\"raw\":\"" + hexStr + "\"}";
  }

  // Gửi qua BLE
  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}


volatile bool isScan = false;
volatile bool isBuzzer = false;
volatile bool isMotionScan = false;
volatile bool isAlert = true;
unsigned long motionScanStart = 0;

void sendStartAlert() {
  // Thiết lập WiFi và WebSocket khi bắt đầu alert
  if (strlen(ssid) > 0 && strlen(password) > 0 && strlen(server) > 0 && port > 0) {
    setupWifi();
    setupWebSocket();
  }
  isMotionScan = false;
  isAlert = true;
  isScan = false;
  isBuzzer = false;
  motionScanStart = millis();
  Serial.println("[ALERT] Bắt đầu chế độ cảnh báo chuyển động!");
}

void sendEndAlert() {
  isMotionScan = false;
  isAlert = false;
  isBuzzer = false;
  String bleResp = "{\"cmd\":\"cmd_send_alert_stop\",\"status\":true}";
  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
  Serial.println("[ALERT] Kết thúc chế độ cảnh báo chuyển động!");
}


void sendStartInventory() {
  isScan = true;
  isMotionScan = false;
  isAlert = false;
  isBuzzer = false;
  // Reset data khi bắt đầu scan mới
  epcCount = 0;
  hasNewData = false;
  lastSendTime = 0;
  // Clear array
  for (int i = 0; i < 15; i++) {
    epcArray[i] = "";
  }
  Serial.println("🚀 Bắt đầu scan inventory với interval " + String(SEND_INTERVAL) + "ms");
}



void sendSetRFLinkProfile(String profileID) {
  Serial.println(profileID);
  byte id = (byte)strtoul(profileID.c_str(), NULL, 16);
  byte cmd[] = { 0xA0, 0x04, 0x01, 0x69, id };
  byte checksum = CheckSum(cmd, 5);

  RFID.write(cmd, 5);
  RFID.write(checksum);

  byte resp[32];

  int len = readRFIDResponse(resp);

  // In phản hồi dạng HEX để debug
  String hexStr = "";
  for (int i = 0; i < len; i++) {
    char hexPart[6];
    sprintf(hexPart, "0x%02X ", resp[i]);
    hexStr += hexPart;
  }
  Serial.print("📥 Phản hồi từ RFID: ");
  Serial.println(hexStr);

  String bleResp;

  // Kiểm tra phản hồi hợp lệ
  if (len >= 6 && resp[0] == 0xA0 && resp[3] == 0x69) {
    bleResp = "{\"cmd\":\"cmd_set_rf_link_profile\",\"value\":\"" + profileID + "\",\"raw\":\"" + hexStr + "\"}";
  } else {
    bleResp = "{\"cmd\":\"cmd_set_rf_link_profile\",\"error\":\"invalid_response\",\"raw\":\"" + hexStr + "\"}";
  }

  // Gửi qua BLE
  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}

void sendGetRFLinkProfile() {
  byte cmd[] = { 0xA0, 0x03, 0x01, 0x6A };
  byte checksum = CheckSum(cmd, 4);

  RFID.write(cmd, 4);
  RFID.write(checksum);

  byte resp[32];
  int len = readRFIDResponse(resp);

  // In phản hồi dạng HEX để debug
  String hexStr = "";
  for (int i = 0; i < len; i++) {
    char hexPart[6];
    sprintf(hexPart, "0x%02X ", resp[i]);
    hexStr += hexPart;
  }
  Serial.print("📥 Phản hồi từ RFID: ");
  Serial.println(hexStr);

  String bleResp;

  if (len >= 6 && resp[0] == 0xA0 && resp[3] == 0x6A) {
    byte profileID = resp[4];
    String profileDesc;

    switch (profileID) {
      case 0xD0:
        profileDesc = "D0";
        break;
      case 0xD1:
        profileDesc = "D1";
        break;
    }

    // Tạo JSON response
    bleResp = "{\"cmd\":\"cmd_get_rf_link_profile\",\"value\":\"" + profileDesc + "\",\"raw\":\"" + hexStr + "\"}";
  } else {
    // Trường hợp lỗi
    bleResp = "{\"cmd\":\"cmd_get_rf_link_profile\",\"error\":\"invalid_response\",\"raw\":\"" + hexStr + "\"}";
  }

  // Gửi qua BLE
  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}


void sendSetOutputPower(byte power) {
  if (power > 33) power = 33;

  byte cmd[] = { 0xA0, 0x07, 0x01, 0x76, power, power, power, power };
  byte checksum = CheckSum(cmd, 8);

  RFID.write(cmd, 8);
  RFID.write(checksum);

  // Đọc phản hồi từ RFID
  byte resp[16];
  int len = readRFIDResponse(resp);

  // In ra HEX để debug
  String hexStr = "";
  for (int i = 0; i < len; i++) {
    char hexPart[6];
    sprintf(hexPart, "0x%02X ", resp[i]);
    hexStr += hexPart;
  }
  Serial.print("📥 Phản hồi từ RFID: ");
  Serial.println(hexStr);

  // Kiểm tra phản hồi hợp lệ
  String bleResp;
  if (len >= 6 && resp[0] == 0xA0 && resp[3] == 0x76) {
    bleResp = "{\"cmd\":\"cmd_set_output_power\",\"status\":true,\"value\":" + String(power) + ",\"raw\":\"" + hexStr + "\"}";
  } else {
    bleResp = "{\"cmd\":\"cmd_set_output_power\",\"error\":\"invalid_response\",\"raw\":\"" + hexStr + "\"}";
  }

  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}


void setupSettingAlert(JsonObject value) {
  ssid = strdup(value["wifiName"] | "");
  password = strdup(value["wifiPassword"] | "");
  server = strdup(value["host"] | "");
  const char* portStr = value["port"] | "0";
  port = atoi(portStr);

  Serial.println("Setting WiFi: " + String(ssid));
  Serial.println("Setting Host: " + String(server) + ":" + String(port));

  setupWifi();
  setupWebSocket();
}

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("🔵 Thiết bị đã kết nối!");
  }

  void onMtuChanged(uint16_t mtu, esp_ble_gatts_cb_param_t* param) {
    currentMTU = mtu;
    Serial.print("New MTU: ");
    Serial.println(mtu);
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("⚪ Thiết bị đã ngắt kết nối.");
  }
};


class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    String rxValue = String(pCharacteristic->getValue().c_str());
    if (rxValue.length() > 0) {
      Serial.print("📥 Nhận từ client: ");
      Serial.println(rxValue);
      if (isMotionScan) {
        return;
      }
      if (rxValue == "motion=1") {
        Serial.println("🔔 Nhận motion=1, bắt đầu scan RFID 20s");
        isMotionScan = true;
        motionScanStart = millis();
        return;
      }
      // ...existing JSON BLE command handling...
      StaticJsonDocument<128> doc;
      DeserializationError error = deserializeJson(doc, rxValue);
      if (error) {
        Serial.println("❌ Lỗi parse JSON!");
        return;
      }
      String command = doc["command"];
      int value = doc["value"];
      if (command == "cmd_get_firmware_version") {
        sendFirmwareCommand();
      } else if (command == "cmd_get_output_power") {
        sendGetOutputPower();
      } else if (command == "get_reader_identifier") {
        sendReaderIdentifier();
      } else if (command == "cmd_get_reader_temperature") {
        sendGetReaderTemperature();
      } else if (command == "cmd_set_output_power") {
        sendSetOutputPower(doc["value"]);
      } else if (command == "cmd_customized_session_target_inventory_start") {
        sendStartInventory();
      } else if (command == "cmd_customized_session_target_inventory_stop") {
        sendStopInventory();
      } else if (command == "cmd_set_rf_link_profile") {
        sendSetRFLinkProfile(doc["value"]);
      } else if (command == "cmd_get_rf_link_profile") {
        sendGetRFLinkProfile();
      } else if (command == "cmd_send_alert_start") {
        sendStartAlert();
      } else if (command == "cmd_send_alert_stop") {
        sendEndAlert();
      } else if (command == "cmd_send_setting_alert") {
        JsonObject value = doc["value"].as<JsonObject>();
        setupSettingAlert(value);
      }
    }
  }
};

void setupBLE() {
  BLEDevice::init(BLE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);

  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();

  pServer->getAdvertising()->start();
}

void setupWifi() {
  WiFi.begin(ssid, password);
  Serial.print("Đang kết nối tới WiFi");

  unsigned long startAttemptTime = millis();

  // Chờ trong 10 giây
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    Serial.print(".");
    delay(500);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nThiết lập kết nối Wifi thành công!!");
    Serial.print("Địa chỉ IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nKết nối WiFi thất bại. Hãy kiểm tra lại SSID và mật khẩu.");
    // Có thể thử kết nối lại, hoặc cho ESP vào chế độ AP
  }
}




void onConnect(const char* payload, size_t length) {
  Serial.println("WebSocket connected!");

  // ✅ Đăng ký device type khi kết nối
  DynamicJsonDocument doc(256);
  doc["deviceId"] = deviceId;
  doc["deviceType"] = deviceType;

  String registerData;
  serializeJson(doc, registerData);
  webSocket.emit("register", registerData.c_str());

  Serial.println("📝 Device registered as Arduino RFID Scanner");
}

void onDisconnect(const char* payload, size_t length) {
  Serial.println("WebSocket disconnected!");
  // Attempt to reconnect
  webSocket.begin(server, port);
}
void receiveCommandCheckRfidWarning(const char* payload, size_t length) {
  Serial.printf("Received warningResponse: %s\n", payload);

  // Parse JSON để lấy danh sách alertId
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload, length);

  if (!error && doc.is<JsonArray>()) {
    JsonArray alertIds = doc.as<JsonArray>();

    // Log danh sách alertId
    Serial.printf("📋 Danh sách Alert IDs (%d items): ", alertIds.size());
    for (size_t i = 0; i < alertIds.size(); i++) {
      Serial.printf("%s", alertIds[i].as<String>().c_str());
      if (i < alertIds.size() - 1) Serial.print(", ");
    }
    Serial.println();

    // Nếu có alertId thì kích hoạt buzzer và gửi yêu cầu chụp ảnh
    if (alertIds.size() > 0) {
      if (!isBuzzer) {
        isBuzzer = true;

        // ✅ Gửi yêu cầu chụp ảnh qua Socket.IO với danh sách alertId
        if (WiFi.status() == WL_CONNECTED) {
          DynamicJsonDocument captureDoc(512);
          captureDoc["deviceId"] = deviceId;
          captureDoc["deviceReceive"] = deviceReceive;
          captureDoc["alertIds"] = alertIds;

          String captureRequest;
          serializeJson(captureDoc, captureRequest);
          webSocket.emit("send_request_capture", captureRequest.c_str());

          Serial.println("📤 Gửi yêu cầu chụp ảnh với alertIds qua Socket.IO: " + captureRequest);
        } else {
          Serial.println("❌ WiFi không kết nối, không thể gửi yêu cầu chụp ảnh");
        }
      }
      Serial.println("🔔 Buzzer activated with alert IDs!");
    } else {
      isBuzzer = false;
      Serial.println("✅ No alert IDs, buzzer deactivated");
    }
  }
}

// Handler cho sự kiện startDetectScan từ Socket.IO
void receiveCommandStartMotionScan(const char* payload, size_t length) {
  // Parse JSON payload
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.printf("❌ JSON parsing failed: %s\n", error.c_str());
    return;
  }

  String deviceReceive = doc["deviceId"];
  if (deviceId == deviceReceive) {
    // ✅ Kiểm tra xem đã đang scan chưa để tránh restart
    if (isMotionScan) {
      unsigned long elapsed = millis() - motionScanStart;
      Serial.printf("⚠️ Đã đang scan motion (%lu ms), bỏ qua lệnh mới\n", elapsed);
      return;
    }

    unsigned long duration = doc["duration"] | 20000;
    isMotionScan = true;
    motionScanStart = millis();

    Serial.printf("🚀 Nhận lệnh bắt đầu motion scan từ server (duration: %lu ms)\n", duration);
  } else {
    Serial.printf("📝 Lệnh motion scan cho device khác: %s\n", deviceReceive.c_str());
  }
}

void receiveStopBuzzer(const char* payload, size_t length) {
  // Parse JSON payload
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.printf("❌ JSON parsing failed: %s\n", error.c_str());
    return;
  }

  String deviceReceive = doc["deviceId"];
  if (deviceId == deviceReceive) {
    // ✅ Kiểm tra xem đã đang scan chưa để tránh restart
    if (isBuzzer) {
      isBuzzer = false;
      Serial.printf("Stop Buzzer");
    }
  } else {
    Serial.printf("📝 Lệnh motion scan cho device khác: %s\n", deviceReceive.c_str());
  }
}


void setupWebSocket() {
  webSocket.on("connect", onConnect);
  webSocket.on("disconnect", onDisconnect);
  webSocket.on("receive_command_check_rfid_warning", receiveCommandCheckRfidWarning);
  webSocket.on("receive_command_start_motion_scan", receiveCommandStartMotionScan);
  webSocket.on("receive_stop_buzzer", receiveStopBuzzer);
  webSocket.begin(server, port);
  Serial.println("Thiết lập kết nối socket.");
}
void setupBuzzer() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
}

void setup() {
  Serial.begin(BAUD_ESP32);
  Serial.println("Thiết lập kết nối ESP32 thành công!!");

  setupBLE();
  Serial.println("Thiết lập kết nối BLE thành công!!");

  RFID.begin(BAUD_RFID, SERIAL_8N1, RXD2, TXD2);
  Serial.println("Thiết lập kết nối RFID thành công!!");

  setupBuzzer();

  isMotionScan = false;
  isScan = false;
  isAlert = false;
  if (isAlert) {
    setupWifi();
    setupWebSocket();
  }
}

void endScan() {
  byte cmd[] = { 0xA0, 0x05, 0xFF, 0x89, 0x01, 0x00 };
  byte checksum = CheckSum(cmd, 6);

  RFID.write(cmd, 6);
  RFID.write(checksum);
}
void startScan() {
  byte cmd[] = { 0xA0, 0x05, 0xFF, 0x89, 0x00, 0x00 };
  byte checksum = CheckSum(cmd, 6);

  RFID.write(cmd, 6);
  RFID.write(checksum);
}

void sendStopInventory() {
  isScan = false;
  endScan();
  String bleResp = "{\"cmd\":\"cmd_customized_session_target_inventory_stop\",\"status\":true}";
  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}

bool checkResponseChecksum(byte* buff, int len) {
  if (len < 4) return false;
  unsigned char uSum = 0;
  for (int i = 0; i < len - 1; i++) {
    uSum += buff[i];
  }
  uSum = (~uSum) + 1;
  return uSum == buff[len - 1];
}

void handlerScanInventoryRealtime() {
  static byte response[512];
  static int responseIndex = 0;

  if (isScan) {
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
          if (response[1] == 0x13 && epcCount < 10) {
            String epc = "";
            for (int i = 7; i < 19; i++) {
              char hexPart[3];
              sprintf(hexPart, "%02X", response[i]);
              epc += String(hexPart);
            }
            Serial.print("\nEPC: ");
            Serial.print(epc);

            // Kiểm tra tag đã tồn tại chưa
            bool tagExists = false;
            for (int i = 0; i < epcCount; i++) {
              if (epcArray[i] == epc) {
                tagExists = true;
                break;
              }
            }

            // Chỉ thêm tag mới
            if (!tagExists && epcCount < 15) {
              epcArray[epcCount++] = epc;
              hasNewData = true;
            }
          }
        }
        responseIndex = 0;
      }
    }

    // Gửi dữ liệu theo interval hoặc khi đầy array
    unsigned long currentTime = millis();
    bool shouldSend = false;

    // Gửi khi có dữ liệu mới và đã qua interval
    if (hasNewData && (currentTime - lastSendTime >= SEND_INTERVAL)) {
      shouldSend = true;
    }

    // Hoặc gửi khi array đầy (15 tags)
    if (epcCount >= 15) {
      shouldSend = true;
    }

    if (shouldSend && epcCount > 0) {
      String epcList = "[";
      for (int i = 0; i < epcCount; i++) {
        epcList += "\"" + epcArray[i] + "\"";
        if (i < epcCount - 1) epcList += ",";
      }
      epcList += "]";

      String bleResp = "{\"cmd\":\"cmd_customized_session_target_inventory_start\",\"tags\":" + epcList + "}";
      Serial.println("📤 Gửi BLE (" + String(epcCount) + " tags): " + bleResp);

      if (deviceConnected && pCharacteristic != NULL) {
        sendBLEJson(bleResp);
        Serial.println("✅ Đã gửi thành công " + String(epcCount) + " tags");
      } else {
        Serial.println("❌ Không thể gửi - device không kết nối");
      }

      lastSendTime = currentTime;
      hasNewData = false;

      // Reset array để tiếp tục scan tags mới
      epcCount = 0;
      for (int i = 0; i < 15; i++) {
        epcArray[i] = "";
      }
    }

    endScan();
  }
}

// 1. Tạo danh sách thẻ tag để lưu trữ các thẻ đã quét trong thời gian 20s

// 2. Hàm kiểm tra thẻ đã tồn tại trong danh sách chưa trước khi thêm

bool checkTagExists(String tag) {
  for (int i = 0; i < epcCount; i++) {
    if (epcArray[i] == tag) {
      return true;
    }
  }
  return false;
}

bool addTag(String tag) {
  if (epcCount < 15 && !checkTagExists(tag)) {
    epcArray[epcCount++] = tag;
    return true;
  }
  return false;
}

void clearTags() {
  epcCount = 0;
  for (int i = 0; i < 15; i++) {
    epcArray[i] = "";
  }
}
// void handlerMotionRealtime() {
//   static byte response[64];
//   static int responseIndex = 0;
//   static String motionRFIDs[15];
//   static int motionRFIDCount = 0;
//   startScan();
//   // Scan
//   while (RFID.available()) {
//     byte b = RFID.read();
//     if (responseIndex < sizeof(response)) {
//       response[responseIndex++] = b;
//     } else {
//       responseIndex = 0;
//       continue;
//     }
//     if (responseIndex >= 2 && responseIndex >= response[1] + 2) {
//       if (response[0] == 0xA0 && response[3] == 0x89 && checkResponseChecksum(response, responseIndex)) {
//         if (response[1] == 0x13) {
//           String epc = "";
//           for (int i = 7; i < 19; i++) {
//             char hexPart[3];
//             sprintf(hexPart, "%02X", response[i]);
//             epc += String(hexPart);
//           }
//           Serial.print("📡 RFID phát hiện: ");
//           Serial.println(epc);
//           // Thêm vào mảng nếu chưa có
//           bool tagExists = false;
//           for (int i = 0; i < motionRFIDCount; i++) {
//             if (motionRFIDs[i] == epc) {
//               tagExists = true;
//               break;
//             }
//           }
//           if (!tagExists && motionRFIDCount < 15) {
//             motionRFIDs[motionRFIDCount++] = epc;
//           }
//         }
//       }
//       responseIndex = 0;
//     }
//   }
//   endScan();
  
//   // Kiểm tra từng thẻ trong mảng motionRFIDs. Nếu từng thẻ tồn tại trong epcArray thì sẽ xóa trong motionRFIDs đi và chỉ giữ lại thẻ mới
  
//   for (int i = 0; i < motionRFIDCount; i++) {
//     if (checkTagExists(motionRFIDs[i])) {
//       for (int j = i; j < motionRFIDCount - 1; j++) {
//         motionRFIDs[j] = motionRFIDs[j + 1];
//       }
//       motionRFIDCount--;
//       i--;
//     } else {
//       addTag(motionRFIDs[i]);
//     }
//   }

//   // 3. Gửi dữ liệu lên server nếu có thẻ mới
//   // ✅ Gửi data chỉ khi có RFIDs
//   if (motionRFIDCount > 0) {
//     // Thực hiện hành động khi phát hiện RFID
//     String rfidList = "[";
//     for (int i = 0; i < motionRFIDCount; i++) {
//       rfidList += "\"" + motionRFIDs[i] + "\"";
//       if (i < motionRFIDCount - 1) rfidList += ",";
//     }
//     rfidList += "]";

//     // Gửi scan result lên server
//     if (WiFi.status() == WL_CONNECTED) {
//       // Tạo object với format mới: { rfids: [], roomId: "" }
//       DynamicJsonDocument warningDoc(512);
//       JsonArray rfidsArray = warningDoc.createNestedArray("rfids");
//       for (int i = 0; i < motionRFIDCount; i++) {
//         rfidsArray.add(motionRFIDs[i]);
//       }
//       warningDoc["roomId"] = roomId;
//       warningDoc["deviceId"] = deviceId;

//       String warningJson;
//       serializeJson(warningDoc, warningJson);
//       webSocket.emit("send_command_check_rfid_warning", warningJson.c_str());

//       Serial.println("📤 Gửi warning (" + String(motionRFIDCount) + " RFIDs): " + warningJson);
//       // 3. Lưu trữ các thẻ đã quét vào mảng tạm thời
//       for (int i = 0; i < motionRFIDCount; i++) {
//         addTag(motionRFIDs[i]);
//       }
//     } else {
//       Serial.println("❌ WiFi disconnected, không thể gửi warning");
//     }
//   } else {
//     Serial.println("🔍 Scan hoàn thành - không phát hiện RFID nào");
//   }
  
//   // ✅ LUÔN reset tags sau mỗi lần scan, bất kể có data hay không
//   motionRFIDCount = 0;
//   for (int i = 0; i < 15; i++) {
//     motionRFIDs[i] = "";
//   }
// }
void handlerMotionRealtime() {
  static byte response[64];
  static int responseIndex = 0;
  static String motionRFIDs[15];
  static int motionRFIDCount = 0;
  
  startScan();
  
  // Scan RFID tags
  while (RFID.available()) {
    byte b = RFID.read();
    if (responseIndex < sizeof(response)) {
      response[responseIndex++] = b;
    } else {
      responseIndex = 0;
      continue;
    }
    
    if (responseIndex >= 2 && responseIndex >= response[1] + 2) {
      if (response[0] == 0xA0 && response[3] == 0x89 && checkResponseChecksum(response, responseIndex)) {
        if (response[1] == 0x13) {
          String epc = "";
          for (int i = 7; i < 19; i++) {
            char hexPart[3];
            sprintf(hexPart, "%02X", response[i]);
            epc += String(hexPart);
          }
          Serial.print("📡 RFID phát hiện: ");
          Serial.println(epc);
          
          // Thêm vào mảng tạm nếu chưa có
          bool tagExists = false;
          for (int i = 0; i < motionRFIDCount; i++) {
            if (motionRFIDs[i] == epc) {
              tagExists = true;
              break;
            }
          }
          if (!tagExists && motionRFIDCount < 15) {
            motionRFIDs[motionRFIDCount++] = epc;
          }
        }
      }
      responseIndex = 0;
    }
  }
  endScan();
  
  // Tạo danh sách chỉ chứa thẻ mới (chưa được gửi trước đó)
  String newRFIDs[15];
  int newRFIDCount = 0;
  
  for (int i = 0; i < motionRFIDCount; i++) {
    if (!checkTagExists(motionRFIDs[i]) && newRFIDCount < 15) {
      newRFIDs[newRFIDCount++] = motionRFIDs[i];
      // Thêm vào danh sách đã gửi để tránh gửi lại
      addTag(motionRFIDs[i]);
    }
  }

  // Gửi dữ liệu lên server chỉ khi có thẻ mới
  if (newRFIDCount > 0) {
    if (WiFi.status() == WL_CONNECTED) {
      DynamicJsonDocument warningDoc(512);
      JsonArray rfidsArray = warningDoc.createNestedArray("rfids");
      for (int i = 0; i < newRFIDCount; i++) {
        rfidsArray.add(newRFIDs[i]);
      }
      warningDoc["roomId"] = roomId;
      warningDoc["deviceId"] = deviceId;

      String warningJson;
      serializeJson(warningDoc, warningJson);
      webSocket.emit("send_command_check_rfid_warning", warningJson.c_str());

      Serial.println("📤 Gửi warning (" + String(newRFIDCount) + " thẻ mới): " + warningJson);
    } else {
      Serial.println("❌ WiFi disconnected, không thể gửi warning");
    }
  } else {
    Serial.println("🔍 Scan hoàn thành - không có thẻ mới");
  }
  
  // Reset mảng tạm thời
  motionRFIDCount = 0;
  for (int i = 0; i < 15; i++) {
    motionRFIDs[i] = "";
  }
}
void loop() {
  if (isAlert) {
    webSocket.loop();
  }
  // Xử lý scan RFID 20s khi nhận motion=1 (alert motion)
  if (isAlert && isMotionScan) {
    // Đảm bảo không conflict với scan inventory
    if (isScan) {
      isScan = false;
    }
    
    // ✅ Kiểm tra thời gian 20s
    if (millis() - motionScanStart >= MOTION_SCAN_DURATION) {
      // Kết thúc motion scan sau 20s
      isMotionScan = false;
      clearTags();
      Serial.println("⏰ Kết thúc motion scan sau 20s");
    } else {
      // ✅ Non-blocking timing cho interval 1s giữa các lần scan
      static unsigned long lastMotionScanTime = 0;
      if (millis() - lastMotionScanTime >= 1000) {  // 1 giây interval
        handlerMotionRealtime();
        lastMotionScanTime = millis();
      }
    }
  }

  if (isScan && !isMotionScan) {
    handlerScanInventoryRealtime();
  }

  if (isBuzzer) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }
}