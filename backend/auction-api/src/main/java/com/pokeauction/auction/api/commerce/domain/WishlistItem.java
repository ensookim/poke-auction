package com.pokeauction.auction.api.commerce.domain;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(
        name = "wishlist_items",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_wishlist_user_auction",
                        columnNames = {"user_id", "auction_id"}
                )
        }
)
public class WishlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private Auction auction;

    private LocalDateTime createdAt;

    private LocalDateTime endingSoonNotifiedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public boolean isEndingSoonNotified() {
        return this.endingSoonNotifiedAt != null;
    }

    public void markEndingSoonNotified() {
        this.endingSoonNotifiedAt = LocalDateTime.now();
    }
}
