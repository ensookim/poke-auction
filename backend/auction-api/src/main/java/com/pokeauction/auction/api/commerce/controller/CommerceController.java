package com.pokeauction.auction.api.commerce.controller;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.commerce.dto.CheckoutResponse;
import com.pokeauction.auction.api.commerce.dto.CollectionItemResponse;
import com.pokeauction.auction.api.commerce.dto.CollectionStatusResponse;
import com.pokeauction.auction.api.commerce.service.CommerceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class CommerceController {

    private final CommerceService commerceService;
    private final JwtProvider jwtProvider;

    @GetMapping("/wishlist")
    public List<CollectionItemResponse> wishlist(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return commerceService.getWishlist(resolveUserId(authorization));
    }

    @PostMapping("/wishlist/{auctionId}")
    public CollectionStatusResponse addWishlist(
            @PathVariable Long auctionId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            return commerceService.addWishlist(resolveUserId(authorization), auctionId);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @DeleteMapping("/wishlist/{auctionId}")
    public CollectionStatusResponse removeWishlist(
            @PathVariable Long auctionId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return commerceService.removeWishlist(resolveUserId(authorization), auctionId);
    }

    @GetMapping("/cart")
    public List<CollectionItemResponse> cart(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return commerceService.getCart(resolveUserId(authorization));
    }

    @PostMapping("/cart/{auctionId}")
    public CollectionStatusResponse addCart(
            @PathVariable Long auctionId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            return commerceService.addCart(resolveUserId(authorization), auctionId);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @DeleteMapping("/cart/{auctionId}")
    public CollectionStatusResponse removeCart(
            @PathVariable Long auctionId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return commerceService.removeCart(resolveUserId(authorization), auctionId);
    }

    @GetMapping("/collections/{auctionId}")
    public CollectionStatusResponse status(
            @PathVariable Long auctionId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return commerceService.getStatus(resolveUserId(authorization), auctionId);
    }

    @PostMapping("/cart/checkout")
    public CheckoutResponse checkout(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            return commerceService.checkoutCart(resolveUserId(authorization));
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
