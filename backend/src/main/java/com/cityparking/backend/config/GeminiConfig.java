package com.cityparking.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Configuration for Google Gemini Vision API.
 * Creates the WebClient bean used by GeminiServiceImpl for API calls.
 *
 * Properties are loaded by GeminiProperties (@ConfigurationProperties(prefix = "gemini")).
 * This class only creates beans - it does NOT own the properties binding.
 */
@Configuration
@Slf4j
public class GeminiConfig {

    @Bean
    @Qualifier("geminiWebClient")
    public WebClient geminiWebClient(GeminiProperties properties) {
        // Allow up to 10MB for base64 image payloads
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();

        WebClient client = WebClient.builder()
                .baseUrl(properties.getBaseUrl())
                .exchangeStrategies(strategies)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();

        log.info("Gemini WebClient configured with base URL: {}, model: {}", properties.getBaseUrl(), properties.getModel());
        return client;
    }
}