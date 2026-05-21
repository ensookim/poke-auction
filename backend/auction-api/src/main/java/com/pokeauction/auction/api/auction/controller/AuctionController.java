package com.pokeauction.auction.api.auction.controller;

import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.service.AuctionService;
import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.bid.dto.PlaceBidRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/auctions")
@RequiredArgsConstructor
public class AuctionController {

    private final AuctionService auctionService;
    private final JwtProvider jwtProvider;

    @GetMapping
    public List<AuctionResponse> listAuctions(
            @RequestParam(required = false) String category,
            @RequestParam(required = false, defaultValue = "hot") String sort,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly
    ) {
        return auctionService.listAuctions(category, sort, activeOnly);
    }

    @PostMapping
    public AuctionResponse createAuction(
            @RequestBody @Valid CreateAuctionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        return auctionService.createAuction(request, userId);
    }

    @PostMapping("/{id}/bid")
    public AuctionResponse placeBid(
            @PathVariable Long id,
            @RequestBody @Valid PlaceBidRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest servletRequest
    ) {
        Long userId = resolveUserId(authorization);
        try {
            String ip = servletRequest.getRemoteAddr();
            String device = servletRequest.getHeader("X-Device-Id");
            String ua = servletRequest.getHeader("User-Agent");

            return auctionService.placeBid(id, userId, request.getAmount(), ip, device, ua);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @PostMapping("/{id}/buy-now")
    public AuctionResponse buyNow(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest servletRequest
    ) {
        Long userId = resolveUserId(authorization);
        try {
            String ip = servletRequest.getRemoteAddr();
            String device = servletRequest.getHeader("X-Device-Id");
            String ua = servletRequest.getHeader("User-Agent");

            return auctionService.buyNow(id, userId, ip, device, ua);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping("/{id}")
    public AuctionResponse getAuction(@PathVariable Long id) {
        return auctionService.getAuctionDetails(id);
    }

    @GetMapping("/my-bids")
    public List<AuctionResponse> myBids(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        return auctionService.getAuctionsByBidder(userId);
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
