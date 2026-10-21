package dev.oceanhub.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI oceanOpenApi() {
        return new OpenAPI().info(new Info().title("Ocean & Weather API Hub")
                .description("Condições costeiras com dados públicos da Open-Meteo.")
                .version("1.0.0"));
    }
}
