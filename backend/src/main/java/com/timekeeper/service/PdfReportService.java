package com.timekeeper.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.timekeeper.dto.request.PdfReportRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfReportService {

    private final SpringTemplateEngine templateEngine;

    public byte[] generateOrgReport(PdfReportRequest request) throws Exception {
        try {
            Context ctx = new Context();
            ctx.setVariable("weekLabel", request.getWeekLabel());
            ctx.setVariable("generatedDate",
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM d, yyyy 'at' h:mm a")));
            ctx.setVariable("stats", request.getStats());
            ctx.setVariable("trendChartImage", request.getTrendChartImage());
            ctx.setVariable("pieChartImage", request.getPieChartImage());
            ctx.setVariable("departments", request.getDepartments());

            String html = templateEngine.process("report-template", ctx);

            ByteArrayOutputStream os = new ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, "/");
            builder.toStream(os);
            builder.run();

            return os.toByteArray();
        } catch (Exception e) {
            log.error("PDF generation failed: {}", e.getMessage(), e);
            throw e;
        }
    }
}
