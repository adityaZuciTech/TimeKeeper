package com.timekeeper.service.impl;

import com.timekeeper.dto.request.CreateHolidayRequest;
import com.timekeeper.dto.response.HolidayResponse;
import com.timekeeper.entity.Holiday;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.repository.HolidayRepository;
import com.timekeeper.service.HolidayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HolidayServiceImpl implements HolidayService {

    private final HolidayRepository holidayRepository;

    @Override
    public List<HolidayResponse> getAll() {
        return holidayRepository.findAllByOrderByDateAsc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public HolidayResponse create(CreateHolidayRequest request) {
        if (holidayRepository.existsByDate(request.getDate())) {
            throw new BusinessException("A holiday already exists on " + request.getDate());
        }

        Holiday holiday = Holiday.builder()
                .name(request.getName())
                .date(request.getDate())
                .description(request.getDescription())
                .build();

        holiday = holidayRepository.save(holiday);
        log.info("Holiday created: {} on {}", holiday.getName(), holiday.getDate());
        return toResponse(holiday);
    }

    @Override
    @Transactional
    public void delete(String id) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday not found: " + id));
        holidayRepository.delete(holiday);
        log.info("Holiday deleted: {}", id);
    }

    private HolidayResponse toResponse(Holiday holiday) {
        return HolidayResponse.builder()
                .id(holiday.getId())
                .name(holiday.getName())
                .date(holiday.getDate())
                .description(holiday.getDescription())
                .build();
    }
}
