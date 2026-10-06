/**
 * Ambient surface of the client packages this entry composes against. They
 * are provided by the shell's client module table at runtime and are never
 * installed from npm; the declarations below cover exactly the API used here,
 * mirrored from the deployed QiLin client runtime (`@qilin/client-ui-primitives`,
 * reached through the shell's DSH-era module-name alias).
 */
declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type { ReactNode } from "react";

  /** Visual family, each backed by a token set. */
  export type ButtonVariant = "primary" | "ghost" | "outline" | "toolbar";

  /** Render a token-styled button. */
  export function Button(props: {
    variant?: ButtonVariant;
    size?: "md" | "sm";
    icon?: ReactNode;
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
    children?: ReactNode;
  }): ReactNode;

  /** Render a single-line text input. */
  export function Input(props: {
    id?: string;
    icon?: ReactNode;
    className?: string;
    value?: string;
    disabled?: boolean;
    inputMode?: "decimal" | "numeric" | "text";
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
    onChange?: (event: { target: { value: string } }) => void;
  }): ReactNode;
}
