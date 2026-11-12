package com.chamaessencia.sale;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class SaleDtos {

    private SaleDtos() {
    }

    public record SaleItemRequest(
            @NotBlank String batchId,
            @Min(value = 1, message = "venda pelo menos 1 vela") int quantity,
            @DecimalMin(value = "0", message = "não pode ser negativo") double unitPrice) {
    }

    public record SaleRequest(
            @NotNull LocalDate date,
            @NotBlank(message = "informe para quem foi a venda") @Size(max = 100) String customer,
            @NotNull @Size(max = 50) List<@Valid SaleItemRequest> items,
            @DecimalMin(value = "0", message = "não pode ser negativo") double discount,
            @NotNull Sale.Payment payment,
            @Size(max = 500) String note) {
    }

    public record SaleItemView(
            String batchId,
            long batchNumber,
            String batchName,
            int quantity,
            double unitPrice,
            double total,
            double unitCost,
            double cost) {
    }

    public record SaleView(
            String id,
            long number,
            LocalDate date,
            String customer,
            List<SaleItemView> items,
            double subtotal,
            double discount,
            double total,
            /** Custo de produção das velas vendidas. */
            double cost,
            double profit,
            Sale.Payment payment,
            String note,
            int candles) {
    }
}
