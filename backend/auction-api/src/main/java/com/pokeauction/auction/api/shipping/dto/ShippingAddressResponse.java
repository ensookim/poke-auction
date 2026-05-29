package com.pokeauction.auction.api.shipping.dto;

import com.pokeauction.auction.api.shipping.domain.ShippingAddress;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ShippingAddressResponse {

    private Long id;
    private String recipientName;
    private String phoneNumber;
    private String address;
    private String addressDetail;
    private String deliveryMemo;
    private LocalDateTime updatedAt;

    public static ShippingAddressResponse from(ShippingAddress address) {
        return ShippingAddressResponse.builder()
                .id(address.getId())
                .recipientName(address.getRecipientName())
                .phoneNumber(address.getPhoneNumber())
                .address(address.getAddress())
                .addressDetail(address.getAddressDetail())
                .deliveryMemo(address.getDeliveryMemo())
                .updatedAt(address.getUpdatedAt())
                .build();
    }
}
