package com.pokeauction.auction.api.user.repository;

import com.pokeauction.auction.api.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    boolean existsByNicknameIgnoreCase(String nickname);
}
