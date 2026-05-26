package com.pokeauction.auction.api.social.dto;

import com.pokeauction.auction.api.user.domain.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FollowUserResponse {
    private Long userId;
    private String nickname;

    public static FollowUserResponse from(User user) {
        return FollowUserResponse.builder()
                .userId(user.getId())
                .nickname(user.getNickname())
                .build();
    }
}
