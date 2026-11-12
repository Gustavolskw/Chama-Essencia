package com.chamaessencia.balance;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chamaessencia.common.ApiException;
import com.chamaessencia.common.Num;
import com.chamaessencia.production.BatchDtos.BatchView;
import com.chamaessencia.production.BatchService;
import com.chamaessencia.sale.SaleDtos.SaleItemView;
import com.chamaessencia.sale.SaleDtos.SaleView;
import com.chamaessencia.sale.SaleRepository;
import com.chamaessencia.sale.SaleService;
import com.chamaessencia.stock.Purchase;
import com.chamaessencia.stock.PurchaseRepository;
import com.chamaessencia.stock.StockDtos.MaterialView;
import com.chamaessencia.stock.StockService;

/**
 * Balanço financeiro do período: vendas, custo das velas vendidas (CMV), compras de insumos e a posição
 * atual do estoque (insumos e velas prontas).
 */
@RestController
@RequestMapping("/api/balance")
public class BalanceController {

    public record MonthRow(String month, double revenue, double cogs, double profit, double purchases,
                           int candlesSold, int candlesProduced, double productionCost) {
    }

    public record CustomerRow(String customer, int sales, int candles, double revenue, double profit) {
    }

    public record BatchRow(String id, long number, String name, boolean seasonal, int produced, int soldInPeriod,
                           int available, double unitCost, double salePrice, double revenue, double cogs,
                           double profit) {
    }

    public record Balance(
            LocalDate from, LocalDate to,
            /** Vendas: total recebido (já com descontos). */
            double revenue, double discounts,
            /** Custo de produção das velas vendidas no período. */
            double cogs, double grossProfit, double grossMarginPercent,
            /** Compras de insumos no período (saída de caixa). */
            double purchases,
            /** Resultado de caixa simples: vendas − compras. */
            double cashResult,
            double productionCost, int candlesProduced, int candlesSold, int salesCount, double averageTicket,
            /** Posição atual (independe do período). */
            double materialStockValue, int lowStockCount,
            int finishedCandles, double finishedStockCost, double finishedStockPotential,
            List<MonthRow> months, List<CustomerRow> customers, List<BatchRow> batches) {
    }

    private final SaleRepository sales;
    private final PurchaseRepository purchases;
    private final BatchService batchService;
    private final StockService stockService;

    public BalanceController(SaleRepository sales, PurchaseRepository purchases, BatchService batchService,
                             StockService stockService) {
        this.sales = sales;
        this.purchases = purchases;
        this.batchService = batchService;
        this.stockService = stockService;
    }

