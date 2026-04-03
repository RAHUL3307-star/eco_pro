/*
 * ╔════════════════════════════════════════════════════════════════╗
 * ║                       EcoBin v2.0                             ║
 * ║            Smart Waste Segregation System                     ║
 * ║    ESP32 + Sensors + RFID + WiFi + OLED + Buzzer + LED        ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * WHAT THIS CODE DOES:
 * 1. Detects waste dropped into the bin (IR obstacle sensor)
 * 2. Classifies waste as METAL, ORGANIC, or INORGANIC using multiple sensors
 * 3. Routes waste to the correct compartment via a servo motor
 * 4. Reads RFID cards for user identification and coin rewards
 * 5. Sends data to a cloud API for dashboard tracking
 * 6. Displays real-time status on an OLED screen (GPIO33/32)
 * 7. Monitors bin fill level with an ultrasonic sensor
 * 8. Stores events offline when WiFi is unavailable
 * 9. Buzzer feedback for events (GPIO13)
 * 10. Waste detection LED shows classification result (GPIO2)
 *
 * KEY CONCEPTS FOR EEE STUDENTS:
 * - GPIO = General Purpose Input/Output — physical pins you wire sensors to
 * - ADC  = Analog-to-Digital Converter — converts voltages (0–3.3V) to numbers (0–4095)
 * - SPI  = Serial Peripheral Interface — fast 4-wire bus (used by RFID reader)
 * - I2C  = Inter-Integrated Circuit — slower 2-wire bus (used by OLED display)
 * - PWM  = Pulse Width Modulation — varying pulse width to control servo angle
 * - millis() = non-blocking timing — returns ms since boot, never freezes the CPU
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * This is a "bare-metal" single-threaded program. There is NO operating system.
 * The loop() function runs thousands of times per second. We use a STATE MACHINE
 * pattern and millis()-based timers so everything appears to run "simultaneously"
 * without any delay() calls blocking the processor.
 *
 * HARDWARE WIRING (v2.0):
 * ┌───────────────────────────────────────────────────────┐
 * │ Device              │ ESP32 Pin  │ Type               │
 * ├───────────────────────────────────────────────────────┤
 * │ OLED SDA            │ GPIO33     │ I2C Data           │
 * │ OLED SCL            │ GPIO32     │ I2C Clock          │
 * │ Buzzer              │ GPIO13     │ Digital Output     │
 * │ Waste Detection LED │ GPIO2      │ Digital Output     │
 * │ Ultrasonic TRIG     │ GPIO5      │ Digital Output     │
 * │ Ultrasonic ECHO     │ GPIO18     │ Digital Input      │
 * │ IR Obstacle         │ GPIO19     │ Digital Input      │
 * │ Rain Sensor (AO)    │ GPIO34     │ Analog Input       │
 * │ Gas Sensor (AO)     │ GPIO35     │ Analog Input       │
 * │ Inductive Metal     │ GPIO27     │ Digital Input      │
 * │ Proximity           │ GPIO26     │ Digital Input      │
 * │ Servo Motor         │ GPIO25     │ PWM Output         │
 * │ RFID SS             │ GPIO21     │ SPI Slave Select   │
 * │ RFID SCK            │ GPIO14     │ SPI Clock          │
 * │ RFID MOSI           │ GPIO23     │ SPI Master Out     │
 * │ RFID MISO           │ GPIO22     │ SPI Master In      │
 * │ RFID RST            │ GPIO4      │ Digital Output     │
 * └───────────────────────────────────────────────────────┘
 */

// ════════════════════════════════════════
// LIBRARY INCLUDES
// ════════════════════════════════════════
// Each #include pulls in pre-written code. Like importing modules in Python.

#include <WiFi.h>             // ESP32 WiFi — connects to your router
#include <HTTPClient.h>       // Makes HTTP requests (POST/GET) to web APIs
#include <ArduinoJson.h>      // Creates and parses JSON (the data format web APIs use)
#include <SPI.h>              // SPI bus protocol — fast, used by RFID (4 wires)
#include <MFRC522.h>          // RC522 RFID reader driver library
#include <ESP32Servo.h>       // Servo motor control for ESP32 (uses LEDC peripheral)
#include <Wire.h>             // I2C bus protocol — slower, used by OLED (2 wires)
#include <Adafruit_GFX.h>     // Graphics primitives (text, shapes) for displays
#include <Adafruit_SSD1306.h> // SSD1306 OLED display driver (128×64 pixels)

// ════════════════════════════════════════
// PIN DEFINITIONS — ACTIVE CONNECTIONS
// ════════════════════════════════════════
// #define = compile-time text substitution. The compiler replaces the name with the number.
// e.g., digitalRead(IR_OBSTACLE) becomes digitalRead(19) during compilation.
// THESE ARE FINAL — changing them means rewiring the physical circuit board.

// --- Sensors ---
#define ULTRASONIC_TRIG   5    // Digital Output — sends a 10µs pulse to trigger ultrasonic burst
#define ULTRASONIC_ECHO   18   // Digital Input  — goes HIGH for duration proportional to distance
#define IR_OBSTACLE       19   // Digital Input  — LOW when IR beam is broken (waste dropped in)
#define RAIN_SENSOR_AO    34   // Analog Input   — moisture level (higher = wetter material)
                               // GPIO34–39 are INPUT-ONLY on ESP32 — no pull-ups available
