package com.pokeauction.auction.api.dev;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevController {

    private final JwtProvider jwtProvider;

    @GetMapping("/token/{userId}")
    public ResponseEntity<String> token(@PathVariable Long userId) {
        String token = jwtProvider.createAccessToken(userId);
        return ResponseEntity.ok(token);
    }
}
