package dev.oceanhub.dto;

import java.time.OffsetDateTime;

public record CoastalConditions(
        String location, double latitude, double longitude, OffsetDateTime observedAt,
        Double airTemperatureC, Double waterTemperatureC, Double waveHeightM,
        Double windSpeedKmh, Integer relativeHumidityPercent,
        String recommendation, String recommendationDetail, String source) { }
