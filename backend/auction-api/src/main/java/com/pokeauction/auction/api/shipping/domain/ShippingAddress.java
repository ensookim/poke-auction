package com.pokeauction.auction.api.shipping.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "shipping_addresses")
public class ShippingAddress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false, length = 80)
    private String recipientName;

    @Column(nullable = false, length = 30)
    private String phoneNumber;

    @Column(nullable = false, length = 300)
    private String address;

    @Column(length = 300)
    private String addressDetail;

    @Column(length = 300)
    private String deliveryMemo;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String recipientName, String phoneNumber, String address, String addressDetail, String deliveryMemo) {
        this.recipientName = recipientName;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.addressDetail = addressDetail;
        this.deliveryMemo = deliveryMemo;
    }
}
