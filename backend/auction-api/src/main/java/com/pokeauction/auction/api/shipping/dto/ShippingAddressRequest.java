package com.pokeauction.auction.api.shipping.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ShippingAddressRequest {

    @NotBlank
    @Size(max = 80)
    private String recipientName;

    @NotBlank
    @Size(max = 30)
    private String phoneNumber;

    @NotBlank
    @Size(max = 300)
    private String address;

    @Size(max = 300)
    private String addressDetail;

    @Size(max = 300)
    private String deliveryMemo;
}
