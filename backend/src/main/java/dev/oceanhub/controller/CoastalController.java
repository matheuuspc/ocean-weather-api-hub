package dev.oceanhub.controller;

import dev.oceanhub.dto.CoastalConditions;
import dev.oceanhub.dto.CoastalForecast;
import dev.oceanhub.service.OpenMeteoService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/coastal")
public class CoastalController {
    private final OpenMeteoService service;
    public CoastalController(OpenMeteoService service) { this.service = service; }

    @GetMapping("/conditions")
    public CoastalConditions conditions(
            @RequestParam @NotBlank String location,
            @RequestParam @Min(-90) @Max(90) double latitude,
            @RequestParam @Min(-180) @Max(180) double longitude) {
        return service.conditions(location, latitude, longitude);
    }

    @GetMapping("/forecast")
    public CoastalForecast forecast(
            @RequestParam @NotBlank String location,
            @RequestParam @Min(-90) @Max(90) double latitude,
            @RequestParam @Min(-180) @Max(180) double longitude,
            @RequestParam(defaultValue = "1") @Min(1) @Max(7) int days) {
        return service.forecast(location, latitude, longitude, days);
    }
}
