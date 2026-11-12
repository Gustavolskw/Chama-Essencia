package com.chamaessencia.production;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Pacote de produção: um lote de velas produzidas juntas (ex.: 10 potes de vela de Natal), com os
 * insumos consumidos do estoque, os custos adicionais por vela e as margens usadas para o preço.
 */
@Document("batches")
public class ProductionBatch {

    @Id
    private String id;
    private long number;
    /** Produto / nome do pacote (ex.: "Vela aromática – Natal"). */
    private String name;
    private LocalDate date;
    /** Quantidade de velas produzidas. */
    private int quantity;
    /** Sazonal usa Preço = Custo ÷ (1 − margens − margem sazonal); normal ignora as margens sazonais. */
    private boolean seasonal;
    private List<BatchItem> items = new ArrayList<>();
    private List<ExtraCost> extraCosts = new ArrayList<>();
    private List<AppliedMargin> margins = new ArrayList<>();
    /** Preço de venda definido manualmente (null = usa o preço sugerido). */
    private Double salePrice;
    private String note;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public long getNumber() { return number; }
    public void setNumber(long number) { this.number = number; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public boolean isSeasonal() { return seasonal; }
    public void setSeasonal(boolean seasonal) { this.seasonal = seasonal; }
    public List<BatchItem> getItems() { return items; }
    public void setItems(List<BatchItem> items) { this.items = items; }
    public List<ExtraCost> getExtraCosts() { return extraCosts; }
    public void setExtraCosts(List<ExtraCost> extraCosts) { this.extraCosts = extraCosts; }
    public List<AppliedMargin> getMargins() { return margins; }
    public void setMargins(List<AppliedMargin> margins) { this.margins = margins; }
    public Double getSalePrice() { return salePrice; }
    public void setSalePrice(Double salePrice) { this.salePrice = salePrice; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
