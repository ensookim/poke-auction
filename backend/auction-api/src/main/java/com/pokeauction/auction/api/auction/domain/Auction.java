package com.pokeauction.auction.api.auction.domain;

import com.pokeauction.auction.api.bid.domain.Bid;
import com.pokeauction.auction.api.user.domain.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "auctions")
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String cardName;

    private String cardDescription;

    private String cardRarity;

    private String cardCategory;

    private String imageUrl;

    private Long startingPrice;

    private Long currentPrice;

    private Long minimumIncrement;

    private Long buyNowPrice;

    private Long winnerId;

    @Version
    @Builder.Default
    @Column(nullable = false)
    private Long version = 0L;

    private LocalDateTime createdAt;

    private LocalDateTime endAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    private User createdBy;

    @OneToMany(mappedBy = "auction", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<Bid> bids = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.currentPrice == null) {
            this.currentPrice = this.startingPrice;
        }
    }

    public boolean isActive() {
        return this.endAt != null && this.endAt.isAfter(LocalDateTime.now());
    }

    public boolean hasBuyNow() {
        return this.buyNowPrice != null && this.buyNowPrice > 0;
    }

    public void placeBid(Bid bid) {
        this.bids.add(bid);
        this.currentPrice = bid.getAmount();
    }

    public void buyNow(Bid bid) {
        this.bids.add(bid);
        this.currentPrice = bid.getAmount();
        this.endAt = LocalDateTime.now();
        if (bid.getBidder() != null) {
            this.winnerId = bid.getBidder().getId();
        }
    }

    public void finalizeWinner() {
        if (this.winnerId != null) return;
        if (this.bids == null || this.bids.isEmpty()) return;
        Bid highest = this.bids.stream().max((a, b) -> Long.compare(a.getAmount(), b.getAmount())).orElse(null);
        if (highest != null && highest.getBidder() != null) {
            this.winnerId = highest.getBidder().getId();
        }
    }
}
