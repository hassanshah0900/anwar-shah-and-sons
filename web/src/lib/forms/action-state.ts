/** Result of a form Server Action, consumed with useActionState. */
export type ActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
  /** What was submitted, so fields keep their input after React resets the form. */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = { status: 'idle' };

/** Reads a text field, turning an empty value into undefined. */
export function optionalText(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * The text values of a submitted form, to send back with an error. Repeated
 * fields (e.g. checkboxes) are joined with commas; read them with formList().
 */
export function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of formData) {
    if (typeof value !== 'string' || name.startsWith('$')) continue;
    values[name] = name in values ? `${values[name]},${value}` : value;
  }
  return values;
}

/** The values of a repeated field from submittedValues(). */
export function formList(values: Record<string, string>, name: string): string[] {
  return values[name]?.split(',').filter(Boolean) ?? [];
}

/**
 * A key that changes when an action returns new values. Put it on a form so its
 * fields remount with those values as defaults: React resets forms after an
 * action, and stateful inputs (Radix Select, Checkbox) would otherwise snap back
 * to their first defaults.
 */
export function formKey(state: ActionState): string {
  return state.values ? JSON.stringify(state.values) : 'initial';
}
