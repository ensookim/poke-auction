package com.pokeauction.auction.api.auction.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AuctionSocketRequest {

    private String type;
    private Long auctionId;
}
