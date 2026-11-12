package com.chamaessencia.sale;

/** Velas de um pacote vendidas na venda (o pacote dá o custo de produção de cada vela). */
public record SaleItem(String batchId, String batchName, int quantity, double unitPrice) {

    public double total() {
        return quantity * unitPrice;
    }
}
