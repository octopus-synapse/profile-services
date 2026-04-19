/**
 * Permission-aware menu builder.
 *
 * Returns the navigation tree the current user is allowed to see, with
 * labels already localized. UI renders <NavTree data={menu} /> and never
 * needs to hide/show items based on roles or feature flags.
 */

import type { Permission } from '@/shared-kernel/authorization';
import type { SupportedLocale } from './enum-catalog';

export interface MenuNode {
  id: string;
  path: string;
  icon: string;
  labels: Record<SupportedLocale, string>;
  children?: MenuNode[];
  requires?: Permission[];
}

const TREE: MenuNode[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    icon: 'layout-dashboard',
    labels: { 'pt-BR': 'Painel', en: 'Dashboard' },
  },
  {
    id: 'cv',
    path: '/cv',
    icon: 'file-text',
    labels: { 'pt-BR': 'Currículos', en: 'Resumes' },
  },
  {
    id: 'jobs',
    path: '/jobs',
    icon: 'briefcase',
    labels: { 'pt-BR': 'Vagas', en: 'Jobs' },
    children: [
      {
        id: 'jobs.applications',
        path: '/jobs/applications',
        icon: 'list-checks',
        labels: { 'pt-BR': 'Aplicações', en: 'Applications' },
      },
      {
        id: 'jobs.saved',
        path: '/jobs/saved',
        icon: 'bookmark',
        labels: { 'pt-BR': 'Salvas', en: 'Saved' },
      },
    ],
  },
  {
    id: 'network',
    path: '/mynetwork',
    icon: 'users',
    labels: { 'pt-BR': 'Rede', en: 'Network' },
    children: [
      {
        id: 'network.suggestions',
        path: '/mynetwork/suggestions',
        icon: 'user-plus',
        labels: { 'pt-BR': 'Sugestões', en: 'Suggestions' },
      },
    ],
  },
  {
    id: 'feed',
    path: '/feed',
    icon: 'newspaper',
    labels: { 'pt-BR': 'Feed', en: 'Feed' },
  },
  {
    id: 'messages',
    path: '/messages',
    icon: 'message-square',
    labels: { 'pt-BR': 'Mensagens', en: 'Messages' },
  },
  {
    id: 'settings',
    path: '/settings',
    icon: 'settings',
    labels: { 'pt-BR': 'Configurações', en: 'Settings' },
  },
  {
    id: 'admin',
    path: '/admin',
    icon: 'shield',
    labels: { 'pt-BR': 'Admin', en: 'Admin' },
    requires: ['admin:full_access' as Permission],
  },
];

function filterTree(nodes: MenuNode[], userPermissions: Set<string>): MenuNode[] {
  const out: MenuNode[] = [];
  for (const node of nodes) {
    if (node.requires && !node.requires.every((p) => userPermissions.has(p))) continue;
    const filtered: MenuNode = { ...node };
    if (node.children) {
      filtered.children = filterTree(node.children, userPermissions);
    }
    out.push(filtered);
  }
  return out;
}

export function buildMenu(userPermissions: string[]): MenuNode[] {
  return filterTree(TREE, new Set(userPermissions));
}
