package com.pokeauction.auction.api.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_users_provider_provider_id",
                        columnNames = {"provider", "provider_id"}
                )
        }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nickname;

    private String role;

    private String provider;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private int unpaidCount;

    private boolean bidRestricted;

    private LocalDateTime restrictedUntil;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.role == null) {
            this.role = "USER";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void incrementUnpaidCount() {
        if (this.unpaidCount == 0) this.unpaidCount = 1;
        else this.unpaidCount = this.unpaidCount + 1;
    }

    public void applyRestrictionDays(int days) {
        this.bidRestricted = true;
        this.restrictedUntil = LocalDateTime.now().plusDays(days);
    }

    public void banPermanently() {
        this.bidRestricted = true;
        this.restrictedUntil = LocalDateTime.now().plusYears(100);
        this.role = "BANNED";
    }
}