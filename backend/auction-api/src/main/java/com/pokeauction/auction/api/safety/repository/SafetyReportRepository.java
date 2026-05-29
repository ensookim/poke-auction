package com.pokeauction.auction.api.safety.repository;

import com.pokeauction.auction.api.safety.domain.SafetyReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SafetyReportRepository extends JpaRepository<SafetyReport, Long> {

    List<SafetyReport> findAllByOrderByCreatedAtDesc();

    List<SafetyReport> findByStatusOrderByCreatedAtDesc(String status);
}
