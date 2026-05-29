package com.pokeauction.auction.api.auth.controller;

import com.pokeauction.auction.api.auth.dto.KakaoLoginRequest;
import com.pokeauction.auction.api.auth.dto.LoginResponse;
import com.pokeauction.auction.api.auth.dto.NicknameAvailabilityResponse;
import com.pokeauction.auction.api.auth.dto.RefreshTokenRequest;
import com.pokeauction.auction.api.auth.dto.UpdateNicknameRequest;
import com.pokeauction.auction.api.auth.service.JwtProvider;
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
    private final JwtProvider jwtProvider;

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

    @GetMapping("/nickname/available")
    public ResponseEntity<NicknameAvailabilityResponse> checkNicknameAvailable(
            @RequestParam String nickname
    ) {
        boolean available = authService.isNicknameAvailable(nickname);
        return ResponseEntity.ok(NicknameAvailabilityResponse.builder().available(available).build());
    }

    @PatchMapping("/nickname")
    public ResponseEntity<LoginResponse> updateNickname(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody UpdateNicknameRequest request
    ) {
        try {
            Long userId = resolveUserId(authorization);
            return ResponseEntity.ok(authService.updateNickname(userId, request));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> withdraw(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        authService.withdraw(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/agreements")
    public ResponseEntity<Void> agreeToRequiredPolicies(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        authService.agreeToRequiredPolicies(userId);
        return ResponseEntity.noContent().build();
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

    private Long resolveUserId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다.");
        }

        String token = authorization.substring(7);
        if (!jwtProvider.validateToken(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }
        return jwtProvider.parseUserId(token);
    }
}
