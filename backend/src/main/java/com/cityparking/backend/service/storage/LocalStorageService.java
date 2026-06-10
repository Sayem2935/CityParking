package com.cityparking.backend.service.storage;

import com.cityparking.backend.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Local filesystem implementation of FileStorageService.
 * Stores files on the local disk under a configurable base directory.
 */
@Service
@Slf4j
public class LocalStorageService implements FileStorageService {

    private final String baseUploadDir;

    public LocalStorageService(
            @Value("${app.upload.base-dir:uploads}") String baseUploadDir) {
        this.baseUploadDir = baseUploadDir;
        log.info("LocalStorageService initialized with base directory: {}", baseUploadDir);
    }

    @Override
    public String store(MultipartFile file, String directory, String filename) {
        Path targetDir = Paths.get(baseUploadDir, directory);
        try {
            Files.createDirectories(targetDir);
        } catch (IOException e) {
            log.error("Failed to create storage directory: {}", targetDir, e);
            throw new BadRequestException("Failed to create storage directory");
        }

        Path targetPath = targetDir.resolve(filename);
        try {
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.debug("File stored at: {}", targetPath);
            return targetPath.toString();
        } catch (IOException e) {
            log.error("Failed to store file to: {}", targetPath, e);
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    @Override
    public void delete(String storagePath) {
        if (storagePath == null) return;
        try {
            Path path = Paths.get(storagePath);
            boolean deleted = Files.deleteIfExists(path);
            if (deleted) {
                log.debug("Deleted file: {}", storagePath);
            } else {
                log.warn("File not found for deletion: {}", storagePath);
            }
        } catch (IOException e) {
            log.error("Failed to delete file: {}", storagePath, e);
        }
    }

    @Override
    public boolean exists(String storagePath) {
        if (storagePath == null) return false;
        return Files.exists(Paths.get(storagePath));
    }
}