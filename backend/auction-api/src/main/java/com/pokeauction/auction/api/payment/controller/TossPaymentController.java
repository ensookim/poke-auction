package com.pokeauction.auction.api.payment.controller;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.payment.dto.TossPaymentConfirmRequest;
import com.pokeauction.auction.api.payment.dto.TossPaymentConfirmResponse;
import com.pokeauction.auction.api.payment.dto.TossPaymentPrepareResponse;
import com.pokeauction.auction.api.payment.service.TossPaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/payments/toss")
@RequiredArgsConstructor
public class TossPaymentController {

    private final TossPaymentService tossPaymentService;
    private final JwtProvider jwtProvider;

    @PostMapping("/auctions/{auctionId}/prepare")
    public TossPaymentPrepareResponse prepareAuction(
            @PathVariable Long auctionId,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest servletRequest
    ) {
        try {
            return tossPaymentService.prepareAuctionPayment(
                    auctionId,
                    resolveUserId(authorization),
                    getRequestBaseUrl(servletRequest)
            );
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @PostMapping("/cart/prepare")
    public TossPaymentPrepareResponse prepareCart(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest servletRequest
    ) {
        try {
            return tossPaymentService.prepareCartPayment(
                    resolveUserId(authorization),
                    getRequestBaseUrl(servletRequest)
            );
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @PostMapping("/confirm")
    public TossPaymentConfirmResponse confirm(
            @RequestBody @Valid TossPaymentConfirmRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            return tossPaymentService.confirm(resolveUserId(authorization), request);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping(value = "/widget", produces = MediaType.TEXT_HTML_VALUE)
    public String widget(@RequestParam String orderId) {
        return tossPaymentService.renderWidgetPage(orderId);
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

    private String getRequestBaseUrl(HttpServletRequest request) {
        return request.getRequestURL()
                .toString()
                .replace(request.getRequestURI(), "");
    }
}
