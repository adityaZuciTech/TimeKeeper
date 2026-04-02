package com.timekeeper.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.timekeeper.entity.TimeEntry;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.EnumMap;
import java.util.Map;

/**
 * JPA converter that serialises Map&lt;DayOfWeek, String&gt; to/from a TEXT column as JSON.
 * Used for the overtime_comments column on the timesheets table.
 */
@Converter
public class DayCommentMapConverter implements AttributeConverter<Map<TimeEntry.DayOfWeek, String>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<EnumMap<TimeEntry.DayOfWeek, String>> TYPE_REF =
            new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(Map<TimeEntry.DayOfWeek, String> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialise overtime comments map", e);
        }
    }

    @Override
    public Map<TimeEntry.DayOfWeek, String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new EnumMap<>(TimeEntry.DayOfWeek.class);
        try {
            return MAPPER.readValue(dbData, TYPE_REF);
        } catch (Exception e) {
            throw new IllegalStateException("Could not deserialise overtime comments map", e);
        }
    }
}
