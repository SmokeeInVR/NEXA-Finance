declare module "json2csv" {
  export class Parser<T = Record<string, unknown>> {
    constructor(options?: unknown);
    parse(data: T[] | T): string;
  }
}