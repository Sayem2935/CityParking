package com.cityparking.backend.service;

import com.cityparking.backend.dto.auth.AuthResponse;
import com.cityparking.backend.dto.auth.LoginRequest;
import com.cityparking.backend.dto.auth.RegisterRequest;
import com.cityparking.backend.dto.user.UserResponse;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.exception.BadRequestException;
import com.cityparking.backend.exception.DuplicateResourceException;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Tests")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserDetailsService userDetailsService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRegisterRequest;
    private LoginRequest validLoginRequest;
    private User savedUser;
    private UserDetails mockUserDetails;

    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequest();
        validRegisterRequest.setFirstName("John");
        validRegisterRequest.setLastName("Doe");
        validRegisterRequest.setEmail("john@example.com");
        validRegisterRequest.setPassword("SecurePass123!");
        validRegisterRequest.setPhone("+1234567890");

        validLoginRequest = new LoginRequest();
        validLoginRequest.setEmail("john@example.com");
        validLoginRequest.setPassword("SecurePass123!");

        savedUser = new User();
        savedUser.setId(1L);
        savedUser.setFirstName("John");
        savedUser.setLastName("Doe");
        savedUser.setEmail("john@example.com");
        savedUser.setPassword("encoded_password");
        savedUser.setPhone("+1234567890");

        mockUserDetails = mock(UserDetails.class);
    }

    @Nested
    @DisplayName("Register Tests")
    class RegisterTests {

        @Test
        @DisplayName("Should register a new user successfully")
        void register_Success() {
            when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
            when(passwordEncoder.encode("SecurePass123!")).thenReturn("encoded_password");
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(userDetailsService.loadUserByUsername("john@example.com")).thenReturn(mockUserDetails);
            when(jwtTokenProvider.generateToken(any(UserDetails.class))).thenReturn("jwt-token");

            AuthResponse response = authService.register(validRegisterRequest);

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("jwt-token");
            assertThat(response.getUser()).isNotNull();
            verify(userRepository).existsByEmail("john@example.com");
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("Should throw exception when email already exists")
        void register_DuplicateEmail() {
            when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

            assertThatThrownBy(() -> authService.register(validRegisterRequest))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("Email is already registered");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should encode password before saving")
        void register_PasswordEncoding() {
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encoded_password");
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(userDetailsService.loadUserByUsername(anyString())).thenReturn(mockUserDetails);
            when(jwtTokenProvider.generateToken(any(UserDetails.class))).thenReturn("jwt-token");

            authService.register(validRegisterRequest);

            verify(passwordEncoder).encode("SecurePass123!");
        }
    }

    @Nested
    @DisplayName("Login Tests")
    class LoginTests {

        @Test
        @DisplayName("Should login successfully with valid credentials")
        void login_Success() {
            Authentication auth = mock(Authentication.class);
            when(auth.getPrincipal()).thenReturn(mockUserDetails);
            when(authenticationManager.authenticate(any())).thenReturn(auth);
            when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(savedUser));
            when(jwtTokenProvider.generateToken(any(UserDetails.class))).thenReturn("jwt-token");

            AuthResponse response = authService.login(validLoginRequest);

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("jwt-token");
            verify(authenticationManager).authenticate(any());
        }

        @Test
        @DisplayName("Should throw exception for non-existent user")
        void login_UserNotFound() {
            Authentication auth = mock(Authentication.class);
            when(auth.getPrincipal()).thenReturn(mockUserDetails);
            when(authenticationManager.authenticate(any())).thenReturn(auth);
            when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

            LoginRequest unknownLogin = new LoginRequest();
            unknownLogin.setEmail("unknown@example.com");
            unknownLogin.setPassword("password");

            // The method throws RuntimeException when user not found after auth
            assertThatThrownBy(() -> authService.login(unknownLogin))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("User not found");
        }

        @Test
        @DisplayName("Should throw exception for bad credentials")
        void login_BadCredentials() {
            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("Bad credentials"));

            assertThatThrownBy(() -> authService.login(validLoginRequest))
                    .isInstanceOf(BadCredentialsException.class);
        }
    }
}