package com.chamaessencia.margin;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Margem cadastrada (percentual sobre o PREÇO DE VENDA, não markup sobre o custo).
 * Preço = Custo ÷ (1 − soma das margens aplicadas).
 */
@Document("margins")
public class Margin {

    public enum Type {
        /** Margem de lucro: entra em todo pacote. */
        PROFIT,
        /** Margem sazonal: só entra em pacotes marcados como sazonais. */
        SEASONAL,
        /** Margem definida pela loja (taxa de cartão, imposto, comissão...): entra em todo pacote. */
        ADDITIONAL
    }

    @Id
    private String id;
    private String name;
    private Type type;
    /** Em pontos percentuais (20 = 20%). */
    private double percent;
    /** Já vem marcada ao criar um pacote novo. */
    private boolean defaultSelected;
    private String description;
    private Instant createdAt = Instant.now();

    public Margin() {
    }

    public Margin(String name, Type type, double percent, boolean defaultSelected, String description) {
        this.name = name;
        this.type = type;
        this.percent = percent;
        this.defaultSelected = defaultSelected;
        this.description = description;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public double getPercent() { return percent; }
    public void setPercent(double percent) { this.percent = percent; }
    public boolean isDefaultSelected() { return defaultSelected; }
    public void setDefaultSelected(boolean defaultSelected) { this.defaultSelected = defaultSelected; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
