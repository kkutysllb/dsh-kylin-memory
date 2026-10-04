/**
 * Ambient surface of the client packages this entry composes against. They
 * are provided by the shell's client module table at runtime and are never
 * installed from npm; the declarations below cover exactly the API used here,
 * mirrored from the deployed DeepSeek Harness client runtime.
 */
declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type { ReactNode } from "react";

  /** Shared shell of one settings form: availability, writability, save state. */
  export interface SettingsFormState {
    available: boolean;
    writable: boolean;
    dirty: boolean;
    invalid: boolean;
    saving: boolean;
    failed: boolean;
  }

  /**
   * One plugin's settings form: read-only notice, the fields (children), and
   * the save control. Discards staged edits on unmount.
   */
  export function SettingsForm(props: {
    labels: Record<string, string>;
    state: SettingsFormState;
    onSave(): void;
    onDiscard(): void;
    children?: ReactNode;
  }): ReactNode;

  /**
   * One staged value field: label, override badge with reset, and the text
   * input. `numeric` only hints the keypad.
   */
  export function SettingsValueField(props: {
    id: string;
    label: string;
    hint?: string;
    overriddenLabel: string;
    resetLabel: string;
    invalidLabel: string;
    numeric?: boolean;
    disabled?: boolean;
    text: string;
    overridden?: boolean;
    invalid?: boolean;
    onEdit(text: string): void;
    onReset(): void;
  }): ReactNode;

  /** Whole-number field spec: empty draft clears, non-numeric drafts block the save. */
  export function settingsNumberField(field: string): unknown;

  /**
   * Staged form model over one settings namespace: stages edits, writes them
   * on save, and publishes a projection through a snapshot store.
   */
  export class SettingsFormModel {
    constructor(scope: unknown, specs: unknown[]);
    shell(): Record<string, unknown>;
    field(field: string): Record<string, unknown>;
    bind(project: () => Record<string, unknown>): { set(value: Record<string, unknown>): void };
    actions(): Record<string, unknown>;
    dispose(): void;
  }
}
