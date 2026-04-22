import { describe, expect, it } from 'bun:test';
import { I18nDictionaryController } from './i18n-dictionary.controller';

describe('I18nDictionaryController', () => {
  const controller = new I18nDictionaryController();

  it('getErrors returns both locales and a known code', () => {
    const res = controller.getErrors();
    expect(res.success).toBe(true);
    expect(res.data.locales).toEqual(['en', 'pt-BR']);
    expect(res.data.entries.ENTITY_NOT_FOUND).toBeDefined();
    expect(res.data.entries.ENTITY_NOT_FOUND.en).toContain('not found');
    expect(res.data.entries.ENTITY_NOT_FOUND['pt-BR']).toContain('não encontrado');
  });

  it('getEnums returns grouped enum labels', () => {
    const res = controller.getEnums();
    expect(res.success).toBe(true);
    const rp = res.data.entries.RemotePolicy;
    expect(rp.REMOTE['pt-BR']).toBe('Remoto');
    expect(rp.HYBRID.en).toBe('Hybrid');
  });

  it('getNotifications returns title/body templates with declared params', () => {
    const res = controller.getNotifications();
    expect(res.success).toBe(true);
    const postLiked = res.data.entries.POST_LIKED;
    expect(postLiked.title.en).toContain('{actorName}');
    expect(postLiked.body['pt-BR']).toContain('{actorName}');
    expect(postLiked.params).toEqual(['actorName', 'postExcerpt']);
  });
});
