package com.chamaessencia.stock;

import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class StockDtos {

    private StockDtos() {
    }

    public record MaterialRequest(
            @NotBlank @Size(max = 80) String name,
            @NotBlank @Size(max = 10) String unit,
            @Size(max = 40) String category,
            @DecimalMin(value = "0", message = "não pode ser negativo") double minStock,
            @Size(max = 500) String note) {
    }

    /** Insumo com o saldo calculado a partir dos lotes. */
    public record MaterialView(
            String id,
            String name,
            String unit,
            String category,
            double minStock,
            String note,
            /** Saldo atual (soma do que resta nos lotes). */
            double stock,
            /** Valor do saldo ao custo de cada lote. */
            double stockValue,
            /** Custo médio do saldo atual (ou da última compra, se o saldo estiver zerado). */
            double avgUnitCost,
            double lastUnitCost,
            LocalDate lastPurchaseDate,
            double totalPurchased,
            double totalSpent,
            double totalConsumed,
            int lots,
            boolean lowStock) {
    }

    public record PurchaseRequest(
            @NotNull String materialId,
            @NotNull LocalDate date,
            @Positive(message = "deve ser maior que zero") double quantity,
            @DecimalMin(value = "0", message = "não pode ser negativo") double totalPrice,
            @Size(max = 80) String supplier,
            @Size(max = 500) String note) {
    }

    public record PurchaseView(
            String id,
            String materialId,
            String materialName,
            String unit,
            LocalDate date,
            double quantity,
            double totalPrice,
            double unitCost,
            double remaining,
            double consumed,
            String supplier,
            String note) {
    }
}
