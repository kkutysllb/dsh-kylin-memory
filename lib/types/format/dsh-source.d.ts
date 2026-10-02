/** Producer identity used by DSH's durable Session V4 messages. */
export declare const DSH_MEMORY_SOURCE_KIND = "plugin:kylin-memory";
export declare function dshMemorySource(): {
    kind: string;
};
/** Read both migrated V4 messages and historical V3 attribution. */
export declare function isDshMemorySource(source: unknown): boolean;
