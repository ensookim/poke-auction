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
                        "2024 프리즘 루키 카드",
                        "상태: 민트\n언어: 영어\n슬리브 보관 중인 스포츠 루키 카드입니다.",
                        "Rookie",
                        "SINGLE",
                        "https://picsum.photos/seed/cardbid-rookie/400/560",
                        12000L,
                        1000L,
                        25000L,
                        48
                ),
                null
        );

        auctionService.createAuction(
                new CreateAuctionRequest(
                        "미개봉 트레이딩 카드 박스",
                        "상태: 미개봉\n구성품: 부스터 박스 1개\n외부 비닐 훼손 없는 상품입니다.",
                        "Sealed",
                        "SEALED",
                        "https://picsum.photos/seed/cardbid-sealed/400/560",
                        38000L,
                        2000L,
                        58000L,
                        36
                ),
                null
        );

        auctionService.createAuction(
                new CreateAuctionRequest(
                        "한정판 사인 카드 PSA 10",
                        "상태: 그레이딩\n인증: PSA 10\n케이스 스크래치가 거의 없는 한정판 카드입니다.",
                        "PSA 10",
                        "GRADED",
                        "https://picsum.photos/seed/cardbid-graded/400/560",
                        95000L,
                        5000L,
                        145000L,
                        72
                ),
                null
        );
    }
}