#define GAS_SENSOR_AO     35   // Analog Input   — gas concentration from MQ sensor
#define METAL_INDUCTIVE   27   // Digital Input  — LOW when metal object is near (active-low)
#define PROXIMITY_SENSOR  26   // Digital Input  — LOW when object is close (secondary check)

// --- Actuators ---
#define SERVO_PIN         25   // PWM Output — servo expects 50Hz signal, 544–2400µs pulse width

// --- RFID RC522 (Custom SPI Pins) ---
// Default ESP32 SPI pins (18, 19) are taken by ultrasonic and IR sensors.
// So we use alternate GPIOs and tell the SPI library about them.
#define RFID_SS_PIN       21   // SPI Slave Select — "chip enable" for RFID module
#define RFID_SCK_PIN      14   // SPI Clock — synchronizes data bits
#define RFID_MOSI_PIN     23   // SPI Master Out Slave In — data TO the RFID
#define RFID_MISO_PIN     22   // SPI Master In Slave Out — data FROM the RFID
#define RFID_RST_PIN      4    // RFID hardware reset pin

// --- OLED Display (Dedicated I2C on custom pins) ---
// Using GPIO33 (SDA) and GPIO32 (SCL) — these do NOT conflict with RFID SPI.
// No bus switching needed! OLED and RFID can work simultaneously.
#define OLED_SDA_PIN      33   // I2C Data line for OLED
#define OLED_SCL_PIN      32   // I2C Clock line for OLED

// --- Buzzer ---
// Active buzzer: HIGH = sound, LOW = silent
#define BUZZER_PIN        13   // Digital Output — piezo buzzer for audio feedback

// --- Waste Detection LED ---
// Shows what waste type was detected via blink patterns
// Also doubles as the ESP32 onboard LED (GPIO2 on most boards)
#define WASTE_LED_PIN     2    // Digital Output — classification indicator LED

// ════════════════════════════════════════
// CONFIGURABLE THRESHOLDS — TUNE DURING CALIBRATION
// ════════════════════════════════════════
// Use Serial Monitor to see raw sensor values, then adjust these numbers.

#define MOISTURE_THRESHOLD  600    // Rain sensor ADC threshold (0–4095)
                                    // 600 ≈ (600/4095)×3.3V ≈ 0.48V at pin
#define GAS_THRESHOLD       400    // MQ gas sensor ADC threshold (0–4095)
#define BIN_HEIGHT_CM       30     // Inner height of bin in cm (measure yours!)
#define BIN_FULL_PERCENT    85     // Trigger "full" alert at this %
#define RFID_WINDOW_MS      15000  // 15s window for RFID card tap
#define HEARTBEAT_MS        300000 // Heartbeat to server every 5 min (300,000 ms)
#define SENSOR_COOLDOWN_MS  10000  // 10s cooldown between waste detections

// ════════════════════════════════════════
// SERVO ANGLE CONSTANTS
// ════════════════════════════════════════
#define SERVO_ORGANIC     30   // 30° = left compartment (organic)
#define SERVO_NEUTRAL     90   // 90° = center (inorganic / resting)
#define SERVO_METAL       150  // 150° = right compartment (metal)
#define SERVO_HOLD_MS     2000 // Hold target angle for 2 seconds

// ════════════════════════════════════════
// WIFI & API CONFIGURATION — CHANGE THESE!
// ════════════════════════════════════════
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* API_BASE  = "https://YOUR-APP.vercel.app";
const char* API_KEY   = "YOUR_API_KEY_HERE";

// ════════════════════════════════════════
// OLED DISPLAY CONFIG
// ════════════════════════════════════════
// 128×64 monochrome OLED using SSD1306 driver chip, connected via I2C.
// Now on dedicated pins GPIO33(SDA)/GPIO32(SCL) — no RFID conflict!
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1     // No dedicated reset pin (uses ESP32 reset)
#define OLED_ADDRESS  0x3C   // I2C address. Try 0x3D if your display doesn't work.

// ════════════════════════════════════════
// GLOBAL OBJECTS — Hardware Abstractions
// ════════════════════════════════════════
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
Servo wasteServo;

// ════════════════════════════════════════
// STATE MACHINE
// ════════════════════════════════════════
// A state machine ensures only ONE thing happens at a time.
// Each state has clear entry/exit conditions — no spaghetti logic.
//
// Flow: IDLE → CLASSIFYING → ROUTING → SERVO_HOLD → RFID_WINDOW → SENDING → IDLE
enum SystemState {
  STATE_IDLE,         // Waiting for waste detection
  STATE_CLASSIFYING,  // Reading sensors, deciding waste type
  STATE_ROUTING,      // Moving servo to target angle
  STATE_SERVO_HOLD,   // Holding servo position for 2 seconds
  STATE_RFID_WINDOW,  // 15-second window for RFID card tap
  STATE_SENDING       // Sending data to API or queuing offline
};
SystemState currentState = STATE_IDLE;

