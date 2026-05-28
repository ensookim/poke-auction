package com.pokeauction.auction.api.payment.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TossPaymentPrepareResponse {
    private String clientKey;
    private String customerKey;
    private String orderId;
    private String orderName;
    private Long amount;
    private String checkoutUrl;
    private String successUrl;
    private String failUrl;
}
