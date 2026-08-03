import type { ChangeEvent, ReactNode } from 'react';
import { Field, Input, InputGroup } from '@chakra-ui/react';

/**
 * Shared form-field chrome: `Field.Root` + `Field.Label` + `Input`, optionally
 * wrapped in an `InputGroup` for a leading adornment (e.g. the search icon).
 * Centralizes the exact label/input styling that was copy-pasted across the
 * auth pages, the group modals and the user-search field.
 *
 * Label rendering follows the two in-app conventions:
 * - `labelStyle="normal"` (auth pages): sentence-case label, `mb={1.5}`.
 * - `labelStyle="uppercase"` (modals + search): uppercase micro-label.
 * Override with `labelMb` when a caller wants a different label gap.
 */
interface TextFieldProps {
  label?: string;
  labelStyle?: 'normal' | 'uppercase';
  labelMb?: number | string;
  /** Spacing under the whole field (Field.Root margin-bottom). Default `4`. */
  mb?: number | string;
  id?: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  minLength?: number;
  maxLength?: number;
  inputBorderColor?: string | Record<string, unknown>;
  /** Leading adornment rendered inside the input group. */
  startElement?: ReactNode;
}

export const TextField = ({
  label,
  labelStyle = 'normal',
  labelMb,
  mb = 4,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
  minLength,
  maxLength,
  inputBorderColor = { base: 'border.subtle', _dark: 'border.strong' },
  startElement,
}: TextFieldProps) => {
  const effectiveLabelMb =
    labelMb !== undefined ? labelMb : labelStyle === 'uppercase' ? undefined : 1.5;

  const input = (
    <Input
      id={id}
      type={type}
      colorPalette="brand"
      bg="bg.raised"
      _placeholder={{ color: 'text.muted' }}
      borderColor={inputBorderColor}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      autoFocus={autoFocus}
      minLength={minLength}
      maxLength={maxLength}
    />
  );

  return (
    <Field.Root mb={mb}>
      {label && (
        <Field.Label
          textTransform={labelStyle === 'uppercase' ? 'uppercase' : undefined}
          fontSize="xs"
          letterSpacing={labelStyle === 'uppercase' ? '0.5px' : undefined}
          fontWeight="medium"
          color="text.secondary"
          mb={effectiveLabelMb}
        >
          {label}
        </Field.Label>
      )}
      {startElement ? <InputGroup startElement={startElement}>{input}</InputGroup> : input}
    </Field.Root>
  );
};

export default TextField;
