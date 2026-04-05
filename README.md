# EcoBin - How to Upload the Code

**Key System Features:**
* **📡 IoT Cloud Dashboard:** Next.js + React dashboard fetching live metrics from Supabase DB every 10 seconds.
* **💳 Offline Smart Card Wallet:** Uses MIFARE cryptography to physically write coin balances directly into the RC522 RFID Card's memory blocks. The user's white card is essentially a prepaid hardware wallet working alongside the cloud!
* **🪙 Solana Tokenomics Ready:** Roadmap designed to launch an 8-Billion token memecoin on the Solana network to distribute 40% investor backing as real-value user rewards.

---
This guide tells you how to put the code into the two boards. Just follow the steps one by one.

---

## Which file goes where?

There are 2 boards and 2 code files:

- ArduinoSlave/ArduinoSlave.ino goes to the Arduino Uno (the blue board)
- EcoBin/EcoBin.ino goes to the ESP32 (the black or grey board)

---

## Step 0 - Install Arduino IDE (do this only once)

1. Go to https://www.arduino.cc/en/software
2. Click Download Arduino IDE 2 and choose Windows
3. Install it like any normal app (just click Next Next Next)
4. Open it when done

---

## Step 0B - Install the libraries (do this only once)

You need 2 extra libraries installed before uploading anything.

1. In Arduino IDE, go to Sketch then Include Library then Manage Libraries
2. Search for ArduinoJson and click Install (by Benoit Blanchon, version 6)
3. Search for MFRC522 and click Install (by GithubCommunity)
4. Servo and Stepper are already built-in so no install needed for those

---

## Step 0C - Add ESP32 board support (do this only once)

The Arduino IDE does not know about the ESP32 board by default. You have to add it.

1. Go to File then Preferences
2. Find the box that says Additional Boards Manager URLs
3. Paste this URL in there:
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
4. Click OK
5. Go to Tools then Board then Boards Manager
6. Search for esp32
7. Find esp32 by Espressif Systems and click Install
8. Wait for it to download (can take a few minutes)

---

## PART 1 - Uploading ArduinoSlave.ino to the Arduino Uno

### Step 1 - Disconnect the TX/RX wires (VERY IMPORTANT)

Before you do anything, physically unplug these 2 wires from the Arduino:
- The wire on Pin 0 (RX)
- The wire on Pin 1 (TX)

These wires talk to the ESP32. If you leave them plugged in, the upload will fail every time.

### Step 2 - Plug in the Arduino

Connect the Arduino Uno to your computer using the USB-A to USB-B cable (the square-ish connector goes into the Arduino).

### Step 3 - Open the file

1. In Arduino IDE go to File then Open
2. Navigate to your project folder
3. Open the folder called ArduinoSlave
4. Click on ArduinoSlave.ino

### Step 4 - Select the right board

1. Go to Tools then Board then Arduino AVR Boards
2. Select Arduino Uno

### Step 5 - Select the right port

1. Go to Tools then Port
2. Choose the COM port that appeared when you plugged in the Arduino
3. On Windows it usually says something like COM3 or COM4
4. If you are not sure which one, open Device Manager and check under Ports

### Step 6 - Upload

1. Click the arrow Upload button at the top left (or press Ctrl + U)
2. Wait for the progress bar at the bottom
3. When done you will see Done uploading

### Step 7 - Check it works (optional but good)

1. Go to Tools then Serial Monitor
2. Set the baud rate at the bottom right to 9600
3. You should see something like:
   {"type":"boot","msg":"ArduinoSlave ready"}
   {"type":"ready","msg":"ArduinoSlave v3.2 initialized"}
4. You should hear two short beeps from the buzzer
5. Close the Serial Monitor when done

### Step 8 - Reconnect the wires

Plug the TX/RX wires back in:
- Pin 0 (RX) gets the wire from ESP32 GPIO17
- Pin 1 (TX) goes through the voltage divider to ESP32 GPIO16

---

## PART 2 - Uploading EcoBin.ino to the ESP32

### Step 1 - Edit your WiFi and API details first

Before uploading you MUST put in your own WiFi password and API key.

