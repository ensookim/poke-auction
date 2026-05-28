package com.pokeauction.auction.api.chat.domain;

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
        name = "chat_rooms",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_chat_rooms_auction_buyer",
                        columnNames = {"auction_id", "buyer_id"}
                )
        }
)
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private Auction auction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    private LocalDateTime createdAt;

    private LocalDateTime lastMessageAt;

    private String lastMessagePreview;

    private LocalDateTime sellerReadAt;

    private LocalDateTime buyerReadAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.lastMessageAt = this.createdAt;
    }

    public boolean hasParticipant(Long userId) {
        return userId != null
                && (this.seller.getId().equals(userId) || this.buyer.getId().equals(userId));
    }

    public User otherParticipant(Long userId) {
        if (this.seller.getId().equals(userId)) {
            return this.buyer;
        }
        return this.seller;
    }

    public void updateLastMessage(String content) {
        this.lastMessageAt = LocalDateTime.now();
        this.lastMessagePreview = content == null
                ? null
                : content.substring(0, Math.min(content.length(), 80));
    }

    public LocalDateTime readAtFor(Long userId) {
        if (this.seller.getId().equals(userId)) {
            return this.sellerReadAt;
        }
        return this.buyerReadAt;
    }

    public void markRead(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        if (this.seller.getId().equals(userId)) {
            this.sellerReadAt = now;
        } else if (this.buyer.getId().equals(userId)) {
            this.buyerReadAt = now;
        }
    }

    public boolean isReadByOther(Long senderId, LocalDateTime messageCreatedAt) {
        LocalDateTime otherReadAt = this.seller.getId().equals(senderId)
                ? this.buyerReadAt
                : this.sellerReadAt;
        return otherReadAt != null
                && messageCreatedAt != null
                && !otherReadAt.isBefore(messageCreatedAt);
    }
}
