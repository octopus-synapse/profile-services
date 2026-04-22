import { describe, expect, it, mock } from 'bun:test';
import type { Response } from 'express';
import { DictionaryProjectorService } from '../application/dictionary-projector.service';
import { I18nDictionaryController } from './i18n-dictionary.controller';

function mockRes(): { res: Response; setHeader: ReturnType<typeof mock> } {
  const setHeader = mock(() => undefined);
  const res = { setHeader } as unknown as Response;
  return { res, setHeader };
}

describe('I18nDictionaryController', () => {
  const controller = new I18nDictionaryController(new DictionaryProjectorService());

  it('getErrors returns pt-BR messages when Accept-Language is pt-BR', () => {
    const { res, setHeader } = mockRes();
    const body = controller.getErrors('pt-BR', res);
    expect(body.locale).toBe('pt-BR');
    expect(body.entries.ENTITY_NOT_FOUND).toContain('não encontrado');
    expect(setHeader).toHaveBeenCalledWith('Content-Language', 'pt-BR');
  });

  it('getErrors returns en messages when Accept-Language is en', () => {
    const { res } = mockRes();
    const body = controller.getErrors('en', res);
    expect(body.locale).toBe('en');
    expect(body.entries.ENTITY_NOT_FOUND).toContain('not found');
  });

  it('getErrors falls back to default locale for unsupported', () => {
    const { res } = mockRes();
    const body = controller.getErrors('fr-FR', res);
    expect(body.locale).toBe('en');
  });

  it('getEnums returns flat value → label map in the negotiated locale', () => {
    const { res } = mockRes();
    const body = controller.getEnums('pt-BR', res);
    expect(body.locale).toBe('pt-BR');
    expect(body.entries.RemotePolicy.REMOTE).toBe('Remoto');
    expect(body.entries.JobType.FULL_TIME).toBe('Tempo integral');
  });

  it('getNotifications returns templates with title/body/params in negotiated locale', () => {
    const { res } = mockRes();
    const body = controller.getNotifications('pt-BR', res);
    expect(body.locale).toBe('pt-BR');
    const postLiked = body.entries.POST_LIKED;
    expect(postLiked.title).toContain('{actorName}');
    expect(postLiked.body).toContain('{actorName}');
    expect(postLiked.params).toEqual(['actorName', 'postExcerpt']);
  });
});
