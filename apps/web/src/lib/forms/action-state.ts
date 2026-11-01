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

/** The text values of a submitted form, to send back with an error. */
export function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of formData) {
    if (typeof value === 'string' && !name.startsWith('$')) values[name] = value;
  }
  return values;
}
