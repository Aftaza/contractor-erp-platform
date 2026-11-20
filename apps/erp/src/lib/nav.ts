import type { Component } from 'svelte';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import ChartColumn from '@lucide/svelte/icons/chart-column';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import FileText from '@lucide/svelte/icons/file-text';
import FolderKanban from '@lucide/svelte/icons/folder-kanban';
import Globe from '@lucide/svelte/icons/globe';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import Trash from '@lucide/svelte/icons/trash';
import Truck from '@lucide/svelte/icons/truck';
import User from '@lucide/svelte/icons/user';
import UserCog from '@lucide/svelte/icons/user-cog';
import Users from '@lucide/svelte/icons/users';
import Wrench from '@lucide/svelte/icons/wrench';

export type Role = 'pimpinan' | 'admin' | 'staff_gudang';
export type Group = 'Operasional' | 'Data' | 'Laporan' | 'Pengaturan';

export interface NavItem {
	/** Route ID SvelteKit — dicocokkan dengan halaman yang benar-benar ada. */
	id: string;
	label: string;
	icon: Component;
	roles: Role[];
	group: Group;
}

const P: Role = 'pimpinan';
const A: Role = 'admin';
const G: Role = 'staff_gudang';

// shortcut: id route selain dashboard adalah tebakan dari SRS §2.4; item otomatis
// tersembunyi sampai halamannya ada, jadi sesuaikan id di sini saat halaman dibuat.
export const NAV: NavItem[] = [
	{ id: '/(app)/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [P, A, G], group: 'Operasional' },
	{ id: '/(app)/projects', label: 'Proyek', icon: FolderKanban, roles: [P, A, G], group: 'Operasional' },
	{ id: '/(app)/approvals', label: 'Persetujuan', icon: CircleCheck, roles: [P], group: 'Operasional' },
	{ id: '/(app)/tools', label: 'Alat', icon: Wrench, roles: [P, A, G], group: 'Operasional' },
	{ id: '/(app)/handovers', label: 'Serah Terima', icon: ClipboardList, roles: [G], group: 'Operasional' },
	{ id: '/(app)/clients', label: 'Klien', icon: Users, roles: [P, A], group: 'Data' },
	{ id: '/(app)/vendors', label: 'Vendor', icon: Truck, roles: [P, A], group: 'Data' },
	{ id: '/(app)/documents', label: 'Dokumen', icon: FileText, roles: [P, A], group: 'Data' },
	{ id: '/(app)/reports', label: 'Laporan', icon: ChartColumn, roles: [P, A], group: 'Laporan' },
	{ id: '/(app)/settings/site', label: 'Publikasi Situs', icon: Globe, roles: [P], group: 'Pengaturan' },
	{ id: '/(app)/settings/users', label: 'Pengguna', icon: UserCog, roles: [P], group: 'Pengaturan' },
	{ id: '/(app)/settings/audit', label: 'Audit Log', icon: ScrollText, roles: [P], group: 'Pengaturan' },
	{ id: '/(app)/settings/trash', label: 'Tempat Sampah', icon: Trash, roles: [P], group: 'Pengaturan' }
];

/** Akun Saya: hanya di menu akun / Lainnya, bukan sidebar. */
export const ACCOUNT: NavItem = {
	id: '/(app)/account',
	label: 'Akun Saya',
	icon: User,
	roles: [P, A, G],
	group: 'Pengaturan'
};

// DESIGN.md §Layout: ≤ 4 item + "Lainnya" per role.
const BOTTOM: Record<Role, string[]> = {
	pimpinan: ['/(app)/dashboard', '/(app)/projects', '/(app)/approvals', '/(app)/reports'],
	admin: ['/(app)/dashboard', '/(app)/projects', '/(app)/tools', '/(app)/reports'],
	staff_gudang: ['/(app)/dashboard', '/(app)/tools', '/(app)/handovers', '/(app)/projects']
};

/** Route ID dari kunci glob `/src/routes/(app)/x/+page.svelte` → `/(app)/x`. */
export function routeIds(globKeys: string[]): Set<string> {
	return new Set(globKeys.map((k) => k.replace('/src/routes', '').replace(/\/\+page\.svelte$/, '')));
}

/** Menu untuk satu role, hanya item yang halamannya ada. */
export function menuFor(role: Role, exists: Set<string>) {
	const visible = NAV.filter((i) => i.roles.includes(role) && exists.has(i.id));
	const bottom = BOTTOM[role].map((id) => visible.find((i) => i.id === id)).filter((i) => i !== undefined);
	const more = visible.filter((i) => !bottom.includes(i));
	if (exists.has(ACCOUNT.id)) more.push(ACCOUNT);
	const groups = (['Operasional', 'Data', 'Laporan', 'Pengaturan'] as Group[])
		.map((name) => ({ name, items: visible.filter((i) => i.group === name) }))
		.filter((g) => g.items.length);
	return { groups, bottom, more };
}
