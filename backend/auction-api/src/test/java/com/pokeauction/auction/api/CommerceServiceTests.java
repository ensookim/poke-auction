package com.pokeauction.auction.api;

import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.service.AuctionService;
import com.pokeauction.auction.api.commerce.dto.CheckoutResponse;
import com.pokeauction.auction.api.commerce.service.CommerceService;
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
        "spring.datasource.url=jdbc:h2:mem:commerce-testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
@Transactional
class CommerceServiceTests {

    @Autowired
    private CommerceService commerceService;

    @Autowired
    private AuctionService auctionService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void wishlistShouldToggleStatus() {
        User user = saveUser("wishlist-user");
        AuctionResponse auction = auctionService.createAuction(defaultAuctionRequest(20000L), null);

        assertThat(commerceService.getStatus(user.getId(), auction.getId()).isWished()).isFalse();

        commerceService.addWishlist(user.getId(), auction.getId());

        assertThat(commerceService.getStatus(user.getId(), auction.getId()).isWished()).isTrue();
        assertThat(commerceService.getWishlist(user.getId())).hasSize(1);

        commerceService.removeWishlist(user.getId(), auction.getId());

        assertThat(commerceService.getStatus(user.getId(), auction.getId()).isWished()).isFalse();
    }

    @Test
    void checkoutShouldReturnCartTotal() {
        User user = saveUser("cart-user");
        AuctionResponse first = auctionService.createAuction(defaultAuctionRequest(25000L), null);
        AuctionResponse second = auctionService.createAuction(defaultAuctionRequest(30000L), null);

        commerceService.addCart(user.getId(), first.getId());
        commerceService.addCart(user.getId(), second.getId());

        CheckoutResponse checkout = commerceService.checkoutCart(user.getId());

        assertThat(checkout.getItemCount()).isEqualTo(2);
        assertThat(checkout.getTotalAmount()).isEqualTo(55000L);
    }

    @Test
    void cartShouldRejectAuctionWithoutBuyNowPrice() {
        User user = saveUser("no-buy-now-user");
        AuctionResponse auction = auctionService.createAuction(defaultAuctionRequest(null), null);

        assertThatThrownBy(() -> commerceService.addCart(user.getId(), auction.getId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("즉시 낙찰가가 있는 상품만 장바구니 결제가 가능합니다.");
    }

    private User saveUser(String providerId) {
        return userRepository.save(User.builder()
                .nickname(providerId)
                .provider("KAKAO")
                .providerId(providerId)
                .role("USER")
                .build());
    }

    private CreateAuctionRequest defaultAuctionRequest(Long buyNowPrice) {
        return CreateAuctionRequest.builder()
                .cardName("루키 카드")
                .cardDescription("판본: 프로모\n등급: 미감정\n상태가 좋은 포켓몬 카드입니다.")
                .cardRarity("프로모 · 미감정")
                .cardCategory("POKEMON")
                .imageUrl("https://example.com/card.png")
                .startingPrice(1500L)
                .minimumIncrement(100L)
                .buyNowPrice(buyNowPrice)
                .durationHours(24)
                .build();
    }
}