// ════════════════════════════════════════
// CLASSIFICATION & DETECTION VARIABLES
// ════════════════════════════════════════
String classifiedType    = "";           // "organic", "inorganic", or "metal"
int    targetServoAngle  = SERVO_NEUTRAL;
String scannedRfidUid    = "";           // Hex UID like "A1B2C3D4"
bool   wasManual         = false;        // True if user tapped RFID card
int    fillLevelPercent  = 0;            // 0–100%
bool   binIsFull         = false;

// ════════════════════════════════════════
// TIMING VARIABLES (non-blocking with millis())
// ════════════════════════════════════════
unsigned long servoStartTime    = 0;
unsigned long rfidWindowStart   = 0;
unsigned long lastDetectionTime = 0;
unsigned long lastHeartbeatTime = 0;
int           lastCountdown     = -1;  // For RFID window display updates

// ════════════════════════════════════════
// BUZZER TIMING (non-blocking patterns)
// ════════════════════════════════════════
unsigned long buzzerStartTime   = 0;
int           buzzerPattern     = 0;   // 0=off, 1=single, 2=double, 3=triple, 4=long
int           buzzerStep        = 0;
bool          buzzerActive      = false;

// ════════════════════════════════════════
// WASTE LED TIMING (non-blocking blink patterns)
// ════════════════════════════════════════
unsigned long wasteLedStartTime = 0;
int           wasteLedBlinks    = 0;   // How many blinks for this waste type
int           wasteLedStep      = 0;
bool          wasteLedActive    = false;

// ════════════════════════════════════════
// DISPLAY STATE (Deferred Update Pattern)
// ════════════════════════════════════════
// We queue display content, then write to OLED when convenient.
bool   displayNeedsUpdate = false;
String displayLine1       = "";
String displayLine2       = "";
String displayLine3       = "";

// ════════════════════════════════════════
// OFFLINE EVENT QUEUE
// ════════════════════════════════════════
// When WiFi is down, events are stored here and flushed on reconnection.
struct WasteEvent {
  String rfid_uid;
  String sector_type;
  bool   was_manual;
  int    fill_percent;
};
#define MAX_QUEUE_SIZE 10
WasteEvent offlineQueue[MAX_QUEUE_SIZE];
int queueSize = 0;
bool wasConnected = false;

// API response tracking
int lastCoinsAwarded = 0;

// ════════════════════════════════════════
// FORWARD DECLARATIONS
// ════════════════════════════════════════
void setDisplay(String l1, String l2, String l3 = "");
void updateDisplayNow();
int  readAveraged(int pin);
long readUltrasonicCm();
int  calculateFillPercent();
String readRfidCard();
void classifyWaste();
void routeServo();
bool sendToApi(String uid, String type, bool manual, int fill);
void sendHeartbeat();
void queueEvent(String uid, String type, bool manual, int fill);
void flushOfflineQueue();
void startBuzzerPattern(int pattern);
void updateBuzzer();
void startWasteLedPattern(int blinks);
void updateWasteLed();
void buzzerBeep(int durationMs);

