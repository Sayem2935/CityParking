package com.cityparking.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

/**
 * Configuration that documents and validates AI provider setup.
 *
 * Bean selection is handled by @ConditionalOnProperty annotations on each
 * service implementation class:
 *
 * Vision providers (ai.provider.vision):
 *   - MockGeminiService: @ConditionalOnProperty(havingValue="mock", matchIfMissing=true)
 *   - GeminiServiceImpl: @ConditionalOnProperty(havingValue="gemini")
 *
 * Face providers (ai.provider.face):
 *   - MockFaceRecognitionService: @ConditionalOnProperty(havingValue="mock", matchIfMissing=true)
 *   - AwsRekognitionService: @ConditionalOnProperty(havingValue="aws")
 *
 * This config class validates that required credentials are present when
 * real providers are selected, and logs the active provider configuration
 * at startup.
 */
@Configuration
public class AiProviderConfig {

    private static final Logger log = LoggerFactory.getLogger(AiProviderConfig.class);

    private final GeminiProperties geminiProperties;
    private final AwsProperties awsProperties;

    @Value("${ai.provider.face:mock}")
    private String faceProvider;

    @Value("${ai.provider.vision:mock}")
    private String visionProvider;

    public AiProviderConfig(GeminiProperties geminiProperties, AwsProperties awsProperties) {
        this.geminiProperties = geminiProperties;
        this.awsProperties = awsProperties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("============================================================");
        log.info("  AI Provider Configuration");
        log.info("============================================================");
        log.info("  Face Provider  : {}", faceProvider);
        log.info("  Vision Provider: {}", visionProvider);

        if ("gemini".equals(visionProvider)) {
            if (geminiProperties.hasApiKey()) {
                log.info("  Gemini API Key : [CONFIGURED]");
            } else {
                log.warn("  Gemini API Key : [NOT SET] - Set GEMINI_API_KEY environment variable!");
            }
            log.info("  Gemini Model   : {}", geminiProperties.getModel());
            log.info("  Gemini URL     : {}", geminiProperties.getBaseUrl());
        }

        if ("aws".equals(faceProvider)) {
            if (awsProperties.hasCredentials()) {
                log.info("  AWS Credentials: [CONFIGURED]");
            } else {
                log.warn("  AWS Credentials: [NOT SET] - Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY!");
            }
            log.info("  AWS Region     : {}", awsProperties.getRegion());
            log.info("  AWS Collection : {}", awsProperties.getCollectionId());
        }

        log.info("============================================================");
    }
}