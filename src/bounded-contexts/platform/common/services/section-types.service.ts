import { Injectable } from '@nestjs/common';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';

export interface SectionTypeListItem {
  key: string;
  semanticKind: string;
  title: string;
}

@Injectable()
export class SectionTypesService {
  constructor(private readonly sectionTypeRepository: SectionTypeRepository) {}

  getAll() {
    return this.sectionTypeRepository.getAll();
  }

  getAllAsDto(): SectionTypeListItem[] {
    const out: SectionTypeListItem[] = [];
    for (const st of this.getAll()) {
      out.push({ key: st.key, semanticKind: st.semanticKind ?? '', title: st.title });
    }
    return out;
  }
}
