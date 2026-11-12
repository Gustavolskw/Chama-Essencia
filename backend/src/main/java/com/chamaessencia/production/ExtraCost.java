package com.chamaessencia.production;

import java.util.List;

import com.chamaessencia.common.Num;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Custo adicional por vela (mão de obra, gás/água, embalagem avulsa...). */
public record ExtraCost(
        @NotBlank @Size(max = 60) String description,
        @DecimalMin(value = "0", message = "não pode ser negativo") double amount) {

    /** Remove linhas vazias e arredonda os valores. */
    public static List<ExtraCost> clean(List<ExtraCost> items) {
        return items == null ? List.of() : items.stream()
                .filter(c -> c != null && c.description() != null && !c.description().isBlank())
                .map(c -> new ExtraCost(c.description().trim(), Num.money(c.amount())))
                .toList();
    }
}
