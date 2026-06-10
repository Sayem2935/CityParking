package com.cityparking.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class AwsPropertiesTest {

    @Autowired
    private AwsProperties awsProperties;

    @Test
    void awsPropertiesLoaded() {
        assertNotNull(awsProperties);
    }

    @Test
    void accessKeyIdIsLoaded() {
        // In test profile, should be set from application-test.yml
        assertNotNull(awsProperties.getAccessKeyId());
    }

    @Test
    void secretAccessKeyIsLoaded() {
        assertNotNull(awsProperties.getSecretAccessKey());
    }

    @Test
    void regionIsLoaded() {
        assertNotNull(awsProperties.getRegion());
        assertEquals("us-east-1", awsProperties.getRegion());
    }

    @Test
    void collectionIdIsLoaded() {
        assertNotNull(awsProperties.getCollectionId());
        assertEquals("test-collection", awsProperties.getCollectionId());
    }

    @Test
    void rekognitionNestedPropertiesLoaded() {
        assertNotNull(awsProperties.getRekognition());
        assertEquals("test-collection", awsProperties.getRekognition().getCollectionId());
    }
}