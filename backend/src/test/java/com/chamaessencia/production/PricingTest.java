package com.chamaessencia.production;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.chamaessencia.common.ApiException;
import com.chamaessencia.margin.Margin;

class PricingTest {

    private static final AppliedMargin PROFIT = new AppliedMargin(null, "Lucro", Margin.Type.PROFIT, 20);
    private static final AppliedMargin SEASONAL = new AppliedMargin(null, "Sazonal", Margin.Type.SEASONAL, 10);

    @Test
    void precoNormalUsaSoAMargemDeLucro() {
        // 14 ÷ (1 − 0,20) = 17,50
        Pricing.Result r = Pricing.compute(14, List.of(PROFIT, SEASONAL), false);
        assertEquals(17.50, r.suggested(), 1e-9);
        assertEquals(20.00, r.priceSeasonal(), 1e-9);
        assertEquals(20, r.appliedPercent(), 1e-9);
    }

    @Test
    void precoSazonalSomaAsMargens() {
        // 14 ÷ (1 − 0,20 − 0,10) = 20,00
        Pricing.Result r = Pricing.compute(14, List.of(PROFIT, SEASONAL), true);
        assertEquals(20.00, r.suggested(), 1e-9);
        assertEquals(17.50, r.priceNormal(), 1e-9);
        assertEquals(30, r.appliedPercent(), 1e-9);
    }

    @Test
    void margensAdicionaisEntramNoPrecoNormal() {
        AppliedMargin card = new AppliedMargin(null, "Cartão", Margin.Type.ADDITIONAL, 5);
        // 14 ÷ (1 − 0,25) = 18,666... → 18,67
        assertEquals(18.67, Pricing.compute(14, List.of(PROFIT, card), false).suggested(), 1e-9);
    }

    @Test
    void somaDeMargensMuitoAltaEhRecusada() {
        AppliedMargin huge = new AppliedMargin(null, "Erro", Margin.Type.PROFIT, 90);
        assertThrows(ApiException.class, () -> Pricing.compute(14, List.of(huge, SEASONAL), true));
    }
}
