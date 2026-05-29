package com.pokeauction.auction.api.shipping.repository;

import com.pokeauction.auction.api.shipping.domain.ShippingAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShippingAddressRepository extends JpaRepository<ShippingAddress, Long> {

    Optional<ShippingAddress> findByUserId(Long userId);
}
