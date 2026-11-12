package com.chamaessencia.production;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.chamaessencia.common.ApiException;
import com.chamaessencia.common.Num;
import com.chamaessencia.common.SequenceService;
import com.chamaessencia.production.BatchDtos.BatchRequest;
import com.chamaessencia.production.BatchDtos.BatchView;
import com.chamaessencia.production.BatchDtos.ItemRequest;
import com.chamaessencia.production.BatchDtos.ItemView;
import com.chamaessencia.sale.Sale;
import com.chamaessencia.sale.SaleItem;
import com.chamaessencia.sale.SaleRepository;
import com.chamaessencia.stock.Allocation;
import com.chamaessencia.stock.Material;
import com.chamaessencia.stock.StockService;
import com.chamaessencia.stock.StockService.Plan;

/**
 * Pacotes de produção: consomem insumos do estoque (FIFO), calculam o custo por vela e o preço de venda.
 * Editar um pacote devolve o consumo anterior ao estoque e consome de novo com os dados atuais
 * (é o "recalcular").
 */
@Service
public class BatchService {

    private final ProductionBatchRepository batches;
    private final SaleRepository sales;
    private final StockService stock;
    private final SequenceService sequences;

    public BatchService(ProductionBatchRepository batches, SaleRepository sales, StockService stock,
                        SequenceService sequences) {
        this.batches = batches;
        this.sales = sales;
        this.stock = stock;
        this.sequences = sequences;
    }

    // ------------------------------------------------------------------ consultas

    public List<BatchView> list() {
        Map<String, Integer> sold = soldByBatch(sales.findAll());
        return batches.findAll().stream()
                .sorted(Comparator.comparing(ProductionBatch::getDate).thenComparing(ProductionBatch::getNumber).reversed())
                .map(b -> view(b, sold.getOrDefault(b.getId(), 0), Map.of()))
                .toList();
    }

    public BatchView get(String id) {
        ProductionBatch b = batch(id);
        return view(b, soldOf(id), Map.of());
    }

    public ProductionBatch batch(String id) {
        return batches.findById(id).orElseThrow(() -> ApiException.notFound("Pacote de produção não encontrado."));
    }

    /** Custo de produção por vela de cada pacote (usado em vendas e no balanço). */
    public Map<String, BatchView> viewsById() {
        return list().stream().collect(Collectors.toMap(BatchView::id, v -> v));
    }

    public static Map<String, Integer> soldByBatch(List<Sale> all) {
        Map<String, Integer> sold = new HashMap<>();
        for (Sale s : all) {
            for (SaleItem i : s.getItems()) {
                sold.merge(i.batchId(), i.quantity(), Integer::sum);
            }
        }
        return sold;
    }

    private int soldOf(String batchId) {
        return soldByBatch(sales.findByItemsBatchId(batchId)).getOrDefault(batchId, 0);
    }

    // ------------------------------------------------------------------ simulação e gravação

    /**
     * Simula o pacote sem gravar nada: mostra custo, preço e o que falta no estoque.
     * Com {@code batchId}, o consumo atual do próprio pacote é considerado devolvido (recalcular).
     */
    public BatchView preview(BatchRequest req, String batchId) {
        ProductionBatch existing = batchId == null ? null : batch(batchId);
        Built built = build(req, existing);
        ProductionBatch draft = built.batch();
        if (existing != null) {
            draft.setId(existing.getId());
            draft.setNumber(existing.getNumber());
        }
        return view(draft, existing == null ? 0 : soldOf(existing.getId()), built.plans());
    }

    public BatchView create(BatchRequest req) {
        Built built = build(req, null);
        requireStock(built);
        List<Allocation> all = allocations(built.batch());
        stock.consume(all);
        try {
            ProductionBatch b = built.batch();
            b.setNumber(sequences.next("batch"));
            batches.save(b);
            return view(b, 0, Map.of());
        } catch (RuntimeException e) {
            stock.release(all);
            throw e;
        }
    }

    public BatchView update(String id, BatchRequest req) {
        ProductionBatch existing = batch(id);
        int sold = soldOf(id);
        if (req.quantity() < sold) {
            throw ApiException.badRequest("Já foram vendidas " + sold + " velas deste pacote; a quantidade produzida "
                    + "não pode ser menor que isso.");
        }
        Built built = build(req, existing);
        requireStock(built);

        List<Allocation> previous = allocations(existing);
        List<Allocation> next = allocations(built.batch());
        stock.release(previous);
        try {
            stock.consume(next);
        } catch (RuntimeException e) {
            stock.consume(previous);
            throw e;
        }
        ProductionBatch b = built.batch();
        b.setId(existing.getId());
        b.setNumber(existing.getNumber());
        b.setCreatedAt(existing.getCreatedAt());
        b.setUpdatedAt(Instant.now());
        batches.save(b);
        return view(b, sold, Map.of());
    }

    public void delete(String id) {
        ProductionBatch existing = batch(id);
        if (sales.existsByItemsBatchId(id)) {
            throw ApiException.badRequest("Este pacote tem vendas registradas e não pode ser removido. "
                    + "Remova as vendas antes.");
        }
        stock.release(allocations(existing));
        batches.deleteById(id);
    }

    private record Built(ProductionBatch batch, Map<String, Plan> plans) {
    }

