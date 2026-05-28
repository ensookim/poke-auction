package com.pokeauction.auction.api.commerce.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CheckoutResponse {
    private Long totalAmount;
    private int itemCount;
    private String paymentStatus;
    private List<CollectionItemResponse> items;
}
