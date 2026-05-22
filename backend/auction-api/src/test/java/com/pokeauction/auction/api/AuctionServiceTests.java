package com.pokeauction.auction.api;

import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.service.AuctionService;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
@Transactional
class AuctionServiceTests {

    @Autowired
    private AuctionService auctionService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void placeBidShouldUpdateCurrentPrice() {
        User seller = userRepository.save(User.builder()
                .nickname("seller")
                .provider("KAKAO")
                .providerId("seller-provider-id")
                .role("USER")
                .build());

        User bidder = userRepository.save(User.builder()
                .nickname("bidder")
                .provider("KAKAO")
                .providerId("bidder-provider-id")
                .role("USER")
                .build());

        CreateAuctionRequest request = CreateAuctionRequest.builder()
                .cardName("루키 카드")
                .cardDescription("상태가 좋은 트레이딩 카드입니다.")
                .cardRarity("Rare")
                .imageUrl("https://example.com/card.png")
                .startingPrice(1500L)
                .minimumIncrement(100L)
                .durationHours(24)
                .build();

        AuctionResponse auction = auctionService.createAuction(request, seller.getId());
        assertThat(auction.getCurrentPrice()).isEqualTo(1500L);
        assertThat(auction.isActive()).isTrue();

        AuctionResponse updated = auctionService.placeBid(auction.getId(), bidder.getId(), 1700L, null, null, null);
        assertThat(updated.getCurrentPrice()).isEqualTo(1700L);
        assertThat(updated.getBidCount()).isEqualTo(1);
    }

    @Test
    void sellerCannotBidOnOwnAuction() {
        User seller = userRepository.save(User.builder()
                .nickname("seller")
                .provider("KAKAO")
                .providerId("seller-own-provider-id")
                .role("USER")
                .build());

        AuctionResponse auction = auctionService.createAuction(defaultAuctionRequest(), seller.getId());

        assertThatThrownBy(() -> auctionService.placeBid(auction.getId(), seller.getId(), 1700L, null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("자신의 경매에는 입찰할 수 없습니다.");
    }

    @Test
    void restrictedUserCannotBid() {
        User seller = userRepository.save(User.builder()
                .nickname("seller")
                .provider("KAKAO")
                .providerId("restricted-seller-provider-id")
                .role("USER")
                .build());

        User bidder = User.builder()
                .nickname("restricted-bidder")
                .provider("KAKAO")
                .providerId("restricted-bidder-provider-id")
                .role("USER")
                .build();
        bidder.applyRestrictionDays(7);
        User savedBidder = userRepository.save(bidder);

        AuctionResponse auction = auctionService.createAuction(defaultAuctionRequest(), seller.getId());

        assertThatThrownBy(() -> auctionService.placeBid(auction.getId(), savedBidder.getId(), 1700L, null, null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("입찰이 제한된 사용자입니다.");
    }

    @Test
    void buyNowPriceMustBeGreaterThanStartingPrice() {
        CreateAuctionRequest request = CreateAuctionRequest.builder()
                .cardName("한정판 카드")
                .startingPrice(1500L)
                .minimumIncrement(100L)
                .buyNowPrice(1500L)
                .durationHours(24)
                .build();

        assertThatThrownBy(() -> auctionService.createAuction(request, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("즉시 낙찰가는 시작가보다 커야 합니다.");
    }

    private CreateAuctionRequest defaultAuctionRequest() {
        return CreateAuctionRequest.builder()
                .cardName("루키 카드")
                .cardDescription("상태가 좋은 트레이딩 카드입니다.")
                .cardRarity("Rare")
                .imageUrl("https://example.com/card.png")
                .startingPrice(1500L)
                .minimumIncrement(100L)
                .durationHours(24)
                .build();
    }
}
