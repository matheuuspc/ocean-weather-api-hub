package dev.oceanhub.service;

import dev.oceanhub.dto.CoastalConditions;
import dev.oceanhub.dto.CoastalForecast;
import dev.oceanhub.dto.HourlyCondition;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import com.fasterxml.jackson.databind.JsonNode;

@Service
public class OpenMeteoService {
    private static final String SOURCE = "Open-Meteo (Weather Forecast + Marine API)";
    private final RestTemplate http;
    private final String weatherUrl;
    private final String marineUrl;

    public OpenMeteoService(RestTemplate http,
            @Value("${open-meteo.weather-url}") String weatherUrl,
            @Value("${open-meteo.marine-url}") String marineUrl) {
        this.http = http;
        this.weatherUrl = weatherUrl;
        this.marineUrl = marineUrl;
    }

    public CoastalConditions conditions(String location, double latitude, double longitude) {
        JsonNode weather = get(weatherUrl, UriComponentsBuilder.fromHttpUrl(weatherUrl)
                .queryParam("latitude", latitude).queryParam("longitude", longitude)
                .queryParam("current", "temperature_2m,relative_humidity_2m,wind_speed_10m")
                .queryParam("timezone", "auto").build().encode().toUriString());
        JsonNode marine = get(marineUrl, UriComponentsBuilder.fromHttpUrl(marineUrl)
                .queryParam("latitude", latitude).queryParam("longitude", longitude)
                .queryParam("hourly", "wave_height,sea_surface_temperature")
                .queryParam("forecast_days", 1).queryParam("timezone", "auto")
                .build().encode().toUriString());
        JsonNode current = weather.path("current");
        String observed = text(current, "time");
        Double wave = nearest(marine.path("hourly"), "wave_height", observed);
        Double water = nearest(marine.path("hourly"), "sea_surface_temperature", observed);
        Double air = number(current, "temperature_2m");
        String[] recommendation = recommend(wave, water);
        return new CoastalConditions(location, latitude, longitude,
                observed == null ? null : OffsetDateTime.parse(observed + offsetSuffix(weather)),
                air, water, wave, number(current, "wind_speed_10m"), integer(current, "relative_humidity_2m"),
                recommendation[0], recommendation[1], SOURCE);
    }

    public CoastalForecast forecast(String location, double latitude, double longitude, int days) {
        JsonNode marine = get(marineUrl, UriComponentsBuilder.fromHttpUrl(marineUrl)
                .queryParam("latitude", latitude).queryParam("longitude", longitude)
                .queryParam("hourly", "wave_height,sea_surface_temperature")
                .queryParam("forecast_days", days).queryParam("timezone", "auto")
                .build().encode().toUriString());
        JsonNode hourly = marine.path("hourly");
        JsonNode times = hourly.path("time");
        List<HourlyCondition> values = new ArrayList<>();
        for (int i = 0; i < times.size(); i++) {
            values.add(new HourlyCondition(LocalDateTime.parse(times.get(i).asText()),
                    at(hourly.path("sea_surface_temperature"), i), at(hourly.path("wave_height"), i)));
        }
        return new CoastalForecast(location, latitude, longitude,
                marine.path("timezone").asText("auto"), values, SOURCE);
    }

    private JsonNode get(String baseUrl, String url) {
        try {
            JsonNode node = http.getForObject(url, JsonNode.class);
            if (node == null || node.has("error") && node.path("error").asBoolean()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Resposta inválida do Open-Meteo");
            }
            return node;
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Não foi possível consultar o serviço Open-Meteo", ex);
        }
    }

    private String offsetSuffix(JsonNode response) {
        int seconds = response.path("utc_offset_seconds").asInt(0);
        return java.time.ZoneOffset.ofTotalSeconds(seconds).toString();
    }

    private Double nearest(JsonNode hourly, String key, String time) {
        JsonNode times = hourly.path("time");
        if (times.isEmpty()) return null;
        int best = 0;
        long distance = Long.MAX_VALUE;
        for (int i = 0; i < times.size(); i++) {
            long candidate = Math.abs(java.time.Duration.between(LocalDateTime.parse(times.get(i).asText()),
                    LocalDateTime.parse(time)).toMinutes());
            if (candidate < distance) { distance = candidate; best = i; }
        }
        return at(hourly.path(key), best);
    }

    private Double at(JsonNode values, int index) {
        return index < values.size() && !values.get(index).isNull() ? values.get(index).asDouble() : null;
    }
    private Double number(JsonNode node, String key) { return node.path(key).isNumber() ? node.path(key).asDouble() : null; }
    private Integer integer(JsonNode node, String key) { return node.path(key).isNumber() ? node.path(key).asInt() : null; }
    private String text(JsonNode node, String key) { return node.path(key).isTextual() ? node.path(key).asText() : null; }

    private String[] recommend(Double wave, Double water) {
        if (wave == null) return new String[]{"Dados indisponíveis", "Não foi possível avaliar as condições do mar agora."};
        if (wave >= 2.5) return new String[]{"Alerta de mar agitado", "Ondas altas. Consulte os avisos oficiais e evite entrar no mar."};
        if (wave >= 1.2) return new String[]{"Bom para surf", "Ondas moderadas; confira as condições locais antes de entrar."};
        if (wave <= 0.8 && water != null && water >= 20) return new String[]{"Condições favoráveis", "Mar relativamente calmo e água amena. Verifique as bandeiras da praia."};
        return new String[]{"Mar moderado", "Consulte as condições locais e as orientações dos guarda-vidas."};
    }
}
