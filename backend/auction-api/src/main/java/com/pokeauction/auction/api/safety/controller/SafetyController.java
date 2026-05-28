package com.pokeauction.auction.api.safety.controller;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.safety.dto.BlockStatusResponse;
import com.pokeauction.auction.api.safety.dto.SafetyReportRequest;
import com.pokeauction.auction.api.safety.dto.SafetyReportResponse;
import com.pokeauction.auction.api.safety.service.SafetyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/safety")
@RequiredArgsConstructor
public class SafetyController {

    private final SafetyService safetyService;
    private final JwtProvider jwtProvider;

    @PostMapping("/reports")
    public SafetyReportResponse report(
            @RequestBody @Valid SafetyReportRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return safetyService.report(resolveUserId(authorization), request);
    }

    @GetMapping("/blocks/{userId}")
    public BlockStatusResponse blockStatus(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return safetyService.status(resolveUserId(authorization), userId);
    }

    @PostMapping("/blocks/{userId}")
    public BlockStatusResponse block(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            return safetyService.block(resolveUserId(authorization), userId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @DeleteMapping("/blocks/{userId}")
    public BlockStatusResponse unblock(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return safetyService.unblock(resolveUserId(authorization), userId);
    }

    private Long resolveUserId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }

        String token = authorization.substring(7);
        if (!jwtProvider.validateToken(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }

        return jwtProvider.parseUserId(token);
    }
}
