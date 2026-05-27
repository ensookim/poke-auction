package com.pokeauction.auction.api.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class NicknameAvailabilityResponse {
    private boolean available;
}
