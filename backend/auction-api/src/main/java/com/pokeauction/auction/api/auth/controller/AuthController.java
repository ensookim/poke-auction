package com.pokeauction.auction.api.auth.controller;

import com.pokeauction.auction.api.auth.dto.KakaoLoginRequest;
import com.pokeauction.auction.api.auth.dto.LoginResponse;
import com.pokeauction.auction.api.auth.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/kakao")
    public ResponseEntity<LoginResponse> kakaoLogin(
            @RequestBody KakaoLoginRequest request
    ) {
        LoginResponse response = authService.kakaoLogin(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/kakao/callback")
    public void kakaoCallback(
            @RequestParam String code,
            HttpServletResponse response
    ) throws IOException {
        String redirectUri = "http://192.168.45.112:8080/api/auth/kakao/callback";

        KakaoLoginRequest request = KakaoLoginRequest.builder()
                .code(code)
                .redirectUri(redirectUri)
                .build();

        LoginResponse loginResponse = authService.kakaoLogin(request);

        String appRedirectUrl =
                "exp://192.168.45.112:8081/--/login-success"
                        + "?accessToken=" + URLEncoder.encode(loginResponse.getAccessToken(), StandardCharsets.UTF_8)
                        + "&refreshToken=" + URLEncoder.encode(loginResponse.getRefreshToken(), StandardCharsets.UTF_8)
                        + "&userId=" + loginResponse.getUserId()
                        + "&nickname=" + URLEncoder.encode(loginResponse.getNickname(), StandardCharsets.UTF_8)
                        + "&isNewUser=" + loginResponse.isNewUser();

        response.sendRedirect(appRedirectUrl);
    }
}