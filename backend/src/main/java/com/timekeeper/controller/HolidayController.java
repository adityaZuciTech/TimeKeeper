package com.timekeeper.controller;

import com.timekeeper.dto.request.CreateHolidayRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.HolidayResponse;
import com.timekeeper.service.HolidayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Holidays", description = "Company-wide holiday calendar")
@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    /** All authenticated users: view holidays */
    @GetMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, List<HolidayResponse>>>> getAll() {
        List<HolidayResponse> holidays = holidayService.getAll();
        return ResponseEntity.ok(ApiResponse.success(Map.of("holidays", holidays)));
    }

    /** Admin only: create holiday */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HolidayResponse>> create(
            @Valid @RequestBody CreateHolidayRequest request) {
        HolidayResponse response = holidayService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Holiday created", response));
    }

    /** Admin only: delete holiday */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        holidayService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Holiday deleted", null));
    }
}
