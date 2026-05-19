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
        User user = userRepository.save(User.builder()
                .nickname("test-user")
                .provider("KAKAO")
                .providerId("test-provider-id")
                .role("USER")
                .build());

        CreateAuctionRequest request = CreateAuctionRequest.builder()
                .cardName("파이리")
                .cardDescription("불 속성 스타터 포켓몬입니다.")
                .cardRarity("Rare")
                .imageUrl("https://example.com/charizard.png")
                .startingPrice(1500L)
                .minimumIncrement(100L)
                .durationHours(24)
                .build();

        AuctionResponse auction = auctionService.createAuction(request, user.getId());
        assertThat(auction.getCurrentPrice()).isEqualTo(1500L);
        assertThat(auction.isActive()).isTrue();

        AuctionResponse updated = auctionService.placeBid(auction.getId(), user.getId(), 1700L, null, null, null);
        assertThat(updated.getCurrentPrice()).isEqualTo(1700L);
        assertThat(updated.getBidCount()).isEqualTo(1);
    }
}