    @GetMapping
    public Balance balance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw ApiException.badRequest("A data inicial deve ser anterior à final.");
        }
        List<BatchView> allBatches = batchService.list();
        Map<String, BatchView> batchesById = new TreeMap<>();
        allBatches.forEach(b -> batchesById.put(b.id(), b));

        List<SaleView> periodSales = sales.findAll().stream()
                .filter(s -> SaleService.inRange(s.getDate(), from, to))
                .map(s -> SaleService.view(s, batchesById))
                .toList();
        List<Purchase> periodPurchases = purchases.findAll().stream()
                .filter(p -> SaleService.inRange(p.getDate(), from, to))
                .toList();
        List<BatchView> periodBatches = allBatches.stream()
                .filter(b -> SaleService.inRange(b.date(), from, to))
                .toList();

        double revenue = 0, discounts = 0, cogs = 0;
        int candlesSold = 0;
        Map<String, double[]> months = new TreeMap<>();
        Map<String, CustomerAcc> customers = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        Map<String, double[]> perBatch = new TreeMap<>();
        for (SaleView s : periodSales) {
            revenue += s.total();
            discounts += s.discount();
            cogs += s.cost();
            candlesSold += s.candles();
            double[] m = month(months, s.date());
            m[0] += s.total();
            m[1] += s.cost();
            m[4] += s.candles();
            CustomerAcc c = customers.computeIfAbsent(s.customer(), k -> new CustomerAcc(s.customer()));
            c.sales++;
            c.candles += s.candles();
            c.revenue += s.total();
            c.profit += s.profit();
            // Desconto rateado entre os itens pelo valor de cada um (para o lucro por pacote).
            double factor = s.subtotal() > 0 ? s.total() / s.subtotal() : 0;
            for (SaleItemView i : s.items()) {
                double[] acc = perBatch.computeIfAbsent(i.batchId(), k -> new double[3]);
                acc[0] += i.quantity();
                acc[1] += i.total() * factor;
                acc[2] += i.cost();
            }
        }
        double purchasesTotal = 0;
        for (Purchase p : periodPurchases) {
            purchasesTotal += p.getTotalPrice();
            month(months, p.getDate())[3] += p.getTotalPrice();
        }
        double productionCost = 0;
        int produced = 0;
        for (BatchView b : periodBatches) {
            productionCost += b.totalCost();
            produced += b.quantity();
            double[] m = month(months, b.date());
            m[5] += b.quantity();
            m[6] += b.totalCost();
        }

        List<MaterialView> materials = stockService.listMaterials();
        double materialStock = materials.stream().mapToDouble(MaterialView::stockValue).sum();
        int low = (int) materials.stream().filter(MaterialView::lowStock).count();
        int finished = 0;
        double finishedCost = 0, finishedPotential = 0;
        for (BatchView b : allBatches) {
            finished += Math.max(0, b.available());
            finishedCost += Math.max(0, b.available()) * b.unitCost();
            finishedPotential += Math.max(0, b.available()) * b.salePrice();
        }

        List<MonthRow> monthRows = new ArrayList<>();
        months.forEach((k, m) -> monthRows.add(new MonthRow(k, Num.money(m[0]), Num.money(m[1]),
                Num.money(m[0] - m[1]), Num.money(m[3]), (int) m[4], (int) m[5], Num.money(m[6]))));

        List<CustomerRow> customerRows = customers.values().stream()
                .sorted(Comparator.comparingDouble((CustomerAcc c) -> c.revenue).reversed())
                .map(c -> new CustomerRow(c.name, c.sales, c.candles, Num.money(c.revenue), Num.money(c.profit)))
                .toList();

        List<BatchRow> batchRows = allBatches.stream()
                .filter(b -> perBatch.containsKey(b.id()) || SaleService.inRange(b.date(), from, to))
                .map(b -> {
                    double[] acc = perBatch.getOrDefault(b.id(), new double[3]);
                    return new BatchRow(b.id(), b.number(), b.name(), b.seasonal(), b.quantity(), (int) acc[0],
                            b.available(), b.unitCost(), b.salePrice(), Num.money(acc[1]), Num.money(acc[2]),
                            Num.money(acc[1] - acc[2]));
                })
                .toList();

        double gross = revenue - cogs;
        return new Balance(from, to, Num.money(revenue), Num.money(discounts), Num.money(cogs), Num.money(gross),
                revenue > 0 ? Num.money(gross / revenue * 100) : 0, Num.money(purchasesTotal),
                Num.money(revenue - purchasesTotal), Num.money(productionCost), produced, candlesSold,
                periodSales.size(), periodSales.isEmpty() ? 0 : Num.money(revenue / periodSales.size()),
                Num.money(materialStock), low, finished, Num.money(finishedCost), Num.money(finishedPotential),
                monthRows, customerRows, batchRows);
    }

    private static double[] month(Map<String, double[]> months, LocalDate date) {
        return months.computeIfAbsent(YearMonth.from(date).toString(), k -> new double[7]);
    }

    private static final class CustomerAcc {
        final String name;
        int sales;
        int candles;
        double revenue;
        double profit;

        CustomerAcc(String name) {
            this.name = name;
        }
    }
}
