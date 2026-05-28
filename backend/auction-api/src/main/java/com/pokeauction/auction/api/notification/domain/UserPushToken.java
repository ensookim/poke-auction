package com.pokeauction.auction.api.notification.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(
        name = "user_push_tokens",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_push_tokens_token", columnNames = "token")
        }
)
public class UserPushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 500)
    private String token;

    @Column(length = 30)
    private String platform;

    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }

    public void update(Long userId, String platform) {
        this.userId = userId;
        this.platform = platform;
    }
}
