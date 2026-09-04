import { useMemo, useState } from "react";
import type { Account, AccountType, Transaction, Wallet } from "@/ipc/types";

export type DateRangeKey = "all" | "last30" | "thisMonth" | "lastMonth";
export type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export interface Filters {
  search: string;
  category: AccountType | "all";
  range: DateRangeKey;
  sort: SortKey;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  category: "all",
  range: "last30",
  sort: "date_desc",
};

const PAGE_SIZE = 20;

export function useTransactionFilters(
  transactions: Transaction[] | undefined,
  accounts: Account[] | undefined,
  wallets: Wallet[] | undefined
) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const accountIndex = useMemo(() => {
    const map = new Map<string, Account>();
    (accounts ?? []).forEach((account) => map.set(account.id, account));
    return map;
  }, [accounts]);

  const walletIndex = useMemo(() => {
    const map = new Map<string, Wallet>();
    (wallets ?? []).forEach((wallet) => map.set(wallet.id, wallet));
    return map;
  }, [wallets]);

  const filtered = useMemo(() => {
    let list = [...(transactions ?? [])];

    if (filters.range !== "all") {
      const [from, to] = resolveRange(filters.range);
      list = list.filter(
        (tx) => tx.payment_date >= from && tx.payment_date <= to
      );
    }

    if (filters.category !== "all") {
      list = list.filter((tx) => {
        const account = accountIndex.get(tx.account_id);
        return account?.account_type === filters.category;
      });
    }

    if (filters.search.trim()) {
      const needle = filters.search.trim().toLowerCase();
      list = list.filter((tx) => {
        const account = accountIndex.get(tx.account_id);
        const matchesDesc = tx.description.toLowerCase().includes(needle);
        const matchesAccount = account?.name.toLowerCase().includes(needle);
        return matchesDesc || matchesAccount;
      });
    }

    switch (filters.sort) {
      case "date_desc":
        list.sort((a, b) =>
          b.payment_date.localeCompare(a.payment_date) ||
          b.created_at.localeCompare(a.created_at)
        );
        break;
      case "date_asc":
        list.sort((a, b) => a.payment_date.localeCompare(b.payment_date));
        break;
      case "amount_desc":
        list.sort((a, b) => b.ves_amount - a.ves_amount);
        break;
      case "amount_asc":
        list.sort((a, b) => a.ves_amount - b.ves_amount);
        break;
    }
    return list;
  }, [transactions, filters, accountIndex]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const from = (clampedPage - 1) * PAGE_SIZE;
  const to = Math.min(from + PAGE_SIZE, filtered.length);
  const paged = filtered.slice(from, to);

  const setFiltersAndReset = (updater: (current: Filters) => Filters) => {
    setFilters((current) => updater(current));
    setPage(1);
  };

  return {
    filters,
    setFilters: setFiltersAndReset,
    page: clampedPage,
    setPage,
    pageSize: PAGE_SIZE,
    totalItems: filtered.length,
    totalPages,
    from: filtered.length ? from + 1 : 0,
    to,
    rows: paged,
    accountIndex,
    walletIndex,
  };
}

function resolveRange(range: Exclude<DateRangeKey, "all">): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (range) {
    case "last30": {
      const to = toDate(now);
      const from = new Date(now);
      from.setDate(now.getDate() - 30);
      return [toDate(from), to];
    }
    case "thisMonth": {
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      return [toDate(first), toDate(last)];
    }
    case "lastMonth": {
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      return [toDate(first), toDate(last)];
    }
  }
}

function toDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
