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

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.NONE;

    private Long paymentAmount;

    private LocalDateTime paidAt;

    private LocalDateTime releasedAt;

    private String trackingNumber;

    private String shippingCompany;

    @Builder.Default
    private boolean receivedConfirmed = false;

    private LocalDateTime receivedConfirmedAt;

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
        if (this.paymentStatus == null) {
            this.paymentStatus = PaymentStatus.NONE;
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
        markPaymentPending();
    }

    public void finalizeWinner() {
        if (this.winnerId != null) return;
        if (this.bids == null || this.bids.isEmpty()) return;
        Bid highest = this.bids.stream().max((a, b) -> Long.compare(a.getAmount(), b.getAmount())).orElse(null);
        if (highest != null && highest.getBidder() != null) {
            this.winnerId = highest.getBidder().getId();
            markPaymentPending();
        }
    }

    public void updateTracking(String shippingCompany, String trackingNumber) {
        this.shippingCompany = shippingCompany;
        this.trackingNumber = trackingNumber;
    }

    public void confirmReceived() {
        this.receivedConfirmed = true;
        this.receivedConfirmedAt = LocalDateTime.now();
        releasePayment();
    }

    public boolean isPaymentHeld() {
        return this.paymentStatus == PaymentStatus.HELD;
    }

    public void markPaymentPending() {
        if (this.paymentStatus == PaymentStatus.NONE) {
            this.paymentStatus = PaymentStatus.PENDING;
            this.paymentAmount = this.currentPrice;
        }
    }

    public void holdPayment() {
        if (this.winnerId == null) {
            throw new IllegalStateException("Cannot hold payment before a winner is selected.");
        }
        if (this.paymentStatus == PaymentStatus.RELEASED) {
            throw new IllegalStateException("Payment has already been released.");
        }
        this.paymentStatus = PaymentStatus.HELD;
        this.paymentAmount = this.currentPrice;
        this.paidAt = LocalDateTime.now();
    }

    public void releasePayment() {
        if (this.paymentStatus == PaymentStatus.HELD) {
            this.paymentStatus = PaymentStatus.RELEASED;
            this.releasedAt = LocalDateTime.now();
        }
    }
}
