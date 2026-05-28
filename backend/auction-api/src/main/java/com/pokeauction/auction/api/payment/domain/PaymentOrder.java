package com.pokeauction.auction.api.payment.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "payment_orders")
public class PaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String orderId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false)
    private String orderName;

    @Column(nullable = false)
    private String auctionIds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentOrderStatus status;

    private String paymentKey;

    private LocalDateTime createdAt;

    private LocalDateTime approvedAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = PaymentOrderStatus.READY;
        }
    }

    public void complete(String paymentKey) {
        this.paymentKey = paymentKey;
        this.status = PaymentOrderStatus.DONE;
        this.approvedAt = LocalDateTime.now();
    }

    public void fail() {
        this.status = PaymentOrderStatus.FAILED;
    }
}
