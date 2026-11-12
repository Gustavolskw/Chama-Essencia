package com.chamaessencia.stock;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.chamaessencia.common.ApiException;
import com.chamaessencia.common.Num;
import com.chamaessencia.stock.StockDtos.MaterialRequest;
import com.chamaessencia.stock.StockDtos.MaterialView;
import com.chamaessencia.stock.StockDtos.PurchaseRequest;
import com.chamaessencia.stock.StockDtos.PurchaseView;

/**
 * Estoque de insumos em lotes. Cada compra é um lote; os pacotes de produção consomem os lotes em
 * ordem FIFO (o mais antigo primeiro), e cada consumo guarda o custo unitário do lote de onde saiu.
 */
@Service
public class StockService {

    /** Coleção dos pacotes de produção (atualizada quando o preço de um lote é corrigido). */
    private static final String BATCHES_COLLECTION = "batches";

    private static final Comparator<Purchase> FIFO = Comparator
            .comparing(Purchase::getDate)
            .thenComparing(Purchase::getCreatedAt);

    private final MaterialRepository materials;
    private final PurchaseRepository purchases;
    private final MongoTemplate mongo;

    public StockService(MaterialRepository materials, PurchaseRepository purchases, MongoTemplate mongo) {
        this.materials = materials;
        this.purchases = purchases;
        this.mongo = mongo;
    }

    // ------------------------------------------------------------------ insumos

    public List<MaterialView> listMaterials() {
        Map<String, List<Purchase>> byMaterial = purchases.findAll().stream()
                .collect(Collectors.groupingBy(Purchase::getMaterialId));
        return materials.findAll().stream()
                .sorted(Comparator.comparing(m -> m.getNameKey()))
                .map(m -> view(m, byMaterial.getOrDefault(m.getId(), List.of())))
                .toList();
    }

    public MaterialView materialView(String id) {
        return view(material(id), purchases.findByMaterialId(id));
    }

    public Material material(String id) {
        return materials.findById(id).orElseThrow(() -> ApiException.notFound("Insumo não encontrado."));
    }

    public MaterialView createMaterial(MaterialRequest req) {
        Material m = new Material();
        apply(m, req);
        if (materials.existsByNameKey(m.getNameKey())) {
            throw new ApiException(HttpStatus.CONFLICT, "Já existe um insumo com este nome.");
        }
        materials.save(m);
        return view(m, List.of());
    }

    public MaterialView updateMaterial(String id, MaterialRequest req) {
        Material m = material(id);
        String oldKey = m.getNameKey();
        apply(m, req);
        if (!m.getNameKey().equals(oldKey) && materials.existsByNameKey(m.getNameKey())) {
            throw new ApiException(HttpStatus.CONFLICT, "Já existe um insumo com este nome.");
        }
        materials.save(m);
        return materialView(id);
    }

    public void deleteMaterial(String id) {
        material(id);
        if (purchases.existsByMaterialId(id)) {
            throw ApiException.badRequest("Este insumo tem compras registradas. Remova as compras antes (só é possível "
                    + "remover compras que ainda não foram usadas em pacotes).");
        }
        materials.deleteById(id);
    }

    private static void apply(Material m, MaterialRequest req) {
        m.setName(req.name().trim());
        m.setNameKey(key(req.name()));
        m.setUnit(req.unit().trim());
        m.setCategory(blankToNull(req.category()));
        m.setMinStock(Num.qty(req.minStock()));
        m.setNote(blankToNull(req.note()));
    }

    private static MaterialView view(Material m, List<Purchase> lots) {
        double stock = 0;
        double stockValue = 0;
        double purchased = 0;
        double spent = 0;
        Purchase last = null;
        for (Purchase p : lots) {
            stock += p.getRemaining();
            stockValue += p.getRemaining() * p.getUnitCost();
            purchased += p.getQuantity();
            spent += p.getTotalPrice();
            if (last == null || FIFO.compare(p, last) > 0) {
                last = p;
            }
        }
        double lastCost = last == null ? 0 : last.getUnitCost();
        double avg = stock > Num.EPS ? stockValue / stock : lastCost;
        return new MaterialView(m.getId(), m.getName(), m.getUnit(), m.getCategory(), m.getMinStock(), m.getNote(),
                Num.qty(stock), Num.money(stockValue), Num.unit(avg), Num.unit(lastCost),
                last == null ? null : last.getDate(), Num.qty(purchased), Num.money(spent),
                Num.qty(purchased - stock), lots.size(),
                m.getMinStock() > 0 && stock <= m.getMinStock() + Num.EPS);
    }

