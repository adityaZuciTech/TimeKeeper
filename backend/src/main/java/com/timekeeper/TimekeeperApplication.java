package com.timekeeper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TimekeeperApplication {
    public static void main(String[] args) {
        SpringApplication.run(TimekeeperApplication.class, args);
    }
}
