package com.chamaessencia.production;

import java.util.List;

import com.chamaessencia.common.ApiException;
import com.chamaessencia.common.Num;
import com.chamaessencia.margin.Margin;

/**
 * Formação do preço de venda por MARGEM sobre o preço (não por markup sobre o custo):
 *
 * <pre>
 *   Normal:   Preço = Custo ÷ (1 − Margem)                     ex.: 14 ÷ (1 − 0,20)        = R$ 17,50
 *   Sazonal:  Preço = Custo ÷ (1 − Margem − Margem sazonal)    ex.: 14 ÷ (1 − 0,20 − 0,10) = R$ 20,00
 * </pre>
 *
 * "Margem" é a soma das margens não sazonais aplicadas ao pacote (lucro + as definidas pela loja, como taxa
 * de cartão). Margens sazonais só entram quando o pacote está marcado como sazonal.
 */
public final class Pricing {

    /** Acima disso o preço explode (divisão por quase zero) — provavelmente erro de digitação. */
    public static final double MAX_TOTAL_PERCENT = 95.0;

    private Pricing() {
    }

    /**
     * @param basePercent     soma das margens não sazonais (pontos percentuais)
     * @param seasonalPercent soma das margens sazonais (pontos percentuais)
     * @param priceNormal     preço sem as margens sazonais
     * @param priceSeasonal   preço com as margens sazonais
     * @param suggested       preço do tipo do pacote (sazonal ou normal), arredondado em centavos
     */
    public record Result(double basePercent, double seasonalPercent, double appliedPercent,
                         double priceNormal, double priceSeasonal, double suggested) {
    }

    /** Preço = custo ÷ (1 − margem%). */
    public static double price(double cost, double marginPercent) {
        if (marginPercent >= 100.0) {
            throw ApiException.badRequest("A soma das margens precisa ser menor que 100%.");
        }
        return cost / (1.0 - marginPercent / 100.0);
    }

    public static Result compute(double unitCost, List<AppliedMargin> margins, boolean seasonal) {
        double base = 0;
        double seasonalSum = 0;
        for (AppliedMargin m : margins) {
            if (m.type() == Margin.Type.SEASONAL) {
                seasonalSum += m.percent();
            } else {
                base += m.percent();
            }
        }
        double applied = seasonal ? base + seasonalSum : base;
        if (applied > MAX_TOTAL_PERCENT) {
            throw ApiException.badRequest("A soma das margens aplicadas (" + Num.money(applied)
                    + "%) passa de " + (int) MAX_TOTAL_PERCENT + "%. Revise as margens do pacote.");
        }
        double normal = price(unitCost, base);
        double withSeasonal = base + seasonalSum < 100 ? price(unitCost, base + seasonalSum) : Double.NaN;
        double suggested = seasonal ? withSeasonal : normal;
        return new Result(Num.money(base), Num.money(seasonalSum), Num.money(applied),
                Num.money(normal), Double.isNaN(withSeasonal) ? 0 : Num.money(withSeasonal), Num.money(suggested));
    }
}
