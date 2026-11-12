package com.chamaessencia.sale;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import org.springframework.stereotype.Service;

import com.chamaessencia.common.ApiException;
import com.chamaessencia.common.Num;
import com.chamaessencia.common.SequenceService;
import com.chamaessencia.production.BatchDtos.BatchView;
import com.chamaessencia.production.BatchService;
import com.chamaessencia.production.ProductionBatch;
import com.chamaessencia.sale.SaleDtos.SaleItemRequest;
import com.chamaessencia.sale.SaleDtos.SaleItemView;
import com.chamaessencia.sale.SaleDtos.SaleRequest;
import com.chamaessencia.sale.SaleDtos.SaleView;

@Service
public class SaleService {

    private final SaleRepository sales;
    private final BatchService batches;
    private final SequenceService sequences;

    public SaleService(SaleRepository sales, BatchService batches, SequenceService sequences) {
        this.sales = sales;
        this.batches = batches;
        this.sequences = sequences;
    }

    public List<SaleView> list(LocalDate from, LocalDate to) {
        Map<String, BatchView> byId = batches.viewsById();
        return sales.findAll().stream()
                .filter(s -> inRange(s.getDate(), from, to))
                .sorted(Comparator.comparing(Sale::getDate).thenComparing(Sale::getNumber).reversed())
                .map(s -> view(s, byId))
                .toList();
    }

    public List<String> customers() {
        TreeSet<String> names = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        sales.findAll().forEach(s -> names.add(s.getCustomer()));
        return new ArrayList<>(names);
    }

    public SaleView create(SaleRequest req) {
        Sale sale = new Sale();
        apply(sale, req, null);
        sale.setNumber(sequences.next("sale"));
        sales.save(sale);
        return view(sale, batches.viewsById());
    }

    public SaleView update(String id, SaleRequest req) {
        Sale sale = sale(id);
        apply(sale, req, id);
        sales.save(sale);
        return view(sale, batches.viewsById());
    }

    public void delete(String id) {
        sale(id);
        sales.deleteById(id);
    }

    private Sale sale(String id) {
        return sales.findById(id).orElseThrow(() -> ApiException.notFound("Venda não encontrada."));
    }

    private void apply(Sale sale, SaleRequest req, String saleId) {
        if (req.items().isEmpty()) {
            throw ApiException.badRequest("Inclua pelo menos um item na venda.");
        }
        // Velas já vendidas por pacote, sem contar a própria venda (ao editar).
        Map<String, Integer> sold = BatchService.soldByBatch(
                sales.findAll().stream().filter(s -> !s.getId().equals(saleId)).toList());
        Map<String, Integer> requested = new HashMap<>();
        List<SaleItem> items = new ArrayList<>();
        for (SaleItemRequest it : req.items()) {
            ProductionBatch b = batches.batch(it.batchId());
            int total = requested.merge(b.getId(), it.quantity(), Integer::sum);
            int available = b.getQuantity() - sold.getOrDefault(b.getId(), 0);
            if (total > available) {
                throw ApiException.badRequest("O pacote nº " + b.getNumber() + " (" + b.getName() + ") tem só "
                        + Math.max(0, available) + " vela(s) disponível(is).");
            }
            items.add(new SaleItem(b.getId(), b.getName(), it.quantity(), Num.money(it.unitPrice())));
        }
        double subtotal = items.stream().mapToDouble(SaleItem::total).sum();
        double discount = Num.money(req.discount());
        if (discount > subtotal + Num.EPS) {
            throw ApiException.badRequest("O desconto não pode ser maior que o valor dos itens.");
        }
        sale.setDate(req.date());
        sale.setCustomer(req.customer().trim().replaceAll("\\s+", " "));
        sale.setItems(items);
        sale.setDiscount(discount);
        sale.setPayment(req.payment());
        sale.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
    }

    /** Custo das velas vendidas = quantidade × custo de produção por vela do pacote. */
    public static SaleView view(Sale s, Map<String, BatchView> batchesById) {
        List<SaleItemView> items = new ArrayList<>();
        double cost = 0;
        for (SaleItem i : s.getItems()) {
            BatchView b = batchesById.get(i.batchId());
            double unitCost = b == null ? 0 : b.unitCost();
            cost += unitCost * i.quantity();
            items.add(new SaleItemView(i.batchId(), b == null ? 0 : b.number(), i.batchName(), i.quantity(),
                    i.unitPrice(), Num.money(i.total()), Num.unit(unitCost), Num.money(unitCost * i.quantity())));
        }
        double subtotal = s.subtotal();
        double total = s.total();
        return new SaleView(s.getId(), s.getNumber(), s.getDate(), s.getCustomer(), items, Num.money(subtotal),
                s.getDiscount(), Num.money(total), Num.money(cost), Num.money(total - cost), s.getPayment(), s.getNote(),
                s.getItems().stream().mapToInt(SaleItem::quantity).sum());
    }

    public static boolean inRange(LocalDate date, LocalDate from, LocalDate to) {
        return (from == null || !date.isBefore(from)) && (to == null || !date.isAfter(to));
    }
}
