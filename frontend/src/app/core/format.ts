import { Pipe, PipeTransform } from '@angular/core';

const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
/** Custos unitários pequenos (R$ 0,0339 por grama) precisam de mais casas. */
const unitMoneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const qtyFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

@Pipe({ name: 'brl' })
export class BrlPipe implements PipeTransform {
  transform(value: number | null | undefined, precise = false): string {
    return (precise ? unitMoneyFmt : moneyFmt).format(value ?? 0);
  }
}

@Pipe({ name: 'qty' })
export class QtyPipe implements PipeTransform {
  transform(value: number | null | undefined, unit?: string | null): string {
    const n = qtyFmt.format(value ?? 0);
    return unit ? `${n} ${unit}` : n;
  }
}

@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return `${pctFmt.format(value ?? 0)}%`;
  }
}

@Pipe({ name: 'dateBr' })
export class DateBrPipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

@Pipe({ name: 'monthBr' })
export class MonthBrPipe implements PipeTransform {
  transform(ym: string): string {
    const [y, m] = ym.split('-');
    return `${MONTHS[Number(m) - 1]}/${y}`;
  }
}

/** Data local no formato AAAA-MM-DD (sem conversão para UTC). */
export function isoDate(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Preço = custo ÷ (1 − margem%). Mesma fórmula do backend (Pricing.java). */
export function priceFor(cost: number, marginPercent: number): number {
  return marginPercent >= 100 ? NaN : cost / (1 - marginPercent / 100);
}

export const FORMAT_PIPES = [BrlPipe, QtyPipe, PctPipe, DateBrPipe, MonthBrPipe];
