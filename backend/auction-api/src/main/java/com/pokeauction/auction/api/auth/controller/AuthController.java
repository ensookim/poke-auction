package com.pokeauction.auction.api.auth.controller;

import com.pokeauction.auction.api.auth.dto.KakaoLoginRequest;
import com.pokeauction.auction.api.auth.dto.LoginResponse;
import com.pokeauction.auction.api.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}