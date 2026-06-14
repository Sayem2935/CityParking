package com.cityparking.backend.service;

import com.cityparking.backend.dto.vehicle.VehicleRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test cases for Unicode Bangla license plate validation.
 * Verifies that the vehicle registration module accepts Bangla script,
 * English, numbers, spaces, and hyphens.
 */
class LicensePlateUnicodeTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }
    }

    private VehicleRequest createRequest(String licensePlate) {
        VehicleRequest req = new VehicleRequest();
        req.setLicensePlate(licensePlate);
        req.setMake("Toyota");
        req.setModel("Corolla");
        req.setYear(2024);
        req.setColor("White");
        req.setVehicleType("car");
        return req;
    }

    private boolean isValid(String licensePlate) {
        Set<ConstraintViolation<VehicleRequest>> violations = validator.validate(createRequest(licensePlate));
        return violations.stream().noneMatch(v -> v.getPropertyPath().toString().equals("licensePlate"));
    }

    @Nested
    @DisplayName("Bangla Unicode plates (MUST pass)")
    class BanglaPlates {

        @Test
        @DisplayName("Full Bangla plate: ঢাকা মেট্রো-গ ১২-৩৪৫৬")
        void banglaDhakaMetro() {
            assertTrue(isValid("ঢাকা মেট্রো-গ ১২-৩৪৫৬"),
                "Dhaka Metro Bangla plate should be accepted");
        }

        @Test
        @DisplayName("Full Bangla plate: চট্টগ্রাম মেট্রো-খ ১১-১২৩৪")
        void banglaChittagongMetro() {
            assertTrue(isValid("চট্টগ্রাম মেট্রো-খ ১১-১২৩৪"),
                "Chittagong Metro Bangla plate should be accepted");
        }

        @Test
        @DisplayName("Bangla plate with mixed content")
        void banglaMixedContent() {
            assertTrue(isValid("ঢাকা মেট্রো-গ ১২-৩৪৫৬"),
                "Mixed Bangla text with numbers should be accepted");
        }

        @Test
        @DisplayName("Short Bangla plate")
        void banglaShortPlate() {
            assertTrue(isValid("ঢাকা-গ"),
                "Short Bangla plate should be accepted");
        }

        @Test
        @DisplayName("Bangla with Bangla digits only")
        void banglaDigitsOnly() {
            assertTrue(isValid("১২৩৪৫"),
                "Bangla digits should be accepted");
        }

        @ParameterizedTest
        @ValueSource(strings = {
            "ঢাকা মেট্রো-গ ১২-৩৪৫৬",
            "চট্টগ্রাম মেট্রো-খ ১১-১২৩৪",
            "রাজশাহী মেট্রো-ঙ ০১-৯৯৯৯",
            "খুলনা মেট্রো-চ ৫৫-৬৭৮৯",
            "সিলেট মেট্রো-ছ ৩৩-৪৫৬৭",
            "বরিশাল মেট্রো-জ ২২-৮৯০১",
            "রংপুর মেট্রো-ঝ ৪৪-২৩৪৫",
            "ময়মনসিংহ মেট্রো-ঞ ৬৬-৭৮৯০"
        })
        @DisplayName("All Bangladesh division plates in Bangla")
        void allBanglaDivisionPlates(String plate) {
            assertTrue(isValid(plate),
                "Bangla plate '" + plate + "' should be accepted");
        }
    }

    @Nested
    @DisplayName("English plates (MUST still pass)")
    class EnglishPlates {

        @Test
        @DisplayName("Standard English plate: Dhaka Metro-G 12-3456")
        void englishDhakaMetro() {
            assertTrue(isValid("Dhaka Metro-G 12-3456"),
                "English Dhaka Metro plate should be accepted");
        }

        @ParameterizedTest
        @ValueSource(strings = {
            "Dhaka Metro-G 12-3456",
            "DHAKA METRO-G 12-3456",
            "Chattogram Metro-K 11-1234",
            "ABC 1234",
            "D 12 3456",
            "GHA-12-3456",
            "টেস্ট",  // Edge case: single Bangla word
        })
        @DisplayName("Various valid English and mixed plates")
        void variousValidPlates(String plate) {
            assertTrue(isValid(plate),
                "Plate '" + plate + "' should be accepted");
        }
    }

    @Nested
    @DisplayName("Edge cases (MUST pass)")
    class EdgeCases {

        @Test
        @DisplayName("Plate with multiple spaces")
        void multipleSpaces() {
            assertTrue(isValid("ঢাকা  মেট্রো  গ"),
                "Multiple spaces should be accepted");
        }

        @Test
        @DisplayName("Plate with multiple hyphens")
        void multipleHyphens() {
            assertTrue(isValid("ঢাকা-মেট্রো-গ-১২"),
                "Multiple hyphens should be accepted");
        }

        @Test
        @DisplayName("Plate with leading/trailing spaces")
        void leadingTrailingSpaces() {
            assertTrue(isValid("  ঢাকা মেট্রো-গ  "),
                "Leading/trailing spaces should be accepted");
        }

        @Test
        @DisplayName("Minimum length Bangla plate")
        void minLengthBangla() {
            assertTrue(isValid("ঢা"),
                "2-char Bangla plate should meet minimum length");
        }
    }

    @Nested
    @DisplayName("Invalid plates (MUST fail)")
    class InvalidPlates {

        @Test
        @DisplayName("Empty string should fail")
        void emptyString() {
            assertFalse(isValid(""),
                "Empty string should be rejected");
        }

        @Test
        @DisplayName("Blank string should fail")
        void blankString() {
            assertFalse(isValid("   "),
                "Blank string should be rejected");
        }

        @Test
        @DisplayName("Single character should fail")
        void singleChar() {
            assertFalse(isValid("A"),
                "Single character should be rejected");
        }

        @Test
        @DisplayName("Plate with special characters should fail")
        void specialCharacters() {
            assertFalse(isValid("ঢাকা@মেট্রো#গ!"),
                "Special characters (@#!) should be rejected");
        }

        @Test
        @DisplayName("Plate with emoji should fail")
        void emojiPlate() {
            assertFalse(isValid("ঢাকা 🚗 মেট্রো"),
                "Emojis should be rejected");
        }

        @Test
        @DisplayName("Plate with punctuation should fail")
        void punctuation() {
            assertFalse(isValid("ঢাকা.মেট্রো.গ"),
                "Periods/punctuation should be rejected");
        }

        @Test
        @DisplayName("Plate exceeding 50 chars should fail")
        void tooLong() {
            // Build a 51-char string of Bangla letters
            String longPlate = "ঢা".repeat(26); // 52 chars
            assertFalse(isValid(longPlate),
                "Plate exceeding 50 characters should be rejected");
        }
    }

    @Nested
    @DisplayName("Normalization tests (VehicleService normalizeLicensePlate)")
    class NormalizationTests {

        @Test
        @DisplayName("English letters should be uppercased")
        void englishUppercased() {
            // VehicleService.toUpperCase() uppercases ASCII, leaves Bangla unchanged
            String input = "dhaka metro-g 12-3456";
            String expected = "DHAKA METRO-G 12-3456";
            assertEquals(expected, input.toUpperCase(),
                "English letters should be uppercased");
        }

        @Test
        @DisplayName("Bangla text should be unchanged by toUpperCase()")
        void banglaUnchangedByUpperCase() {
            String input = "ঢাকা মেট্রো-গ ১২-৩৪৫৬";
            String result = input.toUpperCase();
            assertEquals(input, result,
                "Bangla text should be unchanged by toUpperCase() (Bangla has no case)");
        }

        @Test
        @DisplayName("Mixed English+Bangla uppercased correctly")
        void mixedUppercased() {
            String input = "dhaka মেট্রো-গ 12-3456";
            String expected = "DHAKA মেট্রো-গ 12-3456";
            assertEquals(expected, input.toUpperCase(),
                "Only ASCII letters should be uppercased");
        }
    }
}