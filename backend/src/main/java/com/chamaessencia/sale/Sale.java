package com.chamaessencia.sale;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("sales")
public class Sale {

    public enum Payment { PIX, DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO, TRANSFERENCIA, OUTRO }

    @Id
    private String id;
    private long number;
    private LocalDate date;
    /** Para quem foi vendido. */
    private String customer;
    private List<SaleItem> items = new ArrayList<>();
    /** Desconto em R$ sobre o total da venda. */
    private double discount;
    private Payment payment;
    private String note;
    private Instant createdAt = Instant.now();

    public double subtotal() {
        return items.stream().mapToDouble(SaleItem::total).sum();
    }

    public double total() {
        return subtotal() - discount;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public long getNumber() { return number; }
    public void setNumber(long number) { this.number = number; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getCustomer() { return customer; }
    public void setCustomer(String customer) { this.customer = customer; }
    public List<SaleItem> getItems() { return items; }
    public void setItems(List<SaleItem> items) { this.items = items; }
    public double getDiscount() { return discount; }
    public void setDiscount(double discount) { this.discount = discount; }
    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
