package com.pokeauction.auction.api.auction.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class TrackingInfoRequest {

    @NotBlank
    private String shippingCompany;

    @NotBlank
    private String trackingNumber;
}
