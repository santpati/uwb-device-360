
// Simulate the worker's logic for TDoA prioritization
function processEvent(event) {
    if (event.eventType !== 'IOT_TELEMETRY') return null;

    const telemetry = event.iotTelemetry;
    if (!telemetry) return null;

    const detectedPos = telemetry.detectedPosition;
    const computedPositions = telemetry.allComputedPositions || [];

    // Logic: Prefer TDoA from allComputedPositions
    let finalPos = detectedPos;
    let computeType = detectedPos?.computeType || 'CT_RSSI';

    const tdoaPos = computedPositions.find(p => p.computeType === 'CT_TDOA');
    if (tdoaPos) {
        finalPos = tdoaPos;
        computeType = 'CT_TDOA';
    }

    return {
        computeType,
        finalPos
    };
}

// Sample provided by user
const sampleEvent = {
    "recordUid": "event-64b589cb",
    "recordTimestamp": 1770795333276,
    "eventType": "IOT_TELEMETRY",
    "iotTelemetry": {
        "deviceInfo": {
            "deviceType": "IOT_UWB_TAG",
            "deviceId": "10:35:97:15:b3:33"
        },
        "detectedPosition": {
            "xPos": 241.9,
            "yPos": 250.9,
            "latitude": 52.343854314911354,
            "longitude": 4.888463023889718,
            "confidenceFactor": 3.134392499923706,
            "computeType": "CT_RSSI"
        },
        "allComputedPositions": [
            {
                "xPos": 241.9,
                "yPos": 250.9,
                "latitude": 52.343854314911354,
                "longitude": 4.888463023889718,
                "confidenceFactor": 3.134392499923706,
                "computeType": "CT_TDOA"
            },
            {
                "xPos": 227.6,
                "yPos": 216.2,
                "latitude": 52.343822990155495,
                "longitude": 4.888302625302908,
                "confidenceFactor": 32.0,
                "computeType": "CT_RSSI"
            }
        ]
    }
};

console.log("Running Firehose Logic Validation...");

const result = processEvent(sampleEvent);

if (result && result.computeType === 'CT_TDOA') {
    console.log("PASS: Correctly prioritized CT_TDOA");
    console.log("Selected Position:", result.finalPos);
} else {
    console.error("FAIL: Did not prioritize CT_TDOA");
    console.log("Actual Result:", result);
    process.exit(1);
}

// Additional Test Case: Only RSSI available
const rssiOnlyEvent = JSON.parse(JSON.stringify(sampleEvent));
rssiOnlyEvent.iotTelemetry.allComputedPositions = []; // Clear computed positions with TDOA

const result2 = processEvent(rssiOnlyEvent);

if (result2 && result2.computeType === 'CT_RSSI') {
    console.log("PASS: Correctly fell back to CT_RSSI when CT_TDOA is missing");
} else {
    console.error("FAIL: Incorrect behavior for RSSI-only event");
    process.exit(1);
}
