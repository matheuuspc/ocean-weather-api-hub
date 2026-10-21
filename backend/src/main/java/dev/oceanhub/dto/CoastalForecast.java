package dev.oceanhub.dto;

import java.util.List;

public record CoastalForecast(String location, double latitude, double longitude, String timezone,
        List<HourlyCondition> hourly, String source) { }
