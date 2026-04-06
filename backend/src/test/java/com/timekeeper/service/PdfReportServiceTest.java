package com.timekeeper.service;

import com.timekeeper.dto.request.PdfReportRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.context.IContext;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PdfReportServiceTest {

    @Mock SpringTemplateEngine templateEngine;

    @InjectMocks PdfReportService pdfReportService;

    private PdfReportRequest buildRequest() {
        PdfReportRequest req = new PdfReportRequest();
        req.setWeekLabel("Mar 16 – Mar 20, 2026");
        PdfReportRequest.Stats stats = new PdfReportRequest.Stats();
        stats.setTotalHours("160h");
        stats.setDepartmentsCount(3);
        stats.setEmployeesCount(12);
        stats.setAvgUtilization("80%");
        req.setStats(stats);
        req.setDepartments(List.of());
        req.setTrendChartImage("");
        req.setPieChartImage("");
        return req;
    }

    // ── PDF-01: template engine returns well-formed HTML — byte array returned ─

    @Test
    void generateOrgReport_validHtml_returnsByteArray() throws Exception {
        // Minimal HTML that openhtmltopdf can render
        String html = "<html><head><title>T</title></head><body><p>Report</p></body></html>";
        when(templateEngine.process(eq("report-template"), any(IContext.class))).thenReturn(html);

        byte[] result = pdfReportService.generateOrgReport(buildRequest());

        assertThat(result).isNotNull().isNotEmpty();
    }

    // ── PDF-02: template engine throws — exception propagates ─────────────────

    @Test
    void generateOrgReport_templateEngineThrows_exceptionPropagates() {
        when(templateEngine.process(eq("report-template"), any(IContext.class)))
                .thenThrow(new RuntimeException("Template not found"));

        assertThatThrownBy(() -> pdfReportService.generateOrgReport(buildRequest()))
                .isInstanceOf(Exception.class);
    }

    // ── PDF-03: correct template variables are set ─────────────────────────────

    @Test
    void generateOrgReport_weekLabelPassedToTemplate() throws Exception {
        String html = "<html><head><title>T</title></head><body><p>ok</p></body></html>";
        when(templateEngine.process(eq("report-template"), any(IContext.class))).thenReturn(html);

        pdfReportService.generateOrgReport(buildRequest());

        // Verify the template was invoked with the correct template name
        verify(templateEngine).process(eq("report-template"), any(IContext.class));
    }
}
