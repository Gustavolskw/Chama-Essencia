package com.chamaessencia.production;

import java.util.List;

import com.chamaessencia.stock.Allocation;

/**
 * Insumo usado no pacote.
 *
 * @param mode        PER_UNIT = quantidade informada por vela; TOTAL = quantidade informada para o pacote todo
 * @param perUnit     quantidade por vela
 * @param total       quantidade total consumida do estoque
 * @param allocations de quais lotes (compras) saiu o consumo, com o custo de cada um
 */
public record BatchItem(
        String materialId,
        String materialName,
        String unit,
        Mode mode,
        double perUnit,
        double total,
        List<Allocation> allocations) {

    public enum Mode { PER_UNIT, TOTAL }

    public double cost() {
        return allocations == null ? 0 : allocations.stream().mapToDouble(Allocation::cost).sum();
    }
}
