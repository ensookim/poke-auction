package com.pokeauction.auction.api.commerce.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CollectionStatusResponse {
    private Long auctionId;
    private boolean wished;
    private boolean inCart;
}
