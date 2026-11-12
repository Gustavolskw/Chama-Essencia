package com.chamaessencia.stock;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** Insumo (cera, essência, pote, pavio...). O estoque vem da soma dos lotes de compra. */
@Document("materials")
public class Material {

    @Id
    private String id;
    @Indexed(unique = true)
    private String nameKey;
    private String name;
    /** Unidade de controle do estoque e do consumo: g, ml, un... */
    private String unit;
    private String category;
    /** Alerta de estoque baixo quando o saldo fica igual ou abaixo deste valor (0 = sem alerta). */
    private double minStock;
    private String note;
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNameKey() { return nameKey; }
    public void setNameKey(String nameKey) { this.nameKey = nameKey; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public double getMinStock() { return minStock; }
    public void setMinStock(double minStock) { this.minStock = minStock; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
