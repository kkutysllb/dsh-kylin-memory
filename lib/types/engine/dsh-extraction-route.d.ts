export interface DshExtractionRoute {
    provider: string;
    model: string;
}
export interface DshModelInfoService {
    resolveModelInfo?(provider: string, model: string, signal?: AbortSignal): Promise<{
        reasoning?: {
            efforts: ReadonlyArray<{
                id: string;
            }>;
        };
    }>;
}
/** Provider/configuration failures do not make the durable Q/A invalid. */
export declare class DshExtractionUnavailableError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
/** Select only an effort advertised by the exact host route, without inference calls. */
export declare function resolveDshExtractionReasoning(llm: DshModelInfoService, route: DshExtractionRoute, requested: string | undefined, signal: AbortSignal): Promise<string | undefined>;