    private Built build(BatchRequest req, ProductionBatch existing) {
        if (req.items().isEmpty()) {
            throw ApiException.badRequest("Inclua pelo menos um insumo no pacote.");
        }
        Map<String, Map<String, Double>> credit = creditByMaterial(existing);
        Set<String> seen = new HashSet<>();
        Map<String, Plan> plans = new HashMap<>();
        List<BatchItem> items = new ArrayList<>();
        for (ItemRequest it : req.items()) {
            if (!seen.add(it.materialId())) {
                throw ApiException.badRequest("Um mesmo insumo aparece mais de uma vez no pacote. Junte as quantidades.");
            }
            Material m = stock.material(it.materialId());
            double total = it.mode() == BatchItem.Mode.PER_UNIT ? Num.qty(it.amount() * req.quantity()) : Num.qty(it.amount());
            double perUnit = it.mode() == BatchItem.Mode.PER_UNIT ? Num.qty(it.amount()) : total / req.quantity();
            Plan plan = stock.plan(m.getId(), total, credit.getOrDefault(m.getId(), Map.of()));
            plans.put(m.getId(), plan);
            items.add(new BatchItem(m.getId(), m.getName(), m.getUnit(), it.mode(), perUnit, total, plan.allocations()));
        }
        List<AppliedMargin> margins = req.margins() == null ? List.of() : req.margins().stream()
                .map(m -> new AppliedMargin(m.marginId(), m.name().trim(), m.type(), Num.money(m.percent())))
                .toList();

        ProductionBatch b = new ProductionBatch();
        b.setName(req.name().trim());
        b.setDate(req.date());
        b.setQuantity(req.quantity());
        b.setSeasonal(req.seasonal());
        b.setItems(items);
        b.setExtraCosts(ExtraCost.clean(req.extraCosts()));
        b.setMargins(margins);
        b.setSalePrice(req.salePrice() == null || req.salePrice() <= 0 ? null : Num.money(req.salePrice()));
        b.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        // Valida as margens já aqui (soma >= 95% gera erro).
        Pricing.compute(1, margins, req.seasonal());
        return new Built(b, plans);
    }

    private static void requireStock(Built built) {
        List<String> missing = new ArrayList<>();
        for (BatchItem item : built.batch().getItems()) {
            Plan plan = built.plans().get(item.materialId());
            if (plan != null && plan.shortage() > Num.EPS) {
                missing.add(item.materialName() + ": faltam " + fmt(plan.shortage()) + " " + item.unit());
            }
        }
        if (!missing.isEmpty()) {
            throw ApiException.badRequest("Estoque insuficiente — " + String.join("; ", missing)
                    + ". Registre a compra (botão \"Nova compra\") ou reduza as quantidades.");
        }
    }

    /** Consumo atual do pacote por insumo e lote (devolvido virtualmente ao recalcular). */
    private static Map<String, Map<String, Double>> creditByMaterial(ProductionBatch existing) {
        Map<String, Map<String, Double>> credit = new HashMap<>();
        if (existing == null) {
            return credit;
        }
        for (BatchItem item : existing.getItems()) {
            for (Allocation a : item.allocations()) {
                credit.computeIfAbsent(item.materialId(), k -> new HashMap<>()).merge(a.lotId(), a.quantity(), Double::sum);
            }
        }
        return credit;
    }

    private static List<Allocation> allocations(ProductionBatch b) {
        return b.getItems().stream().flatMap(i -> i.allocations().stream()).toList();
    }

    // ------------------------------------------------------------------ cálculo

    static BatchView view(ProductionBatch b, int sold, Map<String, Plan> plans) {
        int qty = Math.max(1, b.getQuantity());
        double materialCost = 0;
        boolean shortage = false;
        List<ItemView> items = new ArrayList<>();
        for (BatchItem item : b.getItems()) {
            Plan plan = plans.get(item.materialId());
            double missing = plan == null ? 0 : plan.shortage();
            double missingCost = missing * (plan == null ? 0 : plan.lastUnitCost());
            double cost = item.cost() + missingCost;
            shortage |= missing > Num.EPS;
            materialCost += cost;
            items.add(new ItemView(item.materialId(), item.materialName(), item.unit(), item.mode(),
                    Num.qty(item.perUnit()), Num.qty(item.total()), Num.money(cost), Num.unit(cost / qty),
                    item.total() > 0 ? Num.unit(cost / item.total()) : 0,
                    Num.qty(missing), Num.money(missingCost), item.allocations()));
        }
        double extraPerUnit = b.getExtraCosts().stream().mapToDouble(ExtraCost::amount).sum();
        double materialPerUnit = materialCost / qty;
        double unitCost = materialPerUnit + extraPerUnit;
        Pricing.Result price = Pricing.compute(unitCost, b.getMargins(), b.isSeasonal());
        boolean manual = b.getSalePrice() != null;
        double salePrice = manual ? b.getSalePrice() : price.suggested();
        double profit = salePrice - unitCost;

        return new BatchView(b.getId(), b.getNumber(), b.getName(), b.getDate(), b.getQuantity(), b.isSeasonal(),
                b.getNote(), b.getCreatedAt(), b.getUpdatedAt(), items, b.getExtraCosts(), b.getMargins(),
                Num.money(materialCost), Num.unit(materialPerUnit), Num.money(extraPerUnit),
                Num.unit(unitCost), Num.money(unitCost * b.getQuantity()),
                price.basePercent(), price.seasonalPercent(), price.appliedPercent(),
                price.priceNormal(), price.priceSeasonal(), price.suggested(),
                Num.money(salePrice), manual, Num.money(profit),
                salePrice > 0 ? Num.money(profit / salePrice * 100) : 0,
                unitCost > 0 ? Num.money(profit / unitCost * 100) : 0,
                sold, b.getQuantity() - sold, shortage);
    }

    private static String fmt(double v) {
        return String.format(java.util.Locale.forLanguageTag("pt-BR"), "%,.2f", v).replaceAll(",00$", "");
    }
}
