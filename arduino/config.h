#ifndef CONFIG_H
#define CONFIG_H

// =================== CẤU HÌNH CHUNG =====================
#define DEBUG_MODE true
#define SERIAL_BAUD 115200

// =================== CẤU HÌNH BLE =====================
#define BLE_DEVICE_NAME_ESP2 "ESP2_Peripheral"
#define BLE_DEVICE_NAME_ESP1 "ESP1_Central"
#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID "6e400002-b5a3-f393-e0a9-e50e24dcca9e"

// =================== CẤU HÌNH ESP2 (PERIPHERAL) =====================
#define PIR_PIN 15
#define NOTIFY_INTERVAL 1000    // 1 giây
#define ALERT_DURATION 20000    // 20 giây

// =================== CẤU HÌNH ESP1 (CENTRAL) =====================
// RFID Configuration
#define RXD2 16
#define TXD2 17
#define BUZZER_PIN 18
#define BAUD_RFID 115200
#define RFID_ADDRESS 0x01
#define SCAN_TIMEOUT 5000       // 5 giây

// WiFi Configuration
#define WIFI_SSID "ThahhTuyenn"
#define WIFI_PASSWORD "12345678"
#define SOCKET_SERVER "172.20.10.12"
#define SOCKET_PORT 3001

// =================== THẺ RFID HỢP LỆ =====================
// Có thể cấu hình từ server hoặc EEPROM
const String VALID_RFID_TAGS[] = {
  "E20000123456789012345678",
  "E20000123456789012345679", 
  "E20000123456789012345680"
};
const int VALID_TAG_COUNT = 3;

// =================== MESSAGES =====================
#define MSG_SCAN_RFID "scan RFID"
#define MSG_RESPONSE_OK "ok"
#define MSG_RESPONSE_ALERT "alert"
#define MSG_RESPONSE_TIMEOUT "timeout"

// =================== DEBUG MACROS =====================
#if DEBUG_MODE
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
#endif

#endif // CONFIG_H
