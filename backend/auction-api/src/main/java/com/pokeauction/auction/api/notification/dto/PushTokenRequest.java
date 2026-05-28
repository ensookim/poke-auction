package com.pokeauction.auction.api.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PushTokenRequest {

    @NotBlank
    private String token;

    private String platform;
}
