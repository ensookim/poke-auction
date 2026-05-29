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

    private LocalDateTime withdrawnAt;

    private LocalDateTime termsAgreedAt;

    private LocalDateTime privacyAgreedAt;

    private LocalDateTime tradePolicyAgreedAt;

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

    public boolean isBidRestrictedNow() {
        if (this.withdrawnAt != null) {
            return true;
        }

        if ("BANNED".equals(this.role)) {
            return true;
        }

        if (!this.bidRestricted) {
            return false;
        }

        return this.restrictedUntil == null || this.restrictedUntil.isAfter(LocalDateTime.now());
    }

    public void changeNickname(String nickname) {
        this.nickname = nickname;
    }

    public boolean isWithdrawn() {
        return this.withdrawnAt != null || "WITHDRAWN".equals(this.role);
    }

    public void withdraw() {
        this.withdrawnAt = LocalDateTime.now();
        this.role = "WITHDRAWN";
        this.nickname = "Withdrawn user";
        this.providerId = "withdrawn-" + this.id + "-" + System.currentTimeMillis();
        this.bidRestricted = true;
        this.restrictedUntil = LocalDateTime.now().plusYears(100);
    }

    public void agreeToRequiredPolicies() {
        LocalDateTime now = LocalDateTime.now();
        this.termsAgreedAt = now;
        this.privacyAgreedAt = now;
        this.tradePolicyAgreedAt = now;
    }
}
