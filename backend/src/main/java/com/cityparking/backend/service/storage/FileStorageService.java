package com.cityparking.backend.service.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Abstraction for file storage operations.
 * Decouples service layer from specific storage implementations
 * (local filesystem, S3, Azure Blob, etc.).
 */
public interface FileStorageService {

    /**
     * Store a file and return the stored path.
     *
     * @param file          the multipart file to store
     * @param directory     the subdirectory within the storage root
     * @param filename      the desired filename (already sanitized)
     * @return the storage path/key that can be used to retrieve the file
     */
    String store(MultipartFile file, String directory, String filename);

    /**
     * Delete a previously stored file.
     *
     * @param storagePath the path/key returned from store()
     */
    void delete(String storagePath);

    /**
     * Check if a file exists at the given path.
     *
     * @param storagePath the path/key to check
     * @return true if the file exists
     */
    boolean exists(String storagePath);
}