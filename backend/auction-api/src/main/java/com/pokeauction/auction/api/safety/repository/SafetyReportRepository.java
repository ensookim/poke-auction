package com.pokeauction.auction.api.safety.repository;

import com.pokeauction.auction.api.safety.domain.SafetyReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SafetyReportRepository extends JpaRepository<SafetyReport, Long> {
}
