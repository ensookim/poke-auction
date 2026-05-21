package com.pokeauction.auction.api.common;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.auction.service.AuctionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final AuctionRepository auctionRepository;
    private final AuctionService auctionService;

    @Override
    public void run(ApplicationArguments args) {
        if (auctionRepository.count() > 0) {
            return;
        }

        auctionService.createAuction(
                new CreateAuctionRequest(
                        "피카츄",
                        "전기 속성 포켓몬 카드입니다.",
                        "Rare",
                        "SINGLE",
                        "https://assets.pokemon.com/assets/cms2/img/cards/web/XY11/010_hires.png",
                        1200L,
                        100L,
                        null,
                        48
                ),
                null
        );

        auctionService.createAuction(
                new CreateAuctionRequest(
                        "이상해씨",
                        "풀 속성 스타팅 포켓몬 카드입니다.",
                        "Uncommon",
                        "SEALED",
                        "https://assets.pokemon.com/assets/cms2/img/cards/web/SM/001.png",
                        800L,
                        50L,
                        null,
                        36
                ),
                null
        );

        auctionService.createAuction(
                new CreateAuctionRequest(
                        "리자몽",
                        "불 속성 전설의 포켓몬 카드입니다.",
                        "Ultra Rare",
                        "GRADED",
                        "https://assets.pokemon.com/assets/cms2/img/cards/web/XY7/006_hires.png",
                        5000L,
                        300L,
                        null,
                        72
                ),
                null
        );
    }
}
