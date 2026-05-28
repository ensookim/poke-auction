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
                .cardDescription("판본: 프로모\n등급: 미감정\n상태가 좋은 포켓몬 카드입니다.")
                .cardRarity("프로모 · 미감정")
                .cardCategory("POKEMON")
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

    @Test
    void safePaymentShouldHoldAndReleaseOnReceiptConfirmation() {
        User seller = userRepository.save(User.builder()
                .nickname("safe-seller")
                .provider("KAKAO")
                .providerId("safe-seller-provider-id")
                .role("USER")
                .build());

        User buyer = userRepository.save(User.builder()
                .nickname("safe-buyer")
                .provider("KAKAO")
                .providerId("safe-buyer-provider-id")
                .role("USER")
                .build());

        CreateAuctionRequest request = CreateAuctionRequest.builder()
                .cardName("Safe Card")
                .startingPrice(1500L)
                .minimumIncrement(100L)
                .buyNowPrice(5000L)
                .durationHours(24)
                .build();

        AuctionResponse auction = auctionService.createAuction(request, seller.getId());
        AuctionResponse bought = auctionService.buyNow(auction.getId(), buyer.getId(), null, null, null);

        assertThat(bought.getPaymentStatus()).isEqualTo("PENDING");

        AuctionResponse paid = auctionService.payAuction(bought.getId(), buyer.getId());

        assertThat(paid.getPaymentStatus()).isEqualTo("HELD");
        assertThat(paid.getPaymentAmount()).isEqualTo(5000L);
        assertThat(paid.getPaidAt()).isNotNull();

        AuctionResponse confirmed = auctionService.confirmReceived(bought.getId(), buyer.getId());

        assertThat(confirmed.getPaymentStatus()).isEqualTo("RELEASED");
        assertThat(confirmed.getReleasedAt()).isNotNull();
    }

    private CreateAuctionRequest defaultAuctionRequest() {
        return CreateAuctionRequest.builder()
                .cardName("루키 카드")
                .cardDescription("판본: 프로모\n등급: 미감정\n상태가 좋은 포켓몬 카드입니다.")
                .cardRarity("프로모 · 미감정")
                .cardCategory("POKEMON")
                .imageUrl("https://example.com/card.png")
                .startingPrice(1500L)
                .minimumIncrement(100L)
                .durationHours(24)
                .build();
    }
}
