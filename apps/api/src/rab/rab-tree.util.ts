// acme-backend/src/rab/rab-tree.util.ts
//
// Fungsi murni pembangun pohon RAB dari daftar node flat — dipakai
// `GET /projects/:id/rab/nodes` (WP-14, fase-1-vertikal-rab.md §4). Satu
// query DB (`rab.service.ts`) mengambil SEMUA node proyek sekaligus, lalu
// fungsi ini menyusun hierarki di memori — bukan query berulang per level
// (master §5.4: "pohon bersarang, satu query").
import { RabNode } from '@prisma/client';

/**
 * `rollup` — WP-14b (fase-1-vertikal-rab.md §5b U4): default `0`, ditimpa
 * `applyRollup` dengan hasil recursive CTE (`rab.service.ts` `getTree`).
 * Field read-only, TAK PERNAH dihitung di sini — lihat `applyRollup`.
 */
export type RabNodeTree<N extends RabNode = RabNode> = N & {
  children: RabNodeTree<N>[];
  rollup: number;
};

/**
 * Susun daftar node flat jadi pohon bersarang. Root = node tanpa `parentId`
 * ATAU `parentId` menunjuk node yang tak ada di daftar (mis. sudah difilter
 * di query pemanggil) — diperlakukan sebagai root, bukan dibuang, supaya
 * fungsi ini tetap aman dipakai untuk subset node.
 */
export function buildRabTree<N extends RabNode>(nodes: N[]): RabNodeTree<N>[] {
  const byId = new Map<string, RabNodeTree<N>>();
  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [], rollup: 0 });
  }

  const roots: RabNodeTree<N>[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/**
 * Timpa `rollup` tiap node (termasuk keturunan) dengan nilai hasil query SQL
 * (`rab.service.ts` `getTree` — recursive CTE, WP-14b §5b U4). MURNI
 * pemetaan id→nilai yang sudah dihitung DB; TAK ADA aritmetika rollup di
 * sini — itu wajib SQL (aturan paket, hindari N+1 di pohon ~200 node).
 */
export function applyRollup<N extends RabNode>(
  nodes: RabNodeTree<N>[],
  rollupById: Map<string, number>,
): RabNodeTree<N>[] {
  for (const node of nodes) {
    node.rollup = rollupById.get(node.id) ?? 0;
    applyRollup(node.children, rollupById);
  }
  return nodes;
}

/**
 * ID node itu sendiri + seluruh keturunannya. Dipakai mencegah siklus saat
 * memindahkan node (`PATCH /rab/nodes/:id` dengan `parentId` baru) —
 * `recompute_project_progress()` (migration.sql) memakai recursive CTE yang
 * TAK mendeteksi siklus adjacency-list; parentId baru yang ternyata
 * keturunan node ini sendiri akan membuat CTE itu berputar tanpa henti.
 * Aman dipanggil di memori (skala ~200 node per proyek, master §4.4).
 */
export function descendantIds(nodeId: string, nodes: RabNode[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = childrenByParent.get(n.parentId) ?? [];
    list.push(n.id);
    childrenByParent.set(n.parentId, list);
  }

  const result = new Set<string>([nodeId]);
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }
  return result;
}
