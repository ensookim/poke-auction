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
                        "포켓몬 피카츄 프로모 카드",
                        "판본: 프로모\n등급: 미감정\n상태: 민트\n언어: 한국어\n슬리브 보관 중인 포켓몬 프로모 카드입니다.",
                        "프로모 · 미감정",
                        "POKEMON",
                        "https://picsum.photos/seed/cardbid-pokemon/400/560",
                        12000L,
                        1000L,
                        25000L,
                        48
                ),
                null
        );

        auctionService.createAuction(
                new CreateAuctionRequest(
                        "유희왕 블랙 매지션 시크릿",
                        "판본: 시크릿/레어\n등급: PSA 9\n상태: 상급\n언어: 일본어\n케이스 스크래치가 적은 감정 카드입니다.",
                        "시크릿/레어 · PSA 9",
                        "YUGIOH",
                        "https://picsum.photos/seed/cardbid-yugioh/400/560",
                        38000L,
                        2000L,
                        58000L,
                        36
                ),
                null
        );

        auctionService.createAuction(
                new CreateAuctionRequest(
                        "한정판 스포츠 사인 카드 PSA 10",
                        "판본: 사인/넘버드\n등급: PSA 10\n상태: 민트\n언어: 영어\n케이스 스크래치가 거의 없는 한정판 스포츠 카드입니다.",
                        "사인/넘버드 · PSA 10",
                        "SPORTS",
                        "https://picsum.photos/seed/cardbid-sports/400/560",
                        95000L,
                        5000L,
                        145000L,
                        72
                ),
                null
        );
    }
}
