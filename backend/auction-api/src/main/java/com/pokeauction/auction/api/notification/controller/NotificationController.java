package com.pokeauction.auction.api.notification.controller;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.notification.dto.PushTokenRequest;
import com.pokeauction.auction.api.notification.service.PushNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final JwtProvider jwtProvider;
    private final PushNotificationService pushNotificationService;

    @PostMapping("/push-token")
    public void registerPushToken(
            @RequestBody @Valid PushTokenRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        pushNotificationService.registerToken(resolveUserId(authorization), request.getToken(), request.getPlatform());
    }

    private Long resolveUserId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
        }

        String token = authorization.substring(7);
        if (!jwtProvider.validateToken(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token.");
        }

        return jwtProvider.parseUserId(token);
    }
}
