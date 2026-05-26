package com.pokeauction.auction.api.social.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FollowStatusResponse {
    private Long userId;
    private boolean following;
}