// ╔═══════════════════════════════════════════════════════════════╗
// ║                         setup()                               ║
// ║  Runs ONCE at power-on. Initialize all hardware here.         ║
// ╚═══════════════════════════════════════════════════════════════╝
void setup() {
  // --- Serial Monitor for Debugging ---
  // 115200 baud = bits per second. Must match Arduino IDE Serial Monitor setting.
  Serial.begin(115200);
  delay(100);
  Serial.println("\n╔═══════════════════════════════════╗");
  Serial.println("║      EcoBin v2.0 Starting...      ║");
  Serial.println("╚═══════════════════════════════════╝");

  // --- Configure Pin Modes ---
  // Every GPIO must be set as INPUT or OUTPUT before use.
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);
  pinMode(IR_OBSTACLE, INPUT_PULLUP);      // Pull-up: reads HIGH normally, LOW when triggered
  pinMode(METAL_INDUCTIVE, INPUT_PULLUP);  // Active-low: LOW = metal detected
  pinMode(PROXIMITY_SENSOR, INPUT_PULLUP);
  // GPIO34, 35 don't need pinMode — analogRead() configures them automatically.
  // Note: GPIO34–39 have NO internal pull-up/pull-down resistors.

  // --- Buzzer ---
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);  // Buzzer off initially
  Serial.println("[BUZZER] Initialized on GPIO" + String(BUZZER_PIN));

  // --- Waste Detection LED ---
  pinMode(WASTE_LED_PIN, OUTPUT);
  digitalWrite(WASTE_LED_PIN, LOW);  // LED off initially
  Serial.println("[LED] Waste detection LED on GPIO" + String(WASTE_LED_PIN));

  // --- Servo Motor ---
  // Servo expects 50Hz PWM. ESP32Servo uses the LEDC peripheral internally.
  wasteServo.setPeriodHertz(50);
  wasteServo.attach(SERVO_PIN, 544, 2400);  // min/max pulse widths in µs
  wasteServo.write(SERVO_NEUTRAL);
  Serial.println("[SERVO] Attached to GPIO" + String(SERVO_PIN) + ", neutral at " + String(SERVO_NEUTRAL) + "°");

  // --- SPI Bus for RFID ---
  // SPI.begin(SCK, MISO, MOSI, SS) — using our custom pins
  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, RFID_SS_PIN);
  rfid.PCD_Init();
  delay(50);
  rfid.PCD_DumpVersionToSerial();
  Serial.println("[RFID] RC522 initialized on custom SPI pins");

  // --- OLED Display via I2C on DEDICATED pins (GPIO33/GPIO32) ---
  // No conflict with RFID SPI! Both can run simultaneously.
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("[OLED] ERROR: SSD1306 not found! Check wiring.");
    Serial.println("[OLED] Expected: SDA=GPIO" + String(OLED_SDA_PIN) + ", SCL=GPIO" + String(OLED_SCL_PIN));
  } else {
    Serial.println("[OLED] SSD1306 initialized at 0x" + String(OLED_ADDRESS, HEX));
    Serial.println("[OLED] Pins: SDA=GPIO" + String(OLED_SDA_PIN) + ", SCL=GPIO" + String(OLED_SCL_PIN));
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("EcoBin v2.0");
    display.println("Connecting WiFi...");
    display.display();
  }

  // --- Startup buzzer sequence (two short beeps) ---
  buzzerBeep(100);
  delay(100);
  buzzerBeep(100);

  // --- WiFi Connection ---
  // delay() is acceptable in setup() — nothing else needs to run yet.
  Serial.print("[WIFI] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WIFI] Connected! IP: " + WiFi.localIP().toString());
    wasConnected = true;
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("EcoBin Ready!");
    display.println("WiFi: " + String(WIFI_SSID));
    display.println("IP: " + WiFi.localIP().toString());
    display.display();
    // Success buzzer — three quick beeps
    buzzerBeep(80);
    delay(80);
    buzzerBeep(80);
    delay(80);
    buzzerBeep(80);
  } else {
    Serial.println("[WIFI] Connection failed. Will retry in loop.");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("EcoBin Ready!");
    display.println("WiFi: OFFLINE");
    display.display();
    // Failure buzzer — one long beep
    buzzerBeep(500);
  }

  // Initialize timing baselines
  lastHeartbeatTime = millis();
  lastDetectionTime = millis() - SENSOR_COOLDOWN_MS;  // Allow immediate first detection

  Serial.println("\n════════════════════════════════════");
  Serial.println("  EcoBin READY — entering main loop");
  Serial.println("════════════════════════════════════\n");
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║                          loop()                               ║
// ║  Runs CONTINUOUSLY — thousands of times per second.           ║
// ║  NEVER use delay() here. Use millis() for all timing.         ║
// ╚═══════════════════════════════════════════════════════════════╝
void loop() {
  unsigned long now = millis();  // Capture once per iteration for consistency
  bool isConnected = (WiFi.status() == WL_CONNECTED);

  // ── WiFi Reconnection Monitoring ──
  if (!wasConnected && isConnected) {
    Serial.println("[WIFI] Reconnected! Flushing offline queue...");
    setDisplay("WiFi Back!", "Syncing " + String(queueSize) + " events");
    startBuzzerPattern(2);  // Double beep for reconnection
    if (queueSize > 0) flushOfflineQueue();
  }
  if (wasConnected && !isConnected) {
    Serial.println("[WIFI] Connection lost!");
    setDisplay("WiFi Lost", "Saving locally...");
    startBuzzerPattern(4);  // Long beep for connection loss
  }
  wasConnected = isConnected;

  // ── Heartbeat Timer ──
  if (isConnected && (now - lastHeartbeatTime >= HEARTBEAT_MS)) {
    sendHeartbeat();
    lastHeartbeatTime = now;
  }

  // ── Non-blocking Buzzer & LED Updates ──
  updateBuzzer();
  updateWasteLed();

  // ── STATE MACHINE ──
  switch (currentState) {

    case STATE_IDLE: {
      // Enforce cooldown between detections
      if (now - lastDetectionTime < SENSOR_COOLDOWN_MS) break;

      // Check IR obstacle sensor — LOW = beam broken = waste present
      if (digitalRead(IR_OBSTACLE) == LOW) {
        Serial.println("\n[DETECT] ══════ Waste Detected! ══════");
        lastDetectionTime = now;
        setDisplay("Waste Detected!", "Classifying...");
        startBuzzerPattern(1);  // Single beep for detection
        currentState = STATE_CLASSIFYING;
      }
      break;
    }

    case STATE_CLASSIFYING: {
      classifyWaste();             // Reads sensors, sets classifiedType & targetServoAngle
      currentState = STATE_ROUTING;
      break;
    }

    case STATE_ROUTING: {
      routeServo();                // Moves servo to targetServoAngle
      servoStartTime = now;
      setDisplay("Routing...", ">> " + classifiedType + " >>", "Servo: " + String(targetServoAngle) + " deg");
      Serial.println("[SERVO] Moving to " + String(targetServoAngle) + "° for " + classifiedType);

      // Start waste LED blink pattern based on type
      if (classifiedType == "organic") {
        startWasteLedPattern(1);   // 1 slow blink = organic
      } else if (classifiedType == "inorganic") {
        startWasteLedPattern(2);   // 2 blinks = inorganic
      } else if (classifiedType == "metal") {
        startWasteLedPattern(3);   // 3 rapid blinks = metal
      }

      currentState = STATE_SERVO_HOLD;
      break;
    }

    case STATE_SERVO_HOLD: {
      // Wait 2 seconds at target angle, then return to neutral
      if (now - servoStartTime >= SERVO_HOLD_MS) {
        wasteServo.write(SERVO_NEUTRAL);
        Serial.println("[SERVO] Returned to neutral (" + String(SERVO_NEUTRAL) + "°)");

        // Measure fill level after routing
        fillLevelPercent = calculateFillPercent();
        binIsFull = (fillLevelPercent >= BIN_FULL_PERCENT);
        Serial.println("[FILL] Level: " + String(fillLevelPercent) + "%");
        if (binIsFull) {
          Serial.println("[FILL] WARNING — BIN IS FULL!");
          setDisplay("!! BIN FULL !!", "Level: " + String(fillLevelPercent) + "%", "Type: " + classifiedType);
          startBuzzerPattern(4);   // Long beep for bin full
        }

        // Open RFID window
        rfidWindowStart = now;
        scannedRfidUid = "";
        wasManual = false;
        lastCountdown = -1;
        setDisplay("Tap RFID card", String(RFID_WINDOW_MS / 1000) + "s remaining...", "Type: " + classifiedType);
        Serial.println("[RFID] Window open — " + String(RFID_WINDOW_MS / 1000) + "s");
        currentState = STATE_RFID_WINDOW;
      }
      break;
    }

    case STATE_RFID_WINDOW: {
      unsigned long elapsed = now - rfidWindowStart;
      int remaining = (int)((RFID_WINDOW_MS - elapsed) / 1000);

      // Check timeout
      if (elapsed >= RFID_WINDOW_MS) {
        Serial.println("[RFID] Window expired — no card");
        wasManual = false;
        scannedRfidUid = "";
        currentState = STATE_SENDING;
        break;
      }

      // Update countdown display once per second
      if (remaining != lastCountdown) {
        setDisplay("Tap card: " + String(remaining) + "s", "Type: " + classifiedType);
        lastCountdown = remaining;
      }

      // Poll RFID
      String uid = readRfidCard();
      if (uid.length() > 0) {
        scannedRfidUid = uid;
        wasManual = true;
        Serial.println("[RFID] Card scanned: " + uid);
        setDisplay("Card: " + uid, "Processing...");
        startBuzzerPattern(2);  // Double beep for RFID scan
        currentState = STATE_SENDING;
      }
      break;
    }

    case STATE_SENDING: {
      Serial.println("[API] Sending → type:" + classifiedType +
                     " rfid:" + (scannedRfidUid.length() > 0 ? scannedRfidUid : "none") +
                     " manual:" + String(wasManual) + " fill:" + String(fillLevelPercent) + "%");

      if (isConnected) {
        bool ok = sendToApi(scannedRfidUid, classifiedType, wasManual, fillLevelPercent);
        if (ok && lastCoinsAwarded > 0) {
          setDisplay("+" + String(lastCoinsAwarded) + " EcoCoins!", "Type: " + classifiedType, "Fill: " + String(fillLevelPercent) + "%");
          startBuzzerPattern(3);  // Triple celebratory beep for coins!
        } else if (ok) {
          setDisplay("Event Logged!", "Type: " + classifiedType, "Fill: " + String(fillLevelPercent) + "%");
        } else {
          queueEvent(scannedRfidUid, classifiedType, wasManual, fillLevelPercent);
          setDisplay("API Error", "Saved offline", "Queue: " + String(queueSize));
        }
      } else {
        queueEvent(scannedRfidUid, classifiedType, wasManual, fillLevelPercent);
        setDisplay("Offline", "Queued locally", "Queue: " + String(queueSize) + "/" + String(MAX_QUEUE_SIZE));
      }

      currentState = STATE_IDLE;
      Serial.println("[STATE] Returning to IDLE\n");
      break;
    }
  }

  // ── Deferred OLED Update ──
  // Write to display after all operations are done this iteration.
  if (displayNeedsUpdate) {
    updateDisplayNow();
  }
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║                     HELPER FUNCTIONS                          ║
// ╚═══════════════════════════════════════════════════════════════╝

// ════════════════════════════════════════
// DISPLAY HELPERS
// ════════════════════════════════════════

void setDisplay(String l1, String l2, String l3) {
  // Queue content — actual write happens in updateDisplayNow()
  displayLine1 = l1;
  displayLine2 = l2;
  displayLine3 = l3;
  displayNeedsUpdate = true;
}

void updateDisplayNow() {
  // No bus switching needed — OLED has dedicated I2C on GPIO33/32!
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Line 1 — use larger text if it fits
  display.setCursor(0, 0);
  if (displayLine1.length() <= 16) {
    display.setTextSize(2);
    display.println(displayLine1);
    display.setTextSize(1);
  } else {
    display.setTextSize(1);
    display.println(displayLine1);
  }

  // Line 2
  display.setCursor(0, 24);
  display.println(displayLine2);

  // Line 3 (optional)
  if (displayLine3.length() > 0) {
    display.setCursor(0, 40);
    display.println(displayLine3);
  }

  // Status bar at bottom
  display.setCursor(0, 56);
  display.print("WiFi:");
  display.print(WiFi.status() == WL_CONNECTED ? "OK" : "X");
  display.print(" Fill:");
  display.print(fillLevelPercent);
  display.print("%");
  if (binIsFull) {
    display.print(" FULL!");
  }

  display.display();  // Push buffer to screen
  displayNeedsUpdate = false;
}

// ════════════════════════════════════════
// BUZZER — Non-blocking Sound Patterns
// ════════════════════════════════════════
// Pattern 1: Single beep (100ms)         — waste detected
// Pattern 2: Double beep (100ms + 100ms) — RFID scanned / WiFi reconnected
// Pattern 3: Triple beep (80ms × 3)      — coins awarded!
// Pattern 4: Long beep (500ms)           — bin full / WiFi lost

void buzzerBeep(int durationMs) {
  // Blocking beep — ONLY use in setup()
  digitalWrite(BUZZER_PIN, HIGH);
  delay(durationMs);
  digitalWrite(BUZZER_PIN, LOW);
}

void startBuzzerPattern(int pattern) {
  buzzerPattern = pattern;
  buzzerStep = 0;
  buzzerStartTime = millis();
  buzzerActive = true;
  digitalWrite(BUZZER_PIN, HIGH);  // Start first beep
}

void updateBuzzer() {
  if (!buzzerActive) return;

  unsigned long elapsed = millis() - buzzerStartTime;

  switch (buzzerPattern) {
    case 1: // Single beep: ON 100ms
      if (elapsed >= 100) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerActive = false;
      }
      break;

    case 2: // Double beep: ON 100ms, OFF 100ms, ON 100ms
      if (buzzerStep == 0 && elapsed >= 100) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerStep = 1;
        buzzerStartTime = millis();
      } else if (buzzerStep == 1 && elapsed >= 100) {
        digitalWrite(BUZZER_PIN, HIGH);
        buzzerStep = 2;
        buzzerStartTime = millis();
      } else if (buzzerStep == 2 && elapsed >= 100) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerActive = false;
      }
      break;

    case 3: // Triple beep: ON 80ms, OFF 80ms, ON 80ms, OFF 80ms, ON 80ms
      if (buzzerStep == 0 && elapsed >= 80) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerStep = 1;
        buzzerStartTime = millis();
      } else if (buzzerStep == 1 && elapsed >= 80) {
        digitalWrite(BUZZER_PIN, HIGH);
        buzzerStep = 2;
        buzzerStartTime = millis();
      } else if (buzzerStep == 2 && elapsed >= 80) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerStep = 3;
        buzzerStartTime = millis();
      } else if (buzzerStep == 3 && elapsed >= 80) {
        digitalWrite(BUZZER_PIN, HIGH);
        buzzerStep = 4;
        buzzerStartTime = millis();
      } else if (buzzerStep == 4 && elapsed >= 80) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerActive = false;
      }
      break;

    case 4: // Long beep: ON 500ms
      if (elapsed >= 500) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerActive = false;
      }
      break;

    default:
      digitalWrite(BUZZER_PIN, LOW);
      buzzerActive = false;
      break;
  }
}

