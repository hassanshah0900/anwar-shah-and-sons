import 'server-only';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/server';
import { submittedValues, type ActionState } from './action-state';

/** The first message per field from a Zod error, with the submitted values. */
export function validationState(error: z.ZodError, formData: FormData): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    fieldErrors[path] ??= issue.message;
  }
  return { status: 'error', fieldErrors, values: submittedValues(formData) };
}

/**
 * Turns an API failure into form state: validation issues map to fields, other
 * client errors (e.g. 409 conflicts) to a form message, overridable per status.
 * So does a 503: something the API relies on is down, and its message says what to
 * do next (e.g. Stripe can't be reached, so try again). Unexpected errors rethrow.
 */
export function apiErrorState(
  error: unknown,
  formData: FormData,
  messages: Partial<Record<number, string>> = {},
): ActionState {
  if (!(error instanceof ApiError) || (error.status >= 500 && error.status !== 503)) throw error;
  const values = submittedValues(formData);

  if (error.issues.length) {
    return {
      status: 'error',
      fieldErrors: Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message])),
      values,
    };
  }
  return { status: 'error', message: messages[error.status] ?? error.message, values };
}
