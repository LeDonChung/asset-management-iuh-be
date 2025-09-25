#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;

#include <WiFi.h>
#include <SocketIoClient.h>

char* ssid = "ThahhTuyenn";
char* password = "12345678";

char* server = "192.168.1.34";
uint16_t port = 3001;
SocketIoClient webSocket;

#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_NAME "RFID"


#define RXD2 16
#define TXD2 17
#define BUZZER_PIN 18

// RENAME SERIAL02 TO RFID
#define RFID Serial2
uint16_t currentMTU = 517; // mặc định

// DEFAULT BAUD RATE RFID
#define BAUD_RFID 115200

// DEFAULT BAUD RATE ESP32
#define BAUD_ESP32 115200

// DEFAULT RFID(RS485) ADDRESS
#define RFID_ADDRESS 01 // 0x01

// Thêm các biến để kiểm soát tốc độ gửi
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 500; // Gửi mỗi 500ms để tăng tốc độ
static String epcArray[15]; // Tăng từ 10 lên 15 tags
static int epcCount = 0;
static bool hasNewData = false;

unsigned char CheckSum(unsigned char *uBuff, unsigned char uBuffLen)
{
  unsigned char i, uSum = 0;
  for (i = 0; i < uBuffLen; i++) {
    uSum = uSum + uBuff[i];
  }
  uSum = (~uSum) + 1;
  return uSum;
}

int readRFIDResponse(byte *buffer, int maxLen = 32, unsigned long timeout = 300) {
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
  byte cmd[] = {0xA0, 0x03, 0x01, 0x77};
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
    int power1 = resp[4]; // Giá trị 0-33 (dBm)

    bleResp = "{\"cmd\":\"cmd_get_output_power\",\"value\":" + String(power1) +
              ",\"unit\":\"dBm\",\"raw\":\"" + hexStr + "\"}";
  } else {
    bleResp = "{\"cmd\":\"cmd_get_output_power\",\"error\":\"invalid_response\",\"raw\":\"" + hexStr + "\"}";
  }

  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}
void sendFirmwareCommand() {
  byte cmd[] = {0xA0, 0x03, 0x01, 0x72};
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

void sendGetReaderTemperature () {
  byte cmd[] = {0xA0, 0x03, 0x01, 0x7B};
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
  byte cmd[] = {0xA0, 0x03, 0x01, 0x68};
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
    char idStr[13]; // 12 ký tự + null-terminator
    for (int i = 0; i < 12; i++) {
      idStr[i] = (char)resp[4 + i];
    }
    idStr[12] = '\0'; // Kết thúc chuỗi

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
volatile bool isAlert = false;

void sendStartAlert() {
  isAlert = true;
  isScan = false;
  isBuzzer = false;
  
  // Thiết lập WiFi và WebSocket khi bắt đầu alert
  if (strlen(ssid) > 0 && strlen(password) > 0 && strlen(server) > 0 && port > 0) {
    setupWifi();
    setupWebSocket();
  }
}

void sendEndAlert() {
  isAlert = false;
  isBuzzer = false;
  String bleResp = "{\"cmd\":\"cmd_send_alert_stop\",\"status\":true}";
  if (deviceConnected && pCharacteristic != NULL) {
    sendBLEJson(bleResp);
  }
}

void sendStartInventory() {
  isScan = true;
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
  byte id = (byte) strtoul(profileID.c_str(), NULL, 16);
  byte cmd[] = {0xA0, 0x04, 0x01, 0x69, id};
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
    byte result = resp[4];
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
  byte cmd[] = {0xA0, 0x03, 0x01, 0x6A};
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

  byte cmd[] = {0xA0, 0x07, 0x01, 0x76, power, power, power, power};
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
  ssid     = strdup(value["wifiName"] | "");
  password = strdup(value["wifiPassword"] | "");
  server   = strdup(value["host"] | "");
  const char* portStr = value["port"] | "0";
  port = atoi(portStr);

  Serial.println("Setting WiFi: " + String(ssid));
  Serial.println("Setting Host: " + String(server) + ":" + String(port));
  
  // Chỉ thiết lập WiFi và WebSocket khi isAlert = true
  if (isAlert) {
    setupWifi();
    setupWebSocket();
  }
}

class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("🔵 Thiết bị đã kết nối!");
  }

  void onMtuChanged(uint16_t mtu, esp_ble_gatts_cb_param_t *param) {
    currentMTU = mtu;
    Serial.print("New MTU: ");
    Serial.println(mtu);
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("⚪ Thiết bị đã ngắt kết nối.");
  }
};

class MyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String rxValue = String(pCharacteristic->getValue().c_str());

    if (rxValue.length() > 0) {
      Serial.print("📥 Nhận từ client: ");
      Serial.println(rxValue);

      // Parse JSON nhận được
      StaticJsonDocument<128> doc;
      DeserializationError error = deserializeJson(doc, rxValue);

      if (error) {
        Serial.println("❌ Lỗi parse JSON!");
        return;
      }

      String command = doc["command"];
      int value = doc["value"]; // có thể null

      // Xử lý lệnh
      if (command == "cmd_get_firmware_version") {
        sendFirmwareCommand(); // Gửi lệnh hex tới RFID
      } else if(command == "cmd_get_output_power") {
        sendGetOutputPower();
      } else if(command == "get_reader_identifier") {
        sendReaderIdentifier();
      } else if(command == "cmd_get_reader_temperature") {
        sendGetReaderTemperature();
      } else if(command == "cmd_set_output_power") {
        sendSetOutputPower(doc["value"]);
      } else if(command == "cmd_customized_session_target_inventory_start") {
        sendStartInventory();
      } else if(command == "cmd_customized_session_target_inventory_stop") {
        sendStopInventory();
      } else if(command == "cmd_set_rf_link_profile") {
        sendSetRFLinkProfile(doc["value"]);
      } else if(command == "cmd_get_rf_link_profile") {
        sendGetRFLinkProfile();
      } else if(command == "cmd_send_alert_start") {
        sendStartAlert();
      } else if(command == "cmd_send_alert_stop") {
        sendEndAlert();
      } else if(command == "cmd_send_setting_alert") {
        JsonObject value = doc["value"].as<JsonObject>();
        setupSettingAlert(value);
      }
    }
  }
};

void sendHexCommand(String cmd) {
  Serial.print("\nGửi: ");
  Serial.println(cmd);

  int len = cmd.length();
  byte buffer[64];
  int index = 0;

  char *token = strtok((char*)cmd.c_str(), " ");
  while (token != NULL && index < 64) {
    buffer[index++] = (byte)strtol(token, NULL, 16);
    token = strtok(NULL, " ");
  }

  RFID.write(buffer, index);
}



void setupBLE() {
  BLEDevice::init(BLE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ |
                      BLECharacteristic::PROPERTY_WRITE |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

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
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startAttemptTime < 10000) {
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




void onConnect(const char * payload, size_t length) {
  Serial.println("WebSocket connected!");
}

void onDisconnect(const char * payload, size_t length) {
  Serial.println("WebSocket disconnected!");
  // Attempt to reconnect
  webSocket.begin(server, port);
}
void onWarningResponse(const char * payload, size_t length) {
  Serial.printf("Received warningResponse: %s\n", payload);
  if (strcmp(payload, "true") == 0) {
    isBuzzer = false;
    Serial.println("Unexpected payload, buzzer not activated!");
  } else {
    isBuzzer = true;
    Serial.println("Buzzer activated!");
  }
}
void setupWebSocket() {
  webSocket.on("connect", onConnect);
  webSocket.on("disconnect", onDisconnect);
  webSocket.on("warningResponse", onWarningResponse);
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
}

void endScan() {
  byte cmd[] = {0xA0, 0x05, 0xFF, 0x89, 0x01, 0x00};
  byte checksum = CheckSum(cmd, 6);

  RFID.write(cmd, 6);
  RFID.write(checksum);
}
void startScan() {
  byte cmd[] = {0xA0, 0x05, 0xFF, 0x89, 0x00, 0x00};
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

bool checkResponseChecksum(byte *buff, int len) {
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

void handlerAlertWarningRealtime() {
  static byte response[512];
  static int responseIndex = 0;
  static String epcArray[10]; 
  static int epcCount = 0; 

  if (isAlert) {
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
          if (response[1] == 0x13 && epcCount < 10) { // Tag data packet, check array bounds
            char epcBuffer[25] = {0}; // 12 bytes * 2 + null
            int index = 0;
            for (int i = 7; i < 19; i++) {
              sprintf(&epcBuffer[index], "%02X", response[i]);
              index += 2;
            }

            Serial.print("\nEPC: ");
            Serial.println(epcBuffer);
            epcArray[epcCount++] = String(epcBuffer);

            String rawPayload = "\"" + String(epcBuffer) + "\"";
            Serial.println("📤 Sending WebSocket warning: " + rawPayload);
            webSocket.emit("warning", rawPayload.c_str());
 
            delay(1000);
          }
        }
        responseIndex = 0; // Reset for new packet
      }
    }

    endScan();
    delay(500);
  }
}

void loop() {
  // Chỉ gọi webSocket.loop() khi isAlert = true
  if (isAlert) {
    webSocket.loop();
  }
  
  if(isScan) {
    handlerScanInventoryRealtime();
  }
  if(isAlert) {
    handlerAlertWarningRealtime();
  }

  if (isBuzzer) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }
}