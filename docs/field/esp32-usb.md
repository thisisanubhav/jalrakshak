# ESP32 USB readings

The field measurement form accepts an optional USB serial stream. Manual entry
remains available. No board or probe has been selected or tested yet. This is an
app-side integration and firmware output helper, not a completed measurement device.
Bluetooth, Wi-Fi ingestion, mobile USB and automatic background pairing are not implemented.

## Operator flow

1. Open the team workspace on localhost in desktop Chrome or Edge. Select a source
   and Record Measurement. Connect a compatible ESP32 using a data-capable USB cable.
2. Close Arduino Serial Monitor or any app holding the serial port. Click **Connect
   ESP32 by USB** and select the port in the browser permission prompt.
3. The app reads live EC and temperature automatically at 115200 baud. A serial
   connection alone does not imply compatible firmware or a functioning sensor.
4. Wait for a stable sample, then **Use for reading 1**. Rinse/reposition the probe
   according to its procedure, let it stabilize, and capture an independent second
   reading. A fresh third capture is available when needed. Live updates never
   overwrite filled form fields. Clear a field before replacing it.
5. Check timestamp, temperature, instrument, device/probe, operator and calibration.
   First capture supplies timestamp and temperature only when those fields are empty.
   Each capture sets the form device ID to the sending device; all captured readings
   in one record must come from that device. Sensor-specific temperature is also retained in each capture's evidence.
   Review repeatability, then save. Capture alone never saves a record.
6. Unplugging preserves captured fields. Continue manually or reconnect. Navigating
   away closes the connection; drafts persist. Reload requires another connection.

Readings older than five seconds or reported unstable cannot be captured. A sample
cannot fill two independent fields. The board must issue a new sequence for each
actual acquisition, not replay its last value. A reboot/session change requires
reconnection. Firmware is responsible for stability detection and recent acquisition;
receipt time does not prove sensor accuracy or authenticate the device.

USB capture evidence is saved per reading (device/session/sequence/receipt time/raw
EC/temperature), synced, included in JSON backups and CSV/reports. Editing a captured
EC field removes its USB attribution. Existing manual records need no migration.
`MANUAL_FIELD` remains the existing real-field workspace identifier; it distinguishes
real field records from training, not the transport of each reading.

## Firmware contract

Emit one UTF-8 JSON object per newline, at most 1024 characters, over USB serial:

```json
{"protocol":"jalrakshak.ec.v1","deviceId":"ESP32-01","sessionId":"boot-unique-id","sequence":1,"ecUsCm":501.2,"temperatureC":25.1,"stable":true}
```

This example describes the wire format; never transmit hard-coded example readings
as measurements. Protocol uses raw conductivity in **µS/cm**, not mS/cm, TDS ppm,
or temperature-compensated EC25. Numeric fields must be JSON numbers, stable a boolean.
Valid EC range is 0–200000; temperature −20–80 °C; IDs are 1–64 ASCII letters,
digits, dots, underscores or hyphens. Sequence must be a nonnegative safe integer,
strictly increasing within one boot session. Send only newly acquired samples,
ideally once per second, using a new session ID after each reboot. No commands are
sent to the device. Boot logs and malformed packets are rejected; do not multiplex
other JSON protocols on this stream.

`firmware/esp32/JalRakshakSerial.h` formats validated readings from your chosen driver.
Initialize Serial at 115200 and call `jalRakshakSendSample(...)` after a real acquisition.
The helper intentionally supplies no analog-pin conversion formula or fake readings.
Hardware choice determines pinout, voltage compatibility, ADC/interface requirements,
probe driver, calibration procedure, stability algorithm and firmware build target.
Do not wire a probe using guessed ESP32 pins or voltage assumptions.

## Remaining hardware acceptance

Choose the ESP32 variant, calibrated conductivity interface/probe and temperature
sensor. Implement and compile its sensor driver with the helper, verify correct units
against reference standards, and physically test connect/capture/unplug/reconnect.
Automated app tests emulate the serial transport and do not establish sensor accuracy.

Web Serial requires a secure context (localhost qualifies) and user device selection:
https://developer.chrome.com/docs/capabilities/serial
