package com.chamaessencia.stock;

import java.time.Instant;
import java.time.LocalDate;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Compra de um insumo = um lote no estoque. Ex.: 100 pavios por R$ 17,99 → custo unitário R$ 0,1799.
 * {@code remaining} diminui conforme os pacotes de produção consomem o lote.
 */
@Document("purchases")
public class Purchase {

    @Id
    private String id;
    @Indexed
    private String materialId;
    private LocalDate date;
    private double quantity;
    private double totalPrice;
    private double unitCost;
    private double remaining;
    private String supplier;
    private String note;
    private Instant createdAt = Instant.now();

    public double consumed() {
        return quantity - remaining;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMaterialId() { return materialId; }
    public void setMaterialId(String materialId) { this.materialId = materialId; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public double getQuantity() { return quantity; }
    public void setQuantity(double quantity) { this.quantity = quantity; }
    public double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(double totalPrice) { this.totalPrice = totalPrice; }
    public double getUnitCost() { return unitCost; }
    public void setUnitCost(double unitCost) { this.unitCost = unitCost; }
    public double getRemaining() { return remaining; }
    public void setRemaining(double remaining) { this.remaining = remaining; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
