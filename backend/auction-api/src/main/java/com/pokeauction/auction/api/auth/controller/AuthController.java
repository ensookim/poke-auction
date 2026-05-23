package com.pokeauction.auction.api.auth.controller;

import com.pokeauction.auction.api.auth.dto.KakaoLoginRequest;
import com.pokeauction.auction.api.auth.dto.LoginResponse;
import com.pokeauction.auction.api.auth.dto.RefreshTokenRequest;
import com.pokeauction.auction.api.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.mobile-redirect-url:exp://localhost:8081/--/login-success}")
    private String mobileRedirectUrl;

    @PostMapping("/kakao")
    public ResponseEntity<LoginResponse> kakaoLogin(
            @RequestBody KakaoLoginRequest request
    ) {
        LoginResponse response = authService.kakaoLogin(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @RequestBody RefreshTokenRequest request
    ) {
        try {
            return ResponseEntity.ok(authService.refresh(request));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ex.getMessage(), ex);
        }
    }

    @GetMapping("/kakao/callback")
    public void kakaoCallback(
            @RequestParam String code,
            @RequestParam(required = false) String state,
            HttpServletRequest servletRequest,
            HttpServletResponse response
    ) throws IOException {
        String redirectUri = servletRequest.getRequestURL().toString();

        KakaoLoginRequest request = KakaoLoginRequest.builder()
                .code(code)
                .redirectUri(redirectUri)
                .build();

        LoginResponse loginResponse = authService.kakaoLogin(request);

        String appRedirectBaseUrl = state == null || state.isBlank()
                ? mobileRedirectUrl
                : state;

        String appRedirectUrl =
                appRedirectBaseUrl
                        + "?accessToken=" + URLEncoder.encode(loginResponse.getAccessToken(), StandardCharsets.UTF_8)
                        + "&refreshToken=" + URLEncoder.encode(loginResponse.getRefreshToken(), StandardCharsets.UTF_8)
                        + "&userId=" + loginResponse.getUserId()
                        + "&nickname=" + URLEncoder.encode(loginResponse.getNickname(), StandardCharsets.UTF_8)
                        + "&isNewUser=" + loginResponse.isNewUser();

        response.sendRedirect(appRedirectUrl);
    }
}
