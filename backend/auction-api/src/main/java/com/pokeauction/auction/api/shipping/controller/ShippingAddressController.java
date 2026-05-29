package com.pokeauction.auction.api.shipping.controller;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.shipping.dto.ShippingAddressRequest;
import com.pokeauction.auction.api.shipping.dto.ShippingAddressResponse;
import com.pokeauction.auction.api.shipping.service.ShippingAddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/shipping-address")
@RequiredArgsConstructor
public class ShippingAddressController {

    private final ShippingAddressService shippingAddressService;
    private final JwtProvider jwtProvider;

    @GetMapping
    public ShippingAddressResponse get(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return shippingAddressService.get(resolveUserId(authorization));
    }

    @PutMapping
    public ShippingAddressResponse save(
            @RequestBody @Valid ShippingAddressRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return shippingAddressService.save(resolveUserId(authorization), request);
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
