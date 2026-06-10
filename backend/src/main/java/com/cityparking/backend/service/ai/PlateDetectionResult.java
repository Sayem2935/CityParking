package com.cityparking.backend.service.ai;

/**
 * Result of license plate detection from an image.
 */
public class PlateDetectionResult {

    private String plateNumber;
    private double confidence;
    private String vehicleType;
    private String vehicleColor;
    private BoundingBox boundingBox;

    public PlateDetectionResult() {
    }

    public PlateDetectionResult(String plateNumber, double confidence, String vehicleType, String vehicleColor, BoundingBox boundingBox) {
        this.plateNumber = plateNumber;
        this.confidence = confidence;
        this.vehicleType = vehicleType;
        this.vehicleColor = vehicleColor;
        this.boundingBox = boundingBox;
    }

    public String getPlateNumber() {
        return plateNumber;
    }

    public void setPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehicleColor() {
        return vehicleColor;
    }

    public void setVehicleColor(String vehicleColor) {
        this.vehicleColor = vehicleColor;
    }

    public BoundingBox getBoundingBox() {
        return boundingBox;
    }

    public void setBoundingBox(BoundingBox boundingBox) {
        this.boundingBox = boundingBox;
    }

    public static class BoundingBox {
        private int x;
        private int y;
        private int width;
        private int height;

        public BoundingBox() {
        }

        public BoundingBox(int x, int y, int width, int height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }

        public int getX() {
            return x;
        }

        public void setX(int x) {
            this.x = x;
        }

        public int getY() {
            return y;
        }

        public void setY(int y) {
            this.y = y;
        }

        public int getWidth() {
            return width;
        }

        public void setWidth(int width) {
            this.width = width;
        }

        public int getHeight() {
            return height;
        }

        public void setHeight(int height) {
            this.height = height;
        }
    }
}