#pragma once
#include <Arduino.h>
#include <math.h>
#include <cstring>
#include <initializer_list>

// Integration helper, not a sensor driver. Call only after a real, calibrated
// sensor acquisition. Values are raw EC in µS/cm, NOT TDS ppm or EC25.
// deviceId/sessionId must match [A-Za-z0-9._-]{1,64}; generate a new sessionId
// each boot. Increment sequence only for a new physical acquisition.
inline bool jalRakshakSendSample(Stream &output, const char *deviceId,
    const char *sessionId, uint32_t sequence, float ecUsCm,
    float temperatureC, bool stable) {
  if (!isfinite(ecUsCm) || ecUsCm < 0 || ecUsCm > 200000 ||
      !isfinite(temperatureC) || temperatureC < -20 || temperatureC > 80) return false;
  for (const char *id : {deviceId, sessionId}) {
    if (!id || strlen(id) == 0 || strlen(id) > 64) return false;
    for (const char *p = id; *p; ++p)
      if (!((*p >= 'a' && *p <= 'z') || (*p >= 'A' && *p <= 'Z') ||
          (*p >= '0' && *p <= '9') || *p == '.' || *p == '_' || *p == '-')) return false;
  }
  output.print("{\"protocol\":\"jalrakshak.ec.v1\",\"deviceId\":\"");
  output.print(deviceId); output.print("\",\"sessionId\":\""); output.print(sessionId);
  output.print("\",\"sequence\":"); output.print(sequence);
  output.print(",\"ecUsCm\":"); output.print(ecUsCm, 3);
  output.print(",\"temperatureC\":"); output.print(temperatureC, 3);
  output.print(",\"stable\":"); output.print(stable ? "true" : "false"); output.println("}");
  return true;
}
