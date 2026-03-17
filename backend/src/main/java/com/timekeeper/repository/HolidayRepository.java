package com.timekeeper.repository;

import com.timekeeper.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, String> {

    List<Holiday> findAllByOrderByDateAsc();

    boolean existsByDate(LocalDate date);

    List<Holiday> findByDateBetween(LocalDate startDate, LocalDate endDate);

    List<Holiday> findByDateBetweenOrderByDateAsc(LocalDate startDate, LocalDate endDate);
}
