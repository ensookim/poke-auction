package com.pokeauction.auction.api.social.controller;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.social.dto.FollowStatsResponse;
import com.pokeauction.auction.api.social.dto.FollowStatusResponse;
import com.pokeauction.auction.api.social.dto.FollowUserResponse;
import com.pokeauction.auction.api.social.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;
    private final JwtProvider jwtProvider;

    @GetMapping("/follow/stats")
    public FollowStatsResponse stats(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return followService.getStats(resolveUserId(authorization));
    }

    @GetMapping("/following")
    public List<FollowUserResponse> following(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return followService.getFollowing(resolveUserId(authorization));
    }

    @GetMapping("/followers")
    public List<FollowUserResponse> followers(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return followService.getFollowers(resolveUserId(authorization));
    }

    @GetMapping("/follow/{userId}/status")
    public FollowStatusResponse status(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return followService.status(resolveUserId(authorization), userId);
    }

    @PostMapping("/follow/{userId}")
    public FollowStatusResponse follow(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            return followService.follow(resolveUserId(authorization), userId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @DeleteMapping("/follow/{userId}")
    public FollowStatusResponse unfollow(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return followService.unfollow(resolveUserId(authorization), userId);
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
