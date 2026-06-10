package com.cityparking.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AWS configuration properties.
 *
 * Loads from application.yml under the 'aws' prefix.
 * All values must be set via environment variables — NO hardcoded credentials.
 *
 * Required environment variables:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION (default: us-east-1)
 *   AWS_COLLECTION_ID (default: cityparking-faces)
 */
@Data
@Component
@ConfigurationProperties(prefix = "aws")
public class AwsProperties {

    /**
     * AWS access key ID.
     * Environment variable: AWS_ACCESS_KEY_ID
     */
    private String accessKeyId;

    /**
     * AWS secret access key.
     * Environment variable: AWS_SECRET_ACCESS_KEY
     */
    private String secretAccessKey;

    /**
     * AWS region for Rekognition service.
     * Environment variable: AWS_REGION (default: us-east-1)
     */
    private String region = "us-east-1";

    /**
     * Rekognition-specific settings.
     */
    private Rekognition rekognition = new Rekognition();

    @Data
    public static class Rekognition {
        /**
         * Rekognition collection ID for storing face data.
         * Environment variable: AWS_COLLECTION_ID (default: cityparking-faces)
         */
        private String collectionId = "cityparking-faces";
    }

    /**
     * Convenience method to get collection ID.
     */
    public String getCollectionId() {
        return rekognition.getCollectionId();
    }

    /**
     * Check if AWS credentials are configured.
     */
    public boolean hasCredentials() {
        return accessKeyId != null && !accessKeyId.isEmpty()
                && secretAccessKey != null && !secretAccessKey.isEmpty();
    }
}
