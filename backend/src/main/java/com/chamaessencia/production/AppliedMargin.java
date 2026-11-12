package com.chamaessencia.production;

import com.chamaessencia.margin.Margin;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cópia da margem usada no pacote. Fica guardada no pacote para que alterar o cadastro de margens não
 * mude o preço de pacotes antigos (é possível recalcular o pacote com as margens novas quando quiser).
 */
public record AppliedMargin(
        String marginId,
        @NotBlank @Size(max = 60) String name,
        @NotNull Margin.Type type,
        @DecimalMin("0") @DecimalMax("95") double percent) {
}
