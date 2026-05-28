package com.pokeauction.auction.api.safety.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BlockStatusResponse {

    private Long userId;
    private boolean blocked;
}
