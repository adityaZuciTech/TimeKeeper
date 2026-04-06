package com.timekeeper.integration;

import com.timekeeper.entity.Employee;
import com.timekeeper.entity.TimeEntry;
import com.timekeeper.entity.Timesheet;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.TimeEntryRepository;
import com.timekeeper.repository.TimesheetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the {@code @Version} optimistic-lock on {@link Timesheet}
 * prevents two concurrent submit calls from both succeeding.
 *
 * <p>The test uses two threads with a {@link CountDownLatch} to maximise
 * concurrency. Each thread runs its database work inside its own transaction
 * (via {@link TransactionTemplate}) so the H2 locking / versioning triggers.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TimesheetConcurrentSubmitTest {

    @Autowired TimesheetRepository  timesheetRepository;
    @Autowired TimeEntryRepository  timeEntryRepository;
    @Autowired EmployeeRepository   employeeRepository;
    @Autowired PasswordEncoder      passwordEncoder;
    @Autowired PlatformTransactionManager txManager;

    @MockBean JavaMailSender javaMailSender;

    private static final String EMP_ID    = "cc_emp_001";
    private static final String EMP_EMAIL = "cc_emp@example.com";
    private static final String PASSWORD  = "password123";
    private static final LocalDate WEEK   = LocalDate.of(2020, 2, 10); // past Monday

    private String timesheetId;

    @BeforeEach
    void setUp() {
        // Clean up from previous runs (test class is NOT @Transactional so rows persist)
        timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, WEEK)
                .ifPresent(ts -> {
                    timeEntryRepository.deleteAll(timeEntryRepository.findByTimesheetId(ts.getId()));
                    timesheetRepository.delete(ts);
                });
        if (employeeRepository.findById(EMP_ID).isEmpty()) {
            Employee emp = new Employee();
            emp.setId(EMP_ID);
            emp.setName("Concurrent Employee");
            emp.setEmail(EMP_EMAIL);
            emp.setPassword(passwordEncoder.encode(PASSWORD));
            emp.setRole(Employee.Role.EMPLOYEE);
            emp.setStatus(Employee.EmployeeStatus.ACTIVE);
            employeeRepository.save(emp);
        }

        // Create a DRAFT timesheet with one WORK entry in a past week
        TransactionTemplate tx = new TransactionTemplate(txManager);
        timesheetId = tx.execute(status -> {
            Timesheet ts = new Timesheet();
            ts.setEmployee(employeeRepository.findById(EMP_ID).orElseThrow());
            ts.setWeekStartDate(WEEK);
            ts.setWeekEndDate(WEEK.plusDays(4));
            ts.setStatus(Timesheet.TimesheetStatus.DRAFT);
            ts = timesheetRepository.save(ts);

            TimeEntry entry = new TimeEntry();
            entry.setTimesheet(ts);
            entry.setDay(TimeEntry.DayOfWeek.MONDAY);
            entry.setEntryType(TimeEntry.EntryType.WORK);
            entry.setStartTime(LocalTime.of(9, 0));
            entry.setEndTime(LocalTime.of(17, 0));
            entry.setHoursLogged(BigDecimal.valueOf(8));
            timeEntryRepository.save(entry);

            return ts.getId();
        });
    }

    // ── CC-01: two concurrent submits → exactly one succeeds ─────────────────

    @Test
    void submit_concurrentCalls_exactlyOneSucceeds() throws Exception {
        // We call the repository directly to simulate the race; each thread:
        //  1. Loads the timesheet (version N)
        //  2. Waits at the latch so both threads have loaded the same version
        //  3. Sets status = SUBMITTED and saves → second save throws OptimisticLockException
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger successes  = new AtomicInteger(0);
        AtomicInteger conflicts  = new AtomicInteger(0);

        Runnable submitTask = () -> {
            try {
                startGate.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            try {
                new TransactionTemplate(txManager).execute(status -> {
                    Timesheet ts = timesheetRepository.findById(timesheetId).orElseThrow();
                    ts.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
                    timesheetRepository.saveAndFlush(ts);
                    return null;
                });
                successes.incrementAndGet();
            } catch (ObjectOptimisticLockingFailureException e) {
                conflicts.incrementAndGet();
            } catch (Exception e) {
                // Wrap of ObjectOptimisticLockingFailureException counts as conflict
                if (e.getCause() instanceof ObjectOptimisticLockingFailureException
                        || (e.getMessage() != null && e.getMessage().contains("optimistic"))) {
                    conflicts.incrementAndGet();
                }
                // Other exceptions surface as test failures naturally
            }
        };

        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<?> f1 = pool.submit(submitTask);
        Future<?> f2 = pool.submit(submitTask);

        // Release both threads simultaneously
        startGate.countDown();

        f1.get();
        f2.get();
        pool.shutdown();

        assertThat(successes.get() + conflicts.get())
                .as("Both threads must complete (success or conflict)")
                .isEqualTo(2);
        assertThat(successes.get())
                .as("Exactly one submit must succeed")
                .isEqualTo(1);
        assertThat(conflicts.get())
                .as("Exactly one submit must be rejected by optimistic lock")
                .isEqualTo(1);
    }
}
