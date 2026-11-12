package com.chamaessencia.settings;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chamaessencia.production.ExtraCost;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    public record SettingsRequest(
            @NotBlank @Size(max = 80) String storeName,
            @NotNull @Size(max = 20) List<@Valid ExtraCost> defaultExtraCosts) {
    }

    private final SettingsRepository repository;

    public SettingsController(SettingsRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public CompanySettings get() {
        return current();
    }

    @PutMapping
    public CompanySettings update(@Valid @RequestBody SettingsRequest req) {
        CompanySettings settings = current();
        settings.setStoreName(req.storeName().trim());
        settings.setDefaultExtraCosts(ExtraCost.clean(req.defaultExtraCosts()));
        return repository.save(settings);
    }

    public CompanySettings current() {
        return repository.findById(CompanySettings.ID).orElseGet(() -> repository.save(new CompanySettings()));
    }
}