// ════════════════════════════════════════
// WASTE DETECTION LED — Blink Patterns
// ════════════════════════════════════════
// Organic:   1 long blink  (500ms on)
// Inorganic: 2 quick blinks (200ms on, 200ms off)
// Metal:     3 rapid blinks (150ms on, 150ms off)
// After pattern, LED stays on for 2 seconds then turns off.

void startWasteLedPattern(int blinks) {
  wasteLedBlinks = blinks;
  wasteLedStep = 0;
  wasteLedStartTime = millis();
  wasteLedActive = true;
  digitalWrite(WASTE_LED_PIN, HIGH);  // Start first blink
}

void updateWasteLed() {
  if (!wasteLedActive) return;

  unsigned long elapsed = millis() - wasteLedStartTime;

  if (wasteLedBlinks == 1) {
    // Organic: 1 long blink (500ms on), then hold for 2s
    if (wasteLedStep == 0 && elapsed >= 500) {
      digitalWrite(WASTE_LED_PIN, LOW);
      wasteLedStep = 1;
      wasteLedStartTime = millis();
    } else if (wasteLedStep == 1 && elapsed >= 300) {
      // Brief off, then solid on for 2 seconds
      digitalWrite(WASTE_LED_PIN, HIGH);
      wasteLedStep = 2;
      wasteLedStartTime = millis();
    } else if (wasteLedStep == 2 && elapsed >= 2000) {
      digitalWrite(WASTE_LED_PIN, LOW);
      wasteLedActive = false;
    }
  } else {
    // Multiple blinks: ON/OFF cycle
    int onTime = (wasteLedBlinks == 2) ? 200 : 150;
    int offTime = (wasteLedBlinks == 2) ? 200 : 150;
    int totalBlinks = wasteLedBlinks;

    int currentBlink = wasteLedStep / 2;
    bool isOnPhase = (wasteLedStep % 2 == 0);

    if (currentBlink < totalBlinks) {
      if (isOnPhase && elapsed >= (unsigned long)onTime) {
        digitalWrite(WASTE_LED_PIN, LOW);
        wasteLedStep++;
        wasteLedStartTime = millis();
      } else if (!isOnPhase && elapsed >= (unsigned long)offTime) {
        if (currentBlink + 1 < totalBlinks) {
          digitalWrite(WASTE_LED_PIN, HIGH);
        }
        wasteLedStep++;
        wasteLedStartTime = millis();
      }
    } else {
      // Pattern done — hold LED on for 2 seconds
      if (wasteLedStep == totalBlinks * 2) {
        digitalWrite(WASTE_LED_PIN, HIGH);
        wasteLedStep++;
        wasteLedStartTime = millis();
      } else if (elapsed >= 2000) {
        digitalWrite(WASTE_LED_PIN, LOW);
        wasteLedActive = false;
      }
    }
  }
}

