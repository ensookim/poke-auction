package com.pokeauction.auction.api.chat.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatSocketRequest {

    private String type;
    private Long roomId;
    private String content;
    private String imageUrl;
}
