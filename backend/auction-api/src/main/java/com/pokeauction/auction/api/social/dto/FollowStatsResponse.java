package com.pokeauction.auction.api.social.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FollowStatsResponse {
    private long followingCount;
    private long followerCount;
}