// ════════════════════════════════════════
// SENSOR READING — Analog Averaging
// ════════════════════════════════════════
// Reads an analog pin 3 times and returns the average.
// This simple filter smooths out electrical noise and ADC jitter.
//
// analogRead() on ESP32: returns 0–4095 (12-bit ADC, 0–3.3V range)
// Example: value 600 ≈ (600/4095) × 3.3V ≈ 0.48V at the pin

int readAveraged(int pin) {
  int sum = 0;
  for (int i = 0; i < 3; i++) {
    sum += analogRead(pin);
    delay(10);  // 10ms between samples — 30ms total is acceptable
    // This is the ONLY delay() outside setup(). 30ms won't noticeably block.
  }
  return sum / 3;
}

// ════════════════════════════════════════
// ULTRASONIC DISTANCE MEASUREMENT
// ════════════════════════════════════════
// HC-SR04 sends 40kHz sound bursts and measures the echo return time.
//
// Physics: Speed of sound ≈ 343 m/s = 0.0343 cm/µs
// distance_cm = (round_trip_time_µs × 0.0343) / 2
// Simplified: distance_cm = time_µs / 58

long readUltrasonicCm() {
  // Send 10µs trigger pulse
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);      // Clean LOW before pulse
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);     // 10µs pulse required by HC-SR04
  digitalWrite(ULTRASONIC_TRIG, LOW);

  // Measure echo duration (timeout after 30ms ≈ 5m range)
  long duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);

  if (duration == 0) {
    Serial.println("[SONIC] No echo — assuming empty bin");
    return BIN_HEIGHT_CM;  // No echo = assume max distance (empty)
  }

  long cm = duration / 58;
  Serial.println("[SONIC] Distance: " + String(cm) + "cm (raw: " + String(duration) + "µs)");
  return cm;
}

