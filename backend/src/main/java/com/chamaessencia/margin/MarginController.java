package com.chamaessencia.margin;

import java.util.Comparator;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.chamaessencia.common.ApiException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cadastro de margens (lucro, sazonal e as que a loja definir). */
@RestController
@RequestMapping("/api/margins")
public class MarginController {

    public record MarginRequest(
            @NotBlank @Size(max = 60) String name,
            @NotNull Margin.Type type,
            @DecimalMin(value = "0", message = "não pode ser negativa")
            @DecimalMax(value = "95", message = "deve ser no máximo 95%") double percent,
            boolean defaultSelected,
            @Size(max = 300) String description) {
    }

    /** Cria as margens da planilha original no primeiro start (banco vazio). */
    @Component
    public static class Seeder implements ApplicationRunner {
        private final MarginRepository repository;

        public Seeder(MarginRepository repository) {
            this.repository = repository;
        }

        @Override
        public void run(ApplicationArguments args) {
            if (repository.count() == 0) {
                repository.save(new Margin("Margem de lucro", Margin.Type.PROFIT, 20, true,
                        "Lucro desejado sobre o preço de venda."));
                repository.save(new Margin("Margem sazonal", Margin.Type.SEASONAL, 10, true,
                        "Acréscimo para datas especiais (Natal, Dia das Mães...). Só vale em pacotes sazonais."));
            }
        }
    }

    private final MarginRepository repository;

    public MarginController(MarginRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Margin> list() {
        return repository.findAll().stream()
                .sorted(Comparator.comparing((Margin m) -> m.getType().ordinal()).thenComparing(Margin::getName))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Margin create(@Valid @RequestBody MarginRequest req) {
        return repository.save(apply(new Margin(), req));
    }

    @PutMapping("/{id}")
    public Margin update(@PathVariable String id, @Valid @RequestBody MarginRequest req) {
        Margin margin = repository.findById(id).orElseThrow(() -> ApiException.notFound("Margem não encontrada."));
        return repository.save(apply(margin, req));
    }

    /** Pacotes já criados guardam uma cópia das margens usadas, então remover não altera o histórico. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        repository.deleteById(id);
    }

    private static Margin apply(Margin margin, MarginRequest req) {
        margin.setName(req.name().trim());
        margin.setType(req.type());
        margin.setPercent(Math.round(req.percent() * 100.0) / 100.0);
        margin.setDefaultSelected(req.defaultSelected());
        margin.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        return margin;
    }
}
