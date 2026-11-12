package com.chamaessencia.common;

/** Utilitários numéricos: arredondamento de valores e comparação de quantidades com tolerância. */
public final class Num {

    /** Tolerância para comparar quantidades fracionadas (ex.: 0,1 + 0,2). */
    public static final double EPS = 1e-6;

    private Num() {
    }

    public static double money(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    /** Quantidades guardadas com até 4 casas (g, ml, un). */
    public static double qty(double value) {
        return Math.round(value * 10_000.0) / 10_000.0;
    }

    /** Custo unitário com mais precisão (ex.: R$ 0,0339 por grama). */
    public static double unit(double value) {
        return Math.round(value * 1_000_000.0) / 1_000_000.0;
    }

    public static double nz(Double value) {
        return value == null ? 0.0 : value;
    }
}
