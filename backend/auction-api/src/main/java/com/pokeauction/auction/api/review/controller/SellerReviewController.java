package com.pokeauction.auction.api.review.controller;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.review.dto.SellerReviewRequest;
import com.pokeauction.auction.api.review.dto.SellerReviewResponse;
import com.pokeauction.auction.api.review.dto.SellerReviewSummaryResponse;
import com.pokeauction.auction.api.review.service.SellerReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/sellers/{sellerId}/reviews")
@RequiredArgsConstructor
public class SellerReviewController {

    private final SellerReviewService sellerReviewService;
    private final JwtProvider jwtProvider;

    @GetMapping
    public List<SellerReviewResponse> reviews(@PathVariable Long sellerId) {
        return sellerReviewService.getReviews(sellerId);
    }

    @GetMapping("/summary")
    public SellerReviewSummaryResponse summary(@PathVariable Long sellerId) {
        return sellerReviewService.getSummary(sellerId);
    }

    @PostMapping
    public SellerReviewResponse createOrUpdate(
            @PathVariable Long sellerId,
            @RequestBody @Valid SellerReviewRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            return sellerReviewService.createOrUpdateReview(sellerId, resolveUserId(authorization), request);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
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