// ════════════════════════════════════════
// FILL LEVEL CALCULATION
// ════════════════════════════════════════
// Ultrasonic sensor sits at the TOP of the bin pointing DOWN.
//
//    [Sensor] ← at top
//    |-- distance_cm --| (empty space)
//    |                 |
//    |=== waste ===| ← fill_percent of total height
//    └─────────────────┘ (bottom)
//
// fill% = ((total_height - distance) / total_height) × 100

int calculateFillPercent() {
  long dist = readUltrasonicCm();
  float pct = ((float)(BIN_HEIGHT_CM - dist) / (float)BIN_HEIGHT_CM) * 100.0;

  // Clamp to [0, 100] — values outside indicate sensor error
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  return (int)pct;
}

// ════════════════════════════════════════
// RFID CARD READING
// ════════════════════════════════════════
// RC522 generates a 13.56 MHz electromagnetic field.
// RFID cards have no battery — they harvest energy from this field
// and transmit their unique ID (UID) back. Each card has a 4–7 byte UID.
//
// Returns: hex string like "A1B2C3D4", or "" if no card present.

String readRfidCard() {
  // Non-blocking check — returns immediately if no card
  if (!rfid.PICC_IsNewCardPresent()) return "";
  if (!rfid.PICC_ReadCardSerial())   return "";

  // Convert UID bytes to hex string
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";  // Pad: 0xA → "0A"
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  // Release the card so it can be read again next time
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  return uid;
}

// ════════════════════════════════════════
// WASTE CLASSIFICATION
// ════════════════════════════════════════
// Priority: METAL → ORGANIC → INORGANIC (default)
//
// Metal sensor is most reliable (electromagnetic — not affected by moisture).
// If something is both metallic and wet, it's classified as METAL (correct!).

void classifyWaste() {
  // Step 1: Metal — inductive sensor (active-low)
  bool metalDetected = (digitalRead(METAL_INDUCTIVE) == LOW);

  // Step 2: Moisture — rain sensor (higher = wetter)
  int moisture = readAveraged(RAIN_SENSOR_AO);

  // Step 3: Gas — MQ sensor (higher = more decomposition gas)
  int gas = readAveraged(GAS_SENSOR_AO);

  // Step 4: Proximity — secondary confirmation
  bool proximity = (digitalRead(PROXIMITY_SENSOR) == LOW);

  // Debug output for calibration
  Serial.println("[SENSORS] ─────────────────────────");
  Serial.println("  Metal:     " + String(metalDetected ? "YES" : "no"));
  Serial.println("  Moisture:  " + String(moisture) + "/4095 (thresh:" + String(MOISTURE_THRESHOLD) + ")");
  Serial.println("  Gas:       " + String(gas) + "/4095 (thresh:" + String(GAS_THRESHOLD) + ")");
  Serial.println("  Proximity: " + String(proximity ? "YES" : "no"));

  // Decision tree
  if (metalDetected) {
    classifiedType = "metal";
    targetServoAngle = SERVO_METAL;
    Serial.println("[CLASS] Result: METAL");
  } else if (moisture > MOISTURE_THRESHOLD || gas > GAS_THRESHOLD) {
    classifiedType = "organic";
    targetServoAngle = SERVO_ORGANIC;
    if (moisture > MOISTURE_THRESHOLD && gas > GAS_THRESHOLD) {
      Serial.println("[CLASS] Result: ORGANIC (HIGH confidence — both sensors)");
    } else {
      Serial.println("[CLASS] Result: ORGANIC (single sensor)");
    }
  } else {
    classifiedType = "inorganic";
    targetServoAngle = SERVO_NEUTRAL;
    Serial.println("[CLASS] Result: INORGANIC (default)");
  }

  setDisplay("Type: " + classifiedType,
             "M:" + String(moisture) + " G:" + String(gas),
             metalDetected ? "Metal: YES" : "");
}

