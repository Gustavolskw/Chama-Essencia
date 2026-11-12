package com.chamaessencia.production;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.chamaessencia.stock.Allocation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class BatchDtos {

    private BatchDtos() {
    }

    /** Insumo do pacote: {@code amount} é por vela (PER_UNIT) ou do pacote todo (TOTAL). */
    public record ItemRequest(
            @NotBlank String materialId,
            @NotNull BatchItem.Mode mode,
            @Positive(message = "a quantidade do insumo deve ser maior que zero") double amount) {
    }

    public record BatchRequest(
            @NotBlank @Size(max = 100) String name,
            @NotNull LocalDate date,
            @Min(value = 1, message = "produza pelo menos 1 vela") @Max(100_000) int quantity,
            boolean seasonal,
            @NotNull @Size(max = 50) List<@Valid ItemRequest> items,
            @Size(max = 20) List<@Valid ExtraCost> extraCosts,
            @Size(max = 20) List<@Valid AppliedMargin> margins,
            @DecimalMin(value = "0", message = "não pode ser negativo") Double salePrice,
            @Size(max = 1000) String note) {
    }

    public record ItemView(
            String materialId,
            String materialName,
            String unit,
            BatchItem.Mode mode,
            double perUnit,
            double total,
            /** Custo do que saiu do estoque (soma dos lotes). */
            double cost,
            double costPerUnit,
            /** Custo médio por unidade do insumo (g, ml, un) neste pacote. */
            double avgUnitCost,
            /** Só na simulação: quanto falta no estoque e o custo estimado pela última compra. */
            double shortage,
            double shortageCost,
            List<Allocation> allocations) {
    }

    public record BatchView(
            String id,
            long number,
            String name,
            LocalDate date,
            int quantity,
            boolean seasonal,
            String note,
            Instant createdAt,
            Instant updatedAt,
            List<ItemView> items,
            List<ExtraCost> extraCosts,
            List<AppliedMargin> margins,
            /** Materiais do pacote inteiro. */
            double materialCost,
            double materialCostPerUnit,
            double extraCostPerUnit,
            /** Custo de produção por vela = materiais por vela + custos adicionais por vela. */
            double unitCost,
            double totalCost,
            double basePercent,
            double seasonalPercent,
            double appliedPercent,
            double priceNormal,
            double priceSeasonal,
            double suggestedPrice,
            /** Preço de venda em uso (manual, se definido; senão o sugerido). */
            double salePrice,
            boolean manualPrice,
            double profitPerUnit,
            /** Margem real sobre o preço em uso: (preço − custo) ÷ preço. */
            double realMarginPercent,
            /** Markup equivalente: (preço − custo) ÷ custo. */
            double markupPercent,
            int sold,
            int available,
            boolean hasShortage) {
    }
}
