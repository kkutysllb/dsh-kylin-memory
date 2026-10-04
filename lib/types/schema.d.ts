export declare const Config: {
    meta: Record<string, unknown>;
    type: string;
    get "~standard"(): {
        version: 1;
        vendor: string;
        validate: (value: unknown) => {
            value: unknown;
        } | {
            issues: unknown[];
        };
    };
    toJSON(): Record<string, unknown>;
    required(): /*elided*/ any;
    default(value: Record<string, unknown>): /*elided*/ any;
    volatile(): /*elided*/ any;
    step(n: number): /*elided*/ any;
    min(n: number): /*elided*/ any;
    max(n: number): /*elided*/ any;
};
