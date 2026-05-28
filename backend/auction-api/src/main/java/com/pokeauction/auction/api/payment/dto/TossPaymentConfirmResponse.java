package com.pokeauction.auction.api.payment.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TossPaymentConfirmResponse {
    private String orderId;
    private String paymentKey;
    private Long amount;
    private String status;
}