// ════════════════════════════════════════
// SERVO ROUTING
// ════════════════════════════════════════
void routeServo() {
  wasteServo.write(targetServoAngle);
}

// ════════════════════════════════════════
// API — Send Waste Event
// ════════════════════════════════════════
// HTTP POST sends JSON data to your backend.
// The server responds with LED color instruction and coins awarded.

bool sendToApi(String uid, String type, bool manual, int fill) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(API_BASE) + "/api/sensor-data";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(10000);  // 10s timeout

  // Build JSON body
  // StaticJsonDocument allocates on the stack — fast and no fragmentation.
  // 256 bytes is plenty for our small payload.
  StaticJsonDocument<256> doc;

  if (uid.length() > 0) {
    doc["rfid_uid"] = uid;
  } else {
    doc["rfid_uid"] = (char*)NULL;  // JSON null
  }
  doc["sector_type"]        = type;
  doc["was_manual"]          = manual;
  doc["fill_level_percent"]  = fill;
  doc["weight_grams"]        = 0;  // No weight sensor in this version

  String body;
  serializeJson(doc, body);
  Serial.println("[API] POST " + url);
  Serial.println("[API] Body: " + body);

  int httpCode = http.POST(body);
  lastCoinsAwarded = 0;

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("[API] Response: " + response);

    // Parse server response
    StaticJsonDocument<256> resDoc;
    DeserializationError err = deserializeJson(resDoc, response);
    if (!err) {
      const char* ledColor = resDoc["led_color"] | "green";
      lastCoinsAwarded = resDoc["coins_awarded"] | 0;

      // Update bin-full flag based on server instruction
      if (String(ledColor) == "red") {
        binIsFull = true;
      } else {
        binIsFull = false;
      }
      Serial.println("[API] LED: " + String(ledColor) + ", Coins: " + String(lastCoinsAwarded));
    }
    http.end();
    return true;
  } else {
    Serial.println("[API] Error code: " + String(httpCode));
    http.end();
    return false;
  }
}

// ════════════════════════════════════════
// API — Heartbeat
// ════════════════════════════════════════
// Periodic "I'm alive" signal so the dashboard knows the bin is online.

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(API_BASE) + "/api/heartbeat";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(5000);

  int code = http.POST("{}");
  Serial.println("[HEARTBEAT] Sent → HTTP " + String(code));
  http.end();
}

// ════════════════════════════════════════
// OFFLINE QUEUE — Store & Flush
// ════════════════════════════════════════

void queueEvent(String uid, String type, bool manual, int fill) {
  if (queueSize >= MAX_QUEUE_SIZE) {
    Serial.println("[QUEUE] Full! Discarding oldest event.");
    // Shift everything left to make room (FIFO)
    for (int i = 0; i < MAX_QUEUE_SIZE - 1; i++) {
      offlineQueue[i] = offlineQueue[i + 1];
    }
    queueSize = MAX_QUEUE_SIZE - 1;
  }
  offlineQueue[queueSize].rfid_uid     = uid;
  offlineQueue[queueSize].sector_type  = type;
  offlineQueue[queueSize].was_manual   = manual;
  offlineQueue[queueSize].fill_percent = fill;
  queueSize++;
  Serial.println("[QUEUE] Event stored. Queue size: " + String(queueSize));
}

void flushOfflineQueue() {
  Serial.println("[QUEUE] Flushing " + String(queueSize) + " events...");
  int sent = 0;
  for (int i = 0; i < queueSize; i++) {
    bool ok = sendToApi(offlineQueue[i].rfid_uid,
                        offlineQueue[i].sector_type,
                        offlineQueue[i].was_manual,
                        offlineQueue[i].fill_percent);
    if (ok) {
      sent++;
    } else {
      Serial.println("[QUEUE] Failed at event " + String(i) + ", stopping flush.");
      // Shift remaining events to front
      int remaining = queueSize - i;
      for (int j = 0; j < remaining; j++) {
        offlineQueue[j] = offlineQueue[i + j];
      }
      queueSize = remaining;
      return;
    }
  }
  queueSize = 0;
  Serial.println("[QUEUE] All " + String(sent) + " events sent successfully!");
  setDisplay("WiFi Back!", "Synced " + String(sent) + " events");
}
