package com.pokeauction.auction.api.common;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.auction.service.AuctionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final AuctionRepository auctionRepository;
    private final AuctionService auctionService;

    @Override
    public void run(ApplicationArguments args) {
        sampleAuctions().stream()
                .filter(request -> !auctionRepository.existsByCardName(request.getCardName()))
                .forEach(request -> auctionService.createAuction(request, null));
    }

    private List<CreateAuctionRequest> sampleAuctions() {
        return List.of(
                new CreateAuctionRequest(
                        "포켓몬 피카츄 프로모 카드",
                        "상품형태: 단일 카드\n판본: 프로모\n보존상태: 최상\n언어: 한국어\n슬리브 보관 중인 포켓몬 프로모 카드입니다.",
                        "단일 카드 · 프로모 · 최상",
                        "POKEMON",
                        "https://picsum.photos/seed/cardbid-pokemon-pikachu/400/560",
                        12000L,
                        1000L,
                        25000L,
                        48
                ),
                new CreateAuctionRequest(
                        "포켓몬 리자몽 한정판 PSA 10",
                        "상품형태: 감정 카드\n판본: 한정판\n감정: PSA 10\n언어: 일본어\n케이스 상태가 좋은 인기 포켓몬 카드입니다.",
                        "감정 카드 · 한정판 · PSA 10",
                        "POKEMON",
                        "https://picsum.photos/seed/cardbid-pokemon-charizard/400/560",
                        180000L,
                        10000L,
                        260000L,
                        96
                ),
                new CreateAuctionRequest(
                        "유희왕 블랙 매지션 시크릿",
                        "상품형태: 감정 카드\n판본: 시크릿/레어\n감정: PSA 9\n언어: 일본어\n케이스 스크래치가 적은 감정 카드입니다.",
                        "감정 카드 · 시크릿/레어 · PSA 9",
                        "YUGIOH",
                        "https://picsum.photos/seed/cardbid-yugioh-magician/400/560",
                        38000L,
                        2000L,
                        58000L,
                        36
                ),
                new CreateAuctionRequest(
                        "유희왕 푸른 눈의 백룡 레어",
                        "상품형태: 단일 카드\n판본: 시크릿/레어\n보존상태: 상\n언어: 한국어\n모서리 눌림 없이 보관된 카드입니다.",
                        "단일 카드 · 시크릿/레어 · 상",
                        "YUGIOH",
                        "https://picsum.photos/seed/cardbid-yugioh-dragon/400/560",
                        52000L,
                        3000L,
                        76000L,
                        60
                ),
                new CreateAuctionRequest(
                        "원피스 루피 리더 패러렐",
                        "상품형태: 단일 카드\n판본: 한정판\n보존상태: 최상\n언어: 일본어\n더블 슬리브로 보관한 원피스 카드입니다.",
                        "단일 카드 · 한정판 · 최상",
                        "ONE_PIECE",
                        "https://picsum.photos/seed/cardbid-onepiece-luffy/400/560",
                        42000L,
                        2000L,
                        65000L,
                        24
                ),
                new CreateAuctionRequest(
                        "원피스 조로 프로모 카드",
                        "상품형태: 감정 카드\n판본: 프로모\n감정: BGS 9.5\n언어: 영어\n프로모 입고 후 보관만 한 상품입니다.",
                        "감정 카드 · 프로모 · BGS 9.5",
                        "ONE_PIECE",
                        "https://picsum.photos/seed/cardbid-onepiece-zoro/400/560",
                        76000L,
                        5000L,
                        115000L,
                        72
                ),
                new CreateAuctionRequest(
                        "한정판 스포츠 사인 카드 PSA 10",
                        "상품형태: 감정 카드\n판본: 사인/넘버드\n감정: PSA 10\n언어: 영어\n케이스 스크래치가 거의 없는 한정판 스포츠 카드입니다.",
                        "감정 카드 · 사인/넘버드 · PSA 10",
                        "SPORTS",
                        "https://picsum.photos/seed/cardbid-sports-sign/400/560",
                        95000L,
                        5000L,
                        145000L,
                        72
                ),
                new CreateAuctionRequest(
                        "NBA 루키 넘버드 카드 BGS 10",
                        "상품형태: 감정 카드\n판본: 사인/넘버드\n감정: BGS 10\n언어: 영어\n루키 시즌 넘버드 스포츠 카드입니다.",
                        "감정 카드 · 사인/넘버드 · BGS 10",
                        "SPORTS",
                        "https://picsum.photos/seed/cardbid-sports-rookie/400/560",
                        135000L,
                        10000L,
                        210000L,
                        120
                ),
                new CreateAuctionRequest(
                        "기타 애니메이션 카드 미개봉 박스",
                        "상품형태: 팩/박스\n판본: 일반판\n실링: 미개봉\n언어: 일본어\n실링 훼손 없는 미개봉 카드 박스입니다.",
                        "팩/박스 · 미개봉",
                        "ETC",
                        "https://picsum.photos/seed/cardbid-etc-sealed-box/400/560",
                        18000L,
                        1000L,
                        28000L,
                        30
                ),
                new CreateAuctionRequest(
                        "디지몬 오메가몬 프로모",
                        "상품형태: 감정 카드\n판본: 프로모\n감정: CGC 10\n언어: 한국어\n감정 완료된 디지몬 인기 프로모 카드입니다.",
                        "감정 카드 · 프로모 · CGC 10",
                        "DIGIMON",
                        "https://picsum.photos/seed/cardbid-digimon-omega/400/560",
                        64000L,
                        4000L,
                        98000L,
                        84
                )
        );
    }
}
