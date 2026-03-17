package com.timekeeper.service;

import com.timekeeper.dto.request.CreateHolidayRequest;
import com.timekeeper.dto.response.HolidayResponse;

import java.util.List;

public interface HolidayService {
    List<HolidayResponse> getAll();
    HolidayResponse create(CreateHolidayRequest request);
    void delete(String id);
}
