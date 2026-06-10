package com.cityparking.backend.service.ai;

import java.util.List;

/**
 * Result of parking slot detection from an image.
 */
public class ParkingDetectionResult {

    private int totalSlots;
    private int occupiedSlots;
    private int freeSlots;
    private double confidence;
    private List<SlotDetail> slots;

    public ParkingDetectionResult() {
    }

    public ParkingDetectionResult(int totalSlots, int occupiedSlots, int freeSlots, double confidence, List<SlotDetail> slots) {
        this.totalSlots = totalSlots;
        this.occupiedSlots = occupiedSlots;
        this.freeSlots = freeSlots;
        this.confidence = confidence;
        this.slots = slots;
    }

    public int getTotalSlots() {
        return totalSlots;
    }

    public void setTotalSlots(int totalSlots) {
        this.totalSlots = totalSlots;
    }

    public int getOccupiedSlots() {
        return occupiedSlots;
    }

    public void setOccupiedSlots(int occupiedSlots) {
        this.occupiedSlots = occupiedSlots;
    }

    public int getFreeSlots() {
        return freeSlots;
    }

    public void setFreeSlots(int freeSlots) {
        this.freeSlots = freeSlots;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public List<SlotDetail> getSlots() {
        return slots;
    }

    public void setSlots(List<SlotDetail> slots) {
        this.slots = slots;
    }

    public static class SlotDetail {
        private String slotId;
        private boolean occupied;
        private double confidence;
        private String zone;

        public SlotDetail() {
        }

        public SlotDetail(String slotId, boolean occupied, double confidence, String zone) {
            this.slotId = slotId;
            this.occupied = occupied;
            this.confidence = confidence;
            this.zone = zone;
        }

        public String getSlotId() {
            return slotId;
        }

        public void setSlotId(String slotId) {
            this.slotId = slotId;
        }

        public boolean isOccupied() {
            return occupied;
        }

        public void setOccupied(boolean occupied) {
            this.occupied = occupied;
        }

        public double getConfidence() {
            return confidence;
        }

        public void setConfidence(double confidence) {
            this.confidence = confidence;
        }

        public String getZone() {
            return zone;
        }

        public void setZone(String zone) {
            this.zone = zone;
        }
    }
}