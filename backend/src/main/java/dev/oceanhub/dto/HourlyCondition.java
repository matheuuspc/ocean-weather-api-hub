package dev.oceanhub.dto;

import java.time.LocalDateTime;

public record HourlyCondition(LocalDateTime time, Double waterTemperatureC, Double waveHeightM) { }
