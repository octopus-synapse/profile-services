import type { ISkillManagementCreationPort } from './skill-management-creation.port';
import type { ISkillManagementItemPort } from './skill-management-item.port';

export interface ISkillManagementRepositoryPort
  extends ISkillManagementCreationPort,
    ISkillManagementItemPort {}

export type SkillManagementRepositoryPort = ISkillManagementRepositoryPort;