1. Open the folder called EcoBin
2. Open EcoBin.ino in Arduino IDE
3. Find these 4 lines near the top (around line 143):

   const char* WIFI_SSID = "YOUR_WIFI_NAME";
   const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
   const char* API_BASE  = "https://YOUR-APP.vercel.app";
   const char* API_KEY   = "YOUR_API_KEY_HERE";

4. Replace each one with your real details:
   - WIFI_SSID is your WiFi network name (exactly as it appears on your phone)
   - WIFI_PASS is your WiFi password
   - API_BASE is your Vercel website URL (example: https://ecobin-abc.vercel.app)
   - API_KEY is from Supabase. Go to Table Editor then bins table then copy the api_key column value

### Step 2 - Plug in the ESP32

Connect the ESP32 to your computer using its USB cable (Micro-B or USB-C depending on your board).

### Step 3 - Open the file

Go to File then Open then go to the EcoBin folder then open EcoBin.ino

### Step 4 - Select the ESP32 board

1. Go to Tools then Board then esp32
2. Select ESP32 Dev Module
3. If your board is different check what is printed on the board and choose that

### Step 5 - Select the right port

1. Go to Tools then Port
2. Choose the COM port for the ESP32
3. The ESP32 and Arduino will have different COM numbers

### Step 6 - Upload

1. Click the arrow Upload button
2. Watch the bottom output. If you see Connecting...... stuck for more than 10 seconds then hold down the BOOT button on your ESP32 until uploading starts then let go
3. Wait for Done uploading

### Step 7 - Check it works

1. Go to Tools then Serial Monitor
2. Set baud rate to 115200
3. Press the EN or RST button on the ESP32 to restart it
4. You should see:
   EcoBin v3.2 Starting...
   [WIFI] Connecting to: YourNetwork
   [WIFI] Connected! IP: 192.168.x.x
   EcoBin v3.2 READY
5. If WiFi connects you will hear short beeps from the Arduino buzzer
6. If you see [WIFI] Failed then double check your WiFi name and password in the code

---

## PART 3 - Database Setup (Supabase)

You need to run some SQL commands in Supabase to add new columns for the gas sensor.

1. Go to your Supabase project website
2. Click SQL Editor in the left sidebar
3. Click New query
4. Copy and paste each SQL block below one at a time
5. Click Run after each one (or press Ctrl+Enter)

Migration 1 - Add gas columns to bins table:

   ALTER TABLE bins ADD COLUMN IF NOT EXISTS gas_level integer DEFAULT 0;
   ALTER TABLE bins ADD COLUMN IF NOT EXISTS gas_danger boolean DEFAULT false;

Migration 2 - Allow gas_danger alert type:

   ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
   ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check CHECK (alert_type IN ('bin_full', 'bin_cleared', 'gas_danger'));

Migration 3 - Add unique constraint for sectors:

   ALTER TABLE sectors ADD CONSTRAINT sectors_bin_id_sector_type_key UNIQUE (bin_id, sector_type);

Note: If Migration 3 gives an error saying already exists then ignore it. That means it was already set up.

---

## Final Checklist

- Arduino IDE 2 installed
- ArduinoJson library installed
- MFRC522 library installed
- ESP32 board support added
- ArduinoSlave.ino uploaded to Arduino Uno
- EcoBin.ino has your WiFi and API key filled in
- EcoBin.ino uploaded to ESP32
- Supabase SQL migrations done (all 3)
- Both Serial Monitors show correct startup messages
- Organic bin is physically aligned at 0 degrees on power-up

---

## Quick Fixes

- Upload to Arduino fails: Unplug Pin 0 and Pin 1 wires before uploading
- ESP32 upload gets stuck at Connecting: Hold the BOOT button on the ESP32
- Nothing shows in Serial Monitor: Wrong baud rate. Arduino needs 9600. ESP32 needs 115200
- WiFi not connecting: Check WIFI_SSID and WIFI_PASS. They are case-sensitive
- API returns error 401: Check your API_KEY in EcoBin.ino matches what is in Supabase

For full wiring details see PIN_REFERENCE.md
For database SQL details see SUPABASE_MIGRATION.md
