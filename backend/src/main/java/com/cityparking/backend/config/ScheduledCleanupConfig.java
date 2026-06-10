package com.cityparking.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;

@Configuration
@EnableScheduling
public class ScheduledCleanupConfig {

    private static final Logger log = LoggerFactory.getLogger(ScheduledCleanupConfig.class);

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.cleanup.max-file-age-hours:24}")
    private int maxFileAgeHours;

    @Value("${app.cleanup.max-disk-usage-percent:90}")
    private int maxDiskUsagePercent;

    @Value("${app.cleanup.temp-dir:temp}")
    private String tempDir;

    private final AtomicLong totalFilesCleaned = new AtomicLong(0);
    private final AtomicLong totalBytesFreed = new AtomicLong(0);

    /**
     * Runs every hour to clean orphaned upload files older than configured age.
     */
    @Scheduled(fixedRate = 3600000, initialDelay = 60000)
    public void cleanupOrphanedUploads() {
        Path uploadsPath = Paths.get(uploadDir);
        if (!Files.exists(uploadsPath)) {
            log.debug("Upload directory does not exist, skipping cleanup: {}", uploadDir);
            return;
        }

        Instant cutoff = Instant.now().minus(Duration.ofHours(maxFileAgeHours));
        long filesCleaned = 0;
        long bytesFreed = 0;

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(uploadsPath)) {
            for (Path file : stream) {
                try {
                    if (Files.isRegularFile(file)) {
                        BasicFileAttributes attrs = Files.readAttributes(file, BasicFileAttributes.class);
                        if (attrs.lastModifiedTime().toInstant().isBefore(cutoff)) {
                            long size = attrs.size();
                            Files.delete(file);
                            filesCleaned++;
                            bytesFreed += size;
                            log.info("Cleaned orphaned file: {} ({} bytes)", file.getFileName(), size);
                        }
                    }
                } catch (IOException e) {
                    log.warn("Failed to process file during cleanup: {}", file, e);
                }
            }
        } catch (IOException e) {
            log.error("Failed to scan upload directory for cleanup: {}", uploadDir, e);
        }

        totalFilesCleaned.addAndGet(filesCleaned);
        totalBytesFreed.addAndGet(bytesFreed);

        if (filesCleaned > 0) {
            log.info("Cleanup completed: {} files removed, {} bytes freed", filesCleaned, bytesFreed);
        }
    }

    /**
     * Runs every 30 minutes to clean temporary files.
     */
    @Scheduled(fixedRate = 1800000, initialDelay = 30000)
    public void cleanupTempFiles() {
        Path tempPath = Paths.get(tempDir);
        if (!Files.exists(tempPath)) {
            return;
        }

        Instant cutoff = Instant.now().minus(Duration.ofHours(1));
        long filesCleaned = 0;

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(tempPath)) {
            for (Path file : stream) {
                try {
                    if (Files.isRegularFile(file)) {
                        BasicFileAttributes attrs = Files.readAttributes(file, BasicFileAttributes.class);
                        if (attrs.lastModifiedTime().toInstant().isBefore(cutoff)) {
                            Files.delete(file);
                            filesCleaned++;
                        }
                    }
                } catch (IOException e) {
                    log.warn("Failed to delete temp file: {}", file, e);
                }
            }
        } catch (IOException e) {
            log.error("Failed to scan temp directory: {}", tempDir, e);
        }

        if (filesCleaned > 0) {
            log.info("Temp cleanup: {} files removed", filesCleaned);
        }
    }

    /**
     * Runs every 15 minutes to check disk space.
     */
    @Scheduled(fixedRate = 900000, initialDelay = 10000)
    public void checkDiskSpace() {
        Path uploadsPath = Paths.get(uploadDir);
        if (!Files.exists(uploadsPath)) {
            return;
        }

        try {
            long totalSpace = uploadsPath.toFile().getTotalSpace();
            long usableSpace = uploadsPath.toFile().getUsableSpace();
            double usagePercent = ((double)(totalSpace - usableSpace) / totalSpace) * 100;

            if (usagePercent > maxDiskUsagePercent) {
                log.error("DISK SPACE WARNING: Usage at {:.1f}% (threshold: {}%)",
                        usagePercent, maxDiskUsagePercent);
                emergencyCleanup(uploadsPath);
            } else if (usagePercent > maxDiskUsagePercent - 10) {
                log.warn("Disk space approaching threshold: {:.1f}% used", usagePercent);
            }
        } catch (Exception e) {
            log.error("Failed to check disk space", e);
        }
    }

    private void emergencyCleanup(Path uploadsPath) {
        log.warn("Initiating emergency cleanup of oldest files");
        Instant cutoff = Instant.now().minus(Duration.ofHours(6));
        long cleaned = 0;

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(uploadsPath)) {
            for (Path file : stream) {
                try {
                    if (Files.isRegularFile(file)) {
                        BasicFileAttributes attrs = Files.readAttributes(file, BasicFileAttributes.class);
                        if (attrs.lastModifiedTime().toInstant().isBefore(cutoff)) {
                            Files.delete(file);
                            cleaned++;
                        }
                    }
                } catch (IOException e) {
                    log.warn("Emergency cleanup failed for: {}", file, e);
                }
            }
        } catch (IOException e) {
            log.error("Emergency cleanup scan failed", e);
        }

        log.info("Emergency cleanup removed {} files", cleaned);
    }

    public long getTotalFilesCleaned() {
        return totalFilesCleaned.get();
    }

    public long getTotalBytesFreed() {
        return totalBytesFreed.get();
    }
}