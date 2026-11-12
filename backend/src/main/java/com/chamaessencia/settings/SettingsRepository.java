package com.chamaessencia.settings;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface SettingsRepository extends MongoRepository<CompanySettings, String> {
}
