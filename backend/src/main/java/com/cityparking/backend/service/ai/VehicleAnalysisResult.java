package com.cityparking.backend.service.ai;

/**
 * Result of vehicle analysis from an image.
 */
public class VehicleAnalysisResult {

    private String vehicleType;
    private String vehicleColor;
    private String make;
    private String model;
    private int yearEstimate;
    private double confidence;

    public VehicleAnalysisResult() {
    }

    public VehicleAnalysisResult(String vehicleType, String vehicleColor, String make, String model, int yearEstimate, double confidence) {
        this.vehicleType = vehicleType;
        this.vehicleColor = vehicleColor;
        this.make = make;
        this.model = model;
        this.yearEstimate = yearEstimate;
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

    public String getMake() {
        return make;
    }

    public void setMake(String make) {
        this.make = make;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public int getYearEstimate() {
        return yearEstimate;
    }

    public void setYearEstimate(int yearEstimate) {
        this.yearEstimate = yearEstimate;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }
}