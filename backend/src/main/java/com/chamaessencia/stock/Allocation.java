package com.chamaessencia.stock;

import java.time.LocalDate;

/** Quanto um pacote de produção consumiu de um lote de compra, e a que custo unitário. */
public record Allocation(String lotId, double quantity, double unitCost, LocalDate purchaseDate) {

    public double cost() {
        return quantity * unitCost;
    }
}
