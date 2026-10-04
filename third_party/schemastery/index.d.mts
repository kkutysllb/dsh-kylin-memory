/**
 * Hand-written surface of the vendored schemastery build (the subset this
 * plugin uses). The runtime copy is the host's own @deepseek-ai/schemastery,
 * so serialized schema JSON round-trips through the host's settings service.
 */
declare class Schema<T = unknown> {
  constructor(format: unknown)
  meta: Record<string, unknown>
  type: string
  /** Standard Schema v1 entry used by the host config resolver. */
  get "~standard"(): {
    version: 1
    vendor: string
    validate: (value: unknown) => { value: unknown } | { issues: unknown[] }
  }
  toJSON(): Record<string, unknown>
  required(): Schema<T>
  default(value: T): Schema<T>
  volatile(): Schema<T>
  step(n: number): Schema<T>
  min(n: number): Schema<T>
  max(n: number): Schema<T>
  static object(dict: Record<string, Schema<unknown>>): Schema<Record<string, unknown>>
  static number(): Schema<number>
  static string(): Schema<string>
  static boolean(): Schema<boolean>
  static resolve(data: unknown, schema: unknown, options?: unknown, strict?: boolean): unknown[]
}

declare const z: typeof Schema
export default z
