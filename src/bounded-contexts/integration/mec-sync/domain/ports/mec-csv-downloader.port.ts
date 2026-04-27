/**
 * Outbound port for the MEC CSV download — the puppeteer/Cloudflare
 * adapter sits behind it. Returns the raw bytes so the encoding layer
 * can decide UTF-8 vs Latin-1.
 *
 * Adapters MUST translate transport failures into the BC's domain
 * exceptions (`MecCsvDownloadFailedException`,
 * `MecCsvNoResponseException`, `MecCsvBlockedException`); the use cases
 * never see a `Response` object or puppeteer types.
 */

export abstract class MecCsvDownloaderPort {
  abstract download(url: string): Promise<Buffer>;
}