    // ------------------------------------------------------------------ compras (lotes)

    public List<PurchaseView> listPurchases(String materialId) {
        Map<String, Material> byId = materials.findAll().stream()
                .collect(Collectors.toMap(Material::getId, m -> m));
        List<Purchase> list = materialId == null || materialId.isBlank()
                ? purchases.findAll() : purchases.findByMaterialId(materialId);
        return list.stream()
                .sorted(FIFO.reversed())
                .map(p -> view(p, byId.get(p.getMaterialId())))
                .toList();
    }

    public PurchaseView createPurchase(PurchaseRequest req) {
        Material m = material(req.materialId());
        Purchase p = new Purchase();
        p.setMaterialId(m.getId());
        p.setDate(req.date());
        p.setQuantity(Num.qty(req.quantity()));
        p.setRemaining(p.getQuantity());
        p.setTotalPrice(Num.money(req.totalPrice()));
        p.setUnitCost(Num.unit(p.getTotalPrice() / p.getQuantity()));
        p.setSupplier(blankToNull(req.supplier()));
        p.setNote(blankToNull(req.note()));
        purchases.save(p);
        return view(p, m);
    }

    /**
     * Corrige uma compra. A quantidade não pode ficar abaixo do que já foi consumido; se o preço mudar, o
     * custo dos pacotes que usaram este lote é recalculado.
     */
    public PurchaseView updatePurchase(String id, PurchaseRequest req) {
        Purchase p = purchase(id);
        Material m = material(req.materialId());
        double consumed = p.consumed();
        if (!m.getId().equals(p.getMaterialId()) && consumed > Num.EPS) {
            throw ApiException.badRequest("Esta compra já foi usada em pacotes de produção; não é possível trocar o insumo.");
        }
        double quantity = Num.qty(req.quantity());
        if (quantity + Num.EPS < consumed) {
            throw ApiException.badRequest("Já foram consumidos " + fmt(consumed) + " " + m.getUnit()
                    + " deste lote; a quantidade não pode ser menor que isso.");
        }
        double delta = quantity - p.getQuantity();
        double price = Num.money(req.totalPrice());
        double unitCost = Num.unit(price / quantity);

        // Atualização condicional: se um pacote consumiu do lote ao mesmo tempo, o saldo não fica negativo.
        Query query = Query.query(Criteria.where("_id").is(id).and("remaining").gte(-delta - Num.EPS));
        Update update = new Update()
                .set("materialId", m.getId())
                .set("date", req.date())
                .set("quantity", quantity)
                .inc("remaining", delta)
                .set("totalPrice", price)
                .set("unitCost", unitCost)
                .set("supplier", blankToNull(req.supplier()))
                .set("note", blankToNull(req.note()));
        Purchase saved = mongo.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true), Purchase.class);
        if (saved == null) {
            throw new ApiException(HttpStatus.CONFLICT, "O saldo deste lote mudou. Atualize a tela e tente novamente.");
        }
        if (Math.abs(unitCost - p.getUnitCost()) > 1e-9) {
            propagateLotCost(id, unitCost);
        }
        return view(saved, m);
    }

    public void deletePurchase(String id) {
        Purchase p = purchase(id);
        if (p.consumed() > Num.EPS) {
            throw ApiException.badRequest("Esta compra já foi usada em pacotes de produção e não pode ser removida. "
                    + "Corrija a quantidade/preço ou remova os pacotes que a utilizam.");
        }
        purchases.deleteById(id);
    }

    private Purchase purchase(String id) {
        return purchases.findById(id).orElseThrow(() -> ApiException.notFound("Compra não encontrada."));
    }

    private static PurchaseView view(Purchase p, Material m) {
        return new PurchaseView(p.getId(), p.getMaterialId(), m == null ? "(insumo removido)" : m.getName(),
                m == null ? "" : m.getUnit(), p.getDate(), p.getQuantity(), p.getTotalPrice(), p.getUnitCost(),
                Num.qty(p.getRemaining()), Num.qty(p.consumed()), p.getSupplier(), p.getNote());
    }

    /** Atualiza o custo unitário guardado nos consumos dos pacotes que usaram o lote. */
    private void propagateLotCost(String lotId, double unitCost) {
        Query query = Query.query(Criteria.where("items.allocations.lotId").is(lotId));
        Update update = new Update()
                .set("items.$[].allocations.$[a].unitCost", unitCost)
                .filterArray(Criteria.where("a.lotId").is(lotId));
        mongo.updateMulti(query, update, BATCHES_COLLECTION);
    }

    // ------------------------------------------------------------------ consumo FIFO

    /**
     * Resultado do planejamento de consumo de um insumo.
     *
     * @param shortage      quantidade que faltou no estoque
     * @param lastUnitCost  custo da última compra (estimativa para a parte que falta)
     */
    public record Plan(List<Allocation> allocations, double shortage, double lastUnitCost) {

        public double allocatedCost() {
            return allocations.stream().mapToDouble(Allocation::cost).sum();
        }
    }

    /**
     * Planeja (sem gravar) o consumo de {@code quantity} do insumo, do lote mais antigo para o mais novo.
     *
     * @param credit quantidades por lote que devem ser consideradas devolvidas antes de planejar
     *               (o consumo anterior do próprio pacote, ao recalcular um pacote existente)
     */
    public Plan plan(String materialId, double quantity, Map<String, Double> credit) {
        List<Purchase> lots = new ArrayList<>(purchases.findByMaterialId(materialId));
        lots.sort(FIFO);
        double lastCost = lots.isEmpty() ? 0 : lots.get(lots.size() - 1).getUnitCost();
        double missing = Num.qty(quantity);
        List<Allocation> allocations = new ArrayList<>();
        for (Purchase lot : lots) {
            if (missing <= Num.EPS) {
                break;
            }
            double available = lot.getRemaining() + credit.getOrDefault(lot.getId(), 0.0);
            if (available <= Num.EPS) {
                continue;
            }
            double take = Num.qty(Math.min(available, missing));
            allocations.add(new Allocation(lot.getId(), take, lot.getUnitCost(), lot.getDate()));
            missing = Num.qty(missing - take);
        }
        return new Plan(allocations, Math.max(0, missing), lastCost);
    }

    /** Baixa os lotes de forma atômica; se algum não tiver saldo, desfaz o que já baixou. */
    public void consume(List<Allocation> allocations) {
        List<Allocation> done = new ArrayList<>();
        for (Allocation a : allocations) {
            Query query = Query.query(Criteria.where("_id").is(a.lotId()).and("remaining").gte(a.quantity() - Num.EPS));
            Purchase updated = mongo.findAndModify(query, new Update().inc("remaining", -a.quantity()),
                    FindAndModifyOptions.options().returnNew(true), Purchase.class);
            if (updated == null) {
                release(done);
                throw new ApiException(HttpStatus.CONFLICT,
                        "O estoque mudou enquanto o pacote era salvo. Recalcule e tente novamente.");
            }
            done.add(a);
        }
    }

    /** Devolve ao estoque o que foi consumido (ao editar ou remover um pacote). */
    public void release(List<Allocation> allocations) {
        for (Allocation a : allocations) {
            mongo.updateFirst(Query.query(Criteria.where("_id").is(a.lotId())),
                    new Update().inc("remaining", a.quantity()), Purchase.class);
        }
    }

    // ------------------------------------------------------------------ utilitários

    static String key(String name) {
        String noAccents = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noAccents.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String fmt(double v) {
        return String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", v).replaceAll(",00$", "");
    }
}
